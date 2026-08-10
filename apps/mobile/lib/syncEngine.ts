import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { api } from './api';
import {
  initLocalDb,
  getPendingOutboxMutations,
  markOutboxMutationsSynced,
  markOutboxMutationFailed,
  getPendingOutboxCount,
  saveMenuSnapshotToLocal,
  saveInventorySnapshotToLocal,
  saveOrdersSnapshotToLocal,
  setSyncMeta,
  getSyncMeta,
} from './db';
import type { SyncSnapshotData } from '@frozen-shake/shared';

export interface SyncEngineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
}

type SyncStatusListener = (status: SyncEngineStatus) => void;

class SyncEngine {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private listeners: Set<SyncStatusListener> = new Set();
  private timer: any = null;

  constructor() {
    // Initial status
  }

  public init() {
    try {
      initLocalDb();
    } catch (err) {
      console.error('[SYNC ENGINE] DB Init Error:', err);
    }

    // Subscribe to network changes
    NetInfo.addEventListener((state: NetInfoState) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      const wasOffline = !this.isOnline;
      this.isOnline = online;

      this.notifyListeners();

      if (online && wasOffline) {
        console.log('[SYNC ENGINE] Network restored — triggering immediate batch sync');
        this.triggerSync();
      }
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      this.isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      this.notifyListeners();
      if (this.isOnline) {
        this.triggerSync();
      }
    });

    // Periodic sync every 15 seconds
    if (!this.timer) {
      this.timer = setInterval(() => {
        if (this.isOnline && !this.isSyncing) {
          this.triggerSync();
        }
      }, 15000);
    }
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus(): SyncEngineStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: getPendingOutboxCount(),
      lastSyncedAt: getSyncMeta('last_synced_at'),
    };
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach((l) => l(status));
  }

  public async triggerSync(): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      this.notifyListeners();
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const pendingMutations = getPendingOutboxMutations();

      if (pendingMutations.length > 0) {
        console.log(`[SYNC ENGINE] Uploading batch of ${pendingMutations.length} mutations…`);
        const res = await api.post<{ results: Array<{ localId: string; success: boolean }> }>(
          '/sync/batch',
          { mutations: pendingMutations },
        );

        if (res && Array.isArray(res.results)) {
          const successfulIds: string[] = [];
          for (const item of res.results) {
            if (item.success) {
              successfulIds.push(item.localId);
            } else {
              markOutboxMutationFailed(item.localId);
            }
          }
          if (successfulIds.length > 0) {
            markOutboxMutationsSynced(successfulIds);
          }
        }
      }

      // Fetch snapshot to keep local database fresh
      console.log('[SYNC ENGINE] Fetching server snapshot for local database refresh…');
      const snapshot = await api.get<SyncSnapshotData>('/sync/snapshot');

      if (snapshot) {
        if (snapshot.categories && snapshot.menuItems) {
          saveMenuSnapshotToLocal(snapshot.categories, snapshot.menuItems);
        }
        if (snapshot.inventory) {
          saveInventorySnapshotToLocal(snapshot.inventory);
        }
        if (snapshot.orders) {
          saveOrdersSnapshotToLocal(snapshot.orders);
        }
      }

      const now = new Date().toISOString();
      setSyncMeta('last_synced_at', now);
    } catch (err: any) {
      console.warn('[SYNC ENGINE] Sync attempt error (will retry):', err?.message || err);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }
}

export const syncEngine = new SyncEngine();
