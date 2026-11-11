import Swal from 'sweetalert2';

/**
 * Custom styled SweetAlert2 instance styled with modern Tailwind CSS
 */
export const customSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900',
    title: 'text-lg font-bold text-slate-900 dark:text-white',
    htmlContainer: 'text-sm text-slate-600 dark:text-slate-300',
    confirmButton: 'inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors mx-1 cursor-pointer outline-none',
    cancelButton: 'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors mx-1 cursor-pointer outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    denyButton: 'inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors mx-1 cursor-pointer outline-none'
  },
  buttonsStyling: false
});

/**
 * Toast Notification (Top Right)
 */
export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
  customClass: {
    popup: 'rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-lg p-3 dark:border-slate-800 dark:bg-slate-900/95',
    title: 'text-xs font-semibold text-slate-900 dark:text-white'
  }
});

/**
 * Standard Alert
 */
export const showAlert = ({ title, text, icon = 'info', confirmButtonText = 'OK' }) => {
  return customSwal.fire({
    title,
    text,
    icon,
    confirmButtonText
  });
};

/**
 * Success Alert
 */
export const showSuccess = (title = 'Success', text = '') => {
  return customSwal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonText: 'Done'
  });
};

/**
 * Error Alert
 */
export const showError = (title = 'Error', text = '') => {
  return customSwal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: 'Dismiss'
  });
};

/**
 * Confirmation Dialog
 * @returns {Promise<boolean>} resolves to true if confirmed
 */
export const showConfirm = async ({
  title = 'Are you sure?',
  text = 'This action cannot be undone.',
  icon = 'warning',
  confirmButtonText = 'Yes, proceed',
  cancelButtonText = 'Cancel',
  isDanger = true
} = {}) => {
  const result = await customSwal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    customClass: {
      popup: 'rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900',
      title: 'text-lg font-bold text-slate-900 dark:text-white',
      htmlContainer: 'text-sm text-slate-600 dark:text-slate-300',
      confirmButton: isDanger
        ? 'inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors mx-1 cursor-pointer outline-none'
        : 'inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors mx-1 cursor-pointer outline-none',
      cancelButton: 'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors mx-1 cursor-pointer outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
    }
  });

  return result.isConfirmed;
};

export default customSwal;

