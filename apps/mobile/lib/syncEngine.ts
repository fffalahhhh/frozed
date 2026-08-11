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
  setAnalyticsPasswordInDb,
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
        console.log('[SYNC ENGINE] Network restored — syncing pending outbox items');
        this.triggerSync();
      }
    });

    // Initial check on app boot
    NetInfo.fetch().then((state) => {
      this.isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      this.notifyListeners();
      if (this.isOnline) {
        this.triggerSync({ forceSnapshot: true });
      }
    });

    // Background interval check: ONLY run if there are pending outbox items!
    if (!this.timer) {
      this.timer = setInterval(() => {
        if (this.isOnline && !this.isSyncing) {
          const pendingCount = getPendingOutboxCount();
          if (pendingCount > 0) {
            this.triggerSync();
          }
        }
      }, 30000);
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

  public async triggerSync(options?: { forceSnapshot?: boolean }): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      this.notifyListeners();
      return;
    }

    const pendingMutations = getPendingOutboxMutations();
    const lastSyncedAtStr = getSyncMeta('last_synced_at');
    const now = Date.now();
    const lastSyncedTime = lastSyncedAtStr ? new Date(lastSyncedAtStr).getTime() : 0;
    const isSnapshotStale = now - lastSyncedTime > 10 * 60 * 1000; // 10 minutes

    // If no pending mutations, no forced snapshot, and snapshot is fresh -> IDLE (do nothing)
    if (pendingMutations.length === 0 && !options?.forceSnapshot && !isSnapshotStale) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
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

      // Fetch snapshot only when mutations were uploaded, or when snapshot is explicitly requested / stale (>10 min)
      if (pendingMutations.length > 0 || options?.forceSnapshot || isSnapshotStale) {
        console.log('[SYNC ENGINE] Refreshing server snapshot…');
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
          if (snapshot.analyticsPassword) {
            setAnalyticsPasswordInDb(snapshot.analyticsPassword);
          }
        }

        setSyncMeta('last_synced_at', new Date().toISOString());
      }
    } catch (err: any) {
      console.warn('[SYNC ENGINE] Sync attempt warning:', err?.message || err);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }
}

export const syncEngine = new SyncEngine();
