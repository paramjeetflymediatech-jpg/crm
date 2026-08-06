const { NextResponse } = require('next/server');
const { Lead, LeadActivity, Notification, User, Company } = require('@/models');
const { emitToCompany } = require('@/socket/socketServer');
const { sendEmail } = require('@/emails/mailer');
const crypto = require('crypto');

require('dotenv').config();

const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const FB_VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'crm_fb_webhook_verify_2026';
const FB_GRAPH_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION || 'v21.0';

/**
 * GET — Facebook Webhook Verification (hub.challenge handshake)
 * Facebook sends: hub.mode=subscribe, hub.challenge, hub.verify_token
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
      console.log('[Facebook Webhook] Verification successful.');
      return new Response(challenge, { status: 200 });
    }

    return NextResponse.json({ error: 'Verification failed: token mismatch.' }, { status: 403 });
  } catch (error) {
    console.error('[Facebook Webhook] GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST — Facebook Lead Event Receiver
 * Receives leadgen webhook events and imports leads into CRM
 */
export async function POST(request) {
  try {
    // 1. Verify signature (X-Hub-Signature-256 header)
    if (FB_APP_SECRET) {
      const rawBody = await request.text();
      const signature = request.headers.get('x-hub-signature-256') || '';
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', FB_APP_SECRET)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('[Facebook Webhook] Signature verification failed.');
        return NextResponse.json({ error: 'Unauthorized: Invalid signature.' }, { status: 401 });
      }

      // Parse body from raw text since we already read it
      const body = JSON.parse(rawBody);
      return await processLeadgenEvent(body);
    } else {
      // No app secret configured — parse normally (dev mode)
      const body = await request.json();
      return await processLeadgenEvent(body);
    }
  } catch (error) {
    console.error('[Facebook Webhook] POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Processes a leadgen event payload from Facebook
 */
async function processLeadgenEvent(body) {
  if (body.object !== 'page') {
    return NextResponse.json({ status: 'ignored', reason: 'Not a page event.' });
  }

  const results = [];

  for (const entry of (body.entry || [])) {
    const pageId = entry.id;

    // Find which company this page belongs to
    let company = await Company.findOne({
      where: { facebook_page_id: String(pageId).trim(), status: 'active' }
    });

    if (!company) {
      // Fallback: If only 1 active company exists in CRM, assign to it
      const activeCompanies = await Company.findAll({ where: { status: 'active' } });
      if (activeCompanies.length === 1) {
        company = activeCompanies[0];
      }
    }

    if (!company) {
      console.warn(`[Facebook Webhook] No active company found for page_id: ${pageId}`);
      results.push({ pageId, status: 'skipped', reason: 'No company matched' });
      continue;
    }

    for (const change of (entry.changes || [])) {
      if (change.field !== 'leadgen') continue;

      const { leadgen_id, form_id, page_id, adgroup_id, ad_id } = change.value;

      try {
        // 2. Fetch lead field data from Graph API
        const leadData = await fetchFacebookLead(leadgen_id, company.facebook_access_token);

        if (!leadData) {
          results.push({ leadgen_id, status: 'error', reason: 'Failed to fetch lead from Graph API' });
          continue;
        }

        // 3. Parse field data into CRM structure
        const fields = {};
        for (const field of (leadData.field_data || [])) {
          fields[field.name] = field.values?.[0] || '';
        }

        const fullName = fields['full_name'] || fields['name'] || '';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = fields['first_name'] || nameParts[0] || 'Facebook';
        const lastName = fields['last_name'] || nameParts.slice(1).join(' ') || 'Lead';

        // Find email field dynamically from field_data
        let leadEmail = fields['email'] || fields['work_email'] || fields['email_address'] || null;
        if (!leadEmail) {
          const emailKey = Object.keys(fields).find(k => k.toLowerCase().includes('email'));
          if (emailKey) leadEmail = fields[emailKey];
        }
        leadEmail = (leadEmail && typeof leadEmail === 'string' && leadEmail.trim()) ? leadEmail.trim() : null;

        // Construct comprehensive message string containing all form fields & answers dynamically
        const formAnswers = (leadData.field_data || [])
          .map(f => {
            const rawName = f.name || 'Field';
            const label = rawName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const val = Array.isArray(f.values) ? f.values.join(', ') : (f.values || 'N/A');
            return `${label}: ${val}`;
          })
          .join('\n');

        const messageContent = [
          `Source: Facebook Lead Ads`,
          `Form Name: ${leadData.form_name || 'N/A'} (ID: ${form_id || leadData.form_id || 'N/A'})`,
          `Ad ID: ${ad_id || 'N/A'} | AdGroup: ${adgroup_id || 'N/A'}`,
          `Created Time: ${leadData.created_time || new Date().toISOString()}`,
          `\n--- Form Field Submissions ---`,
          formAnswers || 'No form field data available'
        ].join('\n');

        // 4. Create Lead in CRM
        const newLead = await Lead.create({
          company_id: company.id,
          first_name: firstName,
          last_name: lastName,
          email: leadEmail,
          phone: fields['phone_number'] || fields['mobile_number'] || fields['phone'] || '',
          subject: `Facebook Lead Ad — ${leadData.form_name || 'Lead Ad'}`,
          message: messageContent,
          source: 'Facebook Ads',
          source_reference_id: leadgen_id,
          status: 'New',
          priority: 'High',
          lead_score: 70
        });

        // 5. Create Activity Log
        await LeadActivity.create({
          lead_id: newLead.id,
          user_id: null,
          action: 'Lead Created',
          description: `Lead imported from Facebook Lead Ad (Form: ${leadData.form_name || leadgen_id}).`
        });

        // 6. Notify all active company users
        const users = await User.findAll({
          where: { company_id: company.id, status: 'active' }
        });

        const notifTitle = '📣 New Facebook Lead';
        const notifMessage = `${firstName} ${lastName} submitted a Facebook Lead Ad form.`;

        const notifPromises = users.map(u =>
          Notification.create({
            company_id: company.id,
            user_id: u.id,
            lead_id: newLead.id,
            title: notifTitle,
            message: notifMessage,
            type: 'New Lead',
            is_read: false
          })
        );
        const createdNotifs = await Promise.all(notifPromises);

        // 7. Real-time socket event
        emitToCompany(company.id, 'notification', {
          id: createdNotifs[0]?.id || Date.now(),
          title: notifTitle,
          message: notifMessage,
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
            sendPushNotification(fcmTokens, notifTitle, notifMessage, {
              type: 'New Lead',
              leadId: newLead.id
            }).catch(err => console.error('[FCM] Background push error:', err));
          }
        } catch (fcmErr) {
          console.error('[FCM] Push setup error:', fcmErr);
        }

        // 8. Email admins
        const admins = users.filter(u => u.role === 'company_admin');
        for (const admin of admins) {
          await sendEmail({
            to: admin.email,
            subject: `[CRM] New Facebook Lead: ${firstName} ${lastName}`,
            text: `Hello ${admin.name},\n\nA new lead was submitted from your Facebook Lead Ad.\n\nName: ${firstName} ${lastName}\nEmail: ${leadEmail || 'N/A'}\nPhone: ${fields['phone_number'] || 'N/A'}\nForm: ${leadData.form_name || 'N/A'}\n\nLog in to follow up.`,
            html: `
              <p>Hello <strong>${admin.name}</strong>,</p>
              <p>A new lead has been submitted from your Facebook Lead Ad.</p>
              <table cellpadding="6" style="border-collapse:collapse; width:100%; font-size:14px;">
                <tr><td style="font-weight:bold; color:#555;">Name</td><td>${firstName} ${lastName}</td></tr>
                <tr><td style="font-weight:bold; color:#555;">Email</td><td>${leadEmail || 'N/A'}</td></tr>
                <tr><td style="font-weight:bold; color:#555;">Phone</td><td>${fields['phone_number'] || 'N/A'}</td></tr>
                <tr><td style="font-weight:bold; color:#555;">Form</td><td>${leadData.form_name || 'N/A'}</td></tr>
                <tr><td style="font-weight:bold; color:#555;">Lead ID</td><td>${leadgen_id}</td></tr>
              </table>
              <p style="margin-top:16px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/leads/${newLead.id}" 
                   style="background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">
                  View Lead
                </a>
              </p>
            `
          });
        }

        results.push({ leadgen_id, status: 'created', lead_id: newLead.id });
      } catch (innerError) {
        console.error(`[Facebook Webhook] Error processing leadgen_id ${leadgen_id}:`, innerError);
        results.push({ leadgen_id, status: 'error', reason: innerError.message });
      }
    }
  }

  return NextResponse.json({ received: true, results });
}

/**
 * Fetches a single lead's field data from Facebook Graph API
 */
async function fetchFacebookLead(leadgenId, accessToken) {
  if (accessToken) {
    try {
      const url = `https://graph.facebook.com/${FB_GRAPH_VERSION}/${leadgenId}?fields=field_data,form_id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name&access_token=${accessToken}`;
      const response = await fetch(url);
      if (response.ok) {
        const lead = await response.json();
        if (lead.form_id) {
          try {
            const formUrl = `https://graph.facebook.com/${FB_GRAPH_VERSION}/${lead.form_id}?fields=name&access_token=${accessToken}`;
            const formRes = await fetch(formUrl);
            if (formRes.ok) {
              const formData = await formRes.json();
              lead.form_name = formData.name;
            }
          } catch (fErr) {
            console.error('[Facebook Webhook] Failed to fetch form details:', fErr);
          }
        }
        return lead;
      }
      const err = await response.json();
      console.error('[Facebook Webhook] Graph API error:', JSON.stringify(err, null, 2));

      if (err?.error?.code === 100 && err?.error?.error_subcode === 33) {
        console.error(
          `[Facebook Webhook] PERMISSION ERROR (Subcode 33): Access token lacks 'leads_retrieval' permission, ` +
          `or Page Lead Access Manager (Meta Business Manager) restricts lead data access for leadgen_id ${leadgenId}.`
        );
      }

      // If leadgenId is a known Meta test lead ID (e.g. 444444444444), use fallback
      if (String(leadgenId).startsWith('4444444')) {
        console.log(`[Facebook Webhook] Using test lead fallback data for Meta test leadgen_id: ${leadgenId}`);
        return getDummyTestLead();
      }

      return null;
    } catch (error) {
      console.error('[Facebook Webhook] Graph API fetch failed:', error);
      return null;
    }
  } else {
    console.warn('[Facebook Webhook] No access token configured for company.');
  }

  // Fallback for Meta Lead Ads Testing Tool when no access token is set or testing locally
  console.log(`[Facebook Webhook] Using test lead fallback data for leadgen_id: ${leadgenId}`);
  return getDummyTestLead();
}

function getDummyTestLead() {
  return {
    form_id: 'test_lead_form_id',
    form_name: 'Test Facebook Lead Form',
    field_data: [
      { name: 'full_name', values: ['Test Lead (Facebook Ads)'] },
      { name: 'email', values: ['testlead@example.com'] },
      { name: 'phone_number', values: ['+15550199283'] }
    ]
  };
}
