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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mobileApiFetch } from '../api/client';
import { TOKENS } from '../theme/tokens';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { Users, AlertCircle, TrendingUp, CheckCircle2, Award, PieChart as ChartIcon, Bell } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

const COLORS = [TOKENS.colors.primary, TOKENS.colors.success, TOKENS.colors.warning, TOKENS.colors.error, '#7C3AED', '#0284C7', '#0D9488'];

interface ReportsScreenProps {
  onNotificationPress?: () => void;
  unreadCount?: number;
}

export default function ReportsScreen({ onNotificationPress, unreadCount = 0 }: ReportsScreenProps) {
  const insets = useSafeAreaInsets();
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
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  kpiCard: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.lg,
    padding: 14,
    width: '48%',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    ...TOKENS.shadows.card,
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
    color: TOKENS.colors.heading,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  kpiLbl: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    padding: 16,
    marginBottom: 18,
    ...TOKENS.shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.border,
    paddingBottom: 10,
  },
  sectionTitle: {
    color: TOKENS.colors.heading,
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
    color: TOKENS.colors.secondary,
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
    color: TOKENS.colors.secondary,
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
    color: TOKENS.colors.heading,
    fontSize: 12,
    fontWeight: '600',
  },
  sourceVal: {
    color: TOKENS.colors.secondary,
    fontSize: 11,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: TOKENS.colors.background,
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
    borderColor: TOKENS.colors.border,
    paddingBottom: 14,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  teamName: {
    color: TOKENS.colors.heading,
    fontSize: 14,
    fontWeight: '700',
  },
  teamBadge: {
    backgroundColor: TOKENS.colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  teamBadgeText: {
    color: TOKENS.colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  teamDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  teamDetailText: {
    color: TOKENS.colors.secondary,
    fontSize: 11,
    fontWeight: '500',
  },
  teamDetailDivider: {
    color: TOKENS.colors.border,
    marginHorizontal: 8,
    fontSize: 10,
  },
  multiBarContainer: {
    flexDirection: 'row',
  },
  emptyText: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 24,
    fontStyle: 'italic',
  },
});
