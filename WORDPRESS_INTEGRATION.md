# WordPress Lead Sync Integration Guide

This guide details how to automatically synchronize submissions from popular WordPress form plugins to the CRM Lead Management REST API.

## Integration Endpoint Details

- **HTTP Method:** `POST`
- **Endpoint URL:** `https://your-crm-domain.com/api/leads/create`
- **Header:** `Authorization: Bearer <YOUR_COMPANY_API_KEY>`
- **Payload Format:** JSON

---

## 1. Contact Form 7 Integration

Add the following code to your WordPress active theme's `functions.php` file:

```php
add_action('wpcf7_mail_sent', 'sync_cf7_lead_to_crm');

function sync_cf7_lead_to_crm($contact_form) {
    // 1. Identify Form ID (Optional: filter which forms should sync)
    $form_id = $contact_form->id();
    
    // 2. Extract Submitted Form Data
    $submission = WPCF7_Submission::get_instance();
    if (!$submission) return;
    
    $data = $submission->get_posted_data();

    // 3. Map Fields
    $payload = [
        'name'    => sanitize_text_field($data['your-name'] ?? ''),
        'email'   => sanitize_email($data['your-email'] ?? ''),
        'phone'   => sanitize_text_field($data['your-phone'] ?? ''),
        'subject' => sanitize_text_field($data['your-subject'] ?? 'Website Inquiry'),
        'message' => sanitize_textarea_field($data['your-message'] ?? ''),
        'source'  => 'Contact Form 7'
    ];

    // 4. Dispatch to CRM
    crm_dispatch_lead_request($payload);
}
```

---

## 2. Elementor Forms Integration

Add this action helper to your active theme's `functions.php` file:

```php
add_action('elementor_pro/forms/new_record', 'sync_elementor_lead_to_crm', 10, 2);

function sync_elementor_lead_to_crm($record, $handler) {
    // 1. Extract Form Fields
    $raw_fields = $record->get('fields');
    $fields = [];
    foreach ($raw_fields as $id => $field) {
        $fields[$id] = $field['value'];
    }

    // 2. Map Fields
    $payload = [
        'name'    => sanitize_text_field($fields['name'] ?? ''),
        'email'   => sanitize_email($fields['email'] ?? ''),
        'phone'   => sanitize_text_field($fields['phone'] ?? ''),
        'subject' => sanitize_text_field($fields['subject'] ?? 'Elementor Form Lead'),
        'message' => sanitize_textarea_field($fields['message'] ?? ''),
        'source'  => 'Elementor Forms'
    ];

    // 3. Dispatch to CRM
    crm_dispatch_lead_request($payload);
}
```

---

## 3. Gravity Forms Integration

Add this hook handler to your theme's `functions.php`:

```php
// Apply to all forms. Replace 'gform_after_submission' with 'gform_after_submission_1' for form ID 1
add_action('gform_after_submission', 'sync_gravity_lead_to_crm', 10, 2);

function sync_gravity_lead_to_crm($entry, $form) {
    // 1. Map Fields (Gravity Forms names fields by field IDs e.g. entry['1.3'])
    // Check your form configuration to adjust mapped numeric field IDs
    $first_name = $entry['1.3'] ?? '';
    $last_name  = $entry['1.6'] ?? '';
    $name       = trim("$first_name $last_name") ?: ($entry['1'] ?? '');

    $payload = [
        'name'    => sanitize_text_field($name),
        'email'   => sanitize_email($entry['2'] ?? ''),
        'phone'   => sanitize_text_field($entry['3'] ?? ''),
        'subject' => sanitize_text_field($entry['4'] ?? 'Gravity Forms Submission'),
        'message' => sanitize_textarea_field($entry['5'] ?? ''),
        'source'  => 'Gravity Forms'
    ];

    // 2. Dispatch to CRM
    crm_dispatch_lead_request($payload);
}
```

---

## 4. WPForms Integration

Add this action to your theme's `functions.php`:

```php
add_action('wpforms_process_complete', 'sync_wpforms_lead_to_crm', 10, 4);

function sync_wpforms_lead_to_crm($fields, $entry, $form_data, $entry_id) {
    // 1. Map fields (WPForms stores field data by numeric array indexes)
    // Adjust indices 0, 1, 2 based on your WPForms settings
    $name    = $fields[0]['value'] ?? '';
    $email   = $fields[1]['value'] ?? '';
    $phone   = $fields[2]['value'] ?? '';
    $message = $fields[3]['value'] ?? '';

    $payload = [
        'name'    => sanitize_text_field($name),
        'email'   => sanitize_email($email),
        'phone'   => sanitize_text_field($phone),
        'subject' => 'WPForms Website Lead',
        'message' => sanitize_textarea_field($message),
        'source'  => 'WPForms'
    ];

    // 2. Dispatch to CRM
    crm_dispatch_lead_request($payload);
}
```

---

## Shared HTTP Request Engine & Retry Queue

Paste this utility helper at the bottom of your WordPress active theme's `functions.php` file. It handles Bearer Authorization, background requests, error logging, and standard retries if the CRM is temporarily down.

```php
/**
 * Sends lead payload to Multi-Tenant CRM with error logging and retries
 */
function crm_dispatch_lead_request($payload, $attempt = 1) {
    // CONFIGURATION - Replace with your actual CRM URL and API Key
    $crm_url = 'https://your-crm-domain.com/api/leads/create';
    $api_key = 'YOUR_COMPANY_API_KEY_HERE'; // Obtained from settings page

    $headers = [
        'Content-Type'  => 'application/json',
        'Authorization' => 'Bearer ' . $api_key
    ];

    $args = [
        'body'        => json_encode($payload),
        'headers'     => $headers,
        'timeout'     => 10, // seconds
        'data-format' => 'body'
    ];

    // Dispatch remote POST request
    $response = wp_remote_post($crm_url, $args);

    if (is_wp_error($response)) {
        $error_message = $response->get_error_message();
        error_log("[CRM Sync Error] Attempt $attempt failed. Detail: $error_message");
        
        // Retry logic: attempt up to 3 times with a 5-minute schedule delay
        if ($attempt < 3) {
            $next_attempt = $attempt + 1;
            wp_schedule_single_event(
                time() + (5 * 60), 
                'crm_retry_sync_event', 
                [$payload, $next_attempt]
            );
        }
        return false;
    }

    $status_code = wp_remote_retrieve_response_code($response);
    
    if ($status_code !== 201 && $status_code !== 200) {
        $response_body = wp_remote_retrieve_body($response);
        error_log("[CRM API Error] Server returned code $status_code. Response: $response_body");
        return false;
    }

    return true;
}

// Register retry event hook
add_action('crm_retry_sync_event', 'crm_dispatch_lead_request', 10, 2);
```
