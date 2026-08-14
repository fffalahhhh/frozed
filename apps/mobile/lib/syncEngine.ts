import NetInfo from '@react-native-community/netinfo';
import { api } from './api';
import {
  initLocalDb,
  getPendingOutboxMutations,
  markOutboxMutationsSynced,
  markOutboxMutationFailed,
} from './db';

class BackgroundSyncManager {
  private isProcessing: boolean = false;
  private timer: any = null;

  public init() {
    try {
      initLocalDb();
    } catch (err) {
      console.warn('[BACKGROUND SYNC] DB init warning:', err);
    }

    // Process queue when network connection is restored
    NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        this.processQueueSequentially();
      }
    });

    // Background interval check every 15 seconds
    if (!this.timer) {
      this.timer = setInterval(() => {
        this.processQueueSequentially();
      }, 15000);
    }

    // Process any pending outbox items on app startup
    this.processQueueSequentially();
  }

  public async processQueueSequentially(): Promise<void> {
    if (this.isProcessing) return;

    const pending = getPendingOutboxMutations();
    if (!pending || pending.length === 0) return;

    this.isProcessing = true;

    try {
      // Process outbox mutations strictly in sequential FIFO order
      for (const item of pending) {
        const { localId, operationType, payload } = item;
        let success = false;

        try {
          if (operationType === 'CREATE_ORDER') {
            await api.post('/orders', payload);
            success = true;
          } else if (operationType === 'PAY_ORDER') {
            await api.post(`/orders/${payload.orderId}/pay`, {
              paymentMethod: payload.paymentMethod || 'cash',
            });
            success = true;
          } else if (operationType === 'UNPAY_ORDER') {
            await api.patch(`/orders/${payload.orderId}`, {
              status: 'billed',
              paidAt: null,
            });
            success = true;
          } else if (operationType === 'ADJUST_STOCK') {
            await api.post('/inventory/adjust', payload);
            success = true;
          } else if (operationType === 'UPDATE_MENU_ITEM') {
            await api.patch(`/menu/items/${payload.id}`, payload);
            success = true;
          } else {
            success = true;
          }
        } catch (err: any) {
          // Log warning silently and pause processing loop to preserve sequence
          console.warn(
            `[BACKGROUND SYNC] Handled retry for ${operationType} (${localId}):`,
            err?.message || err,
          );
          markOutboxMutationFailed(localId);
          break; // Stop loop so out-of-order execution never occurs
        }

        if (success) {
          markOutboxMutationsSynced([localId]);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const backgroundSync = new BackgroundSyncManager();
