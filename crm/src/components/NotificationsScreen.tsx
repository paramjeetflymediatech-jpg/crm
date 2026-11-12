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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mobileApiFetch } from '../api/client';
import { TOKENS } from '../theme/tokens';
import { Bell, CheckSquare, BellOff, ChevronLeft } from 'lucide-react-native';

interface NotificationsScreenProps {
  onBack?: () => void;
  onOpenLead?: (leadId: number) => void;
}

export default function NotificationsScreen({ onBack, onOpenLead }: NotificationsScreenProps = {}) {
  const insets = useSafeAreaInsets();
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
    const handlePress = () => {
      if (isUnread) {
        handleMarkSingleRead(item.id);
      }
      const targetLeadId = item.lead_id || item.Lead?.id;
      if (targetLeadId && onOpenLead) {
        onOpenLead(targetLeadId);
      }
    };

    return (
      <TouchableOpacity 
        style={[styles.notiCard, isUnread && styles.notiCardUnread]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.notiIconWrapper}>
          <Bell size={18} color={isUnread ? '#2563eb' : '#64748b'} />
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
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
              <ChevronLeft size={24} color={TOKENS.colors.primary} />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Notifications</Text>
        </View>
        <TouchableOpacity 
          style={styles.markReadBtn}
          onPress={handleMarkAllRead}
          activeOpacity={0.7}
        >
          <CheckSquare size={16} color={TOKENS.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.markReadBtnText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList 
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BellOff size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
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
    backgroundColor: TOKENS.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    paddingBottom: 16,
    backgroundColor: TOKENS.colors.surface,
    borderBottomWidth: 1,
    borderColor: TOKENS.colors.border,
    ...TOKENS.shadows.sm,
    zIndex: 10,
  },
  title: {
    color: TOKENS.colors.heading,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: TOKENS.radius.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.primaryBorder,
  },
  markReadBtnText: {
    color: TOKENS.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: TOKENS.spacing.md,
    paddingBottom: 40,
  },
  notiCard: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    alignItems: 'center',
    ...TOKENS.shadows.card,
  },
  notiCardUnread: {
    borderColor: TOKENS.colors.primaryBorder,
    backgroundColor: TOKENS.colors.primaryLight,
  },
  notiIconWrapper: {
    marginRight: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: TOKENS.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  notiTextContainer: {
    flex: 1,
  },
  notiTitle: {
    color: TOKENS.colors.secondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  notiTitleUnread: {
    color: TOKENS.colors.heading,
    fontWeight: '700',
  },
  notiMessage: {
    color: TOKENS.colors.heading,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  notiTime: {
    color: TOKENS.colors.secondary,
    fontSize: 10,
    fontWeight: '500',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TOKENS.colors.primary,
    marginLeft: 12,
  },
  emptyContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: TOKENS.colors.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
