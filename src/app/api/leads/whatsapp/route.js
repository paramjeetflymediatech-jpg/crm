const { NextResponse } = require('next/server');
const { Lead, LeadActivity, Notification, User, Company } = require('@/models');
const { emitToCompany } = require('@/socket/socketServer');
const { sendEmail } = require('@/emails/mailer');

/**
 * Standard CORS headers for cross-origin website widgets
 */
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Preflight OPTIONS request handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

/**
 * Authenticate incoming request by:
 * 1. Authorization header: "Bearer <API_KEY>"
 * 2. Query param: ?apiKey=... or ?api_key=... or ?token=...
 * 3. Body param: apiKey or api_key
 * 4. Meta Cloud API: metadata.phone_number_id lookup against company.whatsapp_phone_id / phone
 */
async function authenticateRequest(request, bodyObj = {}) {
  let apiKey = null;

  // 1. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7).trim();
  }

  // 2. Check Query parameter
  if (!apiKey) {
    const { searchParams } = new URL(request.url);
    apiKey = searchParams.get('apiKey') || searchParams.get('api_key') || searchParams.get('token');
  }

  // 3. Check Body
  if (!apiKey && bodyObj && typeof bodyObj === 'object') {
    apiKey = bodyObj.apiKey || bodyObj.api_key || bodyObj.company_key || bodyObj.companyKey;
  }

  if (apiKey) {
    const company = await Company.findOne({
      where: { api_key: apiKey }
    });

    if (company) {
      if (company.status !== 'active') {
        return { error: 'Company account is inactive or suspended.', status: 403 };
      }
      return { company };
    }
  }

  // 4. Multi-tenant phone resolution:
  // Can come from Meta Cloud API (display_phone_number) OR Website Widget (whatsapp_number / target_phone / business_phone)
  const widgetBusinessPhone = bodyObj?.whatsapp_number || bodyObj?.business_phone || bodyObj?.target_phone || bodyObj?.to;
  const metaDisplayPhone = bodyObj?.entry?.[0]?.changes?.[0]?.value?.metadata?.display_phone_number;
  const receivingPhone = widgetBusinessPhone || metaDisplayPhone;

  const metaPhoneId = bodyObj?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  const wabaId = bodyObj?.entry?.[0]?.id;

  if (receivingPhone || metaPhoneId || wabaId) {
    const cleanDisplay = (receivingPhone || '').replace(/[^0-9]/g, '');
    let company = null;
    const activeCompanies = await Company.findAll({ where: { status: 'active' } });

    console.log('[WhatsApp Webhook] Authenticating event by receiving phone:', {
      receivingPhone,
      cleanPhone: cleanDisplay,
      metaPhoneId,
      wabaId,
      activeCompaniesCount: activeCompanies.length
    });

    // Check 1: Match against each client company's phone number
    if (cleanDisplay) {
      const last10 = cleanDisplay.length >= 10 ? cleanDisplay.slice(-10) : cleanDisplay;

      company = activeCompanies.find(c => {
        if (!c.phone) return false;
        const cClean = String(c.phone).replace(/[^0-9]/g, '');
        return cClean === cleanDisplay || cClean.endsWith(last10) || cleanDisplay.endsWith(cClean);
      });
    }

    // Check 2: Match against facebook_page_id if configured with phone_number_id or WABA ID
    if (!company && metaPhoneId) {
      company = await Company.findOne({
        where: { facebook_page_id: String(metaPhoneId).trim(), status: 'active' }
      });
    }
    if (!company && wabaId) {
      company = await Company.findOne({
        where: { facebook_page_id: String(wabaId).trim(), status: 'active' }
      });
    }

    // Fallback: If only 1 active company exists in CRM
    if (!company && activeCompanies.length === 1) {
      company = activeCompanies[0];
    }

    if (company && company.status === 'active') {
      console.log(`[WhatsApp Webhook] Matched to Company ID: ${company.id} (${company.company_name})`);
      return { company };
    } else {
      console.warn(`[WhatsApp Webhook] No matching company found for receiving phone "${cleanDisplay}". Available company phones:`, 
        activeCompanies.map(c => ({ id: c.id, name: c.company_name, phone: c.phone }))
      );
    }
  }

  // 5. Ultimate Fallback: If only 1 active company exists in CRM, assign to it automatically
  const activeCompaniesFallback = await Company.findAll({ where: { status: 'active' } });
  if (activeCompaniesFallback.length === 1) {
    console.log(`[WhatsApp Webhook] Fallback: Assigned to sole active company ID: ${activeCompaniesFallback[0].id}`);
    return { company: activeCompaniesFallback[0] };
  }

  return { 
    error: 'Authentication failed. Please provide a valid company API key in ?apiKey=..., Bearer header, or payload.',
    status: 401 
  };
}

/**
 * Flexible payload parser (JSON, FormData, URL-encoded)
 */
async function parseIncomingPayload(request) {
  const contentType = request.headers.get('content-type') || '';
  let data = {};

  try {
    if (contentType.includes('application/json')) {
      data = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      try {
        const formData = await request.formData();
        for (const [k, v] of formData.entries()) {
          data[k] = v;
        }
      } catch {
        const raw = await request.text();
        const p = new URLSearchParams(raw);
        for (const [k, v] of p.entries()) {
          data[k] = v;
        }
      }
    } else {
      const raw = await request.text();
      if (raw && raw.trim().startsWith('{')) {
        data = JSON.parse(raw);
      } else if (raw && raw.includes('=')) {
        const p = new URLSearchParams(raw);
        for (const [k, v] of p.entries()) {
          data[k] = v;
        }
      }
    }
  } catch (err) {
    console.warn('[WhatsApp Ingestion] Payload parse error:', err.message);
  }

  // Merge search params
  const { searchParams } = new URL(request.url);
  for (const [k, v] of searchParams.entries()) {
    if (!data[k]) data[k] = v;
  }

  return data;
}

/**
 * Clean and normalize phone number
 */
function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  return String(rawPhone).replace(/[^\d+]/g, '').trim();
}

/**
 * GET Handler:
 * 1. Meta Cloud API Webhook Verification handshake (hub.mode, hub.verify_token, hub.challenge)
 * 2. API Key verification / endpoint health check
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const corsHeaders = getCorsHeaders();

  // 1. Meta Webhook Verification
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && challenge) {
    // If token provided, match against company api_key or accept challenge
    return new NextResponse(challenge, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    });
  }

  // 2. Health check / status check with apiKey
  const { company, error, status } = await authenticateRequest(request, {});
  if (error) {
    return NextResponse.json({ error }, { status: status || 401, headers: corsHeaders });
  }

  return NextResponse.json({
    success: true,
    message: 'WhatsApp integration endpoint active and ready.',
    company: {
      id: company.id,
      name: company.company_name,
    },
    instructions: 'Send POST requests with name, phone, message, and page_url to ingest WhatsApp website leads.'
  }, { headers: corsHeaders });
}

/**
 * POST Handler:
 * Ingests WhatsApp lead from website widget or Meta Cloud API webhook
 */
export async function POST(request) {
  const corsHeaders = getCorsHeaders();

  try {
    const payload = await parseIncomingPayload(request);
    const { company, error, status } = await authenticateRequest(request, payload);

    if (error) {
      return NextResponse.json({ error }, { status: status || 401, headers: corsHeaders });
    }

    // Check if this is a Meta Cloud API webhook payload
    const metaChange = payload.entry?.[0]?.changes?.[0]?.value;
    const isMetaWebhook = Boolean(metaChange && (metaChange.messages || metaChange.contacts));

    let rawName = '';
    let rawPhone = '';
    let rawEmail = '';
    let rawMessage = '';
    let pageUrl = '';
    let pageTitle = '';
    let leadSource = 'WhatsApp';
    let campaignName = '';
    let adId = '';
    let adHeadline = '';
    let adBody = '';
    let adSourceUrl = '';
    let adMediaType = '';
    let utmSource = '';
    let utmMedium = '';
    let utmCampaign = '';

    if (isMetaWebhook) {
      // ─────────────────────────────────────────────
      // Meta Cloud API Webhook Format (Direct CTWA / Boosted Post)
      // ─────────────────────────────────────────────
      const contact = metaChange.contacts?.[0];
      const message = metaChange.messages?.[0];

      if (!message && !contact) {
        // Status update ping (read receipts, delivery), return 200 OK
        return NextResponse.json({ status: 'ignored_status_ping' }, { headers: corsHeaders });
      }

      rawName = contact?.profile?.name || 'WhatsApp Contact';
      rawPhone = contact?.wa_id || message?.from || '';
      rawMessage = message?.text?.body || (message?.type ? `[Sent ${message.type}]` : 'WhatsApp message received');
      leadSource = 'WhatsApp (Cloud API)';

      // Extract Meta Click-to-WhatsApp (CTWA) / Boosted Post Referral details
      const referral = message?.referral || metaChange.referral;
      if (referral) {
        leadSource = referral.source_type === 'ad' ? 'Meta Click-to-WhatsApp Ad' : 'Meta Boosted Post (WhatsApp)';
        adId = referral.source_id || '';
        adHeadline = referral.headline || '';
        adBody = referral.body || '';
        adSourceUrl = referral.source_url || '';
        adMediaType = referral.media_type || '';
        campaignName = adHeadline || (adId ? `Ad #${adId}` : 'Boosted Post');
      }
    } else {
      // ─────────────────────────────────────────────
      // Website Widget / Direct API / Third-Party Webhook Format
      // ─────────────────────────────────────────────
      rawName = (
        payload.name ||
        payload.fullName ||
        payload.full_name ||
        payload.first_name ||
        payload.customer_name ||
        payload.client_name ||
        payload.sender_name ||
        payload.senderName ||
        payload.contact_name ||
        payload.contactName ||
        ''
      ).trim();

      rawPhone = (
        payload.phone ||
        payload.mobile ||
        payload.whatsapp ||
        payload.whatsapp_number ||
        payload.contact ||
        payload.phone_number ||
        payload.wa_id ||
        payload.waId ||
        payload.sender ||
        ''
      ).toString().trim();

      rawEmail = (payload.email || payload.email_address || '').trim();
      rawMessage = (
        payload.message || 
        payload.enquiry || 
        payload.requirement || 
        payload.comment || 
        payload.text ||
        ''
      ).trim();

      pageUrl = (payload.page_url || payload.pageUrl || payload.url || '').trim();
      pageTitle = (payload.page_title || payload.pageTitle || '').trim();
      
      // Campaign & Ad metadata from payload (e.g. WATI, Interakt, AiSensy, Zapier, Make)
      campaignName = payload.campaign || payload.campaign_name || payload.campaignName || '';
      adId = payload.ad_id || payload.adId || payload.ad_number || '';
      adHeadline = payload.ad_headline || payload.headline || payload.ad_name || '';
      utmSource = payload.utm_source || payload.source_name || '';
      utmMedium = payload.utm_medium || '';
      utmCampaign = payload.utm_campaign || '';

      // Extract WATI / BSP referral object if lead originated from Facebook/Instagram ad
      const referral = payload.referral || (payload.message && payload.message.referral);
      if (referral) {
        if (!campaignName) campaignName = referral.headline || referral.source_id || 'Meta Boosted Post';
        if (!adId) adId = referral.source_id || '';
        if (!adHeadline) adHeadline = referral.headline || '';
        if (!adBody) adBody = referral.body || '';
        if (!adSourceUrl) adSourceUrl = referral.source_url || '';
        leadSource = referral.source_type === 'ad' ? 'Meta Click-to-WhatsApp Ad (WATI)' : 'WhatsApp (WATI)';
      }

      // Extract UTM parameters if visitor clicked from Boosted Post link to landing page
      if (pageUrl) {
        try {
          const parsedUrl = new URL(pageUrl, 'https://example.com');
          if (!utmSource) utmSource = parsedUrl.searchParams.get('utm_source') || '';
          if (!utmMedium) utmMedium = parsedUrl.searchParams.get('utm_medium') || '';
          if (!utmCampaign) utmCampaign = parsedUrl.searchParams.get('utm_campaign') || '';
          if (!campaignName && utmCampaign) campaignName = utmCampaign;
          if (!adId) adId = parsedUrl.searchParams.get('ad_id') || parsedUrl.searchParams.get('fbclid') || '';
        } catch (e) {
          // ignore invalid url
        }
      }

      if (payload.source) {
        leadSource = payload.source;
      } else if (utmSource && (utmSource.toLowerCase().includes('facebook') || utmSource.toLowerCase().includes('instagram') || utmSource.toLowerCase().includes('meta'))) {
        leadSource = campaignName ? `WhatsApp (Meta: ${campaignName})` : 'WhatsApp (Meta Campaign)';
      } else if (campaignName) {
        leadSource = `WhatsApp (${campaignName})`;
      }
    }

    const cleanPhone = normalizePhone(rawPhone);

    if (!cleanPhone && !rawEmail) {
      return NextResponse.json({
        error: 'A valid WhatsApp phone number or email is required.'
      }, { status: 400, headers: corsHeaders });
    }

    // Name splitting
    let firstName = 'WhatsApp';
    let lastName = 'Visitor';

    if (rawName) {
      const parts = rawName.split(/\s+/).filter(Boolean);
      firstName = parts[0] || 'WhatsApp';
      lastName = parts.slice(1).join(' ') || '';
    }

    // ─────────────────────────────────────────────
    // De-duplication check: Check if lead exists for this company
    // ─────────────────────────────────────────────
    let existingLead = null;
    if (cleanPhone) {
      existingLead = await Lead.findOne({
        where: {
          company_id: company.id,
          phone: cleanPhone
        },
        order: [['created_at', 'DESC']]
      });
    }

    if (!existingLead && rawEmail) {
      existingLead = await Lead.findOne({
        where: {
          company_id: company.id,
          email: rawEmail
        },
        order: [['created_at', 'DESC']]
      });
    }

    // Format rich enquiry details
    const timestampStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: true });
    const detailLines = [];
    detailLines.push(`Lead Source: ${leadSource}`);
    detailLines.push(`Captured At: ${timestampStr}`);
    if (campaignName) detailLines.push(`Campaign / Post: ${campaignName}`);
    if (adHeadline) detailLines.push(`Ad Headline: ${adHeadline}`);
    if (adId) detailLines.push(`Ad / Post ID: ${adId}`);
    if (adBody) detailLines.push(`Ad Description: ${adBody}`);
    if (adSourceUrl) detailLines.push(`Ad Post URL: ${adSourceUrl}`);
    if (utmSource) detailLines.push(`UTM Source: ${utmSource}`);
    if (utmMedium) detailLines.push(`UTM Medium: ${utmMedium}`);
    if (pageUrl) detailLines.push(`Landing Page URL: ${pageUrl}`);
    if (pageTitle) detailLines.push(`Page Title: ${pageTitle}`);
    if (rawMessage) detailLines.push(`Customer Message:\n"${rawMessage}"`);

    const fullMessage = detailLines.join('\n');

    // Build smart subject
    let leadSubject = `WhatsApp Inquiry: ${rawName || cleanPhone}`;
    if (adHeadline) {
      leadSubject = `WhatsApp Ad: ${adHeadline} (${rawName || cleanPhone})`;
    } else if (campaignName) {
      leadSubject = `WhatsApp [${campaignName}]: ${rawName || cleanPhone}`;
    }

    let leadRecord;
    let isExisting = false;

    if (existingLead) {
      // ─────────────────────────────────────────────
      // Existing Lead: Log activity & update message
      // ─────────────────────────────────────────────
      leadRecord = existingLead;
      isExisting = true;

      await LeadActivity.create({
        lead_id: existingLead.id,
        user_id: null,
        action: 'WhatsApp Inquiry',
        description: `Customer re-contacted via WhatsApp.${campaignName ? ` Campaign: "${campaignName}".` : ''}${adHeadline ? ` Ad: "${adHeadline}".` : ''}${pageUrl ? ` Page: ${pageUrl}.` : ''}${rawMessage ? ` Message: "${rawMessage}".` : ''}`
      });

      // Update lead message to reflect latest inquiry, reset status to New, and bump created_at so it appears at the top of the Leads list
      await existingLead.update({
        message: `${existingLead.message ? existingLead.message + '\n\n---\n\n' : ''}${fullMessage}`,
        status: 'New',
        created_at: new Date()
      });
    } else {
      // ─────────────────────────────────────────────
      // New Lead: Insert into database
      // ─────────────────────────────────────────────
      leadRecord = await Lead.create({
        company_id: company.id,
        first_name: firstName,
        last_name: lastName || null,
        email: rawEmail || null,
        phone: cleanPhone,
        subject: leadSubject,
        message: fullMessage,
        source: leadSource,
        status: 'New',
        priority: 'High',
        lead_score: 75
      });

      // Lead activity
      await LeadActivity.create({
        lead_id: leadRecord.id,
        user_id: null,
        action: 'Lead Created',
        description: `Lead automatically captured via WhatsApp${campaignName ? ` from Campaign "${campaignName}"` : ''}${adHeadline ? ` (Ad: "${adHeadline}")` : ''}${pageUrl ? ` from ${pageUrl}` : ''}.`
      });
    }

    // ─────────────────────────────────────────────
    // Real-Time Notifications
    // ─────────────────────────────────────────────
    const users = await User.findAll({
      where: {
        company_id: company.id,
        status: 'active'
      }
    });

    const notifTitle = isExisting 
      ? `WhatsApp Re-Inquiry: ${rawName || cleanPhone}`
      : `🔥 New WhatsApp Lead: ${rawName || cleanPhone}${campaignName ? ` [${campaignName}]` : ''}`;
    const notifBody = `${cleanPhone} | ${campaignName ? `Campaign: ${campaignName} | ` : ''}${rawMessage ? `"${rawMessage.substring(0, 50)}..."` : 'WhatsApp Inquiry'}`;

    // 1. In-App Notifications
    const notifPromises = users.map(u =>
      Notification.create({
        company_id: company.id,
        user_id: u.id,
        lead_id: leadRecord.id,
        title: notifTitle,
        message: notifBody,
        type: 'New Lead',
        is_read: false
      }).catch(err => console.error('[WhatsApp Ingestion] Notif create error:', err.message))
    );
    await Promise.all(notifPromises);

    // 2. Real-time WebSocket emission
    emitToCompany(company.id, 'notification', {
      id: Date.now(),
      title: notifTitle,
      message: notifBody,
      type: 'New Lead',
      leadId: leadRecord.id,
      lead: {
        id: leadRecord.id,
        first_name: leadRecord.first_name,
        last_name: leadRecord.last_name,
        phone: leadRecord.phone,
        email: leadRecord.email,
        source: leadRecord.source,
        status: leadRecord.status,
        priority: leadRecord.priority,
        created_at: leadRecord.created_at
      },
      createdAt: new Date()
    });

    // Also emit lead:created event for instant UI list updates
    emitToCompany(company.id, 'lead:created', {
      lead: leadRecord
    });

    // 3. FCM Push Notifications to Mobile
    try {
      const { sendPushNotification } = require('@/lib/fcm');
      const fcmTokens = users.reduce((acc, u) => {
        if (u.fcm_tokens && Array.isArray(u.fcm_tokens)) {
          acc.push(...u.fcm_tokens);
        }
        return acc;
      }, []);

      if (fcmTokens.length > 0) {
        sendPushNotification(fcmTokens, notifTitle, notifBody, {
          type: 'New Lead',
          leadId: String(leadRecord.id),
          source: 'WhatsApp'
        }).catch(err => console.error('[WhatsApp FCM] Push error:', err));
      }
    } catch (fcmErr) {
      console.error('[WhatsApp FCM] FCM setup error:', fcmErr);
    }

    // 4. Email notifications to company admins
    try {
      const admins = users.filter(u => u.role === 'company_admin');
      for (const admin of admins) {
        if (admin.email) {
          sendEmail({
            to: admin.email,
            subject: notifTitle,
            text: `Hello ${admin.name},\n\nYou have received a new WhatsApp lead!\n\nName: ${rawName || 'Not provided'}\nPhone: ${cleanPhone}\nEmail: ${rawEmail || 'N/A'}\nCampaign: ${campaignName || 'N/A'}\nAd Headline: ${adHeadline || 'N/A'}\nMessage: ${rawMessage || 'N/A'}\nSource Page: ${pageUrl || 'N/A'}\n\nView details in your CRM dashboard.`
          }).catch(err => console.error('[WhatsApp Email] Send error:', err.message));
        }
      }
    } catch (emailErr) {
      console.error('[WhatsApp Email] Email dispatch error:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: isExisting ? 'Existing lead updated with new inquiry' : 'Lead created successfully',
      isExisting,
      lead: {
        id: leadRecord.id,
        name: `${leadRecord.first_name} ${leadRecord.last_name || ''}`.trim(),
        phone: leadRecord.phone,
        source: leadRecord.source
      }
    }, {
      status: isExisting ? 200 : 201,
      headers: corsHeaders
    });

  } catch (err) {
    console.error('[WhatsApp Ingestion Error]:', err);
    return NextResponse.json({
      error: 'Internal server error processing WhatsApp lead.',
      details: err.message
    }, { status: 500, headers: corsHeaders });
  }
}

