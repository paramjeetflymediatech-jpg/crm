import { 
  getMessaging, 
  getToken, 
  onTokenRefresh, 
  onMessage, 
  onNotificationOpenedApp, 
  getInitialNotification, 
  requestPermission, 
  AuthorizationStatus 
} from '@react-native-firebase/messaging';
import { getApps } from '@react-native-firebase/app';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { mobileApiFetch } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

function isFirebaseAvailable(): boolean {
  try {
    return getApps().length > 0;
  } catch {
    return false;
  }
}

function getSafeMessaging() {
  try {
    if (!isFirebaseAvailable()) return null;
    return getMessaging();
  } catch (err) {
    console.warn('[PushNotification] getMessaging() failed:', err);
    return null;
  }
}

async function requestUserPermission(): Promise<boolean> {
  try {
    if (!isFirebaseAvailable()) {
      return false;
    }

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }
    }

    const msg = getSafeMessaging();
    if (!msg) return false;

    const authStatus = await requestPermission(msg);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    return enabled;
  } catch (err) {
    console.warn('[PushNotification] requestUserPermission error:', err);
    return false;
  }
}

export async function registerDeviceToken() {
  try {
    if (!isFirebaseAvailable()) {
      console.log('[PushNotification] Firebase is not initialized. Skipping device token registration.');
      return;
    }
    const hasPermission = await requestUserPermission();
    if (!hasPermission) {
      console.log('[PushNotification] User denied notification permissions.');
      return;
    }

    const msg = getSafeMessaging();
    if (!msg) return;

    const token = await getToken(msg);
    if (!token) return;
    console.log('[PushNotification] FCM Device Token retrieved:', token);

    // Save token locally in AsyncStorage to compare or delete on logout
    await AsyncStorage.setItem('fcm_token', token);

    const response = await mobileApiFetch('/api/device-token', {
      method: 'POST',
      bodyData: { token }
    });

    if (response.ok) {
      console.log('[PushNotification] Token successfully registered on the server.');
    } else {
      console.warn('[PushNotification] Failed to register token on server:', response.status);
    }
  } catch (error) {
    console.warn('[PushNotification] registerDeviceToken error:', error);
  }
}

export async function unregisterDeviceToken() {
  try {
    if (!isFirebaseAvailable()) {
      return;
    }
    const token = await AsyncStorage.getItem('fcm_token');
    if (!token) return;

    const response = await mobileApiFetch('/api/device-token', {
      method: 'DELETE',
      bodyData: { token }
    });

    if (response.ok) {
      console.log('[PushNotification] Token unregistered from server successfully.');
      await AsyncStorage.removeItem('fcm_token');
    } else {
      console.warn('[PushNotification] Failed to unregister token on server:', response.status);
    }
  } catch (error) {
    console.warn('[PushNotification] unregisterDeviceToken error:', error);
  }
}

// Callback for when a notification is pressed (opens app or foreground tap)
let onNotificationPressedCallback: (() => void) | null = null;
let hasPendingNotificationClick = false;

export function setOnNotificationPressed(callback: () => void) {
  onNotificationPressedCallback = callback;
  if (hasPendingNotificationClick) {
    console.log('[PushNotification] Executing pending notification press callback.');
    hasPendingNotificationClick = false;
    try {
      callback();
    } catch (e) {
      console.warn('[PushNotification] onNotificationPressedCallback error:', e);
    }
  }
}

export function initPushNotifications() {
  try {
    if (!isFirebaseAvailable()) {
      console.log('[PushNotification] Firebase is not initialized. Skipping push notification listeners.');
      return () => {};
    }

    const msg = getSafeMessaging();
    if (!msg) {
      return () => {};
    }

    let unsubscribeTokenRefresh: (() => void) | null = null;
    let unsubscribeForeground: (() => void) | null = null;
    let unsubscribeNotificationOpened: (() => void) | null = null;
    let unsubscribeNotifeeForeground: (() => void) | null = null;

    // 1. Listen for token refresh
    try {
      unsubscribeTokenRefresh = onTokenRefresh(msg, async (token) => {
        try {
          console.log('[PushNotification] FCM Token refreshed:', token);
          await AsyncStorage.setItem('fcm_token', token);
          await mobileApiFetch('/api/device-token', {
            method: 'POST',
            bodyData: { token }
          });
        } catch (e) {
          console.warn('[PushNotification] onTokenRefresh sync error:', e);
        }
      });
    } catch (e) {
      console.warn('[PushNotification] onTokenRefresh registration failed:', e);
    }

    // 2. Foreground messages
    try {
      unsubscribeForeground = onMessage(msg, async (remoteMessage) => {
        console.log('[PushNotification] Foreground message received:', remoteMessage);
        const { notification } = remoteMessage;
        if (notification) {
          try {
            // Create the channel (required for Android)
            const channelId = await notifee.createChannel({
              id: 'default',
              name: 'Default Channel',
              importance: AndroidImportance.HIGH,
              sound: 'default',
            });

            // Display the system banner (plays default notification sound)
            await notifee.displayNotification({
              title: notification.title || 'Notification',
              body: notification.body || '',
              android: {
                channelId,
                importance: AndroidImportance.HIGH,
                pressAction: {
                  id: 'default',
                  launchActivity: 'default',
                },
              },
            });
          } catch (err) {
            console.error('[PushNotification] Notifee display notification failed:', err);
            Alert.alert(notification.title || 'Notification', notification.body || '');
          }
        }
      });
    } catch (e) {
      console.warn('[PushNotification] onMessage registration failed:', e);
    }

    // 3. Notification opened app from background state
    try {
      unsubscribeNotificationOpened = onNotificationOpenedApp(msg, (remoteMessage) => {
        console.log('[PushNotification] Notification caused app to open from background:', remoteMessage);
        if (onNotificationPressedCallback) {
          try {
            onNotificationPressedCallback();
          } catch (e) {
            console.warn('[PushNotification] onNotificationPressedCallback error:', e);
          }
        } else {
          hasPendingNotificationClick = true;
        }
      });
    } catch (e) {
      console.warn('[PushNotification] onNotificationOpenedApp registration failed:', e);
    }

    // 4. Notification opened app from quit state
    try {
      getInitialNotification(msg)
        .then((remoteMessage) => {
          if (remoteMessage) {
            console.log('[PushNotification] Notification caused app to open from quit state:', remoteMessage);
            if (onNotificationPressedCallback) {
              try {
                onNotificationPressedCallback();
              } catch (e) {
                console.warn('[PushNotification] onNotificationPressedCallback error:', e);
              }
            } else {
              hasPendingNotificationClick = true;
            }
          }
        })
        .catch((err) => {
          console.warn('[PushNotification] getInitialNotification error:', err);
        });
    } catch (e) {
      console.warn('[PushNotification] getInitialNotification call failed:', e);
    }

    // 5. Notifee Foreground Event Listener
    try {
      unsubscribeNotifeeForeground = notifee.onForegroundEvent(({ type, detail }) => {
        if (type === EventType.PRESS) {
          console.log('[PushNotification] User pressed foreground notification:', detail.notification);
          if (onNotificationPressedCallback) {
            try {
              onNotificationPressedCallback();
            } catch (e) {
              console.warn('[PushNotification] onNotificationPressedCallback error:', e);
            }
          } else {
            hasPendingNotificationClick = true;
          }
        }
      });
    } catch (e) {
      console.warn('[PushNotification] notifee.onForegroundEvent failed:', e);
    }

    return () => {
      try {
        if (typeof unsubscribeTokenRefresh === 'function') unsubscribeTokenRefresh();
        if (typeof unsubscribeForeground === 'function') unsubscribeForeground();
        if (typeof unsubscribeNotificationOpened === 'function') unsubscribeNotificationOpened();
        if (typeof unsubscribeNotifeeForeground === 'function') unsubscribeNotifeeForeground();
      } catch (e) {
        console.warn('[PushNotification] unsubscribe cleanup error:', e);
      }
    };
  } catch (outerErr) {
    console.warn('[PushNotification] initPushNotifications outer exception:', outerErr);
    return () => {};
  }
}
