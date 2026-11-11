import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuth } from '../store/authSlice';
import { getBaseUrl } from '../api/client';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle,
  Sparkles
} from 'lucide-react-native';
import { registerDeviceToken } from '../services/pushNotification';

interface LoginScreenProps {
  onForgotPassword: () => void;
  onBackToWelcome?: () => void;
}

export default function LoginScreen({ onForgotPassword, onBackToWelcome }: LoginScreenProps) {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (loading) return;
    if (!email.trim() || !password.trim()) {
      const msg = 'Please enter both your work email and password.';
      setError(msg);
      Alert.alert('Required Fields', msg, [{ text: 'Proceed' }]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      if (!data.token) {
        throw new Error('Authentication error: token not received from server.');
      }

      await AsyncStorage.setItem('token', data.token);
      if (data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
      }
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      dispatch(setAuth({ token: data.token, user: data.user }));
      registerDeviceToken();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Something went wrong. Please check your connection.';
      setError(msg);
      Alert.alert('Authentication Failed', msg, [{ text: 'Proceed' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar Navigation */}
          <View style={styles.topBar}>
            {onBackToWelcome ? (
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={onBackToWelcome}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ArrowLeft size={18} color="#0f172a" />
              </TouchableOpacity>
            ) : <View style={{ width: 38 }} />}

            <View style={styles.workspacePill}>
              <Sparkles size={11} color="#2563eb" style={{ marginRight: 5 }} />
              <Text style={styles.workspacePillText}>Cloud Workspace</Text>
            </View>
          </View>

          {/* Hero Branding Header */}
          <View style={styles.heroHeader}>
            <View style={styles.logoWrapper}>
              <View style={styles.logoCard}>
                <Image 
                  source={require('../assets/logo.png')} 
                  style={styles.logoImage} 
                  resizeMode="contain" 
                  alt="CRM Logo"
                  accessible={true}
                  accessibilityLabel="CRM Logo"
                />
              </View>
            </View>

            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>
              Enter your work credentials to access your CRM workspace and leads
            </Text>
          </View>

          {/* Main Form Container */}
          <View style={styles.formContainer}>
            {error && (
              <View style={styles.errorBanner} accessibilityLiveRegion="polite">
                <AlertCircle size={18} color="#dc2626" style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Work Email</Text>
              <View style={styles.inputWrapper}>
                <Mail 
                  size={18} 
                  color="#2563eb" 
                  style={styles.inputIcon} 
                />
                <TextInput
                  ref={emailRef}
                  style={styles.textInput}
                  placeholder="name@company.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={(val) => { 
                    setEmail(val); 
                    if (error) setError(null); 
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  cursorColor="#2563eb"
                  selectionColor="#bfdbfe"
                  editable={!loading}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordHeaderRow}>
                <Text style={styles.inputLabel}>Password</Text>
                <TouchableOpacity 
                  onPress={onForgotPassword}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <Lock 
                  size={18} 
                  color="#2563eb" 
                  style={styles.inputIcon} 
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={(val) => { 
                    setPassword(val); 
                    if (error) setError(null); 
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  cursorColor="#2563eb"
                  selectionColor="#bfdbfe"
                  editable={!loading}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#64748b" />
                  ) : (
                    <Eye size={18} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Sign In Button */}
            <TouchableOpacity
              style={[styles.signInButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={styles.signInButtonText}>Sign In to Workspace</Text>
                  <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Help & Support Note */}
          <View style={styles.helpSection}>
            <Text style={styles.helpText}>
              Need an account or access assistance?{' '}
              <Text style={styles.helpLink}>Contact Organization Admin</Text>
            </Text>
          </View>

          {/* Footer Security Badge */}
          <View style={styles.footer}>
            <ShieldCheck size={14} color="#64748b" style={{ marginRight: 6 }} />
            <Text style={styles.footerText}>
              256-bit SSL Encrypted • Multi-Tenant Protected
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  workspacePillText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoWrapper: {
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  logoCard: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 58,
    height: 58,
    borderRadius: 16,
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  errorText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    paddingVertical: 10,
    minHeight: 48,
  },
  eyeButton: {
    padding: 6,
  },
  signInButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  helpSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  helpText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  helpLink: {
    color: '#2563eb',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
  },
});