import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  ActivityIndicator, 
  RefreshControl,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { mobileApiFetch } from '../api/client';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { Users, AlertCircle, TrendingUp, CheckCircle2, Award, PieChart as ChartIcon, Bell } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0284c7', '#0d9488'];

interface ReportsScreenProps {
  onNotificationPress?: () => void;
  unreadCount?: number;
}

export default function ReportsScreen({ onNotificationPress, unreadCount = 0 }: ReportsScreenProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setError(null);
      const res = await mobileApiFetch('/api/reports');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        throw new Error('Failed to fetch reports.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not load analytics reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, []);

  if (loading || !data) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.infoText}>Loading Reports...</Text>
      </View>
    );
  }

  const { summary, charts } = data;

  // 1. Math for Monthly Line Chart (SVG based)
  const renderMonthlyTrend = () => {
    const monthlyData = charts.leadsByMonth || [];
    if (monthlyData.length === 0) {
      return <Text style={styles.emptyText}>No monthly trend data available</Text>;
    }

    const svgWidth = screenWidth - 64; // container padding subtracted
    const svgHeight = 160;
    const padding = 15;
    
    // Find max value for scaling
    const maxVal = Math.max(
      ...monthlyData.map((d: any) => Math.max(d.count, d.converted)),
      10 // fallback floor
    );

    const getX = (index: number) => {
      if (monthlyData.length <= 1) return svgWidth / 2;
      return padding + (index / (monthlyData.length - 1)) * (svgWidth - 2 * padding);
    };

    const getY = (val: number) => {
      return svgHeight - padding - (val / maxVal) * (svgHeight - 2 * padding);
    };

    // Construct path descriptions
    let countPath = '';
    let convPath = '';

    monthlyData.forEach((d: any, i: number) => {
      const x = getX(i);
      const yCount = getY(d.count);
      const yConv = getY(d.converted);

      if (i === 0) {
        countPath = `M ${x} ${yCount}`;
        convPath = `M ${x} ${yConv}`;
      } else {
        countPath += ` L ${x} ${yCount}`;
        convPath += ` L ${x} ${yConv}`;
      }
    });

    return (
      <View style={styles.chartContainer}>
        <Svg width={svgWidth} height={svgHeight}>
          {/* Grid lines (horizontal) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = padding + ratio * (svgHeight - 2 * padding);
            const valLabel = Math.round(maxVal * (1 - ratio));
            return (
              <React.Fragment key={index}>
                <Path d={`M ${padding} ${y} L ${svgWidth - padding} ${y}`} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4,4" />
              </React.Fragment>
            );
          })}

          {/* Counts Line (Leads) */}
          {countPath !== '' && (
            <Path d={countPath} fill="none" stroke="#2563eb" strokeWidth={2.5} />
          )}

          {/* Converted Line */}
          {convPath !== '' && (
            <Path d={convPath} fill="none" stroke="#10b981" strokeWidth={2.5} />
          )}

          {/* Data Points (Circles) */}
          {monthlyData.map((d: any, i: number) => {
            const x = getX(i);
            const yCount = getY(d.count);
            const yConv = getY(d.converted);

            return (
              <React.Fragment key={i}>
                <Circle cx={x} cy={yCount} r={4} fill="#2563eb" stroke="#ffffff" strokeWidth={2} />
                <Circle cx={x} cy={yConv} r={4} fill="#10b981" stroke="#ffffff" strokeWidth={2} />
              </React.Fragment>
            );
          })}
        </Svg>

        {/* Labels under nodes */}
        <View style={styles.chartXLabels}>
          {monthlyData.map((d: any, i: number) => (
            <Text key={i} style={[styles.chartXText, { width: svgWidth / monthlyData.length, textAlign: 'center' }]}>
              {d.month}
            </Text>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
            <Text style={styles.legendText}>Captured</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>Converted</Text>
          </View>
        </View>
      </View>
    );
  };

  // 2. Horizontal progress bars for Lead Sources
  const renderLeadSources = () => {
    const sources = charts.leadsBySource || [];
    if (sources.length === 0) {
      return <Text style={styles.emptyText}>No source channel data available</Text>;
    }

    const maxVal = Math.max(...sources.map((s: any) => s.value), 1);

    return (
      <View style={styles.sourcesContainer}>
        {sources.map((item: any, idx: number) => {
          const percentage = (item.value / maxVal) * 100;
          const barColor = COLORS[idx % COLORS.length];
          return (
            <View key={idx} style={styles.sourceRow}>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceName}>{item.name}</Text>
                <Text style={styles.sourceVal}>{item.value} leads</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: barColor }]} />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // 3. User performance bars (Assigned vs Converted stacked layout)
  const renderTeamPerformance = () => {
    const team = charts.teamPerformance || [];
    if (team.length === 0) {
      return <Text style={styles.emptyText}>No representative statistics found</Text>;
    }

    return (
      <View style={styles.teamContainer}>
        {team.map((item: any, idx: number) => {
          return (
            <View key={idx} style={styles.teamRow}>
              <View style={styles.teamHeaderRow}>
                <Text style={styles.teamName}>{item.name}</Text>
                <View style={styles.teamBadge}>
                  <Text style={styles.teamBadgeText}>{item.conversionRate}% Rate</Text>
                </View>
              </View>
              
              <View style={styles.teamDetails}>
                <Text style={styles.teamDetailText}>Assigned: {item.leads} leads</Text>
                <Text style={styles.teamDetailDivider}>|</Text>
                <Text style={styles.teamDetailText}>Converted: {item.converted}</Text>
              </View>

              {/* Multi-progress visual bar */}
              <View style={styles.multiBarContainer}>
                <View style={[styles.progressBarBg, { flex: 1 }]}>
                  <View style={[styles.progressBarFill, { width: `${Math.min((item.converted / Math.max(item.leads, 1)) * 100, 100)}%`, backgroundColor: '#10b981' }]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Reports & Analytics</Text>
          <Text style={styles.headerSubtitle}>Review performance metrics and team conversions</Text>
        </View>
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

        {/* Summary KPIs */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.iconWrapper, { backgroundColor: '#fffbeb' }]}>
              <TrendingUp size={18} color="#d97706" />
            </View>
            <Text style={styles.kpiVal}>{summary.conversionRate}%</Text>
            <Text style={styles.kpiLbl}>Conversion Rate</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconWrapper, { backgroundColor: '#ecfdf5' }]}>
              <CheckCircle2 size={18} color="#059669" />
            </View>
            <Text style={styles.kpiVal}>{summary.convertedLeads}</Text>
            <Text style={styles.kpiLbl}>Total Converted</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconWrapper, { backgroundColor: '#eff6ff' }]}>
              <Users size={18} color="#2563eb" />
            </View>
            <Text style={styles.kpiVal}>{summary.totalLeads}</Text>
            <Text style={styles.kpiLbl}>Total Leads</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconWrapper, { backgroundColor: '#faf5ff' }]}>
              <Award size={18} color="#9333ea" />
            </View>
            <Text style={styles.kpiVal}>{summary.followupsToday}</Text>
            <Text style={styles.kpiLbl}>Reminders Active</Text>
          </View>
        </View>

        {/* Section 1: Monthly Growth Trend */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ChartIcon size={18} color="#2563eb" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Monthly Growth Trend</Text>
          </View>
          {renderMonthlyTrend()}
        </View>

        {/* Section 2: Lead Acquisition Sources */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ChartIcon size={18} color="#fbbf24" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Lead Acquisition Sources</Text>
          </View>
          {renderLeadSources()}
        </View>

        {/* Section 3: Representative Conversions */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ChartIcon size={18} color="#10b981" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Staff Conversion Rates</Text>
          </View>
          {renderTeamPerformance()}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  infoText: {
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
  headerTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
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
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    width: '48%',
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
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiVal: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  kpiLbl: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingBottom: 10,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartXLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  chartXText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  sourcesContainer: {
    paddingHorizontal: 4,
  },
  sourceRow: {
    marginBottom: 14,
  },
  sourceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sourceName: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  sourceVal: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  teamContainer: {
    paddingHorizontal: 4,
  },
  teamRow: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: 14,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  teamName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  teamBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  teamBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  teamDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  teamDetailText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  teamDetailDivider: {
    color: '#cbd5e1',
    marginHorizontal: 8,
    fontSize: 10,
  },
  multiBarContainer: {
    flexDirection: 'row',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 24,
    fontStyle: 'italic',
  },
});
