const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

let messaging = null;

try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    let serviceAccount;
    if (serviceAccountJson.trim().startsWith('{')) {
      serviceAccount = JSON.parse(serviceAccountJson);
    } else {
      // It's a file path
      const fs = require('fs');
      const path = require('path');
      const resolvedPath = path.resolve(process.cwd(), serviceAccountJson);
      if (fs.existsSync(resolvedPath)) {
        serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      } else {
        console.warn(`[FCM] Service account file not found at ${resolvedPath}`);
      }
    }

    if (serviceAccount) {
      const app = initializeApp({
        credential: cert(serviceAccount)
      });
      messaging = getMessaging(app);
      console.log('[FCM] Firebase Admin SDK initialized successfully.');
    }
  } else {
    console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. Push notifications will be disabled.');
  }
} catch (error) {
  console.error('[FCM] Error initializing Firebase Admin SDK:', error.message);
}

/**
 * Sends a push notification to one or more FCM tokens
 * @param {string|string[]} tokens - Device token(s) to send to
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} [data] - Optional metadata payload
 */
async function sendPushNotification(tokens, title, body, data = {}) {
  if (!messaging) {
    console.warn('[FCM] Cannot send push notification: FCM is not initialized.');
    return { success: false, error: 'FCM not initialized' };
  }

  // Ensure tokens is an array and filter out empty values
  const tokenList = (Array.isArray(tokens) ? tokens : [tokens]).filter(t => typeof t === 'string' && t.trim() !== '');

  if (tokenList.length === 0) {
    return { success: true, sentCount: 0 };
  }

  try {
    // If it's a single token, send directly using send()
    if (tokenList.length === 1) {
      const response = await messaging.send({
        token: tokenList[0],
        notification: { title, body },
        data: data ? Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ) : {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high',
            channelId: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      });
      return { success: true, response, sentCount: 1 };
    } else {
      // For multiple tokens, send each using sendEachForMulticast
      const message = {
        tokens: tokenList,
        notification: { title, body },
        data: data ? Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ) : {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high',
            channelId: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await messaging.sendEachForMulticast(message);
      
      // Log failures for cleanup (e.g. invalid tokens)
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (errorCode === 'messaging/invalid-registration-token' || errorCode === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokenList[idx]);
          }
          console.error(`[FCM] Error sending to token ${tokenList[idx]}:`, resp.error?.message);
        }
      });

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
        sentCount: tokenList.length
      };
    }
  } catch (error) {
    console.error('[FCM] Send push notification failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification
};
