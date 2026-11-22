import { OutboxMutation } from '../types/collab.types';

const DB_NAME = 'sci_editor_outbox';
const DB_VERSION = 1;

class OutboxDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      throw new Error('IndexedDB não é suportado neste ambiente.');
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = () => {
          const db = req.result;

          // Object store para cache local do documento e arquivos
          if (!db.objectStoreNames.contains('document_cache')) {
            db.createObjectStore('document_cache', { keyPath: 'cacheKey' });
          }

          // Object store para fila de saída (Local Outbox)
          if (!db.objectStoreNames.contains('mutations_outbox')) {
            const outboxStore = db.createObjectStore('mutations_outbox', {
              keyPath: 'id',
              autoIncrement: true,
            });
            outboxStore.createIndex('by_doc', 'documentId', { unique: false });
            outboxStore.createIndex('by_idempotency', 'idempotencyKey', { unique: true });
          }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }

    return this.dbPromise;
  }

  /**
   * Salva conteúdo no cache local do IndexedDB para recuperação instantânea / offline
   */
  async saveCache(
    documentId: string,
    file: string,
    content: string,
    version: number
  ): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('document_cache', 'readwrite');
        const store = tx.objectStore('document_cache');
        const cacheKey = `${documentId}:${file}`;

        store.put({
          cacheKey,
          documentId,
          file,
          content,
          version,
          updatedAt: Date.now(),
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[OutboxDb] Falha ao gravar cache local:', err);
    }
  }

  /**
   * Obtém o conteúdo em cache local de um arquivo
   */
  async getCache(
    documentId: string,
    file: string
  ): Promise<{ content: string; version: number } | null> {
    try {
      const db = await this.getDB();
      return new Promise<{ content: string; version: number } | null>((resolve, reject) => {
        const tx = db.transaction('document_cache', 'readonly');
        const store = tx.objectStore('document_cache');
        const cacheKey = `${documentId}:${file}`;
        const req = store.get(cacheKey);

        req.onsuccess = () => {
          if (req.result) {
            resolve({ content: req.result.content, version: req.result.version });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  /**
   * Enfileira a mutação pendente do arquivo no Outbox local.
   * Para PUSH_UPDATES substitui a anterior (pois traz o conjunto acumulado).
   * Para APPLY_DELTA acumula cada operação atômica em ordem sequencial estrita.
   */
  async enqueueMutation(mutation: Omit<OutboxMutation, 'id'>): Promise<number> {
    const db = await this.getDB();
    return new Promise<number>((resolve, reject) => {
      let settled = false;
      const safeResolve = (res: number) => {
        if (!settled) {
          settled = true;
          resolve(res);
        }
      };
      const safeReject = (err: unknown) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      };

      const tx = db.transaction('mutations_outbox', 'readwrite');
      const store = tx.objectStore('mutations_outbox');

      if (mutation.type === 'APPLY_DELTA') {
        const addReq = store.add(mutation);
        addReq.onsuccess = () => safeResolve(addReq.result as number);
        addReq.onerror = () => safeReject(addReq.error);
      } else {
        const index = store.index('by_doc');
        const req = index.openCursor(IDBKeyRange.only(mutation.documentId));

        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            const item = cursor.value as OutboxMutation;
            if (
              item.file === mutation.file &&
              item.status === 'pending' &&
              item.type === 'PUSH_UPDATES'
            ) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            const addReq = store.add(mutation);
            addReq.onsuccess = () => safeResolve(addReq.result as number);
            addReq.onerror = () => safeReject(addReq.error);
          }
        };
      }

      tx.onerror = () => safeReject(tx.error);
    });
  }

  /**
   * Lista todas as mutações pendentes de um documento em ordem estrita FIFO
   */
  async getPendingMutations(documentId: string): Promise<OutboxMutation[]> {
    try {
      const db = await this.getDB();
      return new Promise<OutboxMutation[]>((resolve, reject) => {
        const tx = db.transaction('mutations_outbox', 'readonly');
        const store = tx.objectStore('mutations_outbox');
        const index = store.index('by_doc');
        const req = index.getAll(IDBKeyRange.only(documentId));

        req.onsuccess = () => {
          const results = (req.result || []) as OutboxMutation[];
          results.sort((a, b) => (a.id || 0) - (b.id || 0));
          resolve(results);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  /**
   * Marca mutação como recebida em memória pelo servidor (OPERATION_ACK)
   */
  async markAckedMemory(id: number): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('mutations_outbox', 'readwrite');
        const store = tx.objectStore('mutations_outbox');
        const req = store.get(id);

        req.onsuccess = () => {
          if (req.result) {
            const item: OutboxMutation = req.result;
            item.status = 'acked_memory';
            store.put(item);
          }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[OutboxDb] Falha ao marcar ack de memória:', err);
    }
  }

  /**
   * Remove mutações confirmadas no PostgreSQL pelo Snapshot Checkpoint (PERSISTENCE_ACK)
   */
  async purgeConfirmedBeforeVersion(documentId: string, confirmedVersion: number): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('mutations_outbox', 'readwrite');
        const store = tx.objectStore('mutations_outbox');
        const index = store.index('by_doc');
        const req = index.openCursor(IDBKeyRange.only(documentId));

        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            const item = cursor.value as OutboxMutation;
            // Apenas purga PUSH_UPDATES onde a versão específica foi confirmada no backend
            if (
              item.type === 'PUSH_UPDATES' &&
              item.version > 0 &&
              item.version <= confirmedVersion
            ) {
              cursor.delete();
            }
            cursor.continue();
          }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[OutboxDb] Falha ao expurgar outbox pós-persistência:', err);
    }
  }

  /**
   * Remove mutações do tipo APPLY_DELTA consolidadas após a reconciliação canônica (RECONCILE_SYNC)
   */
  async purgeReconciledDeltas(documentId: string, file: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('mutations_outbox', 'readwrite');
        const store = tx.objectStore('mutations_outbox');
        const index = store.index('by_doc');
        const req = index.openCursor(IDBKeyRange.only(documentId));

        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            const item = cursor.value as OutboxMutation;
            if (item.file === file && item.type === 'APPLY_DELTA') {
              cursor.delete();
            }
            cursor.continue();
          }
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[OutboxDb] Falha ao expurgar deltas reconciliados:', err);
    }
  }

  /**
   * Remove uma mutação individual após erro irrecuperável ou descarte
   */
  async removeMutation(id: number): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('mutations_outbox', 'readwrite');
        const store = tx.objectStore('mutations_outbox');
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[OutboxDb] Falha ao remover mutação:', err);
    }
  }
}

export const outboxDbService = new OutboxDbService();
