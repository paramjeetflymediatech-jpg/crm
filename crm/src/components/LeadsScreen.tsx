import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Modal, 
  ScrollView, 
  RefreshControl,
  Alert,
  Linking,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { mobileApiFetch } from '../api/client';
import { TOKENS } from '../theme/tokens';
import { 
  Search, 
  User, 
  Users,
  Mail, 
  Phone, 
  X, 
  Plus, 
  CheckSquare, 
  Square,
  MessageSquare,
  Activity,
  Calendar as CalendarIcon,
  ChevronRight,
  Flame,
  Globe,
  Tag,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Share2,
  Trash2,
  ExternalLink,
  PhoneCall
} from 'lucide-react-native';

interface LeadsScreenProps {
  initialLeadId?: number | null;
  clearInitialLeadId?: () => void;
  openCreateModalDirectly?: boolean;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  'New': { bg: TOKENS.colors.primaryLight, text: TOKENS.colors.primary, dot: TOKENS.colors.primary },
  'Contacted': { bg: '#F0F9FF', text: '#0284C7', dot: '#0284C7' },
  'Qualified': { bg: TOKENS.colors.warningLight, text: TOKENS.colors.warning, dot: TOKENS.colors.warning },
  'Proposal': { bg: '#FDF4FF', text: '#7C3AED', dot: '#7C3AED' },
  'Converted': { bg: TOKENS.colors.successLight, text: TOKENS.colors.success, dot: TOKENS.colors.success },
  'Lost': { bg: TOKENS.colors.errorLight, text: TOKENS.colors.error, dot: TOKENS.colors.error },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
  'High': { bg: TOKENS.colors.errorLight, text: TOKENS.colors.error, icon: TOKENS.colors.error },
  'Medium': { bg: TOKENS.colors.warningLight, text: TOKENS.colors.warning, icon: TOKENS.colors.warning },
  'Low': { bg: TOKENS.colors.primaryLight, text: TOKENS.colors.secondary, icon: TOKENS.colors.secondary },
};

export default function LeadsScreen({ initialLeadId, clearInitialLeadId, openCreateModalDirectly }: LeadsScreenProps = {}) {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const insets = useSafeAreaInsets();
  
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('_all');
  const [sourceFilter, setSourceFilter] = useState('_all');
  
  const [statuses, setStatuses] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  
  // Lead Details Modal State
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'tasks'>('timeline');
  
  // Note Form State
  const [noteContent, setNoteContent] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Task Form State
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Create Lead Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    source: 'Website',
    status: 'New',
    priority: 'Medium',
    assigned_to: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    if (openCreateModalDirectly) {
      setCreateModalVisible(true);
    }
  }, [openCreateModalDirectly]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [resStatus, resUsers] = await Promise.all([
          mobileApiFetch('/api/leads/statuses'),
          mobileApiFetch('/api/users')
        ]);
        if (resStatus.ok) {
          const d = await resStatus.json();
          setStatuses(d.statuses || []);
        }
        if (resUsers.ok) {
          const d = await resUsers.json();
          setTeam(d.users || []);
        }
      } catch (err) {
        console.error('Metadata error:', err);
      }
    };
    fetchMetadata();
  }, []);

  const fetchLeads = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== '_all') params.append('status', statusFilter);
      if (sourceFilter !== '_all') params.append('source', sourceFilter);
      params.append('limit', '50');

      const res = await mobileApiFetch(`/api/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [search, statusFilter, sourceFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeads(true);
  }, [search, statusFilter, sourceFilter]);

  const fetchLeadDetail = async (leadId: number) => {
    setDetailLoading(true);
    try {
      const res = await mobileApiFetch(`/api/leads/${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLead(data.lead);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to retrieve lead details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenDetail = (lead: any) => {
    setSelectedLeadId(lead.id);
    setSelectedLead(lead);
    fetchLeadDetail(lead.id);
    setActiveTab('timeline');
    setModalVisible(true);
  };

  useEffect(() => {
    if (initialLeadId) {
      handleOpenDetail({ id: initialLeadId });
      if (clearInitialLeadId) clearInitialLeadId();
    }
  }, [initialLeadId]);

  const handleFieldChange = async (fieldName: string, value: any) => {
    if (!selectedLead) return;
    try {
      const res = await mobileApiFetch(`/api/leads/${selectedLead.id}`, {
        method: 'PUT',
        bodyData: { [fieldName]: value }
      });
      if (res.ok) {
        fetchLeadDetail(selectedLead.id);
        fetchLeads(true);
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to update lead');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim() || !selectedLead) return;
    setNoteSubmitting(true);
    try {
      const res = await mobileApiFetch(`/api/leads/${selectedLead.id}/notes`, {
        method: 'POST',
        bodyData: { note: noteContent.trim() }
      });
      if (res.ok) {
        setNoteContent('');
        fetchLeadDetail(selectedLead.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim() || !taskDueDate || !taskAssignedTo || !selectedLead) {
      Alert.alert('Required Fields', 'Title, Due Date, and Assignee are required.');
      return;
    }
    setTaskSubmitting(true);
    try {
      const res = await mobileApiFetch(`/api/leads/${selectedLead.id}/tasks`, {
        method: 'POST',
        bodyData: {
          title: taskTitle.trim(),
          description: taskDesc.trim(),
          due_date: new Date(taskDueDate).toISOString(),
          assigned_to: parseInt(taskAssignedTo, 10)
        }
      });
      if (res.ok) {
        setTaskTitle('');
        setTaskDesc('');
        setTaskDueDate('');
        setTaskAssignedTo('');
        setShowTaskForm(false);
        fetchLeadDetail(selectedLead.id);
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to create task');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleToggleTask = async (task: any) => {
    if (!selectedLead) return;
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const res = await mobileApiFetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        bodyData: { status: newStatus }
      });
      if (res.ok) {
        fetchLeadDetail(selectedLead.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to permanently delete lead "${selectedLead.first_name} ${selectedLead.last_name || ''}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Permanently', 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await mobileApiFetch(`/api/leads/${selectedLead.id}`, { method: 'DELETE' });
              if (res.ok) {
                setModalVisible(false);
                fetchLeads(true);
              }
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
  };

  const handleCreateLeadSubmit = async () => {
    if (!createForm.first_name.trim()) {
      Alert.alert('Required Field', 'Please enter at least the lead’s first name.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const payload: any = {
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim() || undefined,
        email: createForm.email.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
        source: createForm.source || 'Website',
        status: createForm.status || 'New',
        priority: createForm.priority || 'Medium',
        subject: createForm.subject.trim() || undefined,
        message: createForm.message.trim() || undefined,
      };

      if (createForm.assigned_to) {
        payload.assigned_to = parseInt(createForm.assigned_to, 10);
      }

      const res = await mobileApiFetch('/api/leads', {
        method: 'POST',
        bodyData: payload
      });

      const data = await res.json();
      if (res.ok) {
        setCreateModalVisible(false);
        setCreateForm({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          source: 'Website',
          status: 'New',
          priority: 'Medium',
          assigned_to: '',
          subject: '',
          message: '',
        });
        fetchLeads(true);
        if (data.lead?.id) {
          handleOpenDetail(data.lead);
        }
      } else {
        Alert.alert('Creation Failed', data.error || 'Failed to create lead.');
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'An error occurred while creating the lead.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDialNumber = (phoneStr?: string) => {
    if (!phoneStr) return;
    const cleanPhone = phoneStr.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Dial Error', 'Unable to initiate phone call on this device.');
    });
  };

  const handleSendEmail = (emailStr?: string) => {
    if (!emailStr) return;
    Linking.openURL(`mailto:${emailStr}`).catch(() => {
      Alert.alert('Email Error', 'Unable to open mail client.');
    });
  };

  const renderLeadItem = ({ item }: { item: any }) => {
    const statusCfg = STATUS_CONFIG[item.status] || { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' };
    const priorityCfg = PRIORITY_CONFIG[item.priority] || { bg: '#f1f5f9', text: '#475569', icon: '#64748b' };
    const fullName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unnamed Lead';
    const initial = item.first_name ? item.first_name[0].toUpperCase() : 'L';

    return (
      <TouchableOpacity 
        style={styles.leadCard} 
        onPress={() => handleOpenDetail(item)}
        activeOpacity={0.8}
      >
        {/* Top Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initial}</Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.leadName} numberOfLines={1}>{fullName}</Text>
            <View style={styles.sourceTagRow}>
              <Globe size={11} color="#64748b" />
              <Text style={styles.sourceTagText}>{item.source || 'Manual'}</Text>
              {item.priority && (
                <>
                  <Text style={styles.dotSeparator}>•</Text>
                  <View style={[styles.priorityPill, { backgroundColor: priorityCfg.bg }]}>
                    <Text style={[styles.priorityPillText, { color: priorityCfg.text }]}>
                      {item.priority}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusCfg.dot }]} />
            <Text style={[styles.statusText, { color: statusCfg.text }]}>{item.status || 'New'}</Text>
          </View>
        </View>

        {/* Contact Info Row */}
        <View style={styles.cardContactsRow}>
          {item.phone ? (
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => handleDialNumber(item.phone)}
              activeOpacity={0.7}
            >
              <View style={[styles.contactIconCircle, { backgroundColor: '#ecfdf5' }]}>
                <Phone size={11} color="#059669" />
              </View>
              <Text style={styles.contactItemText} numberOfLines={1}>{item.phone}</Text>
            </TouchableOpacity>
          ) : null}

          {item.email ? (
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => handleSendEmail(item.email)}
              activeOpacity={0.7}
            >
              <View style={[styles.contactIconCircle, { backgroundColor: '#eff6ff' }]}>
                <Mail size={11} color="#2563eb" />
              </View>
              <Text style={styles.contactItemText} numberOfLines={1}>{item.email}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.assignedUserChip}>
            <User size={12} color="#64748b" />
            <Text style={styles.assignedUserText} numberOfLines={1}>
              {item.AssignedUser?.name || 'Unassigned'}
            </Text>
          </View>

          <View style={styles.viewDetailCue}>
            <Text style={styles.viewDetailCueText}>View details</Text>
            <ChevronRight size={14} color="#94a3b8" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Modern Sticky Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.screenTitle}>Leads Directory</Text>
            <Text style={styles.screenSubtitle}>
              {leads.length} {leads.length === 1 ? 'contact' : 'contacts'} in pipeline
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.headerAddBtn}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#ffffff" strokeWidth={2.5} />
            <Text style={styles.headerAddBtnText}>Add Lead</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Search size={18} color="#2563eb" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search leads by name, email, phone..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity 
              style={[styles.filterChip, statusFilter === '_all' && styles.filterChipActive]}
              onPress={() => setStatusFilter('_all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, statusFilter === '_all' && styles.filterChipTextActive]}>
                All Status
              </Text>
            </TouchableOpacity>
            {statuses.map(s => {
              const isActive = statusFilter === s.name;
              const cfg = STATUS_CONFIG[s.name];
              return (
                <TouchableOpacity 
                  key={s.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setStatusFilter(s.name)}
                  activeOpacity={0.7}
                >
                  {cfg && (
                    <View style={[styles.filterChipDot, { backgroundColor: isActive ? '#ffffff' : cfg.dot }]} />
                  )}
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Main Leads List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading Leads...</Text>
        </View>
      ) : (
        <FlatList 
          data={leads}
          renderItem={renderLeadItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Users size={32} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>No Leads Found</Text>
              <Text style={styles.emptyText}>
                {search || statusFilter !== '_all' 
                  ? 'No contacts matched your search or active filters.'
                  : 'Start growing your business by creating your first lead.'}
              </Text>
              {(search || statusFilter !== '_all') ? (
                <TouchableOpacity 
                  style={styles.resetFiltersBtn}
                  onPress={() => { setSearch(''); setStatusFilter('_all'); }}
                >
                  <Text style={styles.resetFiltersBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.emptyActionBtn}
                  onPress={() => setCreateModalVisible(true)}
                >
                  <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyActionBtnText}>Create Lead</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Create Lead Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.createModalCard}>
            <View style={styles.createModalHeader}>
              <View>
                <Text style={styles.createModalTitle}>Create New Lead</Text>
                <Text style={styles.createModalSubtitle}>Add a prospect to your sales pipeline</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeModalBtn}
                onPress={() => setCreateModalVisible(false)}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.createModalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* First Name & Last Name */}
              <View style={styles.formRow}>
                <View style={[styles.formCol, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>FIRST NAME <Text style={{ color: '#ef4444' }}>*</Text></Text>
                  <TextInput 
                    style={styles.formInput}
                    placeholder="e.g. John"
                    placeholderTextColor="#94a3b8"
                    value={createForm.first_name}
                    onChangeText={(val) => setCreateForm(prev => ({ ...prev, first_name: val }))}
                  />
                </View>
                <View style={[styles.formCol, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>LAST NAME</Text>
                  <TextInput 
                    style={styles.formInput}
                    placeholder="e.g. Doe"
                    placeholderTextColor="#94a3b8"
                    value={createForm.last_name}
                    onChangeText={(val) => setCreateForm(prev => ({ ...prev, last_name: val }))}
                  />
                </View>
              </View>

              {/* Email & Phone */}
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>WORK EMAIL</Text>
                <TextInput 
                  style={styles.formInput}
                  placeholder="john.doe@company.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={createForm.email}
                  onChangeText={(val) => setCreateForm(prev => ({ ...prev, email: val }))}
                />
              </View>

              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                <TextInput 
                  style={styles.formInput}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={createForm.phone}
                  onChangeText={(val) => setCreateForm(prev => ({ ...prev, phone: val }))}
                />
              </View>

              {/* Source Selector */}
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>ACQUISITION SOURCE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {['Website', 'WhatsApp', 'Facebook Ads', 'Google Ads', 'Referral', 'Manual'].map(src => (
                    <TouchableOpacity 
                      key={src}
                      style={[styles.segmentChip, createForm.source === src && styles.segmentChipActive]}
                      onPress={() => setCreateForm(prev => ({ ...prev, source: src }))}
                    >
                      <Text style={[styles.segmentChipText, createForm.source === src && styles.segmentChipTextActive]}>
                        {src}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Status Selector */}
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>INITIAL STAGE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {statuses.map(st => (
                    <TouchableOpacity 
                      key={st.id}
                      style={[styles.segmentChip, createForm.status === st.name && styles.segmentChipActive]}
                      onPress={() => setCreateForm(prev => ({ ...prev, status: st.name }))}
                    >
                      <Text style={[styles.segmentChipText, createForm.status === st.name && styles.segmentChipTextActive]}>
                        {st.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Priority */}
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>DEAL PRIORITY</Text>
                <View style={styles.priorityRow}>
                  {['Low', 'Medium', 'High'].map(p => (
                    <TouchableOpacity 
                      key={p}
                      style={[styles.prioritySegmentBtn, createForm.priority === p && styles.prioritySegmentBtnActive]}
                      onPress={() => setCreateForm(prev => ({ ...prev, priority: p }))}
                    >
                      <Text style={[styles.prioritySegmentText, createForm.priority === p && styles.prioritySegmentTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Assignee */}
              {team.length > 0 && (
                <View style={styles.formCol}>
                  <Text style={styles.inputLabel}>ASSIGN TO SALES AGENT</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    <TouchableOpacity 
                      style={[styles.segmentChip, !createForm.assigned_to && styles.segmentChipActive]}
                      onPress={() => setCreateForm(prev => ({ ...prev, assigned_to: '' }))}
                    >
                      <Text style={[styles.segmentChipText, !createForm.assigned_to && styles.segmentChipTextActive]}>
                        Unassigned
                      </Text>
                    </TouchableOpacity>
                    {team.map(member => (
                      <TouchableOpacity 
                        key={member.id}
                        style={[styles.segmentChip, createForm.assigned_to === member.id.toString() && styles.segmentChipActive]}
                        onPress={() => setCreateForm(prev => ({ ...prev, assigned_to: member.id.toString() }))}
                      >
                        <Text style={[styles.segmentChipText, createForm.assigned_to === member.id.toString() && styles.segmentChipTextActive]}>
                          {member.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Subject & Message */}
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>INQUIRY SUBJECT</Text>
                <TextInput 
                  style={styles.formInput}
                  placeholder="e.g. Enterprise CRM inquiry"
                  placeholderTextColor="#94a3b8"
                  value={createForm.subject}
                  onChangeText={(val) => setCreateForm(prev => ({ ...prev, subject: val }))}
                />
              </View>

              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>REMARKS / MESSAGE</Text>
                <TextInput 
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Enter initial lead notes or requirements..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  value={createForm.message}
                  onChangeText={(val) => setCreateForm(prev => ({ ...prev, message: val }))}
                />
              </View>
            </ScrollView>

            <View style={styles.createModalFooter}>
              <TouchableOpacity 
                style={styles.cancelBtn}
                onPress={() => setCreateModalVisible(false)}
                disabled={createSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.submitBtn}
                onPress={handleCreateLeadSubmit}
                disabled={createSubmitting}
              >
                {createSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Plus size={16} color="#ffffff" strokeWidth={2.5} style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Create Lead</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Lead Details Full-Screen Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.detailContainer}>
          {/* Detail Modal Top Header */}
          <View style={[styles.detailHeader, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
            <TouchableOpacity 
              style={styles.detailBackBtn}
              onPress={() => setModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color="#0f172a" />
            </TouchableOpacity>

            <Text style={styles.detailHeaderTitle}>Lead Profile</Text>

            {currentUser?.role !== 'staff' ? (
              <TouchableOpacity 
                style={styles.deleteLeadBtn}
                onPress={handleDeleteLead}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            ) : <View style={{ width: 36 }} />}
          </View>

          {detailLoading && !selectedLead ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading lead records...</Text>
            </View>
          ) : (
            <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
              {/* Hero Contact Card */}
              <View style={styles.heroProfileCard}>
                <View style={styles.profileAvatarLarge}>
                  <Text style={styles.avatarLargeText}>
                    {selectedLead?.first_name ? selectedLead.first_name[0].toUpperCase() : 'L'}
                  </Text>
                </View>

                <Text style={styles.profileFullName}>
                  {selectedLead?.first_name} {selectedLead?.last_name || ''}
                </Text>

                <View style={styles.profileMetaRow}>
                  <Text style={styles.profileMetaText}>Source: {selectedLead?.source || 'Manual'}</Text>
                  <Text style={styles.profileMetaDot}>•</Text>
                  <Text style={styles.profileMetaText}>Assigned: {selectedLead?.AssignedUser?.name || 'Unassigned'}</Text>
                </View>

                {/* Quick Action Buttons (Call / Email) */}
                <View style={styles.quickContactsBar}>
                  <TouchableOpacity 
                    style={[styles.quickContactBtn, !selectedLead?.phone && styles.quickContactDisabled]}
                    onPress={() => handleDialNumber(selectedLead?.phone)}
                    disabled={!selectedLead?.phone}
                  >
                    <Phone size={16} color={selectedLead?.phone ? '#059669' : '#94a3b8'} />
                    <Text style={[styles.quickContactText, !selectedLead?.phone && { color: '#94a3b8' }]}>Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.quickContactBtn, !selectedLead?.email && styles.quickContactDisabled]}
                    onPress={() => handleSendEmail(selectedLead?.email)}
                    disabled={!selectedLead?.email}
                  >
                    <Mail size={16} color={selectedLead?.email ? '#2563eb' : '#94a3b8'} />
                    <Text style={[styles.quickContactText, !selectedLead?.email && { color: '#94a3b8' }]}>Email</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Status & Priority Interactive Selectors */}
              <View style={styles.selectorsCard}>
                <Text style={styles.selectorSectionTitle}>Lifecycle Stage</Text>
                <View style={styles.pickerWrapper}>
                  {statuses.map(st => {
                    const isActive = selectedLead?.status === st.name;
                    return (
                      <TouchableOpacity 
                        key={st.id} 
                        style={[styles.statusSelectChip, isActive && styles.statusSelectChipActive]}
                        onPress={() => handleFieldChange('status', st.name)}
                      >
                        <Text style={[styles.statusSelectChipText, isActive && styles.statusSelectChipTextActive]}>
                          {st.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.selectorSectionTitle, { marginTop: 16 }]}>Deal Priority</Text>
                <View style={styles.pickerWrapper}>
                  {['Low', 'Medium', 'High'].map(p => {
                    const isActive = selectedLead?.priority === p;
                    return (
                      <TouchableOpacity 
                        key={p} 
                        style={[styles.prioritySelectChip, isActive && styles.prioritySelectChipActive]}
                        onPress={() => handleFieldChange('priority', p)}
                      >
                        <Text style={[styles.prioritySelectChipText, isActive && styles.prioritySelectChipTextActive]}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Modern Segmented Tabs */}
              <View style={styles.tabNavContainer}>
                <TouchableOpacity 
                  style={[styles.tabNavItem, activeTab === 'timeline' && styles.tabNavItemActive]}
                  onPress={() => setActiveTab('timeline')}
                >
                  <Activity size={16} color={activeTab === 'timeline' ? '#2563eb' : '#64748b'} />
                  <Text style={[styles.tabNavText, activeTab === 'timeline' && styles.tabNavTextActive]}>
                    Timeline
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.tabNavItem, activeTab === 'notes' && styles.tabNavItemActive]}
                  onPress={() => setActiveTab('notes')}
                >
                  <MessageSquare size={16} color={activeTab === 'notes' ? '#2563eb' : '#64748b'} />
                  <Text style={[styles.tabNavText, activeTab === 'notes' && styles.tabNavTextActive]}>
                    Notes ({(selectedLead?.Notes || []).length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.tabNavItem, activeTab === 'tasks' && styles.tabNavItemActive]}
                  onPress={() => setActiveTab('tasks')}
                >
                  <CheckSquare size={16} color={activeTab === 'tasks' ? '#2563eb' : '#64748b'} />
                  <Text style={[styles.tabNavText, activeTab === 'tasks' && styles.tabNavTextActive]}>
                    Tasks ({(selectedLead?.Tasks || []).length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab Contents */}
              <View style={styles.tabContentArea}>
                {activeTab === 'timeline' && (
                  <View style={styles.timelineTab}>
                    {selectedLead?.message && (
                      <View style={styles.inquiryCard}>
                        <View style={styles.inquiryHeader}>
                          <Sparkles size={14} color="#2563eb" />
                          <Text style={styles.inquirySubject}>
                            {selectedLead.subject || 'Initial Inquiry'}
                          </Text>
                        </View>
                        <Text style={styles.inquiryBody}>"{selectedLead.message}"</Text>
                      </View>
                    )}

                    {(selectedLead?.Activities || []).map((act: any) => (
                      <View key={act.id} style={styles.timelineRow}>
                        <View style={styles.timelineLine} />
                        <View style={styles.timelineDot} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineAction}>{act.action}</Text>
                          <Text style={styles.timelineDesc}>{act.description}</Text>
                          <Text style={styles.timelineTime}>
                            {new Date(act.created_at || act.createdAt).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {(!selectedLead?.Activities || selectedLead.Activities.length === 0) && (
                      <Text style={styles.emptyTabText}>No activity recorded yet.</Text>
                    )}
                  </View>
                )}

                {activeTab === 'notes' && (
                  <View style={styles.notesTab}>
                    <View style={styles.addNoteBox}>
                      <TextInput 
                        style={styles.noteInput}
                        placeholder="Add a progress remark or note..."
                        placeholderTextColor="#94a3b8"
                        multiline
                        numberOfLines={3}
                        value={noteContent}
                        onChangeText={setNoteContent}
                      />
                      <TouchableOpacity 
                        style={styles.saveNoteBtn}
                        onPress={handleAddNote}
                        disabled={noteSubmitting}
                      >
                        {noteSubmitting ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={styles.saveNoteBtnText}>Add Note</Text>
                        )}
                      </TouchableOpacity>
                    </View>

                    {(selectedLead?.Notes || []).map((n: any) => (
                      <View key={n.id} style={styles.noteItemCard}>
                        <View style={styles.noteItemHeader}>
                          <Text style={styles.noteAuthor}>{n.User?.name || 'Staff'}</Text>
                          <Text style={styles.noteTimestamp}>
                            {new Date(n.created_at || n.createdAt).toLocaleString()}
                          </Text>
                        </View>
                        <Text style={styles.noteItemBody}>{n.note}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {activeTab === 'tasks' && (
                  <View style={styles.tasksTab}>
                    <View style={styles.tasksSubHeader}>
                      <Text style={styles.tasksTitle}>Associated Action Items</Text>
                      <TouchableOpacity 
                        style={styles.addTaskToggleBtn}
                        onPress={() => setShowTaskForm(!showTaskForm)}
                      >
                        <Plus size={14} color="#2563eb" style={{ marginRight: 4 }} />
                        <Text style={styles.addTaskToggleBtnText}>New Task</Text>
                      </TouchableOpacity>
                    </View>

                    {showTaskForm && (
                      <View style={styles.taskFormCard}>
                        <TextInput 
                          style={styles.formInput}
                          placeholder="Task Title (e.g. Call for demo)"
                          placeholderTextColor="#94a3b8"
                          value={taskTitle}
                          onChangeText={setTaskTitle}
                        />
                        <TextInput 
                          style={[styles.formInput, { marginTop: 8 }]}
                          placeholder="Description or checklist note"
                          placeholderTextColor="#94a3b8"
                          value={taskDesc}
                          onChangeText={setTaskDesc}
                        />
                        <TextInput 
                          style={[styles.formInput, { marginTop: 8 }]}
                          placeholder="Due Date: YYYY-MM-DD HH:MM"
                          placeholderTextColor="#94a3b8"
                          value={taskDueDate}
                          onChangeText={setTaskDueDate}
                        />

                        <Text style={[styles.inputLabel, { marginTop: 10 }]}>ASSIGN TO</Text>
                        <View style={styles.pickerWrapper}>
                          {team.map(t => (
                            <TouchableOpacity 
                              key={t.id} 
                              style={[styles.statusSelectChip, taskAssignedTo === t.id.toString() && styles.statusSelectChipActive]}
                              onPress={() => setTaskAssignedTo(t.id.toString())}
                            >
                              <Text style={[styles.statusSelectChipText, taskAssignedTo === t.id.toString() && styles.statusSelectChipTextActive]}>
                                {t.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <TouchableOpacity 
                          style={[styles.submitBtn, { marginTop: 12 }]}
                          onPress={handleAddTask}
                          disabled={taskSubmitting}
                        >
                          {taskSubmitting ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={styles.submitBtnText}>Save Task</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {(selectedLead?.Tasks || []).map((t: any) => {
                      const isCompleted = t.status === 'Completed';
                      return (
                        <TouchableOpacity 
                          key={t.id}
                          style={styles.taskItemCard}
                          onPress={() => handleToggleTask(t)}
                          activeOpacity={0.7}
                        >
                          {isCompleted ? (
                            <CheckSquare size={22} color="#059669" />
                          ) : (
                            <Square size={22} color="#94a3b8" />
                          )}
                          <View style={styles.taskTextCol}>
                            <Text style={[styles.taskTitleText, isCompleted && styles.taskTitleCompleted]}>
                              {t.title}
                            </Text>
                            {t.description ? (
                              <Text style={styles.taskDescText}>{t.description}</Text>
                            ) : null}
                            <Text style={styles.taskDueText}>
                              Due: {new Date(t.due_date).toLocaleDateString()} {new Date(t.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    {(!selectedLead?.Tasks || selectedLead.Tasks.length === 0) && (
                      <Text style={styles.emptyTabText}>No tasks assigned to this lead.</Text>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.background,
  },
  loadingText: {
    color: TOKENS.colors.secondary,
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: TOKENS.spacing.md,
    paddingBottom: 14,
    backgroundColor: TOKENS.colors.surface,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.border,
    ...TOKENS.shadows.sm,
    zIndex: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  screenTitle: {
    color: TOKENS.colors.heading,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: TOKENS.radius.md,
    gap: 4,
    shadowColor: TOKENS.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  headerAddBtnText: {
    color: TOKENS.colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.background,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: TOKENS.colors.heading,
    fontSize: 14,
    paddingVertical: 9,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterScroll: {
    paddingRight: 10,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: TOKENS.colors.primary,
    borderColor: TOKENS.colors.primary,
  },
  filterChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterChipText: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: TOKENS.colors.white,
    fontWeight: '700',
  },
  listContent: {
    padding: TOKENS.spacing.md,
    paddingBottom: 40,
  },
  leadCard: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    ...TOKENS.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitials: {
    color: TOKENS.colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  nameContainer: {
    flex: 1,
  },
  leadName: {
    color: TOKENS.colors.heading,
    fontSize: 15,
    fontWeight: '700',
  },
  sourceTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  sourceTagText: {
    color: TOKENS.colors.secondary,
    fontSize: 11,
    fontWeight: '500',
  },
  dotSeparator: {
    color: TOKENS.colors.border,
    fontSize: 10,
  },
  priorityPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  priorityPillText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardContactsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.border,
    marginVertical: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactItemText: {
    color: TOKENS.colors.heading,
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 160,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  assignedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  assignedUserText: {
    color: TOKENS.colors.secondary,
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 160,
  },
  viewDetailCue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailCueText: {
    color: TOKENS.colors.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TOKENS.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: TOKENS.colors.heading,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: TOKENS.colors.secondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  resetFiltersBtn: {
    backgroundColor: TOKENS.colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  resetFiltersBtnText: {
    color: TOKENS.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: TOKENS.radius.md,
  },
  emptyActionBtnText: {
    color: TOKENS.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 24, 40, 0.45)',
    justifyContent: 'flex-end',
  },
  createModalCard: {
    backgroundColor: TOKENS.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  createModalTitle: {
    color: TOKENS.colors.heading,
    fontSize: 17,
    fontWeight: '800',
  },
  createModalSubtitle: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createModalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  formCol: {
    marginBottom: 12,
  },
  inputLabel: {
    color: TOKENS.colors.heading,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: TOKENS.colors.background,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TOKENS.colors.heading,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  chipScroll: {
    paddingVertical: 2,
  },
  segmentChip: {
    backgroundColor: TOKENS.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: TOKENS.radius.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    marginRight: 8,
  },
  segmentChipActive: {
    backgroundColor: TOKENS.colors.primary,
    borderColor: TOKENS.colors.primary,
  },
  segmentChipText: {
    color: TOKENS.colors.heading,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentChipTextActive: {
    color: TOKENS.colors.white,
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prioritySegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: TOKENS.radius.sm,
    backgroundColor: TOKENS.colors.background,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    alignItems: 'center',
  },
  prioritySegmentBtnActive: {
    backgroundColor: TOKENS.colors.primary,
    borderColor: TOKENS.colors.primary,
  },
  prioritySegmentText: {
    color: TOKENS.colors.heading,
    fontSize: 12,
    fontWeight: '600',
  },
  prioritySegmentTextActive: {
    color: TOKENS.colors.white,
    fontWeight: '700',
  },
  createModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: TOKENS.colors.border,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: TOKENS.radius.md,
    backgroundColor: TOKENS.colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  cancelBtnText: {
    color: TOKENS.colors.heading,
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: TOKENS.radius.md,
    backgroundColor: TOKENS.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: TOKENS.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: TOKENS.colors.background,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: TOKENS.colors.surface,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  detailBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeaderTitle: {
    color: TOKENS.colors.heading,
    fontSize: 16,
    fontWeight: '800',
  },
  deleteLeadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailScroll: {
    flex: 1,
    padding: 16,
  },
  heroProfileCard: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.xl,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    ...TOKENS.shadows.card,
    marginBottom: 16,
  },
  profileAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: TOKENS.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    color: TOKENS.colors.primary,
    fontSize: 24,
    fontWeight: '900',
  },
  profileFullName: {
    color: TOKENS.colors.heading,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  profileMetaText: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  profileMetaDot: {
    color: TOKENS.colors.border,
    fontSize: 10,
  },
  quickContactsBar: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    borderTopWidth: 1,
    borderColor: TOKENS.colors.border,
    paddingTop: 14,
  },
  quickContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.background,
    paddingVertical: 10,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    gap: 6,
  },
  quickContactDisabled: {
    opacity: 0.5,
  },
  quickContactText: {
    color: TOKENS.colors.heading,
    fontSize: 13,
    fontWeight: '700',
  },
  selectorsCard: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    ...TOKENS.shadows.card,
    marginBottom: 16,
  },
  selectorSectionTitle: {
    color: TOKENS.colors.heading,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  pickerWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusSelectChip: {
    backgroundColor: TOKENS.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: TOKENS.radius.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  statusSelectChipActive: {
    backgroundColor: TOKENS.colors.primary,
    borderColor: TOKENS.colors.primary,
  },
  statusSelectChipText: {
    color: TOKENS.colors.heading,
    fontSize: 12,
    fontWeight: '600',
  },
  statusSelectChipTextActive: {
    color: TOKENS.colors.white,
    fontWeight: '700',
  },
  prioritySelectChip: {
    backgroundColor: TOKENS.colors.background,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: TOKENS.radius.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  prioritySelectChipActive: {
    backgroundColor: TOKENS.colors.warning,
    borderColor: TOKENS.colors.warning,
  },
  prioritySelectChipText: {
    color: TOKENS.colors.heading,
    fontSize: 12,
    fontWeight: '600',
  },
  prioritySelectChipTextActive: {
    color: TOKENS.colors.white,
    fontWeight: '700',
  },
  tabNavContainer: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.background,
    borderRadius: TOKENS.radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    marginBottom: 14,
  },
  tabNavItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: TOKENS.radius.sm,
    gap: 6,
  },
  tabNavItemActive: {
    backgroundColor: TOKENS.colors.surface,
    ...TOKENS.shadows.sm,
  },
  tabNavText: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabNavTextActive: {
    color: TOKENS.colors.primary,
    fontWeight: '700',
  },
  tabContentArea: {
    marginBottom: 40,
  },
  timelineTab: {
    gap: 12,
  },
  inquiryCard: {
    backgroundColor: TOKENS.colors.primaryLight,
    borderRadius: TOKENS.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.primaryBorder,
    marginBottom: 8,
  },
  inquiryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  inquirySubject: {
    color: TOKENS.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  inquiryBody: {
    color: TOKENS.colors.heading,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  timelineRow: {
    flexDirection: 'row',
    position: 'relative',
    paddingLeft: 20,
    paddingBottom: 16,
  },
  timelineLine: {
    position: 'absolute',
    left: 7,
    top: 10,
    bottom: -6,
    width: 2,
    backgroundColor: TOKENS.colors.border,
  },
  timelineDot: {
    position: 'absolute',
    left: 4,
    top: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TOKENS.colors.primary,
  },
  timelineContent: {
    flex: 1,
  },
  timelineAction: {
    color: TOKENS.colors.heading,
    fontSize: 13,
    fontWeight: '700',
  },
  timelineDesc: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  timelineTime: {
    color: TOKENS.colors.secondary,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  notesTab: {
    gap: 12,
  },
  addNoteBox: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  noteInput: {
    backgroundColor: TOKENS.colors.background,
    borderRadius: TOKENS.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    color: TOKENS.colors.heading,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  saveNoteBtn: {
    backgroundColor: TOKENS.colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: TOKENS.radius.sm,
    alignSelf: 'flex-end',
  },
  saveNoteBtnText: {
    color: TOKENS.colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  noteItemCard: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  noteItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteAuthor: {
    color: TOKENS.colors.heading,
    fontSize: 13,
    fontWeight: '700',
  },
  noteTimestamp: {
    color: TOKENS.colors.secondary,
    fontSize: 11,
    fontWeight: '500',
  },
  noteItemBody: {
    color: TOKENS.colors.heading,
    fontSize: 13,
    lineHeight: 18,
  },
  tasksTab: {
    gap: 12,
  },
  tasksSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tasksTitle: {
    color: TOKENS.colors.heading,
    fontSize: 14,
    fontWeight: '700',
  },
  addTaskToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addTaskToggleBtnText: {
    color: TOKENS.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  taskFormCard: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    marginBottom: 10,
  },
  taskItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    gap: 12,
  },
  taskTextCol: {
    flex: 1,
  },
  taskTitleText: {
    color: TOKENS.colors.heading,
    fontSize: 13,
    fontWeight: '700',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: TOKENS.colors.secondary,
  },
  taskDescText: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  taskDueText: {
    color: TOKENS.colors.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyTabText: {
    color: TOKENS.colors.secondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
});
