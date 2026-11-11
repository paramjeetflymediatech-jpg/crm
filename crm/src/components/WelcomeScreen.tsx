import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react-native';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export default function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Top Badge */}
      <View style={styles.topSection}>
        {/* <View style={styles.badgePill}>
          <Sparkles size={12} color="#2563eb" style={{ marginRight: 6 }} />
          <Text style={styles.badgeText}>Enterprise Cloud CRM</Text>
        </View> */}
      </View>

      {/* Centered Logo & Branding */}
      <View style={styles.centerSection}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoCard}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
          </View>
        </View>

        <Text style={styles.title}>Enterprise CRM</Text>
        <Text style={styles.subtitle}>
          Accelerate client growth, streamline sales pipelines, and collaborate with your team in one secure workspace.
        </Text>
      </View>

      {/* Bottom Action Area */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.getStartedBtn}
          onPress={onGetStarted}
          activeOpacity={0.88}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
          <ArrowRight size={20} color="#ffffff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* <View style={styles.securityRow}>
          <ShieldCheck size={14} color="#64748b" style={{ marginRight: 6 }} />
          <Text style={styles.securityText}>
            256-bit SSL Encrypted • Hardware Secure
          </Text>
        </View> */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 16,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  logoWrapper: {
    padding: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  logoCard: {
    width: 108,
    height: 108,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 86,
    height: 86,
    borderRadius: 20,
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  bottomSection: {
    paddingBottom: 16,
  },
  getStartedBtn: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  getStartedText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityText: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
  },
});
