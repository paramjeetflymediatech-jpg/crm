import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logoutUser } from '../store/authSlice';
import { getBaseUrl, getImageUrl } from '../api/client';
import io from 'socket.io-client';
import { initPushNotifications, registerDeviceToken, unregisterDeviceToken, setOnNotificationPressed } from '../services/pushNotification';

// Screens
import DashboardScreen from './DashboardScreen';
import LeadsScreen from './LeadsScreen';
import NotificationsScreen from './NotificationsScreen';
import SettingsScreen from './SettingsScreen';
import CalendarScreen from './CalendarScreen';
import ReportsScreen from './ReportsScreen';
import AdminScreen from './AdminScreen';
import LegalScreen from './LegalScreen';

// Icons
import { 
  LayoutDashboard, 
  Users, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Menu, 
  Bell, 
  Settings as SettingsIcon, 
  ShieldAlert, 
  LogOut, 
  ChevronRight,
  User,
  Building2,
  Shield,
  Volume2,
  Edit3,
  Scale,
  ShieldCheck,
  FileText
} from 'lucide-react-native';
import { showConfirm } from '../services/alertService';
import { TOKENS } from '../theme/tokens';

export default function AppTabs() {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'calendar' | 'reports' | 'more'>('dashboard');
  const [moreView, setMoreView] = useState<'menu' | 'alerts' | 'settings' | 'admin' | 'legal'>('menu');
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'company' | 'team'>('company');
  const [legalInitialTab, setLegalInitialTab] = useState<'privacy' | 'terms'>('privacy');
  const [targetLeadId, setTargetLeadId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsSourceTab, setNotificationsSourceTab] = useState<'dashboard' | 'leads' | 'calendar' | 'reports' | 'more' | null>(null);

  const openSettings = (tab: 'profile' | 'company' | 'team' = 'company') => {
    setSettingsInitialTab(tab);
    setMoreView('settings');
  };

  // Responsive bottom padding for gesture navigation vs 3-button navigation
  const isGestureNav = insets.bottom > 0 && insets.bottom <= 28;
  const dynamicBottomPadding = insets.bottom > 0
    ? (isGestureNav ? Math.max(insets.bottom - 6, 6) : insets.bottom + 2)
    : (Platform.OS === 'ios' ? 12 : 8);

  const navBg = TOKENS.colors.white;
  const navBorder = TOKENS.colors.border;
  const inactiveIconColor = TOKENS.colors.secondary;
  const activeIconColor = TOKENS.colors.primary;
  const activePillBg = TOKENS.colors.primaryLight;
  const activePillBorder = TOKENS.colors.primaryBorder;
  const activeIndicatorColor = TOKENS.colors.primary;

  useEffect(() => {
    if (!user) return;

    const socket = io(getBaseUrl(), {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Mobile App connected to Socket.IO Server');
      const cid = user.companyId || user.company_id;
      if (cid) {
        socket.emit('join_company', cid);
      }
    });

    socket.on('notification', (payload) => {
      console.log('Mobile App received real-time notification:', payload);
      if (payload.userId && payload.userId !== user?.id) {
        return;
      }
      setUnreadCount((prev) => prev + 1);
    });

    socket.on('disconnect', () => {
      console.log('Mobile App disconnected from Socket.IO Server');
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribePush = initPushNotifications();
    
    // Register device token on tab mount if user is logged in
    registerDeviceToken();

    return () => {
      if (typeof unsubscribePush === 'function') {
        unsubscribePush();
      }
    };
  }, [user]);

  const fetchUnread = async () => {
    try {
      const token = await require('@react-native-async-storage/async-storage').default.getItem('token');
      if (!token) return;
      const res = await fetch(`${getBaseUrl()}/api/notifications?unreadOnly=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.notifications?.length || 0);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  const handleNavigateToAlerts = (source: 'dashboard' | 'leads' | 'calendar' | 'reports' | 'more' = 'dashboard') => {
    setNotificationsSourceTab(source);
    setActiveTab('more');
    setMoreView('alerts');
  };

  const handleNavigateToLeads = (leadId?: number) => {
    setActiveTab('leads');
    if (typeof leadId === 'number') {
      setTargetLeadId(leadId);
    }
  };

  useEffect(() => {
    fetchUnread();
  }, [activeTab]);

  useEffect(() => {
    setOnNotificationPressed(() => {
      console.log('[AppTabs] Redirecting to Alerts screen due to notification press');
      handleNavigateToAlerts('dashboard');
    });
    return () => {
      setOnNotificationPressed(() => {});
    };
  }, []);

  const handleLogout = () => {
    showConfirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your CRM workspace account?',
      isDestructive: true,
      proceedText: 'Sign Out',
      cancelText: 'Cancel',
      onProceed: async () => {
        try {
          await unregisterDeviceToken();
        } catch (err) {
          console.error('[FCM] Error unregistering token:', err);
        } finally {
          dispatch(logoutUser() as any);
        }
      }
    });
  };

  const renderMoreContent = () => {
    if (moreView === 'alerts') {
      return (
        <NotificationsScreen 
          onBack={() => { 
            if (notificationsSourceTab && notificationsSourceTab !== 'more') {
              setActiveTab(notificationsSourceTab);
            }
            setMoreView('menu'); 
            setNotificationsSourceTab(null);
            fetchUnread(); 
          }} 
          onOpenLead={(leadId) => {
            handleNavigateToLeads(leadId);
          }}
        />
      );
    }
    if (moreView === 'settings') {
      return (
        <SettingsScreen 
          onBack={() => setMoreView('menu')} 
          initialTab={settingsInitialTab}
        />
      );
    }
    if (moreView === 'admin') {
      return <AdminScreen onBack={() => setMoreView('menu')} />;
    }
    if (moreView === 'legal') {
      return (
        <LegalScreen 
          onBack={() => setMoreView('menu')} 
          initialTab={legalInitialTab} 
        />
      );
    }

    const isStaff = user?.role === 'staff';
    const isSuperAdmin = user?.role === 'super_admin';
    const roleLabel = user?.role
      ? user.role.replace('_', ' ').toUpperCase()
      : 'USER';

    return (
      <View style={styles.moreContainer}>
        {/* Modern Sticky Header */}
        <View style={[styles.moreHeader, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
          <View>
            <Text style={styles.moreHeaderTitle}>More Options</Text>
            <Text style={styles.moreHeaderSubtitle}>Account, workspace & platform controls</Text>
          </View>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineBadgeText}>CONNECTED</Text>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.moreScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Profile Card */}
          <TouchableOpacity 
            style={styles.heroProfileCard}
            onPress={() => openSettings('profile')}
            activeOpacity={0.8}
          >
            <View style={styles.heroAvatarContainer}>
              <View style={styles.heroAvatar}>
                {getImageUrl(user?.companyLogo || user?.avatar) ? (
                  <Image
                    source={{ uri: getImageUrl(user?.companyLogo || user?.avatar)! }}
                    style={styles.heroAvatarImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.heroAvatarText}>
                    {user?.name ? user.name[0].toUpperCase() : 'U'}
                  </Text>
                )}
              </View>
              <View style={styles.heroAvatarStatusDot} />
            </View>

            <View style={styles.heroProfileDetails}>
              <Text style={styles.heroProfileName} numberOfLines={1}>
                {user?.name || 'Workspace User'}
              </Text>
              <Text style={styles.heroProfileEmail} numberOfLines={1}>
                {user?.email || 'user@company.com'}
              </Text>

              {/* Badges Row */}
              <View style={styles.heroBadgesRow}>
                <View style={[
                  styles.heroRoleBadge,
                  isSuperAdmin ? styles.heroRoleBadgeSuper : (isStaff ? styles.heroRoleBadgeStaff : styles.heroRoleBadgeAdmin)
                ]}>
                  <Shield size={11} color={isSuperAdmin ? '#9333ea' : (isStaff ? '#475569' : '#2563eb')} style={{ marginRight: 3 }} />
                  <Text style={[
                    styles.heroRoleBadgeText,
                    isSuperAdmin ? { color: '#9333ea' } : (isStaff ? { color: '#475569' } : { color: '#2563eb' })
                  ]}>
                    {roleLabel}
                  </Text>
                </View>

                <View style={styles.heroCompanyBadge}>
                  <Building2 size={11} color="#64748b" style={{ marginRight: 3 }} />
                  <Text style={styles.heroCompanyBadgeText} numberOfLines={1}>
                    {user?.companyName || 'Enterprise CRM'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.heroEditPill}>
              <Edit3 size={15} color="#2563eb" />
            </View>
          </TouchableOpacity>

          {/* Section: Workspace Navigation */}
          <Text style={styles.sectionHeaderTitle}>WORKSPACE & NOTIFICATIONS</Text>
          <View style={styles.menuCardGroup}>
            {/* Alerts & Notifications */}
            <TouchableOpacity 
              style={styles.menuCardRow} 
              onPress={() => handleNavigateToAlerts('more')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#eff6ff' }]}>
                <Bell size={18} color="#2563eb" />
              </View>
              <View style={styles.menuCardTextContainer}>
                <Text style={styles.menuCardTitle}>Notifications & Alerts</Text>
                <Text style={styles.menuCardSubtitle}>System updates, mentions & lead notifications</Text>
              </View>
              <View style={styles.menuCardRight}>
                {unreadCount > 0 && (
                  <View style={styles.unreadCountPill}>
                    <Text style={styles.unreadCountText}>{unreadCount}</Text>
                  </View>
                )}
                <ChevronRight size={16} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            <View style={styles.menuRowDivider} />

            {/* My Profile */}
            <TouchableOpacity 
              style={styles.menuCardRow} 
              onPress={() => openSettings('profile')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#f0fdf4' }]}>
                <User size={18} color="#16a34a" />
              </View>
              <View style={styles.menuCardTextContainer}>
                <Text style={styles.menuCardTitle}>My Profile & Image</Text>
                <Text style={styles.menuCardSubtitle}>Upload local photo/logo, contact & password</Text>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            {!isStaff && (
              <>
                <View style={styles.menuRowDivider} />

                {/* Workspace Settings */}
                <TouchableOpacity 
                  style={styles.menuCardRow} 
                  onPress={() => openSettings('company')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIconBox, { backgroundColor: '#faf5ff' }]}>
                    <SettingsIcon size={18} color="#7c3aed" />
                  </View>
                  <View style={styles.menuCardTextContainer}>
                    <Text style={styles.menuCardTitle}>Company & Ingestion API</Text>
                    <Text style={styles.menuCardSubtitle}>Company profile, REST API token & channels</Text>
                  </View>
                  <ChevronRight size={16} color="#94a3b8" />
                </TouchableOpacity>

                <View style={styles.menuRowDivider} />

                {/* Team Members */}
                <TouchableOpacity 
                  style={styles.menuCardRow} 
                  onPress={() => openSettings('team')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIconBox, { backgroundColor: '#fef3c7' }]}>
                    <Users size={18} color="#d97706" />
                  </View>
                  <View style={styles.menuCardTextContainer}>
                    <Text style={styles.menuCardTitle}>Team Members</Text>
                    <Text style={styles.menuCardSubtitle}>Manage staff accounts, assign roles & access</Text>
                  </View>
                  <ChevronRight size={16} color="#94a3b8" />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Section: Super Admin (if super_admin) */}
          {isSuperAdmin && (
            <>
              <Text style={[styles.sectionHeaderTitle, { color: '#dc2626' }]}>
                SUPER ADMIN PLATFORM
              </Text>
              <View style={[styles.menuCardGroup, { borderColor: '#fecaca' }]}>
                <TouchableOpacity 
                  style={styles.menuCardRow} 
                  onPress={() => setMoreView('admin')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIconBox, { backgroundColor: '#fef2f2' }]}>
                    <ShieldAlert size={18} color="#ef4444" />
                  </View>
                  <View style={styles.menuCardTextContainer}>
                    <Text style={[styles.menuCardTitle, { color: '#dc2626' }]}>
                      Platform Control Panel
                    </Text>
                    <Text style={styles.menuCardSubtitle}>
                      Manage tenant companies, system settings & audits
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Section: Preferences */}
          <Text style={styles.sectionHeaderTitle}>PREFERENCES</Text>
          <View style={styles.menuCardGroup}>
            <TouchableOpacity 
              style={styles.menuCardRow} 
              onPress={() => openSettings('profile')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#fff7ed' }]}>
                <Volume2 size={18} color="#ea580c" />
              </View>
              <View style={styles.menuCardTextContainer}>
                <Text style={styles.menuCardTitle}>Lead Alert Ringtone</Text>
                <Text style={styles.menuCardSubtitle}>Audible sound for new assigned & hot leads</Text>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Section: Legal & Compliance */}
          <Text style={styles.sectionHeaderTitle}>LEGAL & POLICIES</Text>
          <View style={styles.menuCardGroup}>
            <TouchableOpacity 
              style={styles.menuCardRow} 
              onPress={() => {
                setLegalInitialTab('privacy');
                setMoreView('legal');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#eff6ff' }]}>
                <ShieldCheck size={18} color="#2563eb" />
              </View>
              <View style={styles.menuCardTextContainer}>
                <Text style={styles.menuCardTitle}>Privacy Policy</Text>
                <Text style={styles.menuCardSubtitle}>Data protection, row isolation & GDPR standards</Text>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.menuRowDivider} />

            <TouchableOpacity 
              style={styles.menuCardRow} 
              onPress={() => {
                setLegalInitialTab('terms');
                setMoreView('legal');
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#f8fafc' }]}>
                <Scale size={18} color="#475569" />
              </View>
              <View style={styles.menuCardTextContainer}>
                <Text style={styles.menuCardTitle}>Terms of Service</Text>
                <Text style={styles.menuCardSubtitle}>Enterprise SaaS agreement & acceptable use</Text>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* App Branding & Version Card */}
          <View style={styles.brandingCard}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.brandingLogo} 
              resizeMode="contain" 
            />
            <Text style={styles.brandingTitle}>Enterprise CRM Mobile</Text>
            <Text style={styles.brandingVersion}>Version 1.2.0 • Production Build</Text>
            <View style={styles.brandingTenantBadge}>
              <Building2 size={12} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.brandingTenantText}>
                Active Tenant: {user?.companyName || 'Enterprise Platform'}
              </Text>
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity 
            style={styles.logoutActionBtn} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LogOut size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.logoutActionBtnText}>Sign Out of Workspace</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardScreen 
            onNotificationPress={() => handleNavigateToAlerts('dashboard')} 
            unreadCount={unreadCount} 
            onNavigateToLeads={handleNavigateToLeads}
            onNavigateToTab={setActiveTab}
          />
        );
      case 'leads':
        return (
          <LeadsScreen 
            initialLeadId={targetLeadId} 
            clearInitialLeadId={() => setTargetLeadId(null)} 
          />
        );
      case 'calendar':
        return (
          <CalendarScreen 
            onNavigateToLeads={handleNavigateToLeads} 
            onNotificationPress={() => handleNavigateToAlerts('calendar')}
            unreadCount={unreadCount}
          />
        );
      case 'reports':
        return (
          <ReportsScreen 
            onNotificationPress={() => handleNavigateToAlerts('reports')}
            unreadCount={unreadCount}
          />
        );
      case 'more':
        return renderMoreContent();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderContent()}
      </View>

      <View style={[styles.tabBarContainer, { backgroundColor: navBg, borderTopColor: navBorder, paddingBottom: dynamicBottomPadding }]}>
        <View style={[styles.tabBar, { backgroundColor: navBg }]}>
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.7}
          >
            {activeTab === 'dashboard' && <View style={[styles.activeTopIndicator, { backgroundColor: activeIndicatorColor }]} />}
            <View style={[
              styles.iconPill, 
              activeTab === 'dashboard' && [styles.iconPillActive, { backgroundColor: activePillBg, borderColor: activePillBorder }]
            ]}>
              <LayoutDashboard 
                size={20} 
                color={activeTab === 'dashboard' ? activeIconColor : inactiveIconColor} 
                strokeWidth={activeTab === 'dashboard' ? 2.5 : 1.8}
              />
            </View>
            <Text style={[
              styles.tabLabel, 
              { color: inactiveIconColor },
              activeTab === 'dashboard' && [styles.tabLabelActive, { color: activeIconColor }]
            ]}>
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('leads')}
            activeOpacity={0.7}
          >
            {activeTab === 'leads' && <View style={[styles.activeTopIndicator, { backgroundColor: activeIndicatorColor }]} />}
            <View style={[
              styles.iconPill, 
              activeTab === 'leads' && [styles.iconPillActive, { backgroundColor: activePillBg, borderColor: activePillBorder }]
            ]}>
              <Users 
                size={20} 
                color={activeTab === 'leads' ? activeIconColor : inactiveIconColor} 
                strokeWidth={activeTab === 'leads' ? 2.5 : 1.8}
              />
            </View>
            <Text style={[
              styles.tabLabel, 
              { color: inactiveIconColor },
              activeTab === 'leads' && [styles.tabLabelActive, { color: activeIconColor }]
            ]}>
              Leads
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('calendar')}
            activeOpacity={0.7}
          >
            {activeTab === 'calendar' && <View style={[styles.activeTopIndicator, { backgroundColor: activeIndicatorColor }]} />}
            <View style={[
              styles.iconPill, 
              activeTab === 'calendar' && [styles.iconPillActive, { backgroundColor: activePillBg, borderColor: activePillBorder }]
            ]}>
              <CalendarIcon 
                size={20} 
                color={activeTab === 'calendar' ? activeIconColor : inactiveIconColor} 
                strokeWidth={activeTab === 'calendar' ? 2.5 : 1.8}
              />
            </View>
            <Text style={[
              styles.tabLabel, 
              { color: inactiveIconColor },
              activeTab === 'calendar' && [styles.tabLabelActive, { color: activeIconColor }]
            ]}>
              Calendar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('reports')}
            activeOpacity={0.7}
          >
            {activeTab === 'reports' && <View style={[styles.activeTopIndicator, { backgroundColor: activeIndicatorColor }]} />}
            <View style={[
              styles.iconPill, 
              activeTab === 'reports' && [styles.iconPillActive, { backgroundColor: activePillBg, borderColor: activePillBorder }]
            ]}>
              <TrendingUp 
                size={20} 
                color={activeTab === 'reports' ? activeIconColor : inactiveIconColor} 
                strokeWidth={activeTab === 'reports' ? 2.5 : 1.8}
              />
            </View>
            <Text style={[
              styles.tabLabel, 
              { color: inactiveIconColor },
              activeTab === 'reports' && [styles.tabLabelActive, { color: activeIconColor }]
            ]}>
              Reports
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => {
              setActiveTab('more');
              setMoreView('menu');
            }}
            activeOpacity={0.7}
          >
            {activeTab === 'more' && <View style={[styles.activeTopIndicator, { backgroundColor: activeIndicatorColor }]} />}
            <View style={[
              styles.iconPill, 
              activeTab === 'more' && [styles.iconPillActive, { backgroundColor: activePillBg, borderColor: activePillBorder }]
            ]}>
              <Menu 
                size={20} 
                color={activeTab === 'more' ? activeIconColor : inactiveIconColor} 
                strokeWidth={activeTab === 'more' ? 2.5 : 1.8}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={[
              styles.tabLabel, 
              { color: inactiveIconColor },
              activeTab === 'more' && [styles.tabLabelActive, { color: activeIconColor }]
            ]}>
              More
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.appBackground,
  },
  content: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: TOKENS.colors.white,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.border,
    shadowColor: TOKENS.colors.heading,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
    paddingTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    height: 52,
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    position: 'relative',
  },
  activeTopIndicator: {
    position: 'absolute',
    top: -4,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: TOKENS.colors.primary,
  },
  iconPill: {
    width: 46,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconPillActive: {
    backgroundColor: TOKENS.colors.primaryLight,
    borderWidth: 1,
    borderColor: TOKENS.colors.primaryBorder,
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
    fontWeight: '500',
    color: TOKENS.colors.secondary,
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: TOKENS.colors.primary,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    right: 1,
    top: -2,
    backgroundColor: TOKENS.colors.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: TOKENS.colors.white,
  },
  badgeText: {
    color: TOKENS.colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  moreContainer: {
    flex: 1,
    backgroundColor: TOKENS.colors.appBackground,
  },
  moreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: TOKENS.colors.white,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  moreHeaderTitle: {
    color: TOKENS.colors.heading,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  moreHeaderSubtitle: {
    color: TOKENS.colors.secondary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.successLight,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.colors.success,
    marginRight: 5,
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: TOKENS.colors.success,
    letterSpacing: 0.5,
  },
  moreScroll: {
    padding: 16,
    paddingBottom: 44,
  },
  heroProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    padding: 16,
    marginBottom: 20,
    shadowColor: TOKENS.colors.heading,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  heroAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TOKENS.colors.primaryLight,
    borderWidth: 2,
    borderColor: TOKENS.colors.primaryBorder,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarImg: {
    width: '100%',
    height: '100%',
  },
  heroAvatarText: {
    color: TOKENS.colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  heroAvatarStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: TOKENS.colors.success,
    borderWidth: 2.5,
    borderColor: TOKENS.colors.white,
  },
  heroProfileDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  heroProfileName: {
    fontSize: 17,
    fontWeight: '700',
    color: TOKENS.colors.heading,
  },
  heroProfileEmail: {
    fontSize: 12,
    color: TOKENS.colors.secondary,
    marginTop: 2,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  heroRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  heroRoleBadgeSuper: {
    backgroundColor: '#f3e8ff',
  },
  heroRoleBadgeAdmin: {
    backgroundColor: TOKENS.colors.primaryLight,
  },
  heroRoleBadgeStaff: {
    backgroundColor: '#f1f5f9',
  },
  heroRoleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroCompanyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.cardSubtle,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    maxWidth: 130,
  },
  heroCompanyBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: TOKENS.colors.secondary,
  },
  heroEditPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TOKENS.colors.primaryLight,
    borderWidth: 1,
    borderColor: TOKENS.colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: TOKENS.colors.secondary,
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  menuCardGroup: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    overflow: 'hidden',
    marginBottom: 18,
    shadowColor: TOKENS.colors.heading,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuCardTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  menuCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.colors.heading,
  },
  menuCardSubtitle: {
    fontSize: 11,
    color: TOKENS.colors.secondary,
    marginTop: 2,
  },
  menuCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadCountPill: {
    backgroundColor: TOKENS.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadCountText: {
    color: TOKENS.colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  menuRowDivider: {
    height: 1,
    backgroundColor: TOKENS.colors.border,
    marginLeft: 68,
  },
  brandingCard: {
    alignItems: 'center',
    backgroundColor: TOKENS.colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  brandingLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginBottom: 8,
  },
  brandingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TOKENS.colors.heading,
    letterSpacing: 0.2,
  },
  brandingVersion: {
    fontSize: 11,
    color: TOKENS.colors.secondary,
    marginTop: 2,
  },
  brandingTenantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.cardSubtle,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  brandingTenantText: {
    fontSize: 11,
    color: TOKENS.colors.secondary,
    fontWeight: '500',
  },
  logoutActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.error,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: TOKENS.colors.error,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
  },
  logoutActionBtnText: {
    color: TOKENS.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
