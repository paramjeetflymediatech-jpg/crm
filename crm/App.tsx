import React, { useEffect, useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { ActivityIndicator, View, StatusBar } from 'react-native';
import { store, RootState } from './src/store';
import { loadStoredAuth } from './src/store/authSlice';
import AppTabs from './src/components/app-tabs';
import LoginScreen from './src/components/LoginScreen';
import ForgotPasswordScreen from './src/components/ForgotPasswordScreen';

function AppContent() {
  const dispatch = useDispatch();
  const [appReady, setAppReady] = useState(false);
  const [authScreen, setAuthScreen] = useState<'login' | 'forgot-password'>('login');
  
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    dispatch(loadStoredAuth() as any).then(() => {
      setAppReady(true);
    });
  }, [dispatch]);

  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  // Auth gate
  if (!token) {
    if (authScreen === 'forgot-password') {
      return (
        <>
          <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
          <ForgotPasswordScreen onBackToLogin={() => setAuthScreen('login')} />
        </>
      );
    }
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <LoginScreen onForgotPassword={() => setAuthScreen('forgot-password')} />
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
      <AppTabs />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
