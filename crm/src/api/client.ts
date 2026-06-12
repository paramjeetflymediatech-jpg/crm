import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { store } from '../store';
import { setAuth, logoutUser } from '../store/authSlice';
// For production:
const BaseUrl = "https://demo.socialflymediatech.com";

// For local development (Next.js server runs on port 3000):
// const BaseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export const getBaseUrl = () => {
  return `${BaseUrl}`;
};

export interface FetchOptions extends RequestInit {
  bodyData?: any;
}

export async function mobileApiFetch(endpoint: string, options: FetchOptions = {}) {
  const baseUrl = getBaseUrl();
  const token = await AsyncStorage.getItem('token');

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.bodyData) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.bodyData);
  }

  let response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const newToken = refreshData.token;
          if (newToken) {
            await AsyncStorage.setItem('token', newToken);

            const userStr = await AsyncStorage.getItem('user');
            const currentUser = userStr ? JSON.parse(userStr) : null;

            store.dispatch(setAuth({ token: newToken, user: currentUser }));

            headers.set('Authorization', `Bearer ${newToken}`);
            response = await fetch(`${baseUrl}${endpoint}`, {
              ...options,
              headers,
            });
            return response;
          }
        }
      } catch (err) {
        console.error('Error auto-refreshing token inside mobileApiFetch:', err);
      }
    }

    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('user');
    store.dispatch(logoutUser() as any);
  }

  return response;
}
