import { randomUUID } from 'crypto';
import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { RawData, WebSocket } from 'ws';
import { z } from 'zod';
import { POD_ID, redisService } from '../../infra/redis/redis.service';
import { DeltaOperation, DocumentSnapshot } from './documents.schema';
import { defaultDocumentsService } from './documents.service';

const WsParamsSchema = z.object({
  documentId: z.string().min(1),
});

const WsQuerySchema = z.object({
  userId: z.string().optional(),
  userName: z.string().optional(),
  token: z.string().optional(),
});
interface ClientMeta {
  ws: WebSocket;
  userId: string;
  userName: string;
  documentId: string;
  color: string;
  role?: string;
  isAuthenticated: boolean;
}

// Mapa de salas de documentos: documentId => Set de sockets conectados
const documentRooms = new Map<string, Set<ClientMeta>>();
const leaseHeartbeats = new Map<string, NodeJS.Timeout>();

// Eviction periódica de documentos inativos da memória a cada 5 minutos
setInterval(
  () => {
    defaultDocumentsService.evictInactiveDocs().catch(console.error);
  },
  5 * 60 * 1000
);
// Paleta de cores para autores com alto contraste e destaque tanto no tema light quanto no dark
const USER_COLORS = [
  '#2563eb', // Royal Blue
  '#059669', // Overleaf Emerald Green
  '#ea580c', // Laranja Intenso
  '#9333ea', // Roxo Elétrico
  '#e11d48', // Rosa Carmesim
  '#0891b2', // Ciano Oceano
  '#4f46e5', // Índigo Profundo
  '#d97706', // Âmbar Quente
];

function getDocumentClients(documentId: string): ClientMeta[] {
  const room = documentRooms.get(documentId);
  return room ? Array.from(room) : [];
}

function broadcastToRoom(documentId: string, payload: unknown, excludeWs?: WebSocket) {
  const room = documentRooms.get(documentId);
  if (!room) return;

  const data = JSON.stringify(payload);
  for (const client of room) {
    if (client.ws !== excludeWs && client.ws.readyState === 1) {
      client.ws.send(data);
    }
  }
}

export function getLiveWebSocketStats() {
  let connectedSockets = 0;
  for (const clientSet of documentRooms.values()) {
    connectedSockets += clientSet.size;
  }
  return {
    activeRoomsCount: documentRooms.size,
    connectedSocketsCount: connectedSockets,
    podId: POD_ID,
  };
}

export const documentsWebSocketPlugin: FastifyPluginAsync = async (fastify) => {
  const service = defaultDocumentsService;

  fastify.withTypeProvider<ZodTypeProvider>().get(
    '/ws/documents/:documentId',
    {
      websocket: true,
      schema: {
        tags: ['Documents Collab'],
        summary: 'WebSocket real-time connection for collaborative editing',
        params: WsParamsSchema,
        querystring: WsQuerySchema,
      },
    },
    async (connection: unknown, req) => {
      const hasSocket = connection && typeof connection === 'object' && 'socket' in connection;
      const rawSocket = hasSocket ? (connection as { socket: WebSocket }).socket : connection;
      const socket = rawSocket as WebSocket;
      const { documentId } = req.params;
      const { userId: queryUserId, userName: queryUserName, token: queryToken } = req.query;

      // Autenticação e extração de credenciais via JWT (Header Authorization, Query Token ou Cookie)
      let authenticatedUser: { sub: string; name?: string; role?: string } | null = null;
      try {
        const rawToken =
          queryToken ||
          (req.headers.authorization
            ? req.headers.authorization.replace(/^Bearer\s+/i, '')
            : null) ||
          req.cookies?.accessToken;

        if (rawToken) {
          const decoded = fastify.jwt.verify<{ sub: string; name: string; role: string }>(rawToken);
          if (decoded && decoded.sub) {
            authenticatedUser = decoded;
          }
        }
      } catch (authErr) {
        console.warn(
          `[Collab WS Auth] Token inválido ou expirado para doc ${documentId}:`,
          authErr
        );
      }

      const userId = authenticatedUser
        ? authenticatedUser.sub
        : queryUserId || Math.random().toString(36).substring(2, 9);
      const userName =
        authenticatedUser?.name || queryUserName || `Usuário-${userId.substring(0, 4)}`;

      // Evita atribuir a mesma cor caso já existam autores conectados na mesma sala
      const existingRoom = documentRooms.get(documentId);
      const usedColors = new Set(existingRoom ? Array.from(existingRoom).map((c) => c.color) : []);
      const availableColor = USER_COLORS.find((col) => !usedColors.has(col));
      const color = availableColor || USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

      const client: ClientMeta = {
        ws: socket,
        userId,
        userName,
        documentId,
        color,
        role: authenticatedUser?.role,
        isAuthenticated: Boolean(authenticatedUser),
      };

      const isFirstClientInRoom = !documentRooms.has(documentId);
      if (isFirstClientInRoom) {
        documentRooms.set(documentId, new Set());
      }
      documentRooms.get(documentId)!.add(client);

      // Adquire ou renova o Document Ownership Lease no Redis com Fencing Token
      // Apenas reivindica nova geração no PostgreSQL se este Pod estiver abrindo a sala pela 1ª vez!
      if (isFirstClientInRoom) {
        try {
          const lease = await redisService.acquireDocumentLease(documentId, POD_ID, 15);
          if (lease.acquired) {
            const pgGeneration = await service.acquireDocumentOwnership(documentId);
            console.log(
              `[Collab WS Fencing] 👑 Pod ${POD_ID} assumiu titularidade do documento ${documentId} (Geração PG: ${pgGeneration}, Redis: ${lease.generation})`
            );
          } else {
            console.warn(
              `[Collab WS Routing] ⚠️ Documento ${documentId} pertence ao Pod ${lease.ownerId}. Este Pod (${POD_ID}) atende conexão.`
            );
          }
        } catch (err) {
          console.warn(`[Collab WS Lease Error]:`, err);
        }
      }

      if (!leaseHeartbeats.has(documentId)) {
        const hb = setInterval(async () => {
          const room = documentRooms.get(documentId);
          if (!room || room.size === 0) {
            clearInterval(hb);
            leaseHeartbeats.delete(documentId);
            return;
          }
          await redisService.renewDocumentLease(documentId, POD_ID, 15).catch(console.warn);
        }, 2000);
        leaseHeartbeats.set(documentId, hb);
      }

      console.log(`[Collab WS] 👤 ${userName} (${userId}) conectou ao documento ${documentId}`);
      // Registra listeners de forma síncrona para não perder eventos iniciais
      socket.on('message', async (raw: RawData) => {
        try {
          const message = JSON.parse(raw.toString());

          const activeDoc = await service.getDocument(documentId);
          switch (message.type) {
            // Cliente enviou atualizações com @codemirror/collab
            case 'PUSH_UPDATES': {
              const targetFile = message.file;
              if (!targetFile) {
                socket.send(
                  JSON.stringify({
                    type: 'ERROR',
                    code: 'MISSING_FILE',
                    message: 'O campo "file" é obrigatório em PUSH_UPDATES.',
                  })
                );
                break;
              }
              const clientVersion = typeof message.version === 'number' ? message.version : 0;
              const updates = Array.isArray(message.updates) ? message.updates : [];

              if (updates.length === 0) {
                break;
              }

              console.log(
                `[WS PUSH_UPDATES] from ${userName} (${userId}) file=${targetFile} ver=${clientVersion} count=${updates.length}`
              );

              const result = await service.pushUpdates(
                documentId,
                targetFile,
                clientVersion,
                updates,
                userId,
                userName,
                (snapshot: DocumentSnapshot) => {
                  broadcastToRoom(documentId, {
                    type: 'SNAPSHOT_SAVED',
                    snapshot,
                    version: snapshot.version,
                    time: new Date().toLocaleTimeString(),
                  });
                  broadcastToRoom(documentId, {
                    type: 'PERSISTENCE_ACK',
                    snapshotId: snapshot.id,
                    version: snapshot.version,
                    timestamp: Date.now(),
                  });
                }
              );

              if (result.rebasedUpdates.length > 0) {
                // 1. Responde diretamente ao autor que enviou:
                // Se o cliente estava defasado em relação ao servidor, enviamos a sequência completa
                // desde a versão dele até a nova versão, garantindo continuidade matemática para o CodeMirror
                const updatesForSender = service.getUpdatesSince(
                  documentId,
                  targetFile,
                  clientVersion
                );
                socket.send(
                  JSON.stringify({
                    type: 'PULL_UPDATES_RESPONSE',
                    file: targetFile,
                    version: result.newVersion,
                    updates: updatesForSender,
                    author: { userId, userName, color },
                    status: 'pending_debounce',
                  })
                );

                // 2. Transmite as novas atualizações rebaseadas para todos os DEMAIS clientes da sala
                broadcastToRoom(
                  documentId,
                  {
                    type: 'PULL_UPDATES_RESPONSE',
                    file: targetFile,
                    version: result.newVersion,
                    updates: result.rebasedUpdates,
                    author: { userId, userName, color },
                    status: 'pending_debounce',
                  },
                  socket
                );
              } else {
                socket.send(
                  JSON.stringify({
                    type: 'PULL_UPDATES_RESPONSE',
                    file: targetFile,
                    version: result.newVersion,
                    updates: [],
                    author: { userId, userName, color },
                    status: 'synced',
                  })
                );
              }
              break;
            }

            case 'PULL_UPDATES': {
              const targetFile = message.file || activeDoc.mainEntryPath;
              const clientVersion = typeof message.version === 'number' ? message.version : 0;
              const historyUpdates = service.getUpdatesSince(documentId, targetFile, clientVersion);
              socket.send(
                JSON.stringify({
                  type: 'PULL_UPDATES_RESPONSE',
                  file: targetFile,
                  version: service.getCollabVersion(documentId, targetFile),
                  updates: historyUpdates,
                })
              );
              break;
            }

            // Solicitação de reconciliação canônica (ex: término de drenagem do Local Outbox ou recuperação de rede)
            case 'REQUEST_RECONCILE': {
              const targetFile = message.file || activeDoc.mainEntryPath;
              const { content, version } = await service.getActiveFileContent(
                documentId,
                targetFile
              );
              broadcastToRoom(documentId, {
                type: 'RECONCILE_SYNC',
                file: targetFile,
                content,
                version,
              });
              break;
            }

            // Cliente enviou um delta de texto atômico (insert ou delete)
            case 'APPLY_DELTA': {
              const targetFile = message.file || (message.delta && message.delta.file);
              if (!targetFile) {
                socket.send(
                  JSON.stringify({
                    type: 'ERROR',
                    code: 'MISSING_FILE',
                    message: 'O campo "file" é obrigatório em APPLY_DELTA.',
                  })
                );
                break;
              }
              const delta: DeltaOperation = {
                type: message.delta.type,
                position: message.delta.position,
                text: message.delta.text,
                length: message.delta.length,
                userId,
                userName,
                timestamp: Date.now(),
              };

              if (targetFile === activeDoc.mainEntryPath) {
                // Aplica no serviço e obtém o novo estado consolidado
                const { operation, newVersion } = await service.applyDelta(
                  documentId,
                  delta,
                  (snapshot: DocumentSnapshot) => {
                    // Notifica toda a sala quando o debounce expira e o snapshot é gravado no banco!
                    broadcastToRoom(documentId, {
                      type: 'SNAPSHOT_SAVED',
                      snapshot,
                      version: snapshot.version,
                      time: new Date().toLocaleTimeString(),
                    });
                    broadcastToRoom(documentId, {
                      type: 'PERSISTENCE_ACK',
                      snapshotId: snapshot.id,
                      version: snapshot.version,
                      timestamp: Date.now(),
                    });
                  }
                );

                // Informa a todos na sala sobre o delta aplicado
                broadcastToRoom(
                  documentId,
                  {
                    type: 'DELTA_BROADCAST',
                    file: targetFile,
                    operation,
                    version: newVersion,
                    author: { userId, userName, color },
                    status: 'pending_debounce',
                  },
                  socket // Não precisa re-enviar para o autor que já aplicou localmente
                );

                // Confirmação para o próprio autor com a nova versão
                socket.send(
                  JSON.stringify({
                    type: 'ACK_DELTA',
                    file: targetFile,
                    operationId: operation.id,
                    version: newVersion,
                    status: 'pending_debounce',
                  })
                );
              } else {
                // Arquivo secundário (.bib, .tex complementar)
                // Transmite imediatamente para os outros autores na mesma sala
                broadcastToRoom(
                  documentId,
                  {
                    type: 'DELTA_BROADCAST',
                    file: targetFile,
                    operation: {
                      id: Math.random().toString(36).substring(2, 9),
                      ...delta,
                    },
                    author: { userId, userName, color },
                    status: 'pending_debounce',
                  },
                  socket
                );
              }
              break;
            }

            // Atualização de posição de cursor e seleção para presença visual com isolamento por arquivo
            case 'CURSOR_MOVE': {
              broadcastToRoom(
                documentId,
                {
                  type: 'CURSOR_UPDATE',
                  user: {
                    userId,
                    userName,
                    color,
                    position: message.position,
                    selectionStart: message.selectionStart,
                    selectionEnd: message.selectionEnd,
                    file: message.file || activeDoc.mainEntryPath,
                  },
                },
                socket
              );
              break;
            }

            // Adicionar comentário de revisão
            case 'ADD_COMMENT': {
              const newComment = service.addComment(documentId, {
                id: (message.comment && message.comment.id) || randomUUID(),
                documentId,
                file: (message.comment && message.comment.file) || activeDoc.mainEntryPath,
                from: message.comment.from,
                to: message.comment.to,
                selectedText: message.comment.selectedText || '',
                userId,
                userName,
                userColor: color,
                content: message.comment.content,
                status: 'open',
                createdAt: new Date().toLocaleTimeString(),
                replies: [],
              });
              broadcastToRoom(documentId, {
                type: 'COMMENT_ADDED',
                comment: newComment,
              });
              break;
            }

            // Responder a um comentário de revisão
            case 'REPLY_COMMENT': {
              const updated = service.replyComment(documentId, message.commentId, {
                id: randomUUID(),
                userId,
                userName,
                userColor: color,
                content: message.content,
                createdAt: new Date().toLocaleTimeString(),
              });
              if (updated) {
                broadcastToRoom(documentId, {
                  type: 'COMMENT_REPLIED',
                  comment: updated,
                });
              }
              break;
            }

            // Resolver ou reabrir comentário
            case 'RESOLVE_COMMENT': {
              const updated = service.resolveComment(documentId, message.commentId, message.status);
              if (updated) {
                broadcastToRoom(documentId, {
                  type: 'COMMENT_RESOLVED',
                  comment: updated,
                });
              }
              break;
            }

            // Excluir comentário
            case 'DELETE_COMMENT': {
              const ok = service.deleteComment(documentId, message.commentId);
              if (ok) {
                broadcastToRoom(documentId, {
                  type: 'COMMENT_DELETED',
                  commentId: message.commentId,
                });
              }
              break;
            }

            // Rollback consistente e integral de Snapshot
            case 'RESTORE_SNAPSHOT': {
              const { snapshotId } = message;
              if (!snapshotId) {
                socket.send(
                  JSON.stringify({
                    type: 'ERROR',
                    code: 'MISSING_SNAPSHOT_ID',
                    message: 'O campo "snapshotId" é obrigatório em RESTORE_SNAPSHOT.',
                  })
                );
                break;
              }

              // Controle de Acesso (RBAC): apenas revisores, autores autenticados ou administradores podem restaurar
              if (
                client.role === 'VIEWER' ||
                (process.env.NODE_ENV === 'production' && !client.isAuthenticated)
              ) {
                socket.send(
                  JSON.stringify({
                    type: 'ERROR',
                    code: 'FORBIDDEN',
                    message: 'Permissão insuficiente para restaurar versão do documento.',
                  })
                );
                break;
              }

              try {
                const restored = await service.restoreSnapshot(documentId, snapshotId);
                const projectFiles = await service.listProjectFiles(documentId);
                broadcastToRoom(documentId, {
                  type: 'SNAPSHOT_RESTORED',
                  snapshot: restored,
                  version: restored.version,
                  content: restored.content,
                  files: projectFiles,
                  restoredBy: userName,
                  time: new Date().toLocaleTimeString(),
                });
              } catch (err: unknown) {
                const error = err as Error;
                socket.send(
                  JSON.stringify({
                    type: 'ERROR',
                    code: 'RESTORE_FAILED',
                    message: error.message,
                  })
                );
              }
              break;
            }
          }
        } catch (err: unknown) {
          const error = err as Error;
          console.error('[Collab WS] Erro ao processar mensagem:', error.message);
        }
      });

      // 3. Desconexão
      socket.on('close', async () => {
        const room = documentRooms.get(documentId);
        if (room) {
          room.delete(client);
          if (room.size === 0) {
            documentRooms.delete(documentId);
            const hb = leaseHeartbeats.get(documentId);
            if (hb) {
              clearInterval(hb);
              leaseHeartbeats.delete(documentId);
            }
            try {
              // Garante persistência dos dados pendentes no PostgreSQL ANTES de soltar o lease
              await service.flushCheckpoint(documentId);
            } catch (err) {
              console.error(`[Collab WS] Falha ao persistir checkpoint final na desconexão:`, err);
            } finally {
              await redisService.releaseDocumentLease(documentId).catch(console.error);
            }
          }
        }
        console.log(`[Collab WS] 🚪 ${userName} desconectou do documento ${documentId}`);

        broadcastToRoom(documentId, {
          type: 'COLLABORATOR_LEFT',
          userId,
          userName,
          collaborators: getDocumentClients(documentId).map((c) => ({
            userId: c.userId,
            userName: c.userName,
            color: c.color,
          })),
        });
      });

      // 4. Envia estado inicial do documento para o cliente recém-conectado
      try {
        const doc = await service.getDocument(documentId);
        const comments = service.getComments(documentId);
        socket.send(
          JSON.stringify({
            type: 'SYNC_INIT',
            document: doc,
            version: service.getCollabVersion(documentId, doc.mainEntryPath),
            fileVersions: service.getAllCollabVersions(documentId),
            comments,
            collaborators: getDocumentClients(documentId).map((c) => ({
              userId: c.userId,
              userName: c.userName,
              color: c.color,
            })),
          })
        );
      } catch (err: unknown) {
        const error = err as Error;
        socket.send(JSON.stringify({ type: 'ERROR', message: error.message }));
        socket.close();
        return;
      }

      // Notifica os outros colaboradores que alguém entrou
      broadcastToRoom(
        documentId,
        {
          type: 'COLLABORATOR_JOINED',
          user: { userId, userName, color },
          collaborators: getDocumentClients(documentId).map((c) => ({
            userId: c.userId,
            userName: c.userName,
            color: c.color,
          })),
        },
        socket
      );
    }
  );
};
