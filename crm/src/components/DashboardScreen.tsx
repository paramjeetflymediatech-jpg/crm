import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator,
  TouchableOpacity,
  Image
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { mobileApiFetch, getImageUrl } from '../api/client';
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
        <ActivityIndicator size="large" color="#2563eb" />
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
        <View style={styles.headerRight}>
          {onNotificationPress && (
            <TouchableOpacity 
              style={styles.bellButton} 
              onPress={onNotificationPress}
              activeOpacity={0.7}
            >
              <Bell size={20} color="#2563eb" />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Top Right Logo / Avatar Image */}
          <View style={styles.headerAvatar}>
            {getImageUrl(user?.companyLogo || user?.avatar) ? (
              <Image 
                source={{ uri: getImageUrl(user?.companyLogo || user?.avatar)! }}
                style={styles.headerAvatarImg}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.headerAvatarText}>
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </Text>
            )}
          </View>
        </View>
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

        <View style={styles.grid}>
          <View style={[styles.card, styles.col6]}>
            <View style={[styles.iconWrapper, { backgroundColor: '#eff6ff' }]}>
              <Users size={20} color="#2563eb" />
            </View>
            <Text style={styles.cardVal}>{summary.totalLeads}</Text>
            <Text style={styles.cardLbl}>Total Leads</Text>
          </View>

          <View style={[styles.card, styles.col6]}>
            <View style={[styles.iconWrapper, { backgroundColor: '#eff6ff' }]}>
              <Sparkles size={20} color="#0284c7" />
            </View>
            <Text style={styles.cardVal}>{summary.newLeads}</Text>
            <Text style={styles.cardLbl}>New Leads</Text>
          </View>

          <View style={[styles.card, styles.col6]}>
            <View style={[styles.iconWrapper, { backgroundColor: '#fffbeb' }]}>
              <TrendingUp size={20} color="#d97706" />
            </View>
            <Text style={styles.cardVal}>{summary.qualifiedLeads}</Text>
            <Text style={styles.cardLbl}>Qualified</Text>
          </View>

          <View style={[styles.card, styles.col6]}>
            <View style={[styles.iconWrapper, { backgroundColor: '#ecfdf5' }]}>
              <CheckCircle2 size={20} color="#059669" />
            </View>
            <Text style={styles.cardVal}>{summary.convertedLeads}</Text>
            <Text style={styles.cardLbl}>Converted</Text>
          </View>

          <View style={[styles.card, styles.col6]}>
            <View style={[styles.iconWrapper, { backgroundColor: '#fef2f2' }]}>
              <ListTodo size={20} color="#dc2626" />
            </View>
            <Text style={styles.cardVal}>{summary.followupsToday}</Text>
            <Text style={styles.cardLbl}>Follow-ups Today</Text>
          </View>

          <View style={[styles.card, styles.col6]}>
            <View style={[styles.iconWrapper, { backgroundColor: '#faf5ff' }]}>
              <TrendingUp size={20} color="#9333ea" />
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
                  <View style={[styles.indicatorDot, { backgroundColor: ['#2563eb', '#0284c7', '#d97706', '#059669', '#dc2626', '#9333ea'][idx % 6] }]} />
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
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  headerAvatarText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '700',
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
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
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  companyText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 12,
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
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardVal: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardLbl: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  pipelineContainer: {
    width: '100%',
  },
  pipelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
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
    borderColor: '#f1f5f9',
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
    color: '#334155',
    fontSize: 13,
    fontWeight: '500',
  },
  pipelineValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
