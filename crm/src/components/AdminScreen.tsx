import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { mobileApiFetch } from '../api/client';
import { TOKENS } from '../theme/tokens';
import { ShieldAlert, Building2, Activity, Ban, CheckCircle2, Globe, Mail, Clock, ChevronLeft, Plus, X, Lock } from 'lucide-react-native';

interface AdminScreenProps {
  onBack?: () => void;
}

export default function AdminScreen({ onBack }: AdminScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Form Wizard states
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    website: '',
    email: '',
    phone: '',
    subscription_plan: 'free',
    admin_name: '',
    admin_email: '',
    admin_password: ''
  });
  const [saving, setSaving] = useState(false);

  const handleProvisionSubmit = async () => {
    if (!form.company_name.trim() || !form.admin_name.trim() || !form.admin_email.trim() || !form.admin_password.trim()) {
      Alert.alert('Validation Error', 'Company name, admin name, admin email, and admin password are required.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.admin_email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid administrator email address.');
      return;
    }

    if (form.admin_password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }

    setSaving(true);
    try {
      const res = await mobileApiFetch('/api/admin/companies', {
        method: 'POST',
        bodyData: {
          company_name: form.company_name.trim(),
          website: form.website.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          subscription_plan: form.subscription_plan,
          admin_name: form.admin_name.trim(),
          admin_email: form.admin_email.trim(),
          admin_password: form.admin_password
        }
      });

      if (res.ok) {
        Alert.alert('Success', 'Company tenant provisioned successfully!');
        setModalVisible(false);
        setForm({
          company_name: '',
          website: '',
          email: '',
          phone: '',
          subscription_plan: 'free',
          admin_name: '',
          admin_email: '',
          admin_password: ''
        });
        fetchData();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to provision company.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const fetchData = async () => {
    try {
      const [resComp, resLogs] = await Promise.all([
        mobileApiFetch('/api/admin/companies'),
        mobileApiFetch('/api/admin/audit-logs')
      ]);

      if (resComp.ok) {
        const d = await resComp.json();
        setCompanies(d.companies || []);
      }
      if (resLogs.ok) {
        const d = await resLogs.json();
        setLogs(d.logs || []);
      }
    } catch (err) {
      console.error('Admin fetching error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'super_admin') {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleToggleSuspend = async (company: any) => {
    const nextStatus = company.status === 'active' ? 'suspended' : 'active';
    const actionText = nextStatus === 'suspended' ? 'suspend' : 'activate';
    
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${actionText} Company "${company.company_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Proceed', 
          onPress: async () => {
            setActionLoadingId(company.id);
            try {
              const res = await mobileApiFetch(`/api/admin/companies/${company.id}`, {
                method: 'PUT',
                bodyData: { status: nextStatus }
              });
              if (res.ok) {
                fetchData();
              } else {
                const err = await res.json();
                Alert.alert('Error', err.error || `Failed to ${actionText} company.`);
              }
            } catch (err) {
              console.error(err);
            } finally {
              setActionLoadingId(null);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.infoText}>Loading Control Panel...</Text>
      </View>
    );
  }

  // Security Guard
  if (currentUser?.role !== 'super_admin') {
    return (
      <View style={styles.restrictedContainer}>
        <View style={styles.restrictedIconWrapper}>
          <ShieldAlert size={36} color="#ef4444" />
        </View>
        <Text style={styles.restrictedTitle}>Access Restricted</Text>
        <Text style={styles.restrictedDesc}>
          This panel requires Super Administrative privileges. Your role limits you from inspecting other client domains.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
            <ChevronLeft size={24} color={TOKENS.colors.primary} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Platform Control Panel</Text>
          <Text style={styles.headerSubtitle}>Super Administrative view across all company tenants</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerAddBtn} 
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Plus size={20} color={TOKENS.colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
      >
        {/* Companies Section */}
        <View style={styles.sectionHeader}>
          <Building2 size={16} color="#2563eb" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Active Client Companies ({companies.length})</Text>
        </View>

        {companies.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No company records found.</Text>
          </View>
        ) : (
          companies.map((c) => {
            const isActive = c.status === 'active';
            const isToggling = actionLoadingId === c.id;

            return (
              <View key={c.id} style={styles.companyCard}>
                <View style={styles.companyHeader}>
                  <Text style={styles.companyName}>{c.company_name}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: isActive ? '#ecfdf5' : '#fef2f2' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: isActive ? '#059669' : '#dc2626' }
                    ]}>{c.status}</Text>
                  </View>
                </View>

                {c.website && (
                  <View style={styles.metaRow}>
                    <Globe size={12} color="#64748b" style={styles.metaIcon} />
                    <Text style={styles.metaText}>{c.website}</Text>
                  </View>
                )}

                {c.email && (
                  <View style={styles.metaRow}>
                    <Mail size={12} color="#64748b" style={styles.metaIcon} />
                    <Text style={styles.metaText}>{c.email}</Text>
                  </View>
                )}

                <View style={styles.companyDetailsRow}>
                  <Text style={styles.detailText}>Plan: <Text style={styles.planText}>{c.subscription_plan}</Text></Text>
                  <Text style={styles.detailDivider}>|</Text>
                  <Text style={styles.detailText}>Leads: <Text style={styles.statsText}>{c.lead_count ?? 0}</Text></Text>
                  <Text style={styles.detailDivider}>|</Text>
                  <Text style={styles.detailText}>Users: <Text style={styles.statsText}>{c.user_count ?? 0}</Text></Text>
                </View>

                <TouchableOpacity 
                  style={[
                    styles.actionBtn, 
                    isActive ? styles.suspendBtn : styles.activateBtn
                  ]}
                  onPress={() => handleToggleSuspend(c)}
                  disabled={isToggling}
                >
                  {isToggling ? (
                    <ActivityIndicator size="small" color={isActive ? '#dc2626' : '#059669'} />
                  ) : (
                    <>
                      {isActive ? (
                        <>
                          <Ban size={14} color="#dc2626" style={{ marginRight: 6 }} />
                          <Text style={styles.suspendBtnText}>Suspend Workspace</Text>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} color="#059669" style={{ marginRight: 6 }} />
                          <Text style={styles.activateBtnText}>Activate Workspace</Text>
                        </>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Audit Logs Section */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Activity size={16} color="#2563eb" style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Security Audit Trail</Text>
        </View>

        <View style={styles.logsContainer}>
          {logs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No actions logged.</Text>
            </View>
          ) : (
            logs.map((log) => (
              <View key={log.id} style={styles.logItem}>
                <View style={styles.logHeader}>
                  <Text style={styles.logTenant}>
                    {log.Company?.company_name || 'System Core'}
                  </Text>
                  <Text style={styles.logModule}>{log.module}</Text>
                </View>
                <Text style={styles.logAction}>{log.action}</Text>
                
                <View style={styles.logFooter}>
                  <Text style={styles.logUser}>User: {log.User?.name || 'Automated / System'}</Text>
                  <View style={styles.logTimeContainer}>
                    <Clock size={10} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={styles.logTime}>
                      {log.created_at || log.createdAt ? new Date(log.created_at || log.createdAt).toLocaleString(undefined, {hour: '2-digit', minute:'2-digit', month: 'short', day: 'numeric'}) : 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Provision Company Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Building2 size={20} color="#2563eb" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Provision Workspace</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.formSectionTitle}>Company Details</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Company Name *</Text>
                <View style={styles.inputWrapper}>
                  <Building2 size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Globex Inc"
                    placeholderTextColor="#64748b"
                    value={form.company_name}
                    onChangeText={(text) => setForm({ ...form, company_name: text })}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Website URL</Text>
                <View style={styles.inputWrapper}>
                  <Globe size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. globex.com"
                    placeholderTextColor="#64748b"
                    value={form.website}
                    onChangeText={(text) => setForm({ ...form, website: text })}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Workspace Phone</Text>
                <View style={styles.inputWrapper}>
                  <Building2 size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. +1 555 9811"
                    placeholderTextColor="#64748b"
                    value={form.phone}
                    onChangeText={(text) => setForm({ ...form, phone: text })}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Subscription Plan</Text>
                <View style={styles.planSelector}>
                  {(['free', 'professional', 'enterprise'] as const).map((plan) => (
                    <TouchableOpacity
                      key={plan}
                      style={[
                        styles.planOption,
                        form.subscription_plan === plan && styles.planOptionActive
                      ]}
                      onPress={() => setForm({ ...form, subscription_plan: plan })}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.planOptionText,
                        form.subscription_plan === plan && styles.planOptionTextActive
                      ]}>
                        {plan === 'free' ? 'Free' : plan === 'professional' ? 'Pro' : 'Enterprise'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.formSectionTitle}>Initial Administrator Details</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Admin Full Name *</Text>
                <View style={styles.inputWrapper}>
                  <Building2 size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Richard Hendricks"
                    placeholderTextColor="#64748b"
                    value={form.admin_name}
                    onChangeText={(text) => setForm({ ...form, admin_name: text })}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Admin Email Login *</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. richard@globex.com"
                    placeholderTextColor="#64748b"
                    value={form.admin_email}
                    onChangeText={(text) => setForm({ ...form, admin_email: text })}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Admin Secure Password *</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="•••••••• (min 6 chars)"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    value={form.admin_password}
                    onChangeText={(text) => setForm({ ...form, admin_password: text })}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleProvisionSubmit}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>Provision Tenant</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.background,
  },
  infoText: {
    color: TOKENS.colors.secondary,
    marginTop: 12,
    fontSize: 14,
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.background,
    padding: 32,
  },
  restrictedIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  restrictedTitle: {
    color: TOKENS.colors.heading,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  restrictedDesc: {
    color: TOKENS.colors.secondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    paddingBottom: 16,
    backgroundColor: TOKENS.colors.surface,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.border,
    ...TOKENS.shadows.sm,
    zIndex: 10,
  },
  headerTitle: {
    color: TOKENS.colors.heading,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: TOKENS.spacing.md,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionTitle: {
    color: TOKENS.colors.heading,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.md,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  emptyText: {
    color: TOKENS.colors.secondary,
    fontSize: 13,
    fontStyle: 'italic',
  },
  companyCard: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    padding: 16,
    marginBottom: 14,
    ...TOKENS.shadows.card,
  },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  companyName: {
    color: TOKENS.colors.heading,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
  },
  companyDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 14,
    backgroundColor: TOKENS.colors.background,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    padding: 8,
    borderRadius: TOKENS.radius.sm,
  },
  detailText: {
    color: TOKENS.colors.secondary,
    fontSize: 11,
  },
  planText: {
    color: TOKENS.colors.primary,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statsText: {
    color: TOKENS.colors.heading,
    fontWeight: '700',
  },
  detailDivider: {
    color: TOKENS.colors.border,
    marginHorizontal: 8,
    fontSize: 10,
  },
  actionBtn: {
    borderRadius: TOKENS.radius.sm,
    paddingVertical: 9,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
  },
  suspendBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  suspendBtnText: {
    color: TOKENS.colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  activateBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  activateBtnText: {
    color: TOKENS.colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  logsContainer: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    overflow: 'hidden',
    ...TOKENS.shadows.card,
  },
  logItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logTenant: {
    color: TOKENS.colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  logModule: {
    backgroundColor: TOKENS.colors.primaryLight,
    color: TOKENS.colors.primary,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  logAction: {
    color: TOKENS.colors.heading,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logUser: {
    color: TOKENS.colors.secondary,
    fontSize: 11,
  },
  logTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logTime: {
    color: TOKENS.colors.secondary,
    fontSize: 11,
  },
  headerAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: TOKENS.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 40, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: TOKENS.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  modalTitle: {
    color: TOKENS.colors.heading,
    fontSize: 17,
    fontWeight: '800',
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  formSectionTitle: {
    color: TOKENS.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: TOKENS.colors.heading,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.background,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: TOKENS.colors.heading,
    fontSize: 14,
    paddingVertical: 10,
  },
  planSelector: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.background,
    borderRadius: TOKENS.radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  planOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: TOKENS.radius.sm,
  },
  planOptionActive: {
    backgroundColor: TOKENS.colors.primary,
  },
  planOptionText: {
    color: TOKENS.colors.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  planOptionTextActive: {
    color: TOKENS.colors.white,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: TOKENS.colors.border,
    marginVertical: 20,
  },
  submitBtn: {
    backgroundColor: TOKENS.colors.primary,
    borderRadius: TOKENS.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: TOKENS.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnText: {
    color: TOKENS.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
