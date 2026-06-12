const { NextResponse } = require('next/server');
const { Lead, LeadActivity, Notification, User } = require('@/models');
const { withApiKey } = require('@/lib/apiGuard');
const { sendEmail } = require('@/emails/mailer');
const { emitToCompany } = require('@/socket/socketServer');

async function handler(request) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message, source = 'Contact Form' } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is a required field.' }, { status: 400 });
    }

    const companyId = request.companyId;
    const company = request.company;

    // 1. Split name into First Name and Last Name
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // 2. Save Lead
    const newLead = await Lead.create({
      company_id: companyId,
      first_name: firstName,
      last_name: lastName,
      email: email || '',
      phone: phone || '',
      subject: subject || '',
      message: message || '',
      source: source,
      status: 'New',
      priority: 'Medium',
      lead_score: 50 // Default starter score for web form submissions
    });

    // 3. Create Activity Log
    await LeadActivity.create({
      lead_id: newLead.id,
      user_id: null,
      action: 'Lead Created',
      description: `Lead synced from WordPress website via ${source}.`
    });

    // 4. Retrieve company users to create notifications
    const users = await User.findAll({
      where: {
        company_id: companyId,
        status: 'active'
      }
    });

    const notificationTitle = 'New Lead Received';
    const notificationMessage = `Name: ${name} | Source: ${source}`;

    // Bulk create notifications for all company users
    const notificationPromises = users.map(user => {
      return Notification.create({
        company_id: companyId,
        user_id: user.id,
        lead_id: newLead.id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'New Lead',
        is_read: false
      });
    });

    const createdNotifications = await Promise.all(notificationPromises);

    // 5. Trigger Real-Time notification
    emitToCompany(companyId, 'notification', {
      id: createdNotifications[0]?.id || Date.now(),
      title: notificationTitle,
      message: notificationMessage,
      type: 'New Lead',
      leadId: newLead.id,
      createdAt: new Date()
    });

    // Send push notification via FCM
    try {
      const { sendPushNotification } = require('@/lib/fcm');
      const fcmTokens = users.reduce((acc, u) => {
        if (u.fcm_tokens && Array.isArray(u.fcm_tokens)) {
          acc.push(...u.fcm_tokens);
        }
        return acc;
      }, []);

      if (fcmTokens.length > 0) {
        sendPushNotification(fcmTokens, notificationTitle, notificationMessage, {
          type: 'New Lead',
          leadId: newLead.id
        }).catch(err => console.error('[FCM] Background push error:', err));
      }
    } catch (fcmErr) {
      console.error('[FCM] Push setup error:', fcmErr);
    }

    // 6. Send Email alerts to Company Admins
    const admins = users.filter(u => u.role === 'company_admin');
    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        subject: `[CRM] New Lead: ${name}`,
        text: `Hello ${admin.name},\n\nA new lead has been submitted to your CRM.\n\nName: ${name}\nEmail: ${email || 'N/A'}\nPhone: ${phone || 'N/A'}\nSubject: ${subject || 'N/A'}\nMessage: ${message || 'N/A'}\nSource: ${source}\n\nPlease log in to follow up.`,
        html: `
          <p>Hello <strong>${admin.name}</strong>,</p>
          <p>A new lead has been submitted from your WordPress site.</p>
          <ul>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Email:</strong> ${email || 'N/A'}</li>
            <li><strong>Phone:</strong> ${phone || 'N/A'}</li>
            <li><strong>Source:</strong> ${source}</li>
            <li><strong>Subject:</strong> ${subject || 'N/A'}</li>
          </ul>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 3px solid #ccc; padding-left: 10px;">${message || 'N/A'}</blockquote>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/leads/${newLead.id}">Click here to view Lead details</a></p>
        `
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Lead received successfully.',
      lead_id: newLead.id
    }, { status: 201 });

  } catch (error) {
    console.error('WordPress Lead Create Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiKey(handler);
