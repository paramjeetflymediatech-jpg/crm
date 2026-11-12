import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Lock,
  Users,
  Server,
  Mail,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Globe,
  Scale,
} from 'lucide-react-native';
import { TOKENS } from '../theme/tokens';
import { getBaseUrl } from '../api/client';

interface LegalScreenProps {
  onBack: () => void;
  initialTab?: 'privacy' | 'terms';
}

export default function LegalScreen({ onBack, initialTab = 'privacy' }: LegalScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  const handleOpenEmail = (address: string, subject: string) => {
    Linking.openURL(`mailto:${address}?subject=${encodeURIComponent(subject)}`).catch(() => {
      Alert.alert('Contact Error', `Please write to: ${address}`);
    });
  };

  const handleOpenWeb = (path: string) => {
    const base = getBaseUrl();
    Linking.openURL(`${base}${path}`).catch(() => {
      Alert.alert('Browser Error', 'Unable to open browser on this device.');
    });
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 14) }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={18} color={TOKENS.colors.heading} />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Legal & Compliance</Text>
          <Text style={styles.headerSubtitle}>Enterprise multi-tenant privacy & terms</Text>
        </View>

        <View style={styles.badgePill}>
          <ShieldCheck size={11} color={TOKENS.colors.primary} style={{ marginRight: 4 }} />
          <Text style={styles.badgePillText}>VERIFIED</Text>
        </View>
      </View>

      {/* Segmented Tab Switcher */}
      <View style={styles.tabSwitcherContainer}>
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'privacy' && styles.tabButtonActive]}
            onPress={() => setActiveTab('privacy')}
            activeOpacity={0.8}
          >
            <ShieldCheck 
              size={14} 
              color={activeTab === 'privacy' ? '#FFFFFF' : TOKENS.colors.secondary} 
              style={{ marginRight: 6 }} 
            />
            <Text style={[styles.tabButtonText, activeTab === 'privacy' && styles.tabButtonTextActive]}>
              Privacy Policy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'terms' && styles.tabButtonActive]}
            onPress={() => setActiveTab('terms')}
            activeOpacity={0.8}
          >
            <FileText 
              size={14} 
              color={activeTab === 'terms' ? '#FFFFFF' : TOKENS.colors.secondary} 
              style={{ marginRight: 6 }} 
            />
            <Text style={[styles.tabButtonText, activeTab === 'terms' && styles.tabButtonTextActive]}>
              Terms of Service
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Effective Date & Security Callout */}
        <View style={styles.calloutCard}>
          <View style={styles.calloutHeader}>
            <View style={styles.calloutIconBox}>
              {activeTab === 'privacy' ? (
                <Lock size={16} color={TOKENS.colors.primary} />
              ) : (
                <Scale size={16} color={TOKENS.colors.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.calloutTitle}>
                {activeTab === 'privacy' ? 'Data Protection Standards' : 'Enterprise SaaS Agreement'}
              </Text>
              <Text style={styles.calloutSubtitle}>Effective Date: November 12, 2026</Text>
            </View>
          </View>

          <View style={styles.highlightsRow}>
            <View style={styles.highlightBadge}>
              <CheckCircle2 size={12} color="#16a34a" style={{ marginRight: 4 }} />
              <Text style={styles.highlightText}>
                {activeTab === 'privacy' ? 'Zero Data Selling' : 'Customer Owns Data'}
              </Text>
            </View>
            <View style={styles.highlightBadge}>
              <CheckCircle2 size={12} color="#16a34a" style={{ marginRight: 4 }} />
              <Text style={styles.highlightText}>Tenant Isolated</Text>
            </View>
            <View style={styles.highlightBadge}>
              <CheckCircle2 size={12} color="#16a34a" style={{ marginRight: 4 }} />
              <Text style={styles.highlightText}>TLS 1.3 Encrypted</Text>
            </View>
          </View>
        </View>

        {activeTab === 'privacy' ? (
          /* ========================================================= */
          /* PRIVACY POLICY CONTENT                                   */
          /* ========================================================= */
          <View style={styles.sectionsWrapper}>
            {/* 1. Introduction */}
            <View style={styles.card}>
              <Text style={styles.sectionNumber}>SECTION 1</Text>
              <Text style={styles.sectionTitle}>Overview & Organization Scope</Text>
              <Text style={styles.sectionBody}>
                Socialfly Media Tech operates Enterprise CRM, a multi-tenant cloud-based platform facilitating sales lead capture, routing, qualification, and communication management.
              </Text>
              <Text style={styles.sectionBody}>
                This Privacy Policy explains how personal and corporate data is ingested, protected, and stored across web and mobile interfaces.
              </Text>
            </View>

            {/* 2. Customer Ownership */}
            <View style={styles.card}>
              <Text style={styles.sectionNumber}>SECTION 2</Text>
              <Text style={styles.sectionTitle}>Customer Ownership & Data Processor Role</Text>
              <Text style={styles.sectionBody}>
                You retain complete, exclusive ownership of all customer contacts, lead names, phone numbers, notes, and task records imported into your workspace.
              </Text>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Your organization acts as the Data Controller; we operate strictly as the Data Processor.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  We never sell, rent, monetize, or broker lead records to third-party advertisers.
                </Text>
              </View>
            </View>

            {/* 3. Information We Collect */}
            <View style={styles.card}>
              <Text style={styles.sectionNumber}>SECTION 3</Text>
              <Text style={styles.sectionTitle}>Information Collected</Text>
              <Text style={styles.sectionBody}>
                To operate the CRM reliably, we collect:
              </Text>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>User Accounts:</Text> Work email, hashed password (salted bcrypt), full name, designated role, company name, and profile photos.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>Lead Records:</Text> Prospect name, email, phone number, lead source, assigned team member, and communication remarks.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>Device Telemetry:</Text> Google Firebase FCM push notification device tokens for lead assignment and task reminders.
                </Text>
              </View>
            </View>

            {/* 4. Multi-Tenant Cryptographic Isolation */}
            <View style={styles.card}>
              <Text style={styles.sectionNumber}>SECTION 4</Text>
              <Text style={styles.sectionTitle}>Multi-Tenant Isolation & Encryption</Text>
              <Text style={styles.sectionBody}>
                Our architecture enforces defense-in-depth isolation:
              </Text>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>Row-Level Tenant Guard:</Text> Every database transaction, API call, and WebSocket event is bounded by authenticated company_id. Cross-tenant leakage is strictly prevented.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  <Text style={styles.boldText}>In-Transit & At-Rest Encryption:</Text> Network communications use TLS 1.3; sensitive credentials and tokens are cryptographically secured.
                </Text>
              </View>
            </View>

            {/* 5. Ingestion Channels */}
            <View style={styles.card}>
              <Text style={styles.sectionNumber}>SECTION 5</Text>
              <Text style={styles.sectionTitle}>Third-Party Webhook Ingestion</Text>
              <Text style={styles.sectionBody}>
                When administrators configure automated lead ingestion (Meta/Facebook Lead Ads or JustDial API), payloads delivered to your company webhook endpoint are decrypted and stored strictly inside your organization&apos;s isolated schema.
              </Text>
            </View>

            {/* 6. Retention & Rights */}
            <View style={styles.card}>
              <Text style={styles.sectionNumber}>SECTION 6</Text>
              <Text style={styles.sectionTitle}>Data Retention & User Rights</Text>
              <Text style={styles.sectionBody}>
                Organizations may export their full CRM lead databases at any time. Upon verified account termination, data is held for 30 calendar days for final export before permanent disk purging.
              </Text>
              <Text style={styles.sectionBody}>
                You retain the right to access, rectify, or request erasure of personal data under applicable GDPR and local privacy statutes.
              </Text>
            </View>

            {/* Contact Desk */}
            <View style={[styles.card, styles.contactCard]}>
              <Text style={styles.contactTitle}>Data Protection & Privacy Desk</Text>
              <Text style={styles.contactSubtitle}>
                Submit privacy inquiries or data subject access requests to our team:
              </Text>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleOpenEmail('privacy@socialflymediatech.com', 'Data Privacy Inquiry')}
                activeOpacity={0.8}
              >
                <Mail size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.contactButtonText}>privacy@socialflymediatech.com</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.webLinkButton}
                onPress={() => handleOpenWeb('/privacy-policy')}
                activeOpacity={0.7}
              >
                <Globe size={14} color={TOKENS.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.webLinkText}>View Full Web Policy</Text>
                <ExternalLink size={12} color={TOKENS.colors.primary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ========================================================= */
          /* TERMS OF SERVICE CONTENT                                 */
          /* ========================================================= */
          <View style={styles.sectionsWrapper}>
            {/* 1. Acceptance */}
            <View style={styles.card}>
              <Text style={styles.sectionNumber}>SECTION 1</Text>
              <Text style={styles.sectionTitle}>Agreement to Terms</Text>
              <Text style={styles.sectionBody}>
                By accessing our web portal, downloading our mobile app, or utilizing our REST/Webhook ingestion APIs, you and your organization agree to be bound by these Terms and Conditions.
              </Text>
              <Text style={styles.sectionBody}>
                If you are accessing the platform on behalf of a company, you represent that you hold valid corporate authority to bind the entity.
              </Text>
            </View>

            {/* 2. Workspace Access & Roles */}
            <View style={styles.card}>
              <Text style={styles.sectionNumber}>SECTION 2</Text>
              <Text style={styles.sectionTitle}>Multi-Tenant Roles & Security</Text>
              <Text style={styles.sectionBody}>
                Organization accounts are categorized into Super Admin, Company Admin, and Staff tiers.
              </Text>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Company Admins hold administrative responsibility for adding staff, maintaining branding, and managing API ingestion tokens.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Staff Members must maintain credential confidentiality and access only records related to their assigned sales scope.
                </Text>
              </View>
            </View>

            {/* 3. Acceptable Use Policy */}
            <View style={styles.card}>
              <Text style={styles.sectionNumber}>SECTION 3</Text>
              <Text style={styles.sectionTitle}>Acceptable Use Policy</Text>
              <Text style={styles.sectionBody}>
                Subscribers and users agree strictly not to:
              </Text>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Reverse engineer, decompile, or extract source code from mobile bundles or web applications.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Ingest scraped, illicit, or spam contact lists that violate consumer telecommunication or privacy regulations.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>
                  Attempt unauthorized penetration testing, vulnerability scanning, or multi-tenant boundary bypassing.
                </Text>
              </View>
            </View>

            {/* 4. Customer Data & Intellectual Property */}
            <View style={styles.card}>
              <Text style={styles.sectionNumber}>SECTION 4</Text>
              <Text style={styles.sectionTitle}>Customer Data & Platform Property</Text>
              <Text style={styles.sectionBody}>
                You retain 100% intellectual property ownership of your client records, pipeline metrics, and corporate logos.
              </Text>
              <Text style={styles.sectionBody}>
                Socialfly Media Tech retains all rights and ownership in platform software, algorithms, user interface designs, and infrastructure trademarks.
              </Text>
            </View>

            {/* 5. Uptime & Service Levels */}
            <View style={styles.card}>
              <Text style={styles.sectionNumber}>SECTION 5</Text>
              <Text style={styles.sectionTitle}>Service Levels & Maintenance</Text>
              <Text style={styles.sectionBody}>
                We target 99.9% availability for core API and mobile sync services. Routine maintenance is scheduled during low-traffic windows with advance notice when practicable.
              </Text>
            </View>

            {/* 6. Disclaimers & Liability */}
            <View style={styles.card}>
              <Text style={styles.sectionNumber}>SECTION 6</Text>
              <Text style={styles.sectionTitle}>Disclaimers & Limitation of Liability</Text>
              <Text style={styles.sectionBody}>
                The platform is provided on an &ldquo;as is&rdquo; basis. In no event shall Socialfly Media Tech be liable for indirect, incidental, or consequential damages. Aggregate liability is capped at the fees paid in the preceding 12 months.
              </Text>
            </View>

            {/* Legal Contact Desk */}
            <View style={[styles.card, styles.contactCard]}>
              <Text style={styles.contactTitle}>Corporate Legal Affairs</Text>
              <Text style={styles.contactSubtitle}>
                For legal notices or enterprise SLA inquiries:
              </Text>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handleOpenEmail('legal@socialflymediatech.com', 'Enterprise Agreement Inquiry')}
                activeOpacity={0.8}
              >
                <Mail size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.contactButtonText}>legal@socialflymediatech.com</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.webLinkButton}
                onPress={() => handleOpenWeb('/terms-and-conditions')}
                activeOpacity={0.7}
              >
                <Globe size={14} color={TOKENS.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.webLinkText}>View Full Web Terms</Text>
                <ExternalLink size={12} color={TOKENS.colors.primary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: TOKENS.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: TOKENS.colors.background,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TOKENS.colors.heading,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: TOKENS.colors.secondary,
    marginTop: 1,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.primaryLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: TOKENS.colors.primary,
    letterSpacing: 0.3,
  },
  tabSwitcherContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: TOKENS.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.border,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.background,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: TOKENS.colors.primary,
    shadowColor: TOKENS.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: TOKENS.colors.secondary,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  calloutCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 14,
    shadowColor: TOKENS.colors.heading,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  calloutIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  calloutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TOKENS.colors.heading,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: TOKENS.colors.secondary,
    marginTop: 1,
  },
  highlightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  highlightText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  sectionsWrapper: {
    gap: 12,
  },
  card: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    shadowColor: TOKENS.colors.heading,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionNumber: {
    fontSize: 10.5,
    fontWeight: '800',
    color: TOKENS.colors.primary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TOKENS.colors.heading,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  sectionBody: {
    fontSize: 13,
    color: TOKENS.colors.secondary,
    lineHeight: 19,
    marginBottom: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: TOKENS.colors.primary,
    marginTop: 7,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 12.5,
    color: TOKENS.colors.secondary,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: TOKENS.colors.heading,
  },
  contactCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    alignItems: 'center',
    textAlign: 'center',
    marginTop: 6,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TOKENS.colors.heading,
  },
  contactSubtitle: {
    fontSize: 12,
    color: TOKENS.colors.secondary,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  webLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  webLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.colors.primary,
  },
});

