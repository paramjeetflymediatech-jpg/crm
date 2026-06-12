import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { logoutUser } from '../store/authSlice';
import { User as UserIcon, Building, LogOut, Key, Globe, Shield, ChevronLeft } from 'lucide-react-native';
import { unregisterDeviceToken } from '../services/pushNotification';

interface SettingsScreenProps {
  onBack?: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps = {}) {
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);
  const user = auth.user;

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
            <ChevronLeft size={24} color="#818cf8" />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>User Account</Text>
          <View style={styles.row}>
            <UserIcon size={18} color="#64748b" style={styles.icon} />
            <View style={styles.infoCol}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{user?.name}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <UserIcon size={18} color="#64748b" style={styles.icon} />
            <View style={styles.infoCol}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.value}>{user?.email}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Shield size={18} color="#64748b" style={styles.icon} />
            <View style={styles.infoCol}>
              <Text style={styles.label}>Role</Text>
              <Text style={styles.roleValue}>{user?.role?.replace('_', ' ')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Company Tenant</Text>
          <View style={styles.row}>
            <Building size={18} color="#64748b" style={styles.icon} />
            <View style={styles.infoCol}>
              <Text style={styles.label}>Company Name</Text>
              <Text style={styles.value}>{user?.companyName || 'System Platform'}</Text>
            </View>
          </View>
          {user?.Company && (
            <>
              {user.Company.website && (
                <View style={styles.row}>
                  <Globe size={18} color="#64748b" style={styles.icon} />
                  <View style={styles.infoCol}>
                    <Text style={styles.label}>Website</Text>
                    <Text style={styles.value}>{user.Company.website}</Text>
                  </View>
                </View>
              )}
              {user.Company.api_key && (
                <View style={styles.row}>
                  <Key size={18} color="#64748b" style={styles.icon} />
                  <View style={styles.infoCol}>
                    <Text style={styles.label}>REST API Key</Text>
                    <Text style={styles.value}>••••••••••••••••</Text>
                  </View>
                </View>
              )}
            </>
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    marginRight: 16,
  },
  infoCol: {
    flex: 1,
  },
  label: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  roleValue: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
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
