const { NextResponse } = require('next/server');
const { Lead, LeadActivity, Notification, User, Company } = require('@/models');
const { emitToCompany } = require('@/socket/socketServer');
const { sendEmail } = require('@/emails/mailer');

/**
 * Authenticates company API key from:
 * 1. Authorization header: "Bearer <API_KEY>"
 * 2. Query param: ?apiKey=... or ?api_key=... or ?token=...
 * 3. Body param: apiKey or api_key
 */
async function authenticateJustdialRequest(request, bodyObj = {}) {
  let apiKey = null;

  // 1. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7).trim();
  }

  // 2. Check Query parameter
  if (!apiKey) {
    const { searchParams } = new URL(request.url);
    apiKey = searchParams.get('apiKey') || searchParams.get('api_key') || searchParams.get('token') || searchParams.get('auth_token');
  }

  // 3. Check Body
  if (!apiKey && bodyObj && typeof bodyObj === 'object') {
    apiKey = bodyObj.apiKey || bodyObj.api_key || bodyObj.token || bodyObj.key;
  }

  if (!apiKey) {
    return { error: 'Authentication required. Please provide a valid API Key in the query string (?apiKey=...), header, or body.', status: 401 };
  }

  const company = await Company.findOne({
    where: { api_key: apiKey }
  });

  if (!company) {
    return { error: 'Invalid API Key. No active company matched this key.', status: 401 };
  }

  if (company.status !== 'active') {
    return { error: 'Company account is inactive or suspended.', status: 403 };
  }

  return { company };
}

/**
 * Extracts payload data flexibly from JSON, FormData, or URL-Encoded text
 */
async function parseIncomingData(request) {
  const contentType = request.headers.get('content-type') || '';
  let data = {};

  try {
    if (contentType.includes('application/json')) {
      data = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      try {
        const formData = await request.formData();
        for (const [key, value] of formData.entries()) {
          data[key] = value;
        }
      } catch {
        const rawText = await request.text();
        const params = new URLSearchParams(rawText);
        for (const [key, value] of params.entries()) {
          data[key] = value;
        }
      }
    } else {
      // Fallback: try JSON or text parsing
      const rawText = await request.text();
      if (rawText && rawText.trim().startsWith('{')) {
        data = JSON.parse(rawText);
      } else if (rawText && rawText.includes('=')) {
        const params = new URLSearchParams(rawText);
        for (const [key, value] of params.entries()) {
          data[key] = value;
        }
      }
    }
  } catch (err) {
    console.warn('[Justdial Webhook] Payload parse warning:', err.message);
  }

  // Merge query parameters for missing fields
  const { searchParams } = new URL(request.url);
  for (const [key, value] of searchParams.entries()) {
    if (!data[key]) {
      data[key] = value;
    }
  }

  return data;
}

/**
 * Processes and creates a Justdial lead
 */
async function processLead(company, payload) {
  // 1. Extract Name
  const prefix = (payload.prefix || payload.salutation || '').trim();
  let rawName = (
    payload.name ||
    payload.caller_name ||
    payload.customer_name ||
    payload.lead_name ||
    payload.contact_name ||
    payload.client_name ||
    ''
  ).trim();

  if (!rawName) {
    rawName = prefix ? `${prefix} Justdial Customer` : 'Justdial Customer';
  } else if (prefix && !rawName.toLowerCase().startsWith(prefix.toLowerCase())) {
    rawName = `${prefix} ${rawName}`;
  }

  const nameParts = rawName.split(/\s+/);
  const firstName = nameParts[0] || 'Justdial';
  const lastName = nameParts.slice(1).join(' ') || 'Lead';

  // 2. Extract Phone
  const phone = (
    payload.mobile ||
    payload.phone ||
    payload.contact ||
    payload.caller_phone ||
    payload.mobile_no ||
    payload.phone_number ||
    payload.contact_no ||
    ''
  ).toString().trim();

  // 3. Extract Email
  const email = (
    payload.email ||
    payload.email_id ||
    payload.email_address ||
    payload.caller_email ||
    ''
  ).toString().trim() || null;

  // 4. Extract Category / Requirement
  const category = (
    payload.category ||
    payload.category_name ||
    payload.cat_name ||
    payload.service ||
    payload.requirement ||
    'General Enquiry'
  ).toString().trim();

  // 5. Extract Location info
  const area = payload.area || payload.locality || '';
  const city = payload.city || '';
  const pincode = payload.pincode || payload.zip || payload.pin || '';
  const address = payload.address || payload.full_address || '';
  const state = payload.state || '';

  const locationParts = [area, city, pincode, state].filter(Boolean).join(', ');

  // 6. Lead ID and Timestamp from Justdial
  const jdLeadId = payload.leadid || payload.lead_id || payload.id || payload.enquiry_id || '';
  const leadDate = payload.date || payload.lead_date || '';
  const leadTime = payload.time || payload.lead_time || '';
  const jdTimestamp = [leadDate, leadTime].filter(Boolean).join(' ');

  // 7. Lead Priority based on Justdial leadtype
  const leadType = (payload.leadtype || payload.lead_type || payload.priority || '').toLowerCase();
  let priority = 'Medium';
  if (leadType.includes('hot') || leadType.includes('urgent') || leadType.includes('high')) {
    priority = 'High';
  } else if (leadType.includes('cold') || leadType.includes('low')) {
    priority = 'Low';
  }

  // 8. Build rich message
  const details = [];
  if (jdLeadId) details.push(`Justdial Lead ID: ${jdLeadId}`);
  if (category) details.push(`Category / Requirement: ${category}`);
  if (locationParts) details.push(`Location: ${locationParts}`);
  if (address) details.push(`Address: ${address}`);
  if (jdTimestamp) details.push(`Justdial Enquiry Time: ${jdTimestamp}`);
  if (payload.dnctype) details.push(`DNC Status: ${payload.dnctype}`);
  if (payload.branch) details.push(`Branch / Location: ${payload.branch}`);

  // Include any extra parameters sent by Justdial
  const knownKeys = new Set([
    'apiKey', 'api_key', 'token', 'key', 'name', 'caller_name', 'customer_name',
    'lead_name', 'contact_name', 'client_name', 'prefix', 'salutation', 'mobile',
    'phone', 'contact', 'caller_phone', 'mobile_no', 'phone_number', 'contact_no',
    'email', 'email_id', 'email_address', 'caller_email', 'category', 'category_name',
    'cat_name', 'service', 'requirement', 'area', 'locality', 'city', 'pincode',
    'zip', 'pin', 'address', 'full_address', 'state', 'leadid', 'lead_id', 'id',
    'enquiry_id', 'date', 'lead_date', 'time', 'lead_time', 'leadtype', 'lead_type',
    'priority', 'dnctype', 'branch'
  ]);

  const extraFields = Object.entries(payload)
    .filter(([k, v]) => !knownKeys.has(k) && v !== null && v !== undefined && String(v).trim() !== '')
    .map(([k, v]) => `${k.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: ${v}`);

  const formattedMessage = [
    `Source: Justdial`,
    `Received: ${new Date().toISOString()}`,
    `----------------------------------------`,
    ...details,
    ...(extraFields.length > 0 ? [`\nAdditional Information:`, ...extraFields] : [])
  ].join('\n');

  // 9. Create Lead in Database
  const subject = category ? `Justdial: ${category}` : (jdLeadId ? `Justdial Enquiry #${jdLeadId}` : 'Justdial Lead');

  const newLead = await Lead.create({
    company_id: company.id,
    first_name: firstName,
    last_name: lastName,
    email: email,
    phone: phone || '',
    subject: subject,
    message: formattedMessage,
    source: 'Justdial',
    status: 'New',
    priority: priority,
    lead_score: priority === 'High' ? 75 : 60
  });

  // 10. Create Lead Activity
  await LeadActivity.create({
    lead_id: newLead.id,
    user_id: null,
    action: 'Lead Created',
    description: `Lead received automatically via Justdial Lead Forwarding API${jdLeadId ? ` (ID: ${jdLeadId})` : ''}.`
  });

  // 11. Create In-App Notifications for Company Users
  const users = await User.findAll({
    where: {
      company_id: company.id,
      status: 'active'
    }
  });

  const notificationTitle = 'New Justdial Lead Received';
  const notificationMessage = `${rawName} | ${phone || 'No Phone'} | ${category}`;

  const notificationPromises = users.map(user =>
    Notification.create({
      company_id: company.id,
      user_id: user.id,
      lead_id: newLead.id,
      title: notificationTitle,
      message: notificationMessage,
      type: 'New Lead',
      is_read: false
    })
  );

  const createdNotifications = await Promise.all(notificationPromises);

  // 12. Real-time WebSocket emission
  emitToCompany(company.id, 'notification', {
    id: createdNotifications[0]?.id || Date.now(),
    title: notificationTitle,
    message: notificationMessage,
    type: 'New Lead',
    leadId: newLead.id,
    createdAt: new Date()
  });

  // 13. Dispatch FCM Push Notification (if active)
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
      }).catch(err => console.error('[Justdial FCM] Background push error:', err));
    }
  } catch (fcmErr) {
    console.error('[Justdial FCM] Push setup error:', fcmErr);
  }

  // 14. Dispatch Email alerts to Company Admins
  const admins = users.filter(u => u.role === 'company_admin');
  for (const admin of admins) {
    sendEmail({
      to: admin.email,
      subject: `[CRM] New Justdial Lead: ${rawName} (${category})`,
      text: `Hello ${admin.name},\n\nA new lead has arrived from Justdial.\n\nName: ${rawName}\nPhone: ${phone || 'N/A'}\nEmail: ${email || 'N/A'}\nCategory: ${category}\nLocation: ${locationParts || 'N/A'}\n\nDetails:\n${formattedMessage}\n\nPlease log in to follow up.`,
      html: `
        <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; line-height: 1.5;">
          <h2 style="color: #f97316; margin-bottom: 4px;">⚡ New Justdial Lead</h2>
          <p style="margin-top: 0; color: #64748b; font-size: 14px;">A new customer enquiry was received via your Justdial integration.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 140px;">Customer:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${rawName}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Phone:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><a href="tel:${phone}" style="color: #4f46e5; text-decoration: none;">${phone || 'N/A'}</a></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${email || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Category:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${category}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Location:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${locationParts || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Priority:</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><span style="background: ${priority === 'High' ? '#fee2e2; color: #b91c1c' : '#fef3c7; color: #b45309'}; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">${priority}</span></td></tr>
          </table>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/leads/${newLead.id}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">View Lead in CRM →</a></p>
        </div>
      `
    }).catch(err => console.error('[Justdial Email Alert Error]:', err));
  }

  return newLead;
}

/**
 * POST /api/leads/justdial
 * Main webhook endpoint for Justdial lead push notifications
 */
export async function POST(request) {
  try {
    const payload = await parseIncomingData(request);
    const auth = await authenticateJustdialRequest(request, payload);

    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const lead = await processLead(auth.company, payload);

    return NextResponse.json({
      status: 'success',
      message: 'Justdial lead received successfully',
      lead_id: lead.id
    }, { status: 201 });

  } catch (error) {
    console.error('[Justdial Webhook] POST Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

/**
 * GET /api/leads/justdial
 * Verification or GET-based lead forwarding support
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const payload = {};
    for (const [key, value] of searchParams.entries()) {
      payload[key] = value;
    }

    const auth = await authenticateJustdialRequest(request, payload);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // If query has minimal contact details (mobile or name), process as a lead
    if (payload.mobile || payload.phone || payload.name || payload.caller_name || payload.customer_name) {
      const lead = await processLead(auth.company, payload);
      return NextResponse.json({
        status: 'success',
        message: 'Justdial lead received successfully via GET',
        lead_id: lead.id
      }, { status: 201 });
    }

    // Otherwise, respond as a healthy webhook verification handshake
    return NextResponse.json({
      status: 'active',
      message: 'Justdial Lead Integration endpoint is online and authenticated for ' + auth.company.company_name
    }, { status: 200 });

  } catch (error) {
    console.error('[Justdial Webhook] GET Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
