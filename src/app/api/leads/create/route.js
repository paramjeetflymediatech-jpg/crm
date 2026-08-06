const { NextResponse } = require('next/server');
const { Lead, LeadActivity, Notification, User } = require('@/models');
const { withApiKey } = require('@/lib/apiGuard');
const { sendEmail } = require('@/emails/mailer');
const { emitToCompany } = require('@/socket/socketServer');

/**
 * Recursively flattens any unknown JSON object or array payload into clean key-value pairs
 */
function extractAllFields(obj, prefix = '') {
  const result = [];
  if (!obj || typeof obj !== 'object') return result;

  for (const [rawKey, val] of Object.entries(obj)) {
    if (['apiKey', 'api_key', 'company_id', 'companyId'].includes(rawKey)) continue;

    const formattedKey = prefix 
      ? `${prefix} — ${rawKey.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`
      : rawKey.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    if (val === null || val === undefined || val === '') continue;

    if (Array.isArray(val)) {
      if (val.every(item => typeof item !== 'object')) {
        result.push({ key: formattedKey, value: val.join(', ') });
      } else {
        val.forEach((item, idx) => {
          result.push(...extractAllFields(item, `${formattedKey} #${idx + 1}`));
        });
      }
    } else if (typeof val === 'object') {
      result.push(...extractAllFields(val, formattedKey));
    } else {
      result.push({ key: formattedKey, value: String(val).trim() });
    }
  }

  return result;
}

async function handler(request) {
  try {
    const body = await request.json();
    const companyId = request.companyId;

    // Extract every single key & value dynamically from the incoming payload
    const allExtracted = extractAllFields(body);

    // Auto-detect standard fields regardless of exact key naming convention used by web forms
    let rawName = body.name || body.full_name || body.fullName || body['your-name'] || body.first_name || '';
    if (!rawName) {
      const nameObj = allExtracted.find(f => f.key.toLowerCase().includes('name'));
      if (nameObj) rawName = nameObj.value;
    }
    if (!rawName) rawName = 'Website Visitor';

    const nameParts = rawName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    let rawEmail = body.email || body.work_email || body['your-email'] || body.email_address || null;
    if (!rawEmail) {
      const emailObj = allExtracted.find(f => f.key.toLowerCase().includes('email') || f.key.toLowerCase().includes('mail'));
      if (emailObj) rawEmail = emailObj.value;
    }
    const leadEmail = (rawEmail && typeof rawEmail === 'string' && rawEmail.trim()) ? rawEmail.trim() : null;

    let rawPhone = body.phone || body.phone_number || body['your-phone'] || body.mobile || body.contact || '';
    if (!rawPhone) {
      const phoneObj = allExtracted.find(f => f.key.toLowerCase().includes('phone') || f.key.toLowerCase().includes('mobile') || f.key.toLowerCase().includes('tel'));
      if (phoneObj) rawPhone = phoneObj.value;
    }

    let rawSubject = body.subject || body.topic || body['your-subject'] || '';
    if (!rawSubject) {
      const subjObj = allExtracted.find(f => f.key.toLowerCase().includes('subject') || f.key.toLowerCase().includes('service'));
      if (subjObj) rawSubject = subjObj.value;
    }

    const source = body.source || body['form-name'] || body.form_name || 'Contact Form';

    // Format all submitted form fields & answers dynamically into the message text
    const formAnswers = allExtracted
      .map(item => `${item.key}: ${item.value}`)
      .join('\n');

    const formattedMessage = [
      `Source: ${source}`,
      `Submitted: ${new Date().toISOString()}`,
      `\n--- Form Field Submissions ---`,
      formAnswers || 'No form field data provided'
    ].join('\n');

    // Save Lead
    const newLead = await Lead.create({
      company_id: companyId,
      first_name: firstName,
      last_name: lastName,
      email: leadEmail,
      phone: rawPhone || '',
      subject: rawSubject || `${source} Submission`,
      message: formattedMessage,
      source: source,
      status: 'New',
      priority: 'Medium',
      lead_score: 50
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
    const notificationMessage = `Name: ${rawName} | Source: ${source}`;

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
        subject: `[CRM] New Lead: ${rawName}`,
        text: `Hello ${admin.name},\n\nA new lead has been submitted to your CRM.\n\nName: ${rawName}\nEmail: ${leadEmail || 'N/A'}\nPhone: ${rawPhone || 'N/A'}\nSubject: ${rawSubject || 'N/A'}\nSource: ${source}\n\nField Submissions:\n${formattedMessage}\n\nPlease log in to follow up.`,
        html: `
          <p>Hello <strong>${admin.name}</strong>,</p>
          <p>A new lead has been submitted from your website/contact form.</p>
          <ul>
            <li><strong>Name:</strong> ${rawName}</li>
            <li><strong>Email:</strong> ${leadEmail || 'N/A'}</li>
            <li><strong>Phone:</strong> ${rawPhone || 'N/A'}</li>
            <li><strong>Source:</strong> ${source}</li>
            <li><strong>Subject:</strong> ${rawSubject || 'N/A'}</li>
          </ul>
          <p><strong>Submitted Form Details:</strong></p>
          <pre style="background: #f4f5f7; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; white-space: pre-wrap;">${formattedMessage}</pre>
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
