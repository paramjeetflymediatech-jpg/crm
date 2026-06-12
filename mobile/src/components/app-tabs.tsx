import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Alert, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logoutUser } from '../store/authSlice';
import { getBaseUrl } from '../api/client';
import io from 'socket.io-client';
import { initPushNotifications, registerDeviceToken, unregisterDeviceToken } from '../services/pushNotification';

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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'calendar' | 'reports' | 'more'>('dashboard');
  const [moreView, setMoreView] = useState<'menu' | 'alerts' | 'settings' | 'admin'>('menu');
  const [targetLeadId, setTargetLeadId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsSourceTab, setNotificationsSourceTab] = useState<'dashboard' | 'leads' | 'calendar' | 'reports' | 'more' | null>(null);

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

  useEffect(() => {
    fetchUnread();
  }, [activeTab]);

  const handleNavigateToLeads = (leadId: number) => {
    setActiveTab('leads');
    setTargetLeadId(leadId);
  };

  const handleNavigateToAlerts = (source: 'dashboard' | 'leads' | 'calendar' | 'reports' | 'more' = 'dashboard') => {
    setNotificationsSourceTab(source);
    setActiveTab('more');
    setMoreView('alerts');
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
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
                <Bell size={18} color="#818cf8" style={{ marginRight: 12 }} />
                <Text style={styles.menuItemText}>Alerts</Text>
                {unreadCount > 0 && (
                  <View style={styles.inlineBadge}>
                    <Text style={styles.inlineBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <ChevronRight size={16} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => setMoreView('settings')}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <SettingsIcon size={18} color="#818cf8" style={{ marginRight: 12 }} />
                <Text style={styles.menuItemText}>Settings</Text>
              </View>
              <ChevronRight size={16} color="#64748b" />
            </TouchableOpacity>

            {user?.role === 'super_admin' && (
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={() => setMoreView('admin')}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <ShieldAlert size={18} color="#f87171" style={{ marginRight: 12 }} />
                  <Text style={[styles.menuItemText, { color: '#f87171' }]}>Platform Control Panel</Text>
                </View>
                <ChevronRight size={16} color="#64748b" />
              </TouchableOpacity>
            )}
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

      <SafeAreaView style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.7}
          >
            <LayoutDashboard size={20} color={activeTab === 'dashboard' ? '#6366f1' : '#64748b'} />
            <Text style={[styles.tabLabel, { color: activeTab === 'dashboard' ? '#6366f1' : '#64748b' }]}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('leads')}
            activeOpacity={0.7}
          >
            <Users size={20} color={activeTab === 'leads' ? '#6366f1' : '#64748b'} />
            <Text style={[styles.tabLabel, { color: activeTab === 'leads' ? '#6366f1' : '#64748b' }]}>Leads</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('calendar')}
            activeOpacity={0.7}
          >
            <CalendarIcon size={20} color={activeTab === 'calendar' ? '#6366f1' : '#64748b'} />
            <Text style={[styles.tabLabel, { color: activeTab === 'calendar' ? '#6366f1' : '#64748b' }]}>Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => setActiveTab('reports')}
            activeOpacity={0.7}
          >
            <TrendingUp size={20} color={activeTab === 'reports' ? '#6366f1' : '#64748b'} />
            <Text style={[styles.tabLabel, { color: activeTab === 'reports' ? '#6366f1' : '#64748b' }]}>Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => {
              setActiveTab('more');
              setMoreView('menu');
            }}
            activeOpacity={0.7}
          >
            <View>
              <Menu size={20} color={activeTab === 'more' ? '#6366f1' : '#64748b'} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, { color: activeTab === 'more' ? '#6366f1' : '#64748b' }]}>More</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  tabBar: {
    flexDirection: 'row',
    height: 52,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '20%',
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  moreContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  moreHeader: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  moreHeaderTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  moreScroll: {
    padding: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  avatarText: {
    color: '#818cf8',
    fontSize: 18,
    fontWeight: '700',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileRole: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  profileCompany: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  menuList: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#0f172a',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    color: '#cbd5e1',
    fontSize: 14,
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
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
