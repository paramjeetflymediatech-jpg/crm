import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  RefreshControl 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mobileApiFetch } from '../api/client';
import { TOKENS } from '../theme/tokens';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, ArrowRight, AlertCircle, Bell } from 'lucide-react-native';

interface CalendarScreenProps {
  onNavigateToLeads: (leadId: number) => void;
  onNotificationPress?: () => void;
  unreadCount?: number;
}

export default function CalendarScreen({ onNavigateToLeads, onNotificationPress, unreadCount = 0 }: CalendarScreenProps) {
  const insets = useSafeAreaInsets();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setError(null);
      const res = await mobileApiFetch('/api/leads?limit=100');
      if (res.ok) {
        const d = await res.json();
        
        // Filter leads that have follow-up dates set OR are in "Follow-up" status
        const followUpTasks = (d.leads || [])
          .filter((l: any) => l.follow_up_date || l.status === 'Follow-up' || l.status?.toLowerCase() === 'follow-up')
          .map((l: any) => {
            const dateVal = l.follow_up_date || l.updated_at || l.updatedAt || l.created_at || l.createdAt;
            const hasExplicitDate = !!l.follow_up_date;
            return {
              id: `lead-${l.id}`,
              title: `Follow-up with ${l.first_name} ${l.last_name || ''}${!hasExplicitDate ? ' (Unscheduled)' : ''}`,
              date: new Date(dateVal),
              leadId: l.id,
              description: l.subject || 'Follow-up discussion',
              assignee: l.AssignedUser?.name || 'Unassigned',
              status: l.status,
              priority: l.priority || 'Medium'
            };
          });

        setTasks(followUpTasks);
      } else {
        throw new Error('Failed to load tasks.');
      }
    } catch (err: any) {
      console.error('Error fetching calendar data:', err);
      setError(err.message || 'Could not fetch follow-up items.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, []);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (y: number, m: number) => {
    return new Date(y, m, 1).getDay();
  };

  const totalDays = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const cells = [];
  // Empty alignment cells
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, date: null });
  }
  // Month days
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, date: new Date(year, month, d) });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const hasTasksOnDate = (date: Date) => {
    return tasks.some(task => {
      const d = new Date(task.date);
      return (
        d.getDate() === date.getDate() &&
        d.getMonth() === date.getMonth() &&
        d.getFullYear() === date.getFullYear()
      );
    });
  };

  // Filter tasks due on selectedDate
  const selectedTasks = tasks.filter(task => {
    const d = new Date(task.date);
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    );
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.infoText}>Loading Calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Follow-up Calendar</Text>
          <Text style={styles.headerSubtitle}>Check scheduled appointments and lead actions</Text>
        </View>
        {onNotificationPress && (
          <TouchableOpacity 
            style={styles.bellButton} 
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <Bell size={20} color={TOKENS.colors.heading} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
      >
        {error && (
          <View style={styles.errorCard}>
            <AlertCircle size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Visual Calendar Card */}
        <View style={styles.calendarCard}>
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
              <ChevronLeft size={20} color="#2563eb" />
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthNames[month]} {year}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
              <ChevronRight size={20} color="#2563eb" />
            </TouchableOpacity>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekLabels}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label, index) => (
              <Text key={index} style={styles.weekLabel}>{label}</Text>
            ))}
          </View>

          {/* Grid Cells */}
          <View style={styles.grid}>
            {cells.map((cell, idx) => {
              if (cell.day === null || cell.date === null) {
                return <View key={idx} style={styles.cell} />;
              }

              const isSelected = 
                selectedDate.getDate() === cell.day &&
                selectedDate.getMonth() === cell.date.getMonth() &&
                selectedDate.getFullYear() === cell.date.getFullYear();

              const hasTask = hasTasksOnDate(cell.date);

              return (
                <TouchableOpacity 
                  key={idx} 
                  style={[
                    styles.cell, 
                    isSelected && styles.cellSelected
                  ]}
                  onPress={() => cell.date && setSelectedDate(cell.date)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.cellText,
                    isSelected && styles.cellTextSelected,
                    hasTask && !isSelected && styles.cellTextWithTask
                  ]}>
                    {cell.day}
                  </Text>
                  {hasTask && (
                    <View style={[
                      styles.dot, 
                      isSelected ? styles.dotSelected : styles.dotActive
                    ]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
              <Text style={styles.legendText}>Days with follow-ups scheduled</Text>
            </View>
          </View>
        </View>

        {/* Agenda Section */}
        <View style={styles.agendaCard}>
          <View style={styles.agendaHeader}>
            <Text style={styles.agendaTitle}>
              Agenda for {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <Text style={styles.agendaSubtitle}>
              {selectedTasks.length} follow-ups scheduled
            </Text>
          </View>

          <View style={styles.agendaList}>
            {selectedTasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <CalendarIcon size={32} color="#64748b" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyText}>No follow-ups scheduled for this day.</Text>
              </View>
            ) : (
              selectedTasks.map((task) => {
                const priorityBg = task.priority === 'High' ? TOKENS.colors.errorLight :
                  task.priority === 'Medium' ? TOKENS.colors.warningLight :
                  TOKENS.colors.primaryLight;
                const priorityColor = task.priority === 'High' ? TOKENS.colors.error :
                  task.priority === 'Medium' ? TOKENS.colors.warning :
                  TOKENS.colors.secondary;

                return (
                  <TouchableOpacity 
                    key={task.id}
                    style={styles.taskCard}
                    onPress={() => onNavigateToLeads(task.leadId)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <View style={[styles.priorityBadge, { backgroundColor: priorityBg }]}>
                        <Text style={[styles.priorityText, { color: priorityColor }]}>
                          {task.priority}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.taskDesc}>{task.description}</Text>

                    <View style={styles.taskFooter}>
                      <View style={styles.assigneeContainer}>
                        <User size={12} color={TOKENS.colors.secondary} style={{ marginRight: 4 }} />
                        <Text style={styles.assigneeText}>Rep: {task.assignee}</Text>
                      </View>
                      <View style={styles.viewLinkContainer}>
                        <Text style={styles.viewLinkText}>View Profile</Text>
                        <ArrowRight size={12} color={TOKENS.colors.primary} style={{ marginLeft: 2 }} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
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
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: TOKENS.spacing.md,
    paddingBottom: 16,
    backgroundColor: TOKENS.colors.surface,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...TOKENS.shadows.sm,
    zIndex: 10,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  bellBadge: {
    position: 'absolute',
    right: 2,
    top: 2,
    backgroundColor: TOKENS.colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: TOKENS.colors.white,
    fontSize: 8,
    fontWeight: 'bold',
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
    fontWeight: '500',
    marginTop: 2,
  },
  scrollContent: {
    padding: TOKENS.spacing.md,
    paddingBottom: 40,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: TOKENS.radius.md,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: TOKENS.colors.error,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
  calendarCard: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    padding: 16,
    marginBottom: 18,
    ...TOKENS.shadows.card,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TOKENS.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  monthText: {
    color: TOKENS.colors.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  weekLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekLabel: {
    width: '14.28%',
    color: TOKENS.colors.secondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cell: {
    width: '14.28%',
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: TOKENS.radius.sm,
    position: 'relative',
  },
  cellSelected: {
    backgroundColor: TOKENS.colors.primary,
  },
  cellText: {
    color: TOKENS.colors.heading,
    fontSize: 14,
    fontWeight: '500',
  },
  cellTextSelected: {
    color: TOKENS.colors.white,
    fontWeight: '700',
  },
  cellTextWithTask: {
    color: TOKENS.colors.primary,
    fontWeight: '700',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
  dotActive: {
    backgroundColor: TOKENS.colors.primary,
  },
  dotSelected: {
    backgroundColor: TOKENS.colors.white,
  },
  legend: {
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: TOKENS.colors.border,
    paddingTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  agendaCard: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    padding: 16,
    ...TOKENS.shadows.card,
  },
  agendaHeader: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.border,
    paddingBottom: 12,
  },
  agendaTitle: {
    color: TOKENS.colors.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  agendaSubtitle: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  agendaList: {
    minHeight: 120,
  },
  emptyContainer: {
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: TOKENS.colors.secondary,
    fontSize: 13,
    fontStyle: 'italic',
  },
  taskCard: {
    backgroundColor: TOKENS.colors.background,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    padding: 14,
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitle: {
    color: TOKENS.colors.heading,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  taskDesc: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: TOKENS.colors.border,
    paddingTop: 8,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeText: {
    color: TOKENS.colors.secondary,
    fontSize: 11,
  },
  viewLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewLinkText: {
    color: TOKENS.colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
});
