import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert
} from 'react-native';
import { mobileApiFetch } from '../api/client';
import { Bell, CheckSquare, BellOff, ChevronLeft } from 'lucide-react-native';

interface NotificationsScreenProps {
  onBack?: () => void;
}

export default function NotificationsScreen({ onBack }: NotificationsScreenProps = {}) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await mobileApiFetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(true);
  }, []);

  const handleMarkAllRead = async () => {
    if (notifications.length === 0) return;
    try {
      const res = await mobileApiFetch('/api/notifications', {
        method: 'POST',
        bodyData: { markAll: true }
      });
      if (res.ok) {
        fetchNotifications(true);
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to mark read');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkSingleRead = async (id: number) => {
    try {
      const res = await mobileApiFetch('/api/notifications', {
        method: 'POST',
        bodyData: { notificationIds: [id] }
      });
      if (res.ok) {
        fetchNotifications(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isUnread = !item.is_read;
    return (
      <TouchableOpacity 
        style={[styles.notiCard, isUnread && styles.notiCardUnread]}
        onPress={() => isUnread && handleMarkSingleRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.notiIconWrapper}>
          <Bell size={18} color={isUnread ? '#818cf8' : '#64748b'} />
        </View>
        <View style={styles.notiTextContainer}>
          <Text style={[styles.notiTitle, isUnread && styles.notiTitleUnread]}>{item.title}</Text>
          <Text style={styles.notiMessage}>{item.message}</Text>
          <Text style={styles.notiTime}>{new Date(item.created_at || item.createdAt).toLocaleString()}</Text>
        </View>
        {isUnread && (
          <View style={styles.unreadIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
              <ChevronLeft size={24} color="#818cf8" />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Notifications</Text>
        </View>
        <TouchableOpacity 
          style={styles.markReadBtn}
          onPress={handleMarkAllRead}
          activeOpacity={0.7}
        >
          <CheckSquare size={16} color="#818cf8" style={{ marginRight: 6 }} />
          <Text style={styles.markReadBtnText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList 
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BellOff size={40} color="#334155" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>You have no notifications.</Text>
            </View>
          }
        />
      )}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markReadBtnText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  notiCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  notiCardUnread: {
    borderColor: '#475569',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  notiIconWrapper: {
    marginRight: 16,
  },
  notiTextContainer: {
    flex: 1,
  },
  notiTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  notiTitleUnread: {
    color: '#ffffff',
    fontWeight: '600',
  },
  notiMessage: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  notiTime: {
    color: '#64748b',
    fontSize: 10,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
    marginLeft: 12,
  },
  emptyContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
  },
});
