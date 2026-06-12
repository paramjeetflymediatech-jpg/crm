import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'company_admin' | 'staff';
  avatar?: string;
  phone?: string;
  company_id?: number;
  companyId?: number;
  companyName?: string;
  Company?: {
    id: number;
    company_name: string;
    website?: string;
    logo?: string;
    email?: string;
    phone?: string;
    api_key?: string;
  };
}

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  token: null,
  user: null,
  loading: false,
  error: null,
};

export const loadStoredAuth = createAsyncThunk('auth/loadStored', async () => {
  const token = await AsyncStorage.getItem('token');
  const userJson = await AsyncStorage.getItem('user');
  if (token && userJson) {
    return { token, user: JSON.parse(userJson) };
  }
  return { token: null, user: null };
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('refreshToken');
  await AsyncStorage.removeItem('user');
  return null;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.token = null;
        state.user = null;
      });
  },
});

export const { setAuth, setLoading, setError, clearError } = authSlice.actions;
export default authSlice.reducer;
