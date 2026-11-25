import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_BASE } from '../../../constants/api.constants';
import { outboxDbService } from '../services/outboxDb.service';
import { useNetworkStatus } from '../../../context/NetworkStatusContext';
import {
  Collaborator,
  CollabUpdateJSON,
  DeltaOperation,
  DocumentData,
  DocumentSnapshot,
  RemoteCursor,
  ReviewComment,
  SnapshotRestoredPayload,
} from '../types/collab.types';

export interface UseCollabWebSocketProps {
  documentId: string;
  userId: string;
  userName: string;
  activeFile: string;
  onRemoteDelta: (delta: DeltaOperation, file: string, version: number) => void;
  onRemoteCollabUpdates?: (file: string, version: number, updates: CollabUpdateJSON[]) => void;
  onSyncInit: (
    document: DocumentData,
    collaborators: Collaborator[],
    comments?: ReviewComment[],
    collabVersion?: number,
    fileVersions?: Record<string, number>
  ) => void;
  onSnapshotSaved: (snapshot: DocumentSnapshot, time: string) => void;
  onSnapshotRestored?: (payload: SnapshotRestoredPayload) => void;
  onReconcileSync?: (file: string, content: string, version: number) => void;
  onCommentAdded?: (comment: ReviewComment) => void;
  onCommentRepliedOrResolved?: (comment: ReviewComment) => void;
  onCommentDeleted?: (commentId: string) => void;
}

export function useCollabWebSocket({
  documentId,
  userId,
  userName,
  activeFile,
  onRemoteDelta,
  onRemoteCollabUpdates,
  onSyncInit,
  onSnapshotSaved,
  onSnapshotRestored,
  onReconcileSync,
  onCommentAdded,
  onCommentRepliedOrResolved,
  onCommentDeleted,
}: UseCollabWebSocketProps) {
  const { isOnline } = useNetworkStatus();
  const isOnlineRef = useRef(isOnline);
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [activeEditor, setActiveEditor] = useState<{
    userName: string;
    color: string;
    action: string;
  } | null>(null);
  const activeEditorTimeoutRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const messageQueueRef = useRef<string[]>([]);
  const connectRef = useRef<(() => void) | null>(null);

  const activeFileRef = useRef(activeFile);
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  const callbacksRef = useRef({
    onRemoteDelta,
    onRemoteCollabUpdates,
    onSyncInit,
    onSnapshotSaved,
    onSnapshotRestored,
    onReconcileSync,
    onCommentAdded,
    onCommentRepliedOrResolved,
    onCommentDeleted,
  });
  useEffect(() => {
    callbacksRef.current = {
      onRemoteDelta,
      onRemoteCollabUpdates,
      onSyncInit,
      onSnapshotSaved,
      onSnapshotRestored,
      onReconcileSync,
      onCommentAdded,
      onCommentRepliedOrResolved,
      onCommentDeleted,
    };
  });

  useEffect(() => {
    let isDisposed = false;
    let reconnectTimer: number | undefined;

    const drainOutbox = async (ws: WebSocket) => {
      try {
        const pending = await outboxDbService.getPendingMutations(documentId);
        for (const mutation of pending) {
          if (ws.readyState === WebSocket.OPEN) {
            if (mutation.type === 'APPLY_DELTA') {
              ws.send(
                JSON.stringify({
                  type: 'APPLY_DELTA',
                  file: mutation.file,
                  delta: mutation.payload,
                })
              );
            } else {
              ws.send(
                JSON.stringify({
                  type: mutation.type,
                  file: mutation.file,
                  version: mutation.version,
                  updates: mutation.payload,
                  idempotencyKey: mutation.idempotencyKey,
                })
              );
            }
          }
        }

        // Reconciliação canônica automática após a drenagem do outbox ou reconexão
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'REQUEST_RECONCILE',
              file: activeFileRef.current,
            })
          );
        }
      } catch (err) {
        console.warn('[Collab WS Outbox Drain] Falha ao drenar outbox:', err);
      }
    };

    const connect = () => {
      if (isDisposed || !isOnlineRef.current) return;
      const token = localStorage.getItem('token') || '';
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
      const wsUrl = `${WS_BASE}/ws/documents/${documentId}?userId=${userId}&userName=${encodeURIComponent(userName)}${tokenParam}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isDisposed) {
          ws.close();
          return;
        }
        setIsConnected(true);

        // Drena primeiro as mutações pendentes salvas no IndexedDB Local Outbox
        drainOutbox(ws).catch(console.warn);

        while (messageQueueRef.current.length > 0) {
          const queued = messageQueueRef.current.shift();
          if (queued && ws.readyState === WebSocket.OPEN) {
            ws.send(queued);
          }
        }
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'SYNC_INIT':
              setCollaborators(msg.collaborators);
              callbacksRef.current.onSyncInit(
                msg.document,
                msg.collaborators,
                msg.comments,
                msg.version,
                msg.fileVersions
              );
              break;

            case 'PULL_UPDATES_RESPONSE': {
              const targetFile: string = msg.file || activeFileRef.current;
              const updates: CollabUpdateJSON[] = msg.updates || [];
              if (typeof msg.version === 'number') {
                outboxDbService
                  .purgeConfirmedBeforeVersion(documentId, msg.version)
                  .catch(console.warn);
              }
              callbacksRef.current.onRemoteCollabUpdates?.(targetFile, msg.version, updates);
              if (
                msg.author &&
                msg.author.userId !== userId &&
                targetFile === activeFileRef.current
              ) {
                setActiveEditor({
                  userName: msg.author.userName,
                  color: msg.author.color,
                  action: `digitou em ${targetFile}`,
                });
                clearTimeout(activeEditorTimeoutRef.current ?? undefined);
                activeEditorTimeoutRef.current = setTimeout(() => {
                  setActiveEditor(null);
                }, 2500);
              }
              break;
            }

            case 'COLLABORATOR_JOINED':
            case 'COLLABORATOR_LEFT':
              setCollaborators(msg.collaborators);
              if (msg.type === 'COLLABORATOR_LEFT') {
                setRemoteCursors((prev) => {
                  const map = new Map(prev);
                  map.delete(msg.userId);
                  return map;
                });
              }
              break;

            case 'CURSOR_UPDATE': {
              if (msg.user.userId !== userId) {
                setRemoteCursors((prev) => {
                  const map = new Map(prev);
                  map.set(msg.user.userId, {
                    userId: msg.user.userId,
                    userName: msg.user.userName,
                    color: msg.user.color,
                    position: msg.user.position,
                    selectionStart: msg.user.selectionStart,
                    selectionEnd: msg.user.selectionEnd,
                    file: msg.user.file || '',
                    lastActive: Date.now(),
                  });
                  return map;
                });
              }
              break;
            }

            case 'DELTA_BROADCAST': {
              const op: DeltaOperation = msg.operation;
              const targetFile: string = msg.file || activeFileRef.current;
              callbacksRef.current.onRemoteDelta(op, targetFile, msg.version);
              if (msg.author && msg.author.userId !== userId) {
                const newPos = op.position + (op.text ? op.text.length : 0);
                setRemoteCursors((prev) => {
                  const map = new Map(prev);
                  map.set(msg.author.userId, {
                    userId: msg.author.userId,
                    userName: msg.author.userName,
                    color: msg.author.color,
                    position: newPos,
                    file: targetFile,
                    lastActive: Date.now(),
                  });
                  return map;
                });

                if (targetFile === activeFileRef.current) {
                  setActiveEditor({
                    userName: msg.author.userName,
                    color: msg.author.color,
                    action:
                      op.type === 'insert' ? `digitou em ${targetFile}` : `apagou em ${targetFile}`,
                  });
                  clearTimeout(activeEditorTimeoutRef.current ?? undefined);
                  activeEditorTimeoutRef.current = setTimeout(() => {
                    setActiveEditor(null);
                  }, 2500);
                }
              }
              break;
            }

            case 'SNAPSHOT_SAVED':
              callbacksRef.current.onSnapshotSaved(msg.snapshot, msg.time);
              break;

            case 'RECONCILE_SYNC': {
              const targetFile = msg.file || activeFileRef.current;
              callbacksRef.current.onReconcileSync?.(targetFile, msg.content, msg.version);
              // Quando o documento é reconciliado com o backend, as mutações até essa versão foram consolidadas
              if (typeof msg.version === 'number') {
                outboxDbService
                  .purgeConfirmedBeforeVersion(documentId, msg.version)
                  .catch(console.warn);
              }
              outboxDbService.purgeReconciledDeltas(documentId, targetFile).catch(console.warn);
              break;
            }

            case 'PERSISTENCE_ACK':
              // Limpa com segurança as mutações do Local Outbox confirmadas no PostgreSQL
              if (typeof msg.version === 'number') {
                outboxDbService
                  .purgeConfirmedBeforeVersion(documentId, msg.version)
                  .catch(console.warn);
              }
              break;

            case 'SNAPSHOT_RESTORED':
              callbacksRef.current.onSnapshotRestored?.(msg);
              break;

            case 'COMMENT_ADDED':
              callbacksRef.current.onCommentAdded?.(msg.comment);
              break;

            case 'COMMENT_REPLIED':
            case 'COMMENT_RESOLVED':
              callbacksRef.current.onCommentRepliedOrResolved?.(msg.comment);
              break;

            case 'COMMENT_DELETED':
              callbacksRef.current.onCommentDeleted?.(msg.commentId);
              break;
          }
        } catch (err) {
          console.error('[Collab WS] Erro ao processar mensagem:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (!isDisposed && isOnlineRef.current) {
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            if (isOnlineRef.current) connect();
          }, 2000);
        }
      };

      ws.onerror = (err) => {
        console.warn('[Collab WS Error]:', err);
      };
    };

    connectRef.current = connect;
    if (isOnlineRef.current) {
      connect();
    }

    return () => {
      isDisposed = true;
      connectRef.current = null;
      clearTimeout(reconnectTimer);
      if (socketRef.current) {
        const ws = socketRef.current;
        socketRef.current = null;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          ws.close();
        } catch {
          // Fechamento antecipado limpo
        }
      }
    };
  }, [documentId, userId, userName]);

  // Reage imediatamente a mudanças de conectividade de rede (online/offline)
  useEffect(() => {
    if (!isOnline) {
      setIsConnected(false);
      if (socketRef.current) {
        const ws = socketRef.current;
        socketRef.current = null;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          ws.close();
        } catch {
          // Socket fechado
        }
      }
    } else {
      if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
        connectRef.current?.();
      }
    }
  }, [isOnline]);

  const safeSend = useCallback(
    (payload: unknown) => {
      const raw = JSON.stringify(payload);
      if (isOnline && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(raw);
      } else {
        messageQueueRef.current.push(raw);
      }
    },
    [isOnline]
  );

  const sendDelta = useCallback(
    (file: string, delta: Omit<DeltaOperation, 'userId' | 'userName' | 'timestamp'>) => {
      if (isOnline && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'APPLY_DELTA',
            file,
            delta,
          })
        );
      } else {
        const idempotencyKey = crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        outboxDbService
          .enqueueMutation({
            idempotencyKey,
            documentId,
            file,
            type: 'APPLY_DELTA',
            payload: delta,
            version: 0,
            status: 'pending',
            timestamp: Date.now(),
          })
          .catch(console.warn);
      }
    },
    [documentId, isOnline]
  );
  const sendCollabUpdates = useCallback(
    (file: string, version: number, updates: CollabUpdateJSON[]) => {
      const idempotencyKey = crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // 1. Enfileira de forma assíncrona no Local Outbox (IndexedDB)
      outboxDbService
        .enqueueMutation({
          idempotencyKey,
          documentId,
          file,
          type: 'PUSH_UPDATES',
          payload: updates,
          version,
          status: 'pending',
          timestamp: Date.now(),
        })
        .catch(console.warn);

      // 2. Despacha via WebSocket se aberto e online; se offline, a mutação já está garantida no outboxDbService
      if (isOnline && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'PUSH_UPDATES',
            file,
            version,
            updates,
            idempotencyKey,
          })
        );
      }
    },
    [documentId, isOnline]
  );

  const restoreSnapshot = useCallback(
    (snapshotId: string) => {
      safeSend({
        type: 'RESTORE_SNAPSHOT',
        snapshotId,
      });
    },
    [safeSend]
  );

  const cursorThrottleTimerRef = useRef<number | null>(null);
  const pendingCursorRef = useRef<{
    position: number;
    file: string;
    selectionStart?: number;
    selectionEnd?: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (cursorThrottleTimerRef.current !== null) {
        clearTimeout(cursorThrottleTimerRef.current);
      }
    };
  }, []);

  const sendCursorMove = useCallback(
    (position: number, file: string, selectionStart?: number, selectionEnd?: number) => {
      pendingCursorRef.current = { position, file, selectionStart, selectionEnd };
      if (cursorThrottleTimerRef.current === null) {
        cursorThrottleTimerRef.current = window.setTimeout(() => {
          cursorThrottleTimerRef.current = null;
          if (pendingCursorRef.current) {
            safeSend({
              type: 'CURSOR_MOVE',
              ...pendingCursorRef.current,
            });
            pendingCursorRef.current = null;
          }
        }, 80);
      }
    },
    [safeSend]
  );

  const sendRawMessage = useCallback(
    (payload: unknown) => {
      safeSend(payload);
    },
    [safeSend]
  );
  const requestReconcile = useCallback(
    (file?: string) => {
      safeSend({
        type: 'REQUEST_RECONCILE',
        file: file || activeFileRef.current,
      });
    },
    [safeSend]
  );

  return {
    isConnected: isConnected && isOnline,
    isOnline,
    collaborators,
    remoteCursors,
    activeEditor,
    sendDelta,
    sendCollabUpdates,
    restoreSnapshot,
    sendCursorMove,
    sendRawMessage,
    requestReconcile,
  };
}
