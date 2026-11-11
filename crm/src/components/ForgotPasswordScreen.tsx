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
import { SafeAreaView } from 'react-native-safe-area-context';
import { getBaseUrl } from '../api/client';
import { Mail, ArrowLeft, KeyRound, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react-native';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
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
                      keyboardType="email-address"
                      autoComplete="email"
                      editable={!loading}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
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
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    color: '#2563eb',
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
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  badgePill: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  heroTitle: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
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
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
  },
  inputWrapperFocused: {
    borderColor: '#2563eb',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 1,
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    paddingVertical: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
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
  primaryButtonText: {
    color: '#ffffff',
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
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  successBody: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  successEmail: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 12,
  },
  successNote: {
    color: '#94a3b8',
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
    color: '#2563eb',
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
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
  },
});
