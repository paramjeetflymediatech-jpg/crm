/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

// Register background handler (modular API)
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  console.log('[FCM] Message handled in the background!', remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
