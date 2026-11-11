import React, { useEffect, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, RootState } from './src/store';
import { loadStoredAuth } from './src/store/authSlice';
import AppTabs from './src/components/app-tabs';
import WelcomeScreen from './src/components/WelcomeScreen';
import LoginScreen from './src/components/LoginScreen';
import ForgotPasswordScreen from './src/components/ForgotPasswordScreen';
import CustomAlertModal from './src/components/common/CustomAlertModal';
import { initAlertPolyfill } from './src/services/alertService';

// Initialize global custom alert popup polyfill
initAlertPolyfill();

function AppContent() {
  const dispatch = useDispatch();
  const [appReady, setAppReady] = useState(false);
  const [authScreen, setAuthScreen] = useState<'welcome' | 'login' | 'forgot-password'>('welcome');
  
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    dispatch(loadStoredAuth() as any).then(() => {
      setAppReady(true);
    });
  }, [dispatch]);

  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // Auth gate
  if (!token) {
    if (authScreen === 'welcome') {
      return (
        <>
          <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
          <WelcomeScreen onGetStarted={() => setAuthScreen('login')} />
        </>
      );
    }
    if (authScreen === 'forgot-password') {
      return (
        <>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          <ForgotPasswordScreen onBackToLogin={() => setAuthScreen('login')} />
        </>
      );
    }
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <LoginScreen 
          onForgotPassword={() => setAuthScreen('forgot-password')} 
          onBackToWelcome={() => setAuthScreen('welcome')}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <AppTabs />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <AppContent />
        <CustomAlertModal />
      </Provider>
    </SafeAreaProvider>
  );
}
