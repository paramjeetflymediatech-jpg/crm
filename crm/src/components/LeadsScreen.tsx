import React, { useState, useEffect, useCallback } from 'react';
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
  Alert
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { mobileApiFetch } from '../api/client';
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  X, 
  Plus, 
  CheckSquare, 
  Square,
  MessageSquare,
  Activity
} from 'lucide-react-native';

interface LeadsScreenProps {
  initialLeadId?: number | null;
  clearInitialLeadId?: () => void;
}

export default function LeadsScreen({ initialLeadId, clearInitialLeadId }: LeadsScreenProps = {}) {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('_all');
  const [sourceFilter, setSourceFilter] = useState('_all');
  
  const [statuses, setStatuses] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'tasks'>('timeline');
  
  const [noteContent, setNoteContent] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

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
      Alert.alert('Error', 'Title, Due Date, and Assignee are required.');
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
    try {
      const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
      const res = await mobileApiFetch(`/api/tasks`, {
        method: 'PUT',
        bodyData: { id: task.id, status: nextStatus }
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
      'Are you sure you want to permanently delete this lead?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
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

  const renderLeadItem = ({ item }: { item: any }) => {
    const isNew = item.status === 'New';
    const isConverted = item.status === 'Converted';
    
    return (
      <TouchableOpacity 
        style={styles.leadCard} 
        onPress={() => handleOpenDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.leadHeader}>
          <Text style={styles.leadName}>{item.first_name} {item.last_name || ''}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: isNew ? 'rgba(14, 165, 233, 0.15)' : isConverted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: isNew ? '#38bdf8' : isConverted ? '#34d399' : '#cbd5e1' }
            ]}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.leadSource}>WordPress: {item.source || 'Manual'}</Text>
        
        {item.email && (
          <View style={styles.metaRow}>
            <Mail size={12} color="#64748b" style={styles.metaIcon} />
            <Text style={styles.metaText}>{item.email}</Text>
          </View>
        )}

        {item.assigned_to && (
          <View style={styles.metaRow}>
            <User size={12} color="#64748b" style={styles.metaIcon} />
            <Text style={styles.metaText}>Assigned: {item.AssignedUser?.name || 'Unassigned'}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchWrapper}>
          <Search size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search leads..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity 
              style={[styles.filterChip, statusFilter === '_all' && styles.filterChipActive]}
              onPress={() => setStatusFilter('_all')}
            >
              <Text style={[styles.filterChipText, statusFilter === '_all' && styles.filterChipTextActive]}>All Status</Text>
            </TouchableOpacity>
            {statuses.map(s => (
              <TouchableOpacity 
                key={s.id}
                style={[styles.filterChip, statusFilter === s.name && styles.filterChipActive]}
                onPress={() => setStatusFilter(s.name)}
              >
                <Text style={[styles.filterChipText, statusFilter === s.name && styles.filterChipTextActive]}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList 
          data={leads}
          renderItem={renderLeadItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No leads matched your filters.</Text>
            </View>
          }
        />
      )}

      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Lead Details</Text>
            {currentUser?.role !== 'staff' ? (
              <TouchableOpacity onPress={handleDeleteLead}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            ) : <View style={{ width: 40 }} />}
          </View>

          {detailLoading && !selectedLead ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#6366f1" />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView style={styles.modalScroll}>
                <View style={styles.modalProfileCard}>
                  <View style={styles.profileAvatar}>
                    <Text style={styles.avatarLetter}>
                      {selectedLead?.first_name ? selectedLead.first_name[0].toUpperCase() : ''}
                    </Text>
                  </View>
                  <Text style={styles.profileName}>
                    {selectedLead?.first_name} {selectedLead?.last_name || ''}
                  </Text>
                  <Text style={styles.profileSource}>Source: {selectedLead?.source || 'Manual'}</Text>
                </View>

                <View style={styles.detailsSection}>
                  <View style={styles.detailItem}>
                    <Mail size={16} color="#64748b" style={styles.detailIcon} />
                    <Text style={styles.detailVal}>{selectedLead?.email || 'No email'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Phone size={16} color="#64748b" style={styles.detailIcon} />
                    <Text style={styles.detailVal}>{selectedLead?.phone || 'No phone'}</Text>
                  </View>
                </View>

                <View style={styles.selectorsCard}>
                  <Text style={styles.selectorLabel}>Status</Text>
                  <View style={styles.pickerWrapper}>
                    {statuses.map(st => (
                      <TouchableOpacity 
                        key={st.id} 
                        style={[styles.smallChip, selectedLead?.status === st.name && styles.smallChipActive]}
                        onPress={() => handleFieldChange('status', st.name)}
                      >
                        <Text style={[styles.smallChipText, selectedLead?.status === st.name && styles.smallChipTextActive]}>{st.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.selectorLabel, { marginTop: 16 }]}>Priority</Text>
                  <View style={styles.pickerWrapper}>
                    {['Low', 'Medium', 'High'].map(p => (
                      <TouchableOpacity 
                        key={p} 
                        style={[styles.smallChip, selectedLead?.priority === p && styles.smallChipActive]}
                        onPress={() => handleFieldChange('priority', p)}
                      >
                        <Text style={[styles.smallChipText, selectedLead?.priority === p && styles.smallChipTextActive]}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.tabsHeader}>
                  <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'timeline' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('timeline')}
                  >
                    <Activity size={16} color={activeTab === 'timeline' ? '#818cf8' : '#64748b'} />
                    <Text style={[styles.tabText, activeTab === 'timeline' && styles.tabTextActive]}>Timeline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'notes' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('notes')}
                  >
                    <MessageSquare size={16} color={activeTab === 'notes' ? '#818cf8' : '#64748b'} />
                    <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>Notes</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'tasks' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('tasks')}
                  >
                    <CheckSquare size={16} color={activeTab === 'tasks' ? '#818cf8' : '#64748b'} />
                    <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>Tasks</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.tabContentContainer}>
                  {activeTab === 'timeline' && (
                    <View style={styles.timelineTab}>
                      {selectedLead?.message && (
                        <View style={styles.inquiryBox}>
                          <Text style={styles.inquirySubject}>Subject: {selectedLead.subject || 'Inquiry'}</Text>
                          <Text style={styles.inquiryBody}>"{selectedLead.message}"</Text>
                        </View>
                      )}
                      {(selectedLead?.Activities || []).map((act: any) => (
                        <View key={act.id} style={styles.timelineRow}>
                          <View style={styles.timelineDot} />
                          <View style={styles.timelineTextContainer}>
                            <Text style={styles.timelineAction}>{act.action}</Text>
                            <Text style={styles.timelineDesc}>{act.description}</Text>
                            <Text style={styles.timelineTime}>{new Date(act.created_at || act.createdAt).toLocaleString()}</Text>
                          </View>
                        </View>
                      ))}
                      {(!selectedLead?.Activities || selectedLead.Activities.length === 0) && (
                        <Text style={styles.emptyTabText}>No activity logged.</Text>
                      )}
                    </View>
                  )}

                  {activeTab === 'notes' && (
                    <View style={styles.notesTab}>
                      <View style={styles.addNoteContainer}>
                        <TextInput 
                          style={styles.noteInput}
                          placeholder="Type a new comment..."
                          placeholderTextColor="#64748b"
                          multiline
                          numberOfLines={3}
                          value={noteContent}
                          onChangeText={setNoteContent}
                        />
                        <TouchableOpacity 
                          style={styles.noteSubmitBtn}
                          onPress={handleAddNote}
                          disabled={noteSubmitting}
                        >
                          {noteSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Add Note</Text>}
                        </TouchableOpacity>
                      </View>

                      {(selectedLead?.Notes || []).map((note: any) => (
                        <View key={note.id} style={styles.noteCard}>
                          <View style={styles.noteHeader}>
                            <Text style={styles.noteUser}>{note.User?.name || 'User'}</Text>
                            <Text style={styles.noteTime}>{new Date(note.created_at || note.createdAt).toLocaleString()}</Text>
                          </View>
                          <Text style={styles.noteText}>{note.note}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {activeTab === 'tasks' && (
                    <View style={styles.tasksTab}>
                      <View style={styles.tasksSubHeader}>
                        <Text style={styles.tasksTitle}>Tasks Checklist</Text>
                        <TouchableOpacity 
                          style={styles.addTaskBtn}
                          onPress={() => setShowTaskForm(!showTaskForm)}
                        >
                          <Plus size={14} color="#818cf8" style={{ marginRight: 4 }} />
                          <Text style={styles.addTaskBtnText}>Add Task</Text>
                        </TouchableOpacity>
                      </View>

                      {showTaskForm && (
                        <View style={styles.addTaskForm}>
                          <TextInput 
                            style={styles.taskInput}
                            placeholder="Task title"
                            placeholderTextColor="#64748b"
                            value={taskTitle}
                            onChangeText={setTaskTitle}
                          />
                          <TextInput 
                            style={styles.taskInput}
                            placeholder="Description"
                            placeholderTextColor="#64748b"
                            value={taskDesc}
                            onChangeText={setTaskDesc}
                          />
                          <TextInput 
                            style={styles.taskInput}
                            placeholder="Due Date (YYYY-MM-DD HH:MM)"
                            placeholderTextColor="#64748b"
                            value={taskDueDate}
                            onChangeText={setTaskDueDate}
                          />
                          <View style={styles.pickerWrapper}>
                            {team.map(t => (
                              <TouchableOpacity 
                                key={t.id} 
                                style={[styles.smallChip, taskAssignedTo === t.id.toString() && styles.smallChipActive]}
                                onPress={() => setTaskAssignedTo(t.id.toString())}
                              >
                                <Text style={[styles.smallChipText, taskAssignedTo === t.id.toString() && styles.smallChipTextActive]}>{t.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <TouchableOpacity 
                            style={styles.noteSubmitBtn}
                            onPress={handleAddTask}
                            disabled={taskSubmitting}
                          >
                            {taskSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>Save Task</Text>}
                          </TouchableOpacity>
                        </View>
                      )}

                      {(selectedLead?.Tasks || []).map((t: any) => {
                        const isCompleted = t.status === 'Completed';
                        return (
                          <TouchableOpacity 
                            key={t.id}
                            style={styles.taskItem}
                            onPress={() => handleToggleTask(t)}
                          >
                            {isCompleted ? <CheckSquare size={20} color="#6366f1" /> : <Square size={20} color="#64748b" />}
                            <View style={styles.taskTextCol}>
                              <Text style={[styles.taskItemTitle, isCompleted && styles.taskCompleted]}>{t.title}</Text>
                              {t.description && <Text style={styles.taskItemDesc}>{t.description}</Text>}
                              <Text style={styles.taskItemDue}>Due: {new Date(t.due_date).toLocaleDateString()} {new Date(t.due_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                      {(!selectedLead?.Tasks || selectedLead.Tasks.length === 0) && (
                        <Text style={styles.emptyTabText}>No tasks assigned.</Text>
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 10,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterScroll: {
    paddingRight: 10,
  },
  filterChip: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  leadCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  leadName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  leadSource: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    flex: 1,
    padding: 20,
  },
  modalProfileCard: {
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  profileAvatar: {
    backgroundColor: '#6366f1',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileSource: {
    color: '#94a3b8',
    fontSize: 13,
  },
  detailsSection: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailIcon: {
    marginRight: 12,
  },
  detailVal: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  selectorsCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 20,
  },
  selectorLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  pickerWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smallChip: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#475569',
  },
  smallChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  smallChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  smallChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  tabsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    borderColor: '#6366f1',
  },
  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#818cf8',
    fontWeight: '600',
  },
  tabContentContainer: {
    paddingBottom: 60,
  },
  timelineTab: {
    paddingLeft: 4,
  },
  inquiryBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  inquirySubject: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  inquiryBody: {
    color: '#cbd5e1',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
    marginTop: 6,
    marginRight: 12,
  },
  timelineTextContainer: {
    flex: 1,
  },
  timelineAction: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  timelineDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  timelineTime: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
  },
  emptyTabText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  notesTab: {},
  addNoteContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginBottom: 16,
  },
  noteInput: {
    color: '#ffffff',
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: 'top',
    padding: 8,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
    marginBottom: 10,
  },
  noteSubmitBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  noteCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  noteUser: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '600',
  },
  noteTime: {
    color: '#64748b',
    fontSize: 10,
  },
  noteText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  tasksTab: {},
  tasksSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tasksTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addTaskBtnText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '600',
  },
  addTaskForm: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginBottom: 16,
  },
  taskInput: {
    color: '#ffffff',
    fontSize: 13,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
    padding: 8,
    marginBottom: 10,
  },
  taskItem: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  taskTextCol: {
    marginLeft: 12,
    flex: 1,
  },
  taskItemTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  taskItemDesc: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 2,
  },
  taskItemDue: {
    color: '#f87171',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
});
