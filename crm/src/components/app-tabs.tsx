import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logoutUser } from '../store/authSlice';
import { getBaseUrl } from '../api/client';
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

// Icons
import { LayoutDashboard, Users, Calendar as CalendarIcon, TrendingUp, Menu, Bell, Settings as SettingsIcon, ShieldAlert, LogOut, ChevronRight } from 'lucide-react-native';

export default function AppTabs() {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'calendar' | 'reports' | 'more'>('dashboard');
  const [moreView, setMoreView] = useState<'menu' | 'alerts' | 'settings' | 'admin'>('menu');
  const [targetLeadId, setTargetLeadId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsSourceTab, setNotificationsSourceTab] = useState<'dashboard' | 'leads' | 'calendar' | 'reports' | 'more' | null>(null);

  // Responsive bottom padding for gesture navigation vs 3-button navigation
  const isGestureNav = insets.bottom > 0 && insets.bottom <= 28;
  const dynamicBottomPadding = insets.bottom > 0
    ? (isGestureNav ? Math.max(insets.bottom - 6, 6) : insets.bottom + 2)
    : (Platform.OS === 'ios' ? 12 : 8);

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

  const handleNavigateToLeads = (leadId: number) => {
    setActiveTab('leads');
    setTargetLeadId(leadId);
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
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Proceed', 
          style: 'destructive',
          onPress: () => {
            unregisterDeviceToken().catch(err => console.error('[FCM] Error unregistering token:', err)).finally(() => {
              dispatch(logoutUser() as any);
            });
          }
        }
      ]
    );
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
      return <SettingsScreen onBack={() => setMoreView('menu')} />;
    }
    if (moreView === 'admin') {
      return <AdminScreen onBack={() => setMoreView('menu')} />;
    }

    return (
      <View style={styles.moreContainer}>
        <View style={styles.moreHeader}>
          <Text style={styles.moreHeaderTitle}>More Options</Text>
        </View>

        <ScrollView contentContainerStyle={styles.moreScroll}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name ? user.name[0].toUpperCase() : 'U'}</Text>
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileRole}>{user?.role?.replace('_', ' ')}</Text>
              <Text style={styles.profileCompany}>{user?.companyName || 'System Platform'}</Text>
            </View>
          </View>

          {/* List items */}
          <View style={styles.menuList}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => handleNavigateToAlerts('more')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Bell size={18} color="#2563eb" style={{ marginRight: 12 }} />
                <Text style={styles.menuItemText}>Alerts</Text>
                {unreadCount > 0 && (
                  <View style={styles.inlineBadge}>
                    <Text style={styles.inlineBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => setMoreView('settings')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <SettingsIcon size={18} color="#2563eb" style={{ marginRight: 12 }} />
                <Text style={styles.menuItemText}>Settings</Text>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            {user?.role === 'super_admin' && (
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => setMoreView('admin')}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <ShieldAlert size={18} color="#ef4444" style={{ marginRight: 12 }} />
                  <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Platform Control Panel</Text>
                </View>
                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.appBranding}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.brandLogo} 
              resizeMode="contain" 
            />
            <Text style={styles.brandTitle}>Enterprise CRM</Text>
            <Text style={styles.brandVersion}>v1.1.0 • Production Build</Text>
          </View>

          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LogOut size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>Sign Out</Text>
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

      <View style={[styles.tabBarContainer, { paddingBottom: dynamicBottomPadding }]}>
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconPill, activeTab === 'dashboard' && styles.iconPillActive]}>
              <LayoutDashboard 
                size={20} 
                color={activeTab === 'dashboard' ? '#2563eb' : '#64748b'} 
                strokeWidth={activeTab === 'dashboard' ? 2.4 : 1.9}
              />
            </View>
            <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.tabLabelActive]}>
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('leads')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconPill, activeTab === 'leads' && styles.iconPillActive]}>
              <Users 
                size={20} 
                color={activeTab === 'leads' ? '#2563eb' : '#64748b'} 
                strokeWidth={activeTab === 'leads' ? 2.4 : 1.9}
              />
            </View>
            <Text style={[styles.tabLabel, activeTab === 'leads' && styles.tabLabelActive]}>
              Leads
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('calendar')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconPill, activeTab === 'calendar' && styles.iconPillActive]}>
              <CalendarIcon 
                size={20} 
                color={activeTab === 'calendar' ? '#2563eb' : '#64748b'} 
                strokeWidth={activeTab === 'calendar' ? 2.4 : 1.9}
              />
            </View>
            <Text style={[styles.tabLabel, activeTab === 'calendar' && styles.tabLabelActive]}>
              Calendar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('reports')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconPill, activeTab === 'reports' && styles.iconPillActive]}>
              <TrendingUp 
                size={20} 
                color={activeTab === 'reports' ? '#2563eb' : '#64748b'} 
                strokeWidth={activeTab === 'reports' ? 2.4 : 1.9}
              />
            </View>
            <Text style={[styles.tabLabel, activeTab === 'reports' && styles.tabLabelActive]}>
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
            <View style={[styles.iconPill, activeTab === 'more' && styles.iconPillActive]}>
              <Menu 
                size={20} 
                color={activeTab === 'more' ? '#2563eb' : '#64748b'} 
                strokeWidth={activeTab === 'more' ? 2.4 : 1.9}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, activeTab === 'more' && styles.tabLabelActive]}>
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
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
    paddingTop: 5,
  },
  tabBar: {
    flexDirection: 'row',
    height: 48,
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconPill: {
    width: 44,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconPillActive: {
    backgroundColor: '#eff6ff',
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
    fontWeight: '500',
    color: '#64748b',
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    right: -4,
    top: -3,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '800',
  },
  moreContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  moreHeader: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  moreHeaderTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '700',
  },
  moreScroll: {
    padding: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginBottom: 20,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  avatarText: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: '700',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  profileRole: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  profileCompany: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  menuList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '500',
  },
  inlineBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 8,
  },
  inlineBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  appBranding: {
    alignItems: 'center',
    marginVertical: 24,
  },
  brandLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginBottom: 8,
  },
  brandTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  brandVersion: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
