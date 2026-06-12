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
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { mobileApiFetch } from '../api/client';
import { ShieldAlert, Building2, Activity, Ban, CheckCircle2, Globe, Mail, Clock, ChevronLeft, Plus, X, Lock } from 'lucide-react-native';

interface AdminScreenProps {
  onBack?: () => void;
}

export default function AdminScreen({ onBack }: AdminScreenProps = {}) {
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
          text: actionText.toUpperCase(), 
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
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.infoText}>Loading Control Panel...</Text>
      </View>
    );
  }

  // Security Guard
  if (currentUser?.role !== 'super_admin') {
    return (
      <View style={styles.restrictedContainer}>
        <View style={styles.restrictedIconWrapper}>
          <ShieldAlert size={36} color="#f87171" />
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
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
            <ChevronLeft size={24} color="#818cf8" />
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
          <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {/* Companies Section */}
        <View style={styles.sectionHeader}>
          <Building2 size={16} color="#818cf8" style={{ marginRight: 6 }} />
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
                    { backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: isActive ? '#34d399' : '#f87171' }
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
                    <ActivityIndicator size="small" color={isActive ? '#ef4444' : '#10b981'} />
                  ) : (
                    <>
                      {isActive ? (
                        <>
                          <Ban size={14} color="#f87171" style={{ marginRight: 6 }} />
                          <Text style={styles.suspendBtnText}>Suspend Workspace</Text>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} color="#34d399" style={{ marginRight: 6 }} />
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
          <Activity size={16} color="#818cf8" style={{ marginRight: 6 }} />
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
                <Building2 size={20} color="#818cf8" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Provision Workspace</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                <X size={20} color="#94a3b8" />
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
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  infoText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 32,
  },
  restrictedIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  restrictedTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  restrictedDesc: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  companyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  companyName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
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
    color: '#94a3b8',
    fontSize: 12,
  },
  companyDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 14,
    backgroundColor: '#0f172a',
    padding: 8,
    borderRadius: 6,
  },
  detailText: {
    color: '#64748b',
    fontSize: 11,
  },
  planText: {
    color: '#818cf8',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statsText: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  detailDivider: {
    color: '#334155',
    marginHorizontal: 8,
    fontSize: 10,
  },
  actionBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
  },
  suspendBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  suspendBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  activateBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  activateBtnText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '600',
  },
  logsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  logItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#0f172a',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logTenant: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '600',
  },
  logModule: {
    backgroundColor: '#334155',
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  logAction: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logUser: {
    color: '#64748b',
    fontSize: 10,
  },
  logTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logTime: {
    color: '#64748b',
    fontSize: 10,
  },
  headerAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  formSectionTitle: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 10,
  },
  planSelector: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: '#475569',
  },
  planOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  planOptionActive: {
    backgroundColor: '#6366f1',
  },
  planOptionText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  planOptionTextActive: {
    color: '#ffffff',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 20,
  },
  submitBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
