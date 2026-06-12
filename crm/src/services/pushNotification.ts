import messaging from '@react-native-firebase/messaging';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { mobileApiFetch } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

async function requestUserPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  return enabled;
}

export async function registerDeviceToken() {
  try {
    const hasPermission = await requestUserPermission();
    if (!hasPermission) {
      console.log('[PushNotification] User denied notification permissions.');
      return;
    }

    const token = await messaging().getToken();
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
    console.error('[PushNotification] registerDeviceToken error:', error);
  }
}

export async function unregisterDeviceToken() {
  try {
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
    console.error('[PushNotification] unregisterDeviceToken error:', error);
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
    callback();
  }
}

export function initPushNotifications() {
  // Configure foreground presentation options for iOS
  if (Platform.OS === 'ios') {
    (messaging() as any).setForegroundNotificationPresentationOptions({
      alert: true,
      badge: true,
      sound: true,
    }).catch((err: any) => console.warn('[PushNotification] Failed to set iOS foreground presentation options:', err));
  }

  // 1. Listen for token refresh
  messaging().onTokenRefresh(async (token) => {
    console.log('[PushNotification] FCM Token refreshed:', token);
    await AsyncStorage.setItem('fcm_token', token);
    await mobileApiFetch('/api/device-token', {
      method: 'POST',
      bodyData: { token }
    });
  });

  // 2. Foreground messages
  const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
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
        // Fallback to basic Alert if Notifee fails
        Alert.alert(notification.title || 'Notification', notification.body || '');
      }
    }
  });

  // 3. Notification opened app from background state
  messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('[PushNotification] Notification caused app to open from background:', remoteMessage);
    if (onNotificationPressedCallback) {
      onNotificationPressedCallback();
    } else {
      hasPendingNotificationClick = true;
    }
  });

  // 4. Notification opened app from quit state
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('[PushNotification] Notification caused app to open from quit state:', remoteMessage);
        if (onNotificationPressedCallback) {
          onNotificationPressedCallback();
        } else {
          hasPendingNotificationClick = true;
        }
      }
    });

  // 5. Notifee Foreground Event Listener
  const unsubscribeNotifeeForeground = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      console.log('[PushNotification] User pressed foreground notification:', detail.notification);
      if (onNotificationPressedCallback) {
        onNotificationPressedCallback();
      } else {
        hasPendingNotificationClick = true;
      }
    }
  });

  return () => {
    unsubscribeForeground();
    unsubscribeNotifeeForeground();
  };
}
