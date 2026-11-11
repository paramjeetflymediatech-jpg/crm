import { Alert } from 'react-native';

export type AlertType = 'info' | 'success' | 'warning' | 'danger';

export interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  title: string;
  message?: string;
  type?: AlertType;
  proceedText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onProceed?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

type AlertListener = (options: AlertOptions | null) => void;

let currentListener: AlertListener | null = null;
let isPolyfilled = false;

export const alertService = {
  subscribe(listener: AlertListener) {
    currentListener = listener;
    return () => {
      if (currentListener === listener) {
        currentListener = null;
      }
    };
  },

  show(options: AlertOptions) {
    if (currentListener) {
      currentListener(options);
    } else {
      // Fallback if modal component not mounted yet
      Alert.alert(
        options.title,
        options.message,
        options.showCancel
          ? [
              { text: options.cancelText || 'Cancel', style: 'cancel', onPress: options.onCancel },
              { 
                text: options.proceedText || 'Proceed', 
                style: options.isDestructive ? 'destructive' : 'default', 
                onPress: options.onProceed 
              },
            ]
          : [{ text: options.proceedText || 'Proceed', onPress: options.onProceed }]
      );
    }
  },

  close() {
    if (currentListener) {
      currentListener(null);
    }
  },
};

/**
 * Modern Helper Methods
 */
export function showAlert(options: AlertOptions) {
  alertService.show(options);
}

export function showSuccess(title: string, message?: string, onProceed?: () => void, proceedText: string = 'Proceed') {
  alertService.show({
    title,
    message,
    type: 'success',
    proceedText,
    onProceed,
  });
}

export function showError(title: string, message?: string, onProceed?: () => void, proceedText: string = 'Proceed') {
  alertService.show({
    title,
    message,
    type: 'danger',
    proceedText,
    onProceed,
  });
}

export function showWarning(title: string, message?: string, onProceed?: () => void, proceedText: string = 'Proceed') {
  alertService.show({
    title,
    message,
    type: 'warning',
    proceedText,
    onProceed,
  });
}

export function showConfirm({
  title,
  message,
  proceedText = 'Proceed',
  cancelText = 'Cancel',
  isDestructive = false,
  type,
  onProceed,
  onCancel,
}: {
  title: string;
  message?: string;
  proceedText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  type?: AlertType;
  onProceed?: () => void;
  onCancel?: () => void;
}) {
  alertService.show({
    title,
    message,
    type: type || (isDestructive ? 'danger' : 'info'),
    proceedText,
    cancelText,
    showCancel: true,
    isDestructive,
    onProceed,
    onCancel,
  });
}

/**
 * Replaces standard React Native Alert.alert globally with our custom modern modal
 */
export function initAlertPolyfill() {
  if (isPolyfilled) return;
  isPolyfilled = true;

  const originalAlert = Alert.alert;

  Alert.alert = (title: string, message?: string, buttons?: AlertButton[], options?: any) => {
    // If no listener is available yet, fall back to native alert
    if (!currentListener) {
      originalAlert(title, message, buttons, options);
      return;
    }

    // Auto-detect type based on title or button style
    let detectedType: AlertType = 'info';
    const lowerTitle = (title || '').toLowerCase();
    const lowerMsg = (message || '').toLowerCase();

    if (
      lowerTitle.includes('error') || 
      lowerTitle.includes('failed') || 
      lowerTitle.includes('invalid') || 
      lowerTitle.includes('validation')
    ) {
      detectedType = 'warning';
    } else if (lowerTitle.includes('success') || lowerMsg.includes('success')) {
      detectedType = 'success';
    } else if (
      lowerTitle.includes('delete') || 
      lowerTitle.includes('sign out') || 
      lowerTitle.includes('logout') || 
      lowerTitle.includes('remove') ||
      lowerTitle.includes('suspend')
    ) {
      detectedType = 'danger';
    }

    // Handle single or two buttons
    if (!buttons || buttons.length <= 1) {
      const btn = buttons?.[0];
      const isDestr = btn?.style === 'destructive' || detectedType === 'danger';
      alertService.show({
        title,
        message,
        type: isDestr ? 'danger' : detectedType,
        proceedText: btn?.text || 'Proceed',
        onProceed: btn?.onPress,
        showCancel: false,
      });
    } else {
      // Find cancel button and action button
      const cancelBtn = buttons.find(b => b.style === 'cancel');
      const actionBtn = buttons.find(b => b.style !== 'cancel') || buttons[buttons.length - 1];

      const isDestr = actionBtn?.style === 'destructive' || detectedType === 'danger';

      alertService.show({
        title,
        message,
        type: isDestr ? 'danger' : detectedType,
        cancelText: cancelBtn?.text || 'Cancel',
        proceedText: actionBtn?.text || 'Proceed',
        isDestructive: isDestr,
        showCancel: true,
        onCancel: cancelBtn?.onPress,
        onProceed: actionBtn?.onPress,
      });
    }
  };
}

