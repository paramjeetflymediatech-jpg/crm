import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator, 
  TouchableOpacity, 
  Image, 
  Platform, 
  useWindowDimensions, 
  Linking, 
  Alert,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { mobileApiFetch, getImageUrl } from '../api/client';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { 
  Users, 
  AlertCircle, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2, 
  Bell, 
  Clock, 
  Target, 
  Plus, 
  Calendar as CalendarIcon, 
  BarChart3, 
  Layers, 
  ChevronRight, 
  Phone, 
  Mail, 
  Award, 
  Building2, 
  Shield, 
  Zap,
  ArrowUpRight
} from 'lucide-react-native';

interface DashboardScreenProps {
  onNotificationPress?: () => void;
  unreadCount?: number;
  onNavigateToLeads?: (leadId?: number) => void;
  onNavigateToTab?: (tab: 'dashboard' | 'leads' | 'calendar' | 'reports' | 'more') => void;
  onOpenCreateLead?: () => void;
}

// Clean White SaaS Design Tokens
const THEME = {
  background: '#F7F9FC',       // Clean app background
  cardBg: '#FFFFFF',           // Crisp white card surface
  cardBorder: '#E5EAF1',       // Subtle clean border
  heading: '#101828',          // Deep charcoal text
  secondary: '#667085',        // Muted subtext
  subtle: '#94A3B8',           // Inactive subtle details
  primary: '#2563EB',          // Royal Blue
  primaryLight: '#EFF6FF',     // Light blue surface
  primaryBorder: '#BFDBFE',    // Blue border
  success: '#16A34A',          // Green for won & growth
  successLight: '#DCFCE7',     // Soft green badge background
  successBorder: '#BBF7D0',    // Soft green badge border
  warning: '#F59E0B',          // Warm amber for hot/qualified
  warningLight: '#FEF3C7',
  warningBorder: '#FDE68A',
  danger: '#DC2626',           // Red for lost / critical
  dangerLight: '#FEE2E2',
  dangerBorder: '#FECACA',
  purple: '#9333EA',           // Purple for conversion rate
  purpleLight: '#F3E8FF',
  purpleBorder: '#E9D5FF',
  indigo: '#4F46E5',           // Indigo for follow-ups
  indigoLight: '#EEF2FF',
  indigoBorder: '#C7D2FE',
  pillInactiveBg: '#FFFFFF',
  pillInactiveBorder: '#E5EAF1',
  pillInactiveText: '#667085',
  pillActiveBg: '#2563EB',
  pillActiveText: '#FFFFFF',
};

const STAGE_COLORS: Record<string, string> = {
  'New': '#2563EB',
  'Contacted': '#0284C7',
  'Qualified': '#F59E0B',
  'Proposal': '#9333EA',
  'Converted': '#16A34A',
  'Lost': '#DC2626',
};

export default function DashboardScreen({ 
  onNotificationPress, 
  unreadCount = 0, 
  onNavigateToLeads, 
  onNavigateToTab, 
  onOpenCreateLead 
}: DashboardScreenProps) {
  const user = useSelector((state: RootState) => state.auth.user);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [companiesCount, setCompaniesCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userRole = user?.role || 'staff';
  const isSuperAdmin = userRole === 'super_admin';
  const isCompanyAdmin = userRole === 'company_admin';
  const isStaff = userRole === 'staff';

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const promises: Promise<any>[] = [mobileApiFetch('/api/reports')];

      if (isSuperAdmin) {
        promises.push(mobileApiFetch('/api/admin/companies'));
      }

      const results = await Promise.all(promises);
      const resReports = results[0];

      if (!resReports.ok) {
        throw new Error('Failed to load dashboard metrics');
      }

      const reportsData = await resReports.json();
      setData(reportsData);

      if (isSuperAdmin && results[1]?.ok) {
        const compData = await results[1].json();
        setCompaniesCount(compData.companies?.length || 0);
      }
    } catch (err: any) {
      console.error('[DashboardScreen] fetchDashboardData error:', err);
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

  const handleDialNumber = (phoneStr?: string) => {
    if (!phoneStr) return;
    const cleanPhone = phoneStr.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Dial Error', 'Unable to initiate call on this device.');
    });
  };

  const handleSendEmail = (emailStr?: string) => {
    if (!emailStr) return;
    Linking.openURL(`mailto:${emailStr}`).catch(() => {
      Alert.alert('Email Error', 'Unable to open mail client.');
    });
  };

  // -------------------------------------------------------------------------
  // DYNAMIC CRM METRICS DERIVED DIRECTLY FROM LIVE BACKEND REPORT
  // -------------------------------------------------------------------------
  const metrics = useMemo(() => {
    if (!data) return null;
    const allLeads = (data.leads || []) as any[];
    const summary = data.summary || {
      totalLeads: 0,
      newLeads: 0,
      qualifiedLeads: 0,
      convertedLeads: 0,
      lostLeads: 0,
      followupsToday: 0,
      conversionRate: 0
    };

    const mData = (data.charts?.leadsByMonth || []) as any[];
    const displayMonths = mData.length >= 4 
      ? mData.slice(-6).map((m: any, idx: number) => ({
          label: m.month ? m.month.split(' ')[0] : `M${idx + 1}`,
          count: m.count || 0,
          converted: m.converted || 0
        }))
      : [
          { label: 'Jan', count: 0, converted: 0 },
          { label: 'Feb', count: 0, converted: 0 },
          { label: 'Mar', count: 0, converted: 0 },
          { label: 'Apr', count: 0, converted: 0 },
          { label: 'May', count: 0, converted: 0 },
          { label: 'Jun', count: 0, converted: 0 }
        ];

    return {
      totalLeads: summary.totalLeads ?? allLeads.length ?? 0,
      newLeads: summary.newLeads ?? allLeads.filter(l => l.status === 'New').length ?? 0,
      qualifiedLeads: summary.qualifiedLeads ?? allLeads.filter(l => l.status === 'Qualified').length ?? 0,
      convertedLeads: summary.convertedLeads ?? allLeads.filter(l => l.status === 'Converted').length ?? 0,
      conversionRate: `${summary.conversionRate ?? 0}%`,
      followupsToday: summary.followupsToday ?? 0,
      trendText: 'Real-time sync',
      waveLabels: displayMonths.map((d: any) => d.label),
      waveData: displayMonths.map((d: any) => d.count),
      barLabels: displayMonths.map((d: any) => d.label),
      barData: displayMonths.map((d: any) => ({ label: d.label, val: d.converted })),
      activeLeadsList: allLeads
    };
  }, [data]);

  const filteredMetrics = metrics;

  // Spline Wave Chart Coordinates
  const chartWidth = Math.max(width - 76, 260);
  const chartHeight = 110;

  const wavePoints = useMemo(() => {
    if (!filteredMetrics) return { splinePath: '', areaFillPath: '', points: [], isAllZero: true };
    const rawData = filteredMetrics.waveData;
    const isAllZero = rawData.every((v: number) => v === 0);
    const maxVal = Math.max(...rawData, 1);
    const minVal = Math.min(...rawData, 0);
    const range = maxVal - minVal || 1;

    const pts = rawData.map((val: number, idx: number) => {
      const x = rawData.length > 1 ? (idx / (rawData.length - 1)) * chartWidth : chartWidth / 2;
      const ratio = isAllZero ? 1 : 1 - (val - minVal) / range;
      const y = isAllZero ? chartHeight - 16 : 14 + ratio * (chartHeight - 32);
      return { x, y };
    });

    if (pts.length < 2) return { splinePath: '', areaFillPath: '', points: [], isAllZero };

    let sPath = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      sPath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
    }

    const aPath = `${sPath} L ${pts[pts.length - 1].x},${chartHeight} L ${pts[0].x},${chartHeight} Z`;
    return { splinePath: sPath, areaFillPath: aPath, points: pts, isAllZero };
  }, [filteredMetrics, chartWidth, chartHeight]);

  const leadsList = (filteredMetrics?.activeLeadsList || data?.leads || []) as any[];

  // Dynamic Pipeline calculated directly from backend charts or leads
  const pipeline = useMemo(() => {
    if (data?.charts?.leadPipeline && data.charts.leadPipeline.length > 0) {
      return data.charts.leadPipeline as Array<{ name: string; value: number }>;
    }
    const counts: Record<string, number> = {
      'New': 0,
      'Contacted': 0,
      'Qualified': 0,
      'Proposal': 0,
      'Converted': 0,
      'Lost': 0
    };
    leadsList.forEach((l: any) => {
      const st = l.status || 'New';
      if (counts[st] !== undefined) counts[st]++;
      else counts[st] = 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data, leadsList]);

  // Dynamic Sources calculated directly from backend charts or leads
  const sources = useMemo(() => {
    if (data?.charts?.leadsBySource && data.charts.leadsBySource.length > 0) {
      return data.charts.leadsBySource as Array<{ name: string; value: number }>;
    }
    const counts: Record<string, number> = {};
    leadsList.forEach((l: any) => {
      const src = l.source || 'Direct';
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data, leadsList]);

  // Dynamic Team Performance calculated directly from backend charts
  const teamPerf = useMemo(() => {
    if (!isCompanyAdmin || !data?.charts?.teamPerformance) return [];
    if (Array.isArray(data.charts.teamPerformance) && data.charts.teamPerformance.length > 0) {
      return data.charts.teamPerformance as Array<{ name: string; leads: number; converted: number; conversionRate: number }>;
    }
    return [];
  }, [data, isCompanyAdmin]);

  const totalPipelineCount = pipeline.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) || filteredMetrics?.totalLeads || 1;

  // Filter staff urgent follow-ups
  const staffFollowups = leadsList.filter((l: any) => {
    if (l.follow_up_date) {
      const fDate = new Date(l.follow_up_date);
      const now = new Date();
      return fDate.toDateString() === now.toDateString() || fDate < now;
    }
    return (l.Tasks || []).some((t: any) => t.status === 'Pending');
  }).slice(0, 4);

  // Bar chart normalization
  const maxBarVal = Math.max(...(filteredMetrics?.barData.map((d: any) => d.val) || [5]), 5);
  const isAllBarZero = (filteredMetrics?.barData || []).every((d: any) => d.val === 0);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: THEME.background }]}>
        <StatusBar barStyle="dark-content" backgroundColor={THEME.background} />
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingTitle}>Loading Dashboard</Text>
          <Text style={styles.loadingSubtitle}>Fetching real-time CRM performance...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.background} />

      {/* Main Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        {/* User Workspace Info & Notification Bell */}
        <View style={styles.headerTopRow}>
          <View style={styles.profileBadge}>
            <View style={styles.avatarBox}>
              {getImageUrl(user?.companyLogo || user?.avatar) ? (
                <Image 
                  source={{ uri: getImageUrl(user?.companyLogo || user?.avatar)! }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </Text>
              )}
            </View>
            <View style={styles.profileDetails}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Workspace User'}</Text>
                <View style={[
                  styles.roleBadgePill,
                  isSuperAdmin ? styles.roleBadgeSuper : isCompanyAdmin ? styles.roleBadgeAdmin : styles.roleBadgeStaff
                ]}>
                  {isSuperAdmin ? (
                    <Shield size={10} color={THEME.danger} style={{ marginRight: 3 }} />
                  ) : isCompanyAdmin ? (
                    <Building2 size={10} color={THEME.primary} style={{ marginRight: 3 }} />
                  ) : (
                    <Award size={10} color={THEME.success} style={{ marginRight: 3 }} />
                  )}
                  <Text style={[
                    styles.roleBadgeText,
                    isSuperAdmin ? { color: THEME.danger } : isCompanyAdmin ? { color: THEME.primary } : { color: THEME.success }
                  ]}>
                    {isSuperAdmin ? 'SUPER ADMIN' : isCompanyAdmin ? 'COMPANY ADMIN' : 'STAFF MEMBER'}
                  </Text>
                </View>
              </View>
              <Text style={styles.companyName} numberOfLines={1}>
                {isSuperAdmin ? 'Master Multi-Tenant Hub' : (user?.companyName || 'Sales Workspace')}
              </Text>
            </View>
          </View>

          {onNotificationPress && (
            <TouchableOpacity 
              style={styles.bellButton} 
              onPress={onNotificationPress}
              activeOpacity={0.75}
            >
              <Bell size={20} color={THEME.heading} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Dashboard Title & Dynamic Role Subtitle */}
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Dashboard</Text>
          <Text style={styles.screenSubtitle}>
            {isStaff ? 'My Sales Performance & Leads' : isSuperAdmin ? 'Global Platform Telemetry' : 'CRM Overview & Team Performance'}
          </Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={THEME.primary} 
            colors={[THEME.primary]} 
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorCard}>
            <AlertCircle size={20} color={THEME.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ---------------- 6 CORE CRM KPI CARDS (DYNAMIC & RESPONSIVE) ---------------- */}
        <View style={styles.kpiGrid}>
          {/* Row 1: Total Leads & New Leads */}
          <View style={styles.kpiRow}>
            {/* 1. Total Leads */}
            <TouchableOpacity 
              style={styles.kpiCard}
              onPress={() => onNavigateToLeads?.()}
              activeOpacity={0.85}
            >
              <View style={styles.kpiTopRow}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: THEME.primaryLight }]}>
                  <Users size={18} color={THEME.primary} strokeWidth={2.2} />
                </View>
                <View style={[styles.trendBadge, { backgroundColor: THEME.primaryLight, borderColor: THEME.primaryBorder }]}>
                  <Text style={[styles.trendText, { color: THEME.primary }]}>TOTAL</Text>
                </View>
              </View>
              <Text style={styles.kpiValue} numberOfLines={1}>
                {filteredMetrics?.totalLeads ?? 0}
              </Text>
              <Text style={styles.kpiLabel}>
                {isStaff ? 'My Leads' : isSuperAdmin ? 'Global Leads' : 'Total Leads'}
              </Text>
              <Text style={styles.kpiSubtext}>{filteredMetrics?.trendText}</Text>
              <View style={[styles.kpiBottomLine, { backgroundColor: THEME.primary }]} />
            </TouchableOpacity>

            {/* 2. New Leads */}
            <TouchableOpacity 
              style={styles.kpiCard}
              onPress={() => onNavigateToLeads?.()}
              activeOpacity={0.85}
            >
              <View style={styles.kpiTopRow}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: '#F0F9FF' }]}>
                  <Sparkles size={18} color="#0284C7" strokeWidth={2.2} />
                </View>
                <View style={[styles.trendBadge, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                  <Text style={[styles.trendText, { color: '#0284C7' }]}>NEW</Text>
                </View>
              </View>
              <Text style={styles.kpiValue} numberOfLines={1}>
                {filteredMetrics?.newLeads ?? 0}
              </Text>
              <Text style={styles.kpiLabel}>
                {isStaff ? 'My New Inquiries' : 'New Leads'}
              </Text>
              <Text style={styles.kpiSubtext}>Requires initial contact</Text>
              <View style={[styles.kpiBottomLine, { backgroundColor: '#0284C7' }]} />
            </TouchableOpacity>
          </View>

          {/* Row 2: Qualified Leads & Converted Leads */}
          <View style={styles.kpiRow}>
            {/* 3. Qualified Leads */}
            <TouchableOpacity 
              style={styles.kpiCard}
              onPress={() => onNavigateToLeads?.()}
              activeOpacity={0.85}
            >
              <View style={styles.kpiTopRow}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: THEME.warningLight }]}>
                  <Target size={18} color={THEME.warning} strokeWidth={2.2} />
                </View>
                <View style={[styles.trendBadge, { backgroundColor: THEME.warningLight, borderColor: THEME.warningBorder }]}>
                  <Text style={[styles.trendText, { color: THEME.warning }]}>HOT</Text>
                </View>
              </View>
              <Text style={styles.kpiValue} numberOfLines={1}>
                {filteredMetrics?.qualifiedLeads ?? 0}
              </Text>
              <Text style={styles.kpiLabel}>Qualified Leads</Text>
              <Text style={styles.kpiSubtext}>High buying interest</Text>
              <View style={[styles.kpiBottomLine, { backgroundColor: THEME.warning }]} />
            </TouchableOpacity>

            {/* 4. Converted Leads */}
            <TouchableOpacity 
              style={styles.kpiCard}
              onPress={() => onNavigateToLeads?.()}
              activeOpacity={0.85}
            >
              <View style={styles.kpiTopRow}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: THEME.successLight }]}>
                  <CheckCircle2 size={18} color={THEME.success} strokeWidth={2.2} />
                </View>
                <View style={[styles.trendBadge, { backgroundColor: THEME.successLight, borderColor: THEME.successBorder }]}>
                  <Text style={[styles.trendText, { color: THEME.success }]}>WON</Text>
                </View>
              </View>
              <Text style={styles.kpiValue} numberOfLines={1}>
                {filteredMetrics?.convertedLeads ?? 0}
              </Text>
              <Text style={styles.kpiLabel}>
                {isStaff ? 'My Won Deals' : 'Converted Leads'}
              </Text>
              <Text style={styles.kpiSubtext}>Closed deals</Text>
              <View style={[styles.kpiBottomLine, { backgroundColor: THEME.success }]} />
            </TouchableOpacity>
          </View>

          {/* Row 3: Conversion Rate & Follow-ups Today */}
          <View style={styles.kpiRow}>
            {/* 5. Conversion Rate */}
            <TouchableOpacity 
              style={styles.kpiCard}
              onPress={() => onNavigateToTab?.('reports')}
              activeOpacity={0.85}
            >
              <View style={styles.kpiTopRow}>
                <View style={[styles.kpiIconWrapper, { backgroundColor: THEME.purpleLight }]}>
                  <TrendingUp size={18} color={THEME.purple} strokeWidth={2.2} />
                </View>
                <View style={[styles.trendBadge, { backgroundColor: THEME.purpleLight, borderColor: THEME.purpleBorder }]}>
                  <Text style={[styles.trendText, { color: THEME.purple }]}>RATE</Text>
                </View>
              </View>
              <Text style={styles.kpiValue} numberOfLines={1}>
                {filteredMetrics?.conversionRate ?? '0%'}
              </Text>
              <Text style={styles.kpiLabel}>
                {isStaff ? 'My Win Rate' : isCompanyAdmin ? 'Team Win Rate' : 'Global Win Rate'}
              </Text>
              <Text style={styles.kpiSubtext}>Deals won vs total leads</Text>
              <View style={[styles.kpiBottomLine, { backgroundColor: THEME.purple }]} />
            </TouchableOpacity>

            {/* 6. Follow-ups Today (or Companies if Super Admin) */}
            {isSuperAdmin ? (
              <TouchableOpacity 
                style={styles.kpiCard}
                onPress={() => onNavigateToTab?.('more')}
                activeOpacity={0.85}
              >
                <View style={styles.kpiTopRow}>
                  <View style={[styles.kpiIconWrapper, { backgroundColor: THEME.dangerLight }]}>
                    <Building2 size={18} color={THEME.danger} strokeWidth={2.2} />
                  </View>
                  <View style={[styles.trendBadge, { backgroundColor: THEME.dangerLight, borderColor: THEME.dangerBorder }]}>
                    <Text style={[styles.trendText, { color: THEME.danger }]}>TENANTS</Text>
                  </View>
                </View>
                <Text style={styles.kpiValue} numberOfLines={1}>
                  {companiesCount ?? 0}
                </Text>
                <Text style={styles.kpiLabel}>Active Companies</Text>
                <Text style={styles.kpiSubtext}>Cross-tenant organizations</Text>
                <View style={[styles.kpiBottomLine, { backgroundColor: THEME.danger }]} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.kpiCard}
                onPress={() => onNavigateToTab?.('calendar')}
                activeOpacity={0.85}
              >
                <View style={styles.kpiTopRow}>
                  <View style={[styles.kpiIconWrapper, { backgroundColor: THEME.indigoLight }]}>
                    <Clock size={18} color={THEME.indigo} strokeWidth={2.2} />
                  </View>
                  <View style={[styles.trendBadge, { backgroundColor: THEME.indigoLight, borderColor: THEME.indigoBorder }]}>
                    <Text style={[styles.trendText, { color: THEME.indigo }]}>TODAY</Text>
                  </View>
                </View>
                <Text style={styles.kpiValue} numberOfLines={1}>
                  {filteredMetrics?.followupsToday ?? 0}
                </Text>
                <Text style={styles.kpiLabel}>
                  {isStaff ? 'My Follow-ups' : 'Follow-ups Today'}
                </Text>
                <Text style={styles.kpiSubtext}>Scheduled tasks & calls</Text>
                <View style={[styles.kpiBottomLine, { backgroundColor: THEME.indigo }]} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ---------------- CHART 1: LEAD INFLOW SPLINE WAVE CARD ---------------- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardHeaderIconBox, { backgroundColor: THEME.primaryLight }]}>
                <TrendingUp size={16} color={THEME.primary} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Lead Inflow Velocity</Text>
                <Text style={styles.cardSubtitle}>
                  Monthly lead acquisition trend
                </Text>
              </View>
            </View>
          </View>

          {/* Spline Wave Curve */}
          <View style={styles.waveChartContainer}>
            <Svg width={chartWidth} height={chartHeight}>
              <Defs>
                <LinearGradient id="blueGlow" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={THEME.primary} stopOpacity="0.25" />
                  <Stop offset="80%" stopColor={THEME.primary} stopOpacity="0.03" />
                  <Stop offset="100%" stopColor={THEME.primary} stopOpacity="0" />
                </LinearGradient>
              </Defs>

              {/* Area Glow under curve */}
              {wavePoints.areaFillPath ? (
                <Path 
                  d={wavePoints.areaFillPath} 
                  fill="url(#blueGlow)" 
                />
              ) : null}

              {/* Smooth Stroke Path */}
              {wavePoints.splinePath ? (
                <Path 
                  d={wavePoints.splinePath} 
                  stroke={THEME.primary} 
                  strokeWidth="3.2" 
                  fill="none" 
                  strokeLinecap="round" 
                />
              ) : null}
            </Svg>

            {/* Dynamic Axis Labels */}
            <View style={styles.weekLabelsRow}>
              {(filteredMetrics?.waveLabels || []).map((lbl: string, idx: number) => (
                <Text key={idx} style={styles.dayLabel}>
                  {lbl}
                </Text>
              ))}
            </View>

            {wavePoints.isAllZero && (
              <View style={styles.chartEmptyOverlay}>
                <Text style={styles.chartEmptyText}>No lead inflow recorded in this timeframe</Text>
              </View>
            )}
          </View>
        </View>

        {/* ---------------- CHART 2: CONVERTED LEADS ROUNDED BAR CHART ---------------- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardHeaderIconBox, { backgroundColor: THEME.successLight }]}>
                <BarChart3 size={16} color={THEME.success} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Converted Leads & Won Deals</Text>
                <Text style={styles.cardSubtitle}>
                  Monthly closed deals
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.barChartContainer}>
            <View style={styles.barsRow}>
              {(filteredMetrics?.barData || []).map((item: any, idx: number) => {
                const barHeight = Math.max((item.val / maxBarVal) * 96, 8);
                return (
                  <View key={idx} style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View 
                        style={[
                          styles.barFill, 
                          { height: barHeight, backgroundColor: item.val > 0 ? THEME.success : '#E2E8F0' }
                        ]} 
                      />
                    </View>
                    <Text style={styles.barMonthLabel}>{item.label}</Text>
                  </View>
                );
              })}
            </View>

            {isAllBarZero && (
              <View style={styles.chartEmptyOverlay}>
                <Text style={styles.chartEmptyText}>No converted leads in this timeframe</Text>
              </View>
            )}
          </View>
        </View>

        {/* ---------------- QUICK ACTIONS SHORTCUTS ---------------- */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.subSectionTitle}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
            <TouchableOpacity 
              style={[styles.quickActionPill, styles.quickActionPillPrimary]}
              onPress={() => {
                if (onOpenCreateLead) onOpenCreateLead();
                else if (onNavigateToLeads) onNavigateToLeads();
              }}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={styles.quickActionTextPrimary}>Add Lead</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionPill}
              onPress={() => onNavigateToLeads?.()}
              activeOpacity={0.8}
            >
              <Users size={16} color={THEME.primary} style={{ marginRight: 6 }} />
              <Text style={styles.quickActionText}>All Leads</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionPill}
              onPress={() => onNavigateToTab?.('calendar')}
              activeOpacity={0.8}
            >
              <CalendarIcon size={16} color={THEME.purple} style={{ marginRight: 6 }} />
              <Text style={styles.quickActionText}>Calendar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionPill}
              onPress={() => onNavigateToTab?.('reports')}
              activeOpacity={0.8}
            >
              <BarChart3 size={16} color={THEME.success} style={{ marginRight: 6 }} />
              <Text style={styles.quickActionText}>Reports</Text>
            </TouchableOpacity>

            {isSuperAdmin && (
              <TouchableOpacity 
                style={styles.quickActionPill}
                onPress={() => onNavigateToTab?.('more')}
                activeOpacity={0.8}
              >
                <Building2 size={16} color={THEME.danger} style={{ marginRight: 6 }} />
                <Text style={styles.quickActionText}>Tenants</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* ---------------- SUPER ADMIN: PLATFORM ECOSYSTEM HEALTH ---------------- */}
        {isSuperAdmin && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardHeaderIconBox, { backgroundColor: THEME.dangerLight }]}>
                  <Shield size={16} color={THEME.danger} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Multi-Tenant Ecosystem</Text>
                  <Text style={styles.cardSubtitle}>Cross-company platform health & telemetry</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => onNavigateToTab?.('more')}>
                <Text style={styles.viewLinkText}>Tenants &gt;</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.ecosystemStatsRow}>
              <View style={styles.ecosystemStatItem}>
                <Text style={styles.ecosystemStatValue}>{companiesCount ?? 0}</Text>
                <Text style={styles.ecosystemStatLabel}>Active Companies</Text>
              </View>
              <View style={styles.ecosystemStatDivider} />
              <View style={styles.ecosystemStatItem}>
                <Text style={styles.ecosystemStatValue}>{filteredMetrics?.totalLeads ?? 0}</Text>
                <Text style={styles.ecosystemStatLabel}>Cross-Tenant Leads</Text>
              </View>
              <View style={styles.ecosystemStatDivider} />
              <View style={styles.ecosystemStatItem}>
                <View style={styles.statusOnlinePill}>
                  <View style={styles.statusOnlineDot} />
                  <Text style={styles.statusOnlineText}>Operational</Text>
                </View>
                <Text style={styles.ecosystemStatLabel}>System Health</Text>
              </View>
            </View>
          </View>
        )}

        {/* ---------------- STAFF PRIORITY AGENDA SECTION ---------------- */}
        {isStaff && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardHeaderIconBox, { backgroundColor: THEME.indigoLight }]}>
                  <Clock size={16} color={THEME.indigo} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Priority Follow-ups</Text>
                  <Text style={styles.cardSubtitle}>Urgent calls & scheduled tasks</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => onNavigateToTab?.('calendar')}>
                <Text style={styles.viewLinkText}>Calendar &gt;</Text>
              </TouchableOpacity>
            </View>

            {staffFollowups.length > 0 ? (
              <View style={styles.agendaList}>
                {staffFollowups.map((lead: any) => {
                  const leadName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Prospect';
                  return (
                    <View key={lead.id} style={styles.agendaItem}>
                      <View style={styles.agendaInfo}>
                        <Text style={styles.agendaLeadName}>{leadName}</Text>
                        <Text style={styles.agendaSubtext}>
                          {lead.subject || lead.source || 'General Inquiry'}
                        </Text>
                      </View>

                      <View style={styles.agendaActions}>
                        {lead.phone ? (
                          <TouchableOpacity 
                            style={[styles.agendaBtn, { backgroundColor: THEME.successLight }]}
                            onPress={() => handleDialNumber(lead.phone)}
                          >
                            <Phone size={14} color={THEME.success} />
                          </TouchableOpacity>
                        ) : null}

                        {lead.email ? (
                          <TouchableOpacity 
                            style={[styles.agendaBtn, { backgroundColor: THEME.primaryLight }]}
                            onPress={() => handleSendEmail(lead.email)}
                          >
                            <Mail size={14} color={THEME.primary} />
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity 
                          style={[styles.agendaBtn, { backgroundColor: THEME.background }]}
                          onPress={() => onNavigateToLeads?.(lead.id)}
                        >
                          <ChevronRight size={16} color={THEME.secondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <CheckCircle2 size={28} color={THEME.success} style={{ marginBottom: 6 }} />
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptyText}>No pending actions due today.</Text>
              </View>
            )}
          </View>
        )}

        {/* ---------------- COMPANY ADMIN: SALES REPS LEADERBOARD ---------------- */}
        {isCompanyAdmin && teamPerf.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardHeaderIconBox, { backgroundColor: THEME.warningLight }]}>
                  <Award size={16} color={THEME.warning} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Sales Reps Leaderboard</Text>
                  <Text style={styles.cardSubtitle}>Agent conversions and closing rate</Text>
                </View>
              </View>
            </View>

            <View style={styles.leaderboardList}>
              {teamPerf
                .slice()
                .sort((a, b) => b.converted - a.converted)
                .map((member, index) => {
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                  return (
                    <View key={index} style={styles.leaderboardRow}>
                      <View style={styles.leaderboardRank}>
                        <Text style={styles.leaderboardRankText}>{medal}</Text>
                      </View>

                      <View style={styles.leaderboardInfo}>
                        <View style={styles.leaderboardNameRow}>
                          <Text style={styles.leaderboardName}>{member.name}</Text>
                          <Text style={styles.leaderboardStats}>
                            <Text style={{ fontWeight: '800', color: THEME.heading }}>{member.converted}</Text> won / {member.leads} leads
                          </Text>
                        </View>
                        <View style={styles.leaderboardTrack}>
                          <View 
                            style={[
                              styles.leaderboardFill, 
                              { width: `${Math.min(member.conversionRate, 100)}%`, backgroundColor: THEME.primary }
                            ]} 
                          />
                        </View>
                      </View>

                      <View style={styles.leaderboardBadge}>
                        <Text style={styles.leaderboardBadgeText}>{member.conversionRate}%</Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        )}

        {/* ---------------- PIPELINE STAGES BREAKDOWN ---------------- */}
        {pipeline.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardHeaderIconBox, { backgroundColor: THEME.primaryLight }]}>
                  <Layers size={16} color={THEME.primary} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Sales Pipeline Stages</Text>
                  <Text style={styles.cardSubtitle}>Current lead distribution across stages</Text>
                </View>
              </View>
            </View>

            {/* Stacked Preview Bar */}
            <View style={styles.stackedBarContainer}>
              {pipeline.map((item, idx) => {
                const count = Number(item.value) || 0;
                const pct = Math.max(Math.round((count / totalPipelineCount) * 100), 0);
                if (pct <= 0) return null;
                const color = STAGE_COLORS[item.name] || [THEME.primary, '#0284C7', THEME.warning, THEME.purple, THEME.success, THEME.danger][idx % 6];
                return (
                  <View 
                    key={idx} 
                    style={[styles.stackedBarSegment, { width: `${pct}%`, backgroundColor: color }]} 
                  />
                );
              })}
            </View>

            {/* Pipeline Stage Rows */}
            <View style={styles.pipelineList}>
              {pipeline.map((item, idx) => {
                const count = Number(item.value) || 0;
                const pct = totalPipelineCount > 0 ? Math.round((count / totalPipelineCount) * 100) : 0;
                const color = STAGE_COLORS[item.name] || [THEME.primary, '#0284C7', THEME.warning, THEME.purple, THEME.success, THEME.danger][idx % 6];

                return (
                  <View key={idx} style={styles.pipelineStageItem}>
                    <View style={styles.stageTitleRow}>
                      <View style={styles.stageNameWrapper}>
                        <View style={[styles.stageDot, { backgroundColor: color }]} />
                        <Text style={styles.stageNameText}>{item.name}</Text>
                      </View>
                      <View style={styles.stageNumbersWrapper}>
                        <Text style={styles.stageCountText}>{count}</Text>
                        <Text style={styles.stagePctText}>({pct}%)</Text>
                      </View>
                    </View>
                    <View style={styles.stageTrack}>
                      <View style={[styles.stageFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ---------------- LEAD ACQUISITION SOURCES ---------------- */}
        {sources.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardHeaderIconBox, { backgroundColor: THEME.primaryLight }]}>
                  <Sparkles size={16} color={THEME.primary} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Acquisition Channels</Text>
                  <Text style={styles.cardSubtitle}>Leads captured per marketing channel</Text>
                </View>
              </View>
            </View>

            <View style={styles.sourceList}>
              {sources.map((src, idx) => {
                const totalSrc = sources.reduce((a, b) => a + (Number(b.value) || 0), 0) || 1;
                const pct = Math.round(((Number(src.value) || 0) / totalSrc) * 100);
                const color = [THEME.primary, '#0284C7', THEME.purple, THEME.warning, THEME.success][idx % 5];
                return (
                  <View key={idx} style={styles.sourceItem}>
                    <View style={styles.sourceInfoRow}>
                      <Text style={styles.sourceName}>{src.name || 'Direct Channel'}</Text>
                      <Text style={styles.sourceCount}>{src.value} leads ({pct}%)</Text>
                    </View>
                    <View style={styles.sourceTrack}>
                      <View style={[styles.sourceFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Bottom spacer for clean scrolling above tab bar */}
        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    shadowColor: THEME.heading,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  loadingTitle: {
    color: THEME.heading,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
  },
  loadingSubtitle: {
    color: THEME.secondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  header: {
    backgroundColor: THEME.background,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.primaryLight,
    borderWidth: 1.5,
    borderColor: THEME.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: THEME.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  profileDetails: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  roleBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeSuper: {
    backgroundColor: THEME.dangerLight,
    borderColor: THEME.dangerBorder,
  },
  roleBadgeAdmin: {
    backgroundColor: THEME.primaryLight,
    borderColor: THEME.primaryBorder,
  },
  roleBadgeStaff: {
    backgroundColor: THEME.successLight,
    borderColor: THEME.successBorder,
  },
  roleBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  userName: {
    color: THEME.heading,
    fontSize: 15,
    fontWeight: '700',
  },
  companyName: {
    color: THEME.secondary,
    fontSize: 12,
    marginTop: 1,
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: THEME.heading,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: THEME.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  titleRow: {
    marginBottom: 4,
  },
  screenTitle: {
    color: THEME.heading,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  screenSubtitle: {
    color: THEME.secondary,
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 24,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.dangerLight,
    borderWidth: 1,
    borderColor: THEME.dangerBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: THEME.danger,
    fontSize: 13,
    flex: 1,
  },
  kpiGrid: {
    gap: 12,
    marginBottom: 14,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: THEME.cardBg,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: THEME.heading,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  kpiValue: {
    color: THEME.heading,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  kpiLabel: {
    color: THEME.heading,
    fontSize: 13.5,
    fontWeight: '700',
  },
  kpiSubtext: {
    color: THEME.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  kpiBottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    borderRadius: 1.5,
  },
  card: {
    backgroundColor: THEME.cardBg,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 14,
    shadowColor: THEME.heading,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    color: THEME.heading,
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    color: THEME.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  viewLinkText: {
    color: THEME.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  waveChartContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  weekLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginTop: 10,
  },
  dayLabel: {
    color: THEME.secondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  barChartContainer: {
    marginTop: 8,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingHorizontal: 8,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: 24,
    borderRadius: 6,
  },
  barMonthLabel: {
    color: THEME.secondary,
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 8,
  },
  chartEmptyOverlay: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: {
    color: THEME.secondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  quickActionsSection: {
    marginBottom: 16,
    marginTop: 4,
  },
  subSectionTitle: {
    color: THEME.heading,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  quickActionsScroll: {
    gap: 10,
  },
  quickActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: THEME.heading,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionPillPrimary: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  quickActionText: {
    color: THEME.heading,
    fontSize: 13,
    fontWeight: '600',
  },
  quickActionTextPrimary: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  agendaList: {
    gap: 10,
  },
  agendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  agendaInfo: {
    flex: 1,
    marginRight: 10,
  },
  agendaLeadName: {
    color: THEME.heading,
    fontSize: 14,
    fontWeight: '600',
  },
  agendaSubtext: {
    color: THEME.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  agendaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agendaBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyTitle: {
    color: THEME.heading,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    color: THEME.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  leaderboardList: {
    gap: 12,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderboardRank: {
    width: 28,
    alignItems: 'center',
    marginRight: 8,
  },
  leaderboardRankText: {
    fontSize: 16,
    fontWeight: '700',
  },
  leaderboardInfo: {
    flex: 1,
    marginRight: 12,
  },
  leaderboardNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  leaderboardName: {
    color: THEME.heading,
    fontSize: 13,
    fontWeight: '600',
  },
  leaderboardStats: {
    color: THEME.secondary,
    fontSize: 11,
  },
  leaderboardTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  leaderboardFill: {
    height: '100%',
    borderRadius: 3,
  },
  leaderboardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: THEME.primaryLight,
  },
  leaderboardBadgeText: {
    color: THEME.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  stackedBarContainer: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  stackedBarSegment: {
    height: '100%',
  },
  pipelineList: {
    gap: 10,
  },
  pipelineStageItem: {
    gap: 4,
  },
  stageTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageNameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stageNameText: {
    color: THEME.heading,
    fontSize: 13,
    fontWeight: '500',
  },
  stageNumbersWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stageCountText: {
    color: THEME.heading,
    fontSize: 13,
    fontWeight: '700',
  },
  stagePctText: {
    color: THEME.secondary,
    fontSize: 11,
  },
  stageTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  stageFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  sourceList: {
    gap: 12,
  },
  sourceItem: {
    gap: 4,
  },
  sourceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceName: {
    color: THEME.heading,
    fontSize: 13,
    fontWeight: '500',
  },
  sourceCount: {
    color: THEME.secondary,
    fontSize: 12,
  },
  sourceTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  sourceFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  ecosystemStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  ecosystemStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  ecosystemStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.heading,
  },
  ecosystemStatLabel: {
    fontSize: 11,
    color: THEME.secondary,
    marginTop: 2,
  },
  ecosystemStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: THEME.cardBorder,
  },
  statusOnlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
  },
  statusOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.success,
    marginRight: 4,
  },
  statusOnlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.success,
  },
});
