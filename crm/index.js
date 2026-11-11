/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { getApps } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

// Register background handler (modular API) if Firebase is initialized
try {
  if (getApps().length > 0) {
    setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
      console.log('[FCM] Message handled in the background!', remoteMessage);
    });
  }
} catch (error) {
  console.warn('[FCM] Background message handler registration skipped:', error);
}

AppRegistry.registerComponent(appName, () => App);
