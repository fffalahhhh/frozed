import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

let timerId: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'success',

  showToast: (message, type = 'success') => {
    if (timerId) clearTimeout(timerId);
    set({ visible: true, message, type });

    timerId = setTimeout(() => {
      set({ visible: false });
    }, 3500);
  },

  hideToast: () => {
    if (timerId) clearTimeout(timerId);
    set({ visible: false });
  },
}));
