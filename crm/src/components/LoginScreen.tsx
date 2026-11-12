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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { TOKENS } from '../theme/tokens';

interface LoginScreenProps {
  onForgotPassword: () => void;
  onBackToWelcome?: () => void;
  onOpenLegal?: (tab: 'privacy' | 'terms') => void;
}

export default function LoginScreen({ onForgotPassword, onBackToWelcome, onOpenLegal }: LoginScreenProps) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
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
    <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, 14), paddingBottom: Math.max(insets.bottom, 14) }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
              <View style={[styles.inputWrapper, isEmailFocused && styles.inputWrapperFocused]}>
                <Mail 
                  size={18} 
                  color={isEmailFocused ? '#2563eb' : '#64748b'} 
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
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
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

              <View style={[styles.inputWrapper, isPasswordFocused && styles.inputWrapperFocused]}>
                <Lock 
                  size={18} 
                  color={isPasswordFocused ? '#2563eb' : '#64748b'} 
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
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
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
          {/* <View style={styles.helpSection}>
            <Text style={styles.helpText}>
              Need an account or access assistance?{' '}
              <Text style={styles.helpLink}>Contact Organization Admin</Text>
            </Text>
          </View> */}

          {/* Footer Security Badge & Legal Links */}
          <View style={styles.footer}>
            <View style={styles.footerSecurityRow}>
              <ShieldCheck size={14} color="#64748b" style={{ marginRight: 6 }} />
              <Text style={styles.footerText}>
                256-bit SSL Encrypted • Multi-Tenant Protected
              </Text>
            </View>

            {onOpenLegal && (
              <View style={styles.legalLinksRow}>
                <TouchableOpacity onPress={() => onOpenLegal('privacy')} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.legalLinkText}>Privacy Policy</Text>
                </TouchableOpacity>
                <Text style={styles.legalDot}>•</Text>
                <TouchableOpacity onPress={() => onOpenLegal('terms')} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.legalLinkText}>Terms of Service</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: TOKENS.colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 24,
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
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: TOKENS.colors.heading,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.primaryLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  workspacePillText: {
    color: TOKENS.colors.primary,
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
    backgroundColor: TOKENS.colors.primaryLight,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 16,
    shadowColor: TOKENS.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  logoCard: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: TOKENS.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 58,
    height: 58,
    borderRadius: 16,
  },
  title: {
    color: TOKENS.colors.heading,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: TOKENS.colors.secondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },
  formContainer: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    shadowColor: TOKENS.colors.heading,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: TOKENS.colors.errorLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  errorText: {
    flex: 1,
    color: TOKENS.colors.error,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: TOKENS.colors.heading,
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
    color: TOKENS.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.background,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.border,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputWrapperFocused: {
    borderColor: TOKENS.colors.primary,
    backgroundColor: TOKENS.colors.white,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: TOKENS.colors.heading,
    fontSize: 15,
    paddingVertical: 10,
    minHeight: 48,
  },
  eyeButton: {
    padding: 6,
  },
  signInButton: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: TOKENS.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: TOKENS.colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  helpSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  helpText: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  helpLink: {
    color: TOKENS.colors.primary,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 20,
    gap: 8,
  },
  footerSecurityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: TOKENS.colors.secondary,
    fontSize: 11,
    textAlign: 'center',
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLinkText: {
    color: TOKENS.colors.primary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  legalDot: {
    color: TOKENS.colors.secondary,
    fontSize: 10,
  },
});