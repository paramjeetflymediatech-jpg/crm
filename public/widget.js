/**
 * Fly Media CRM - Smart WhatsApp Website Lead Widget
 * 
 * Embeddable script for client websites that captures visitor Name & Phone
 * into the CRM as a lead before launching a WhatsApp conversation.
 * 
 * Usage:
 * <script 
 *   src="https://demo.socialflymediatech.com/widget.js" 
 *   data-company-key="YOUR_COMPANY_API_KEY" 
 *   data-whatsapp-number="919876543210"
 *   data-brand-name="Your Company Name"
 *   defer>
 * </script>
 */

(function () {
  'use strict';

  // Prevent duplicate execution
  if (window.__FLYMEDIA_WA_WIDGET_LOADED__) return;
  window.__FLYMEDIA_WA_WIDGET_LOADED__ = true;

  // 1. Locate current script element and read config
  const scriptTag = document.currentScript || (function () {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('widget.js') !== -1) {
        return scripts[i];
      }
    }
    return scripts[scripts.length - 1];
  })();

  // Determine CRM backend URL from script source origin
  let defaultCrmUrl = 'https://demo.socialflymediatech.com';
  try {
    if (scriptTag && scriptTag.src) {
      const urlObj = new URL(scriptTag.src);
      defaultCrmUrl = urlObj.origin;
    }
  } catch (e) {
    // Fallback default
  }

  const globalConfig = window.FlyMediaWhatsAppWidgetConfig || {};

  const config = {
    crmUrl: scriptTag?.getAttribute('data-crm-url') || globalConfig.crmUrl || defaultCrmUrl,
    companyKey: scriptTag?.getAttribute('data-company-key') || globalConfig.companyKey || '',
    whatsappNumber: (scriptTag?.getAttribute('data-whatsapp-number') || globalConfig.whatsappNumber || '').replace(/[^\d]/g, ''),
    brandName: scriptTag?.getAttribute('data-brand-name') || globalConfig.brandName || 'Customer Support',
    brandLogo: scriptTag?.getAttribute('data-brand-logo') || globalConfig.brandLogo || '',
    welcomeMessage: scriptTag?.getAttribute('data-welcome-message') || globalConfig.welcomeMessage || 'Hi there! 👋 How can we help you today? Enter your details to start chatting on WhatsApp.',
    prefillMessage: scriptTag?.getAttribute('data-prefill-text') || globalConfig.prefillText || 'Hi, I visited your website and would like to know more about your services.',
    buttonColor: scriptTag?.getAttribute('data-button-color') || globalConfig.buttonColor || '#25D366',
    position: (scriptTag?.getAttribute('data-position') || globalConfig.position || 'bottom-right').toLowerCase(),
    ctaText: scriptTag?.getAttribute('data-cta-text') || globalConfig.ctaText || 'Chat on WhatsApp',
  };

  if (!config.companyKey) {
    console.warn('[FlyMedia CRM Widget] Warning: Missing "data-company-key" attribute on script tag.');
  }

  // 2. Inject Styles
  const styleEl = document.createElement('style');
  styleEl.id = 'flymedia-wa-widget-styles';
  styleEl.textContent = `
    .fm-wa-container {
      position: fixed;
      ${config.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
      bottom: 20px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-sizing: border-box;
    }
    .fm-wa-container * {
      box-sizing: border-box;
    }
    /* Floating Trigger Button */
    .fm-wa-trigger {
      display: flex;
      align-items: center;
      gap: 10px;
      background-color: ${config.buttonColor};
      color: #ffffff;
      border: none;
      border-radius: 50px;
      padding: 12px 18px 12px 14px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.22);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      outline: none;
      user-select: none;
    }
    .fm-wa-trigger:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
    }
    .fm-wa-trigger:active {
      transform: scale(0.97);
    }
    .fm-wa-trigger-icon {
      width: 24px;
      height: 24px;
      fill: #ffffff;
      flex-shrink: 0;
    }
    .fm-wa-pulse {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50px;
      background-color: ${config.buttonColor};
      opacity: 0.4;
      animation: fm-wa-pulsing 2s infinite;
      z-index: -1;
      pointer-events: none;
    }
    @keyframes fm-wa-pulsing {
      0% { transform: scale(1); opacity: 0.4; }
      50% { transform: scale(1.15); opacity: 0; }
      100% { transform: scale(1); opacity: 0; }
    }
    /* Chat Popup Card */
    .fm-wa-card {
      position: absolute;
      ${config.position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
      bottom: 70px;
      width: 340px;
      max-width: calc(100vw - 40px);
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      display: none;
      flex-direction: column;
      transform-origin: ${config.position === 'bottom-left' ? 'bottom left' : 'bottom right'};
      animation: fm-wa-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .fm-wa-card.fm-wa-open {
      display: flex;
    }
    @keyframes fm-wa-slide-in {
      from { opacity: 0; transform: scale(0.9) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    /* Header */
    .fm-wa-header {
      background: linear-gradient(135deg, #075E54 0%, #128C7E 100%);
      color: #ffffff;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .fm-wa-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .fm-wa-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .fm-wa-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .fm-wa-title {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.2;
    }
    .fm-wa-status {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.85);
      margin-top: 3px;
    }
    .fm-wa-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: #25D366;
    }
    .fm-wa-close-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.8);
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.15s;
    }
    .fm-wa-close-btn:hover {
      color: #ffffff;
    }
    /* Body & Messages */
    .fm-wa-body {
      background-color: #EFEAE2;
      background-image: radial-gradient(#d4cdbe 1px, transparent 1px);
      background-size: 16px 16px;
      padding: 14px;
      max-height: 420px;
      overflow-y: auto;
    }
    .fm-wa-message-bubble {
      background: #ffffff;
      border-radius: 8px 8px 8px 0;
      padding: 10px 12px;
      font-size: 13px;
      line-height: 1.45;
      color: #111827;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      margin-bottom: 12px;
      position: relative;
    }
    .fm-wa-message-bubble::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: -6px;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 0 6px 8px 0;
      border-color: transparent #ffffff transparent transparent;
    }
    /* Form */
    .fm-wa-form {
      background: #ffffff;
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .fm-wa-input-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .fm-wa-label {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .fm-wa-input {
      width: 100%;
      padding: 9px 11px;
      font-size: 13px;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      outline: none;
      color: #0F172A;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .fm-wa-input:focus {
      border-color: #25D366;
      box-shadow: 0 0 0 2px rgba(37, 211, 102, 0.2);
    }
    .fm-wa-textarea {
      resize: none;
      height: 60px;
    }
    .fm-wa-submit-btn {
      background-color: #25D366;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 11px 16px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 2px 6px rgba(37, 211, 102, 0.35);
      transition: background-color 0.2s, transform 0.1s;
    }
    .fm-wa-submit-btn:hover {
      background-color: #20BA56;
    }
    .fm-wa-submit-btn:disabled {
      background-color: #94A3B8;
      cursor: not-allowed;
      box-shadow: none;
    }
    .fm-wa-privacy-note {
      font-size: 10px;
      color: #94A3B8;
      text-align: center;
      margin-top: 2px;
    }
  `;
  document.head.appendChild(styleEl);

  // 3. WhatsApp SVG Icon
  const whatsappSvg = `
    <svg class="fm-wa-trigger-icon" viewBox="0 0 24 24">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.67C9.33 7.67 9.01 7.74 8.74 8.04C8.47 8.33 7.72 9.03 7.72 10.47C7.72 11.91 8.77 13.3 8.91 13.5C9.06 13.69 11.1 16.84 14.21 18.18C14.95 18.5 15.53 18.69 15.98 18.84C16.72 19.07 17.39 19.04 17.92 18.96C18.52 18.87 19.74 18.22 20 17.5C20.25 16.77 20.25 16.14 20.18 16.03C20.1 15.91 19.91 15.84 19.62 15.7C19.34 15.56 17.96 14.88 17.7 14.79C17.45 14.7 17.26 14.65 17.07 14.94C16.88 15.24 16.33 15.91 16.17 16.11C16 16.3 15.84 16.32 15.56 16.18C15.28 16.04 14.37 15.74 13.3 14.79C12.47 14.05 11.91 13.14 11.75 12.86C11.59 12.58 11.73 12.42 11.87 12.28C12 12.15 12.16 11.94 12.3 11.77C12.44 11.6 12.49 11.48 12.58 11.29C12.67 11.1 12.62 10.93 12.55 10.8C12.48 10.66 11.93 9.3 11.7 8.74C11.47 8.19 11.24 8.27 11.07 8.26C10.91 8.25 10.72 8.25 10.53 8.25C10.34 8.25 10.04 8.32 9.79 8.59C9.53 8.86 8.84 9.51 8.84 10.83"/>
    </svg>
  `;

  // 4. Retrieve saved user details from localStorage
  let savedUser = { name: '', phone: '' };
  try {
    const raw = localStorage.getItem('flymedia_wa_visitor');
    if (raw) savedUser = JSON.parse(raw);
  } catch (e) {}

  // 5. Construct DOM elements
  const container = document.createElement('div');
  container.className = 'fm-wa-container';

  container.innerHTML = `
    <!-- Card Modal -->
    <div class="fm-wa-card" id="fm-wa-card">
      <div class="fm-wa-header">
        <div class="fm-wa-header-info">
          <div class="fm-wa-avatar">
            ${config.brandLogo 
              ? `<img src="${config.brandLogo}" alt="Logo" />` 
              : whatsappSvg}
          </div>
          <div>
            <div class="fm-wa-title">${config.brandName}</div>
            <div class="fm-wa-status">
              <span class="fm-wa-status-dot"></span>
              <span>Online • Typically replies instantly</span>
            </div>
          </div>
        </div>
        <button type="button" class="fm-wa-close-btn" id="fm-wa-close" aria-label="Close">✕</button>
      </div>

      <div class="fm-wa-body">
        <div class="fm-wa-message-bubble">
          ${config.welcomeMessage}
        </div>

        <form class="fm-wa-form" id="fm-wa-form">
          <div class="fm-wa-input-group">
            <label class="fm-wa-label">Your Name</label>
            <input 
              type="text" 
              class="fm-wa-input" 
              id="fm-wa-name" 
              placeholder="e.g. Rahul Sharma" 
              value="${savedUser.name || ''}" 
              required 
            />
          </div>

          <div class="fm-wa-input-group">
            <label class="fm-wa-label">WhatsApp Number</label>
            <input 
              type="tel" 
              class="fm-wa-input" 
              id="fm-wa-phone" 
              placeholder="e.g. +91 98765 43210" 
              value="${savedUser.phone || ''}" 
              required 
            />
          </div>

          <div class="fm-wa-input-group">
            <label class="fm-wa-label">Message / Requirement (Optional)</label>
            <textarea 
              class="fm-wa-input fm-wa-textarea" 
              id="fm-wa-message" 
              placeholder="How can we help you?"
            ></textarea>
          </div>

          <button type="submit" class="fm-wa-submit-btn" id="fm-wa-submit">
            ${whatsappSvg}
            <span>Start WhatsApp Chat</span>
          </button>

          <div class="fm-wa-privacy-note">
            🔒 Your details are securely transmitted to our verified team.
          </div>
        </form>
      </div>
    </div>

    <!-- Trigger Button -->
    <button type="button" class="fm-wa-trigger" id="fm-wa-trigger" aria-label="WhatsApp Chat">
      <span class="fm-wa-pulse"></span>
      ${whatsappSvg}
      <span>${config.ctaText}</span>
    </button>
  `;

  document.body.appendChild(container);

  // 6. Interactive Event Handlers
  const card = document.getElementById('fm-wa-card');
  const triggerBtn = document.getElementById('fm-wa-trigger');
  const closeBtn = document.getElementById('fm-wa-close');
  const form = document.getElementById('fm-wa-form');
  const nameInput = document.getElementById('fm-wa-name');
  const phoneInput = document.getElementById('fm-wa-phone');
  const messageInput = document.getElementById('fm-wa-message');
  const submitBtn = document.getElementById('fm-wa-submit');

  function openCard() {
    card.classList.add('fm-wa-open');
    if (!nameInput.value) {
      setTimeout(() => nameInput.focus(), 150);
    } else if (!phoneInput.value) {
      setTimeout(() => phoneInput.focus(), 150);
    }
  }

  function closeCard() {
    card.classList.remove('fm-wa-open');
  }

  triggerBtn.addEventListener('click', function () {
    if (card.classList.contains('fm-wa-open')) {
      closeCard();
    } else {
      openCard();
    }
  });

  closeBtn.addEventListener('click', closeCard);

  // Submit Handler
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const customMessage = messageInput.value.trim();

    if (!name || !phone) {
      alert('Please enter your name and WhatsApp phone number.');
      return;
    }

    // Save in localStorage for subsequent visits
    try {
      localStorage.setItem('flymedia_wa_visitor', JSON.stringify({ name, phone }));
    } catch (err) {}

    // Disable button & show spinner state
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Connecting to WhatsApp...</span>`;

    // Target WhatsApp business number
    const targetPhone = config.whatsappNumber;

    // Build the message text for WhatsApp
    let waText = config.prefillMessage;
    if (customMessage) {
      waText = `${waText}\n\nNote: ${customMessage}`;
    }
    waText = `${waText}\n\n(Sent by ${name}, Phone: ${phone})`;

    const encodedText = encodeURIComponent(waText);
    const waUrl = targetPhone 
      ? `https://wa.me/${targetPhone}?text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    // Function to launch WhatsApp redirect
    let hasRedirected = false;
    function redirectToWhatsApp() {
      if (hasRedirected) return;
      hasRedirected = true;
      submitBtn.disabled = false;
      submitBtn.innerHTML = `${whatsappSvg}<span>Start WhatsApp Chat</span>`;
      closeCard();

      // Open WhatsApp in new window/tab
      window.open(waUrl, '_blank');
    }

    // Safety fallback: If network is slow, open WhatsApp in 2.5s anyway
    const fallbackTimer = setTimeout(redirectToWhatsApp, 2500);

    // Extract campaign / UTM parameters from current page URL
    let utmCampaign = '';
    let utmSource = '';
    let utmMedium = '';
    let utmContent = '';
    try {
      const urlParams = new URLSearchParams(window.location.search);
      utmCampaign = urlParams.get('utm_campaign') || '';
      utmSource = urlParams.get('utm_source') || '';
      utmMedium = urlParams.get('utm_medium') || '';
      utmContent = urlParams.get('utm_content') || '';
    } catch (e) {}

    let computedSource = 'WhatsApp';
    if (utmSource && (utmSource.toLowerCase().includes('facebook') || utmSource.toLowerCase().includes('instagram') || utmSource.toLowerCase().includes('meta'))) {
      computedSource = utmCampaign ? `WhatsApp (Meta: ${utmCampaign})` : 'WhatsApp (Meta Boosted Post)';
    } else if (utmCampaign) {
      computedSource = `WhatsApp (${utmCampaign})`;
    }

    // Fire ingestion request to CRM Backend
    const endpoint = `${config.crmUrl}/api/leads/whatsapp?apiKey=${encodeURIComponent(config.companyKey)}`;

    fetch(endpoint, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        apiKey: config.companyKey,
        company_key: config.companyKey,
        name: name,
        phone: phone,
        message: customMessage || config.prefillMessage,
        page_url: window.location.href,
        page_title: document.title,
        source: computedSource,
        campaign: utmCampaign,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_content: utmContent,
        whatsapp_number: targetPhone
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          console.warn('[FlyMedia CRM Widget] Ingestion warning:', data);
        }
      })
      .catch((err) => {
        console.warn('[FlyMedia CRM Widget] Ingestion error:', err.message);
      })
      .finally(() => {
        clearTimeout(fallbackTimer);
        redirectToWhatsApp();
      });
  });

})();

