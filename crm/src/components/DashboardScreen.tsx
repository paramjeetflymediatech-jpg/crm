import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { mobileApiFetch } from '../api/client';
import { Users, AlertCircle, TrendingUp, Sparkles, CheckCircle2, ListTodo, Bell } from 'lucide-react-native';

interface DashboardScreenProps {
  onNotificationPress?: () => void;
  unreadCount?: number;
}

export default function DashboardScreen({ onNotificationPress, unreadCount = 0 }: DashboardScreenProps) {
  const user = useSelector((state: RootState) => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const res = await mobileApiFetch('/api/reports');
      if (!res.ok) {
        throw new Error('Failed to load dashboard metrics');
      }
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not fetch dashboard reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading Metrics...</Text>
      </View>
    );
  }

  const summary = data?.summary || {
    totalLeads: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    convertedLeads: 0,
    lostLeads: 0,
    followupsToday: 0,
    conversionRate: 0
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeText}>Hello, {user?.name || 'User'}</Text>
          <Text style={styles.companyText}>{user?.companyName || 'System Tenant'}</Text>
        </View>
        {onNotificationPress && (
          <TouchableOpacity 
            style={styles.bellButton} 
            onPress={onNotificationPress}
            activeOpacity={0.7}
          >
            <Bell size={22} color="#cbd5e1" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {error && (
          <View style={styles.errorCard}>
            <AlertCircle size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.grid}>
          <View style={[styles.card, styles.col6]}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Users size={20} color="#818cf8" />
            </View>
            <Text style={styles.cardVal}>{summary.totalLeads}</Text>
            <Text style={styles.cardLbl}>Total Leads</Text>
          </View>

          <View style={[styles.card, styles.col6]}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
              <Sparkles size={20} color="#38bdf8" />
            </View>
            <Text style={styles.cardVal}>{summary.newLeads}</Text>
            <Text style={styles.cardLbl}>New Leads</Text>
          </View>

          <View style={[styles.card, styles.col6]}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <TrendingUp size={20} color="#fbbf24" />
            </View>
            <Text style={styles.cardVal}>{summary.qualifiedLeads}</Text>
            <Text style={styles.cardLbl}>Qualified</Text>
          </View>

          <View style={[styles.card, styles.col6]}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <CheckCircle2 size={20} color="#34d399" />
            </View>
            <Text style={styles.cardVal}>{summary.convertedLeads}</Text>
            <Text style={styles.cardLbl}>Converted</Text>
          </View>

          <View style={[styles.card, styles.col6]}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <ListTodo size={20} color="#f87171" />
            </View>
            <Text style={styles.cardVal}>{summary.followupsToday}</Text>
            <Text style={styles.cardLbl}>Follow-ups Today</Text>
          </View>

          <View style={[styles.card, styles.col6]}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <TrendingUp size={20} color="#c084fc" />
            </View>
            <Text style={styles.cardVal}>{summary.conversionRate}%</Text>
            <Text style={styles.cardLbl}>Conversion Rate</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pipeline Breakdown</Text>
          <View style={styles.pipelineContainer}>
            <View style={styles.pipelineHeader}>
              <Text style={styles.pipelineText}>Status</Text>
              <Text style={styles.pipelineText}>Count</Text>
            </View>
            {(data?.charts?.leadPipeline || []).map((item: any, idx: number) => (
              <View key={idx} style={styles.pipelineRow}>
                <View style={styles.pipelineNameCol}>
                  <View style={[styles.indicatorDot, { backgroundColor: ['#6366f1', '#38bdf8', '#fbbf24', '#34d399', '#f87171', '#c084fc'][idx % 6] }]} />
                  <Text style={styles.pipelineName}>{item.name}</Text>
                </View>
                <Text style={styles.pipelineValue}>{item.value}</Text>
              </View>
            ))}
            {(!data?.charts?.leadPipeline || data.charts.leadPipeline.length === 0) && (
              <Text style={styles.emptyText}>No leads in pipeline.</Text>
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
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  bellBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  companyText: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  col6: {
    width: '48%',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardVal: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardLbl: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  pipelineContainer: {
    width: '100%',
  },
  pipelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#334155',
    paddingBottom: 8,
    marginBottom: 8,
  },
  pipelineText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  pipelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  pipelineNameCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  pipelineName: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '500',
  },
  pipelineValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
