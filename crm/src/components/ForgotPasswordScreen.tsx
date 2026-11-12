import React, { useState } from 'react';
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
import { getBaseUrl } from '../api/client';
import { Mail, ArrowLeft, KeyRound, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { TOKENS } from '../theme/tokens';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      const msg = 'Please enter your work email address.';
      setError(msg);
      Alert.alert('Required Field', msg, [{ text: 'Proceed' }]);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${getBaseUrl()}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email');
      }

      const msg = data.message || 'Password reset instructions have been dispatched to your email.';
      setSuccessMessage(msg);
      Alert.alert('Instructions Sent', msg, [{ text: 'Proceed' }]);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Something went wrong. Please check your connection.';
      setError(msg);
      Alert.alert('Reset Failed', msg, [{ text: 'Proceed' }]);
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
          {/* Top Back Navigation Bar */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onBackToLogin}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.backIconCircle}>
              <ArrowLeft size={18} color="#2563eb" />
            </View>
            <Text style={styles.backButtonText}>Back to Sign In</Text>
          </TouchableOpacity>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconCircle}>
              <KeyRound size={28} color="#2563eb" />
            </View>
            
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>Account Recovery</Text>
            </View>

            <Text style={styles.heroTitle}>Reset Password</Text>
            <Text style={styles.heroSubtitle}>
              Enter your registered work email to receive secure recovery instructions
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {error && (
              <View style={styles.errorBanner}>
                <AlertCircle size={18} color="#dc2626" style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {successMessage ? (
              <View style={styles.successState}>
                <View style={styles.successIconWrapper}>
                  <CheckCircle2 size={36} color="#059669" />
                </View>
                <Text style={styles.successTitle}>Check Your Inbox</Text>
                <Text style={styles.successBody}>
                  We sent password reset instructions to:
                </Text>
                <Text style={styles.successEmail}>{email}</Text>
                <Text style={styles.successNote}>
                  If you don&apos;t see the email within a couple of minutes, please check your spam folder.
                </Text>

                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={onBackToLogin}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Return to Sign In</Text>
                  <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.resendBtn}
                  onPress={handleForgotPassword}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendBtnText}>Resend Email</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Work Email Address</Text>
                  <View style={[
                    styles.inputWrapper,
                    isFocused && styles.inputWrapperFocused
                  ]}>
                    <Mail 
                      size={18} 
                      color={isFocused ? '#2563eb' : '#94a3b8'} 
                      style={styles.fieldIcon} 
                    />
                    <TextInput 
                      style={styles.input}
                      placeholder="name@company.com"
                      placeholderTextColor="#94a3b8"
                      value={email}
                      onChangeText={(val) => { setEmail(val); if (error) setError(null); }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      editable={!loading}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      returnKeyType="done"
                      onSubmitEditing={handleForgotPassword}
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.primaryButton, loading && styles.buttonDisabled]} 
                  onPress={handleForgotPassword}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Send Recovery Link</Text>
                      <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer Security Badge */}
          <View style={styles.footer}>
            <ShieldCheck size={14} color="#64748b" style={{ marginRight: 6 }} />
            <Text style={styles.footerText}>
              Protected by Enterprise Multi-Tenant Identity Verification
            </Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TOKENS.colors.primaryLight,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    color: TOKENS.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: TOKENS.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    shadowColor: TOKENS.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  badgePill: {
    backgroundColor: TOKENS.colors.primaryLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    color: TOKENS.colors.primary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  heroTitle: {
    color: TOKENS.colors.heading,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: TOKENS.colors.secondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
  card: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    shadowColor: TOKENS.colors.heading,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: TOKENS.colors.errorLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
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
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: TOKENS.colors.heading,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    paddingHorizontal: 12,
  },
  inputWrapperFocused: {
    borderColor: TOKENS.colors.primary,
    backgroundColor: TOKENS.colors.white,
    borderWidth: 1.5,
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: TOKENS.colors.heading,
    fontSize: 15,
    paddingVertical: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
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
  primaryButtonText: {
    color: TOKENS.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  successState: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  successIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TOKENS.colors.successLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    color: TOKENS.colors.heading,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  successBody: {
    color: TOKENS.colors.secondary,
    fontSize: 13,
    textAlign: 'center',
  },
  successEmail: {
    color: TOKENS.colors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 12,
  },
  successNote: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  resendBtn: {
    marginTop: 14,
    paddingVertical: 8,
  },
  resendBtnText: {
    color: TOKENS.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    paddingHorizontal: 12,
  },
  footerText: {
    color: TOKENS.colors.secondary,
    fontSize: 11,
    textAlign: 'center',
  },
});
