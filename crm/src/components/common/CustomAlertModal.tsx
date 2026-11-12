import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ArrowRight, 
  X,
  Trash2,
  LogOut,
  Sparkles
} from 'lucide-react-native';
import { alertService, AlertOptions, AlertType } from '../../services/alertService';
import { TOKENS } from '../../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CustomAlertModal() {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    const unsubscribe = alertService.subscribe((newOptions) => {
      if (newOptions) {
        setOptions(newOptions);
        setVisible(true);
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 7,
            tension: 65,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        handleDismiss();
      }
    });

    return unsubscribe;
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.94,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setOptions(null);
    });
  };

  const handleProceed = () => {
    const callback = options?.onProceed;
    handleDismiss();
    if (callback) {
      setTimeout(callback, 200);
    }
  };

  const handleCancel = () => {
    const callback = options?.onCancel;
    handleDismiss();
    if (callback) {
      setTimeout(callback, 200);
    }
  };

  if (!visible || !options) {
    return null;
  }

  const type: AlertType = options.type || 'info';
  const isDestructive = options.isDestructive || type === 'danger';

  // Config based on alert type
  const getThemeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={32} color={TOKENS.colors.success} />,
          iconBg: TOKENS.colors.successLight,
          iconBorder: '#A7F3D0',
          accentColor: TOKENS.colors.success,
          shadowColor: TOKENS.colors.success,
        };
      case 'danger':
        return {
          icon: isDestructive ? <AlertTriangle size={32} color={TOKENS.colors.error} /> : <AlertCircle size={32} color={TOKENS.colors.error} />,
          iconBg: TOKENS.colors.errorLight,
          iconBorder: '#FECACA',
          accentColor: TOKENS.colors.error,
          shadowColor: TOKENS.colors.error,
        };
      case 'warning':
        return {
          icon: <AlertCircle size={32} color={TOKENS.colors.warning} />,
          iconBg: TOKENS.colors.warningLight,
          iconBorder: '#FDE68A',
          accentColor: TOKENS.colors.warning,
          shadowColor: TOKENS.colors.warning,
        };
      case 'info':
      default:
        return {
          icon: <Sparkles size={30} color={TOKENS.colors.primary} />,
          iconBg: TOKENS.colors.primaryLight,
          iconBorder: '#BFDBFE',
          accentColor: TOKENS.colors.primary,
          shadowColor: TOKENS.colors.primary,
        };
    }
  };

  const theme = getThemeConfig();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={options.showCancel ? handleCancel : handleProceed}>
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Close Button top-right */}
              <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={handleCancel}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>

              {/* Icon Container */}
              <View style={[styles.iconWrapper, { backgroundColor: theme.iconBg, borderColor: theme.iconBorder }]}>
                {theme.icon}
              </View>

              {/* Text Content */}
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>{options.title}</Text>
                {options.message ? (
                  <Text style={styles.messageText}>{options.message}</Text>
                ) : null}
              </View>

              {/* Actions Footer */}
              <View style={styles.actionContainer}>
                {options.showCancel ? (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancel}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.cancelButtonText}>
                        {options.cancelText || 'Cancel'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.proceedButton,
                        { backgroundColor: isDestructive ? '#dc2626' : '#2563eb' }
                      ]}
                      onPress={handleProceed}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.proceedButtonText}>
                        {options.proceedText || 'Proceed'}
                      </Text>
                      <ArrowRight size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.fullProceedButton,
                      { backgroundColor: theme.accentColor }
                    ]}
                    onPress={handleProceed}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.fullProceedButtonText}>
                      {options.proceedText || 'Proceed'}
                    </Text>
                    <ArrowRight size={17} color="#ffffff" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: Math.min(SCREEN_WIDTH - 48, 380),
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  messageText: {
    fontSize: 14.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 6,
  },
  actionContainer: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  proceedButton: {
    flex: 1.2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  proceedButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  fullProceedButton: {
    width: '100%',
    flexDirection: 'row',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  fullProceedButtonText: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

