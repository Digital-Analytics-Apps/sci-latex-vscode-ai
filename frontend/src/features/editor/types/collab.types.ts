export interface Collaborator {
  userId: string;
  userName: string;
  color: string;
  position?: number;
  file?: string;
}

export interface RemoteCursor {
  userId: string;
  userName: string;
  color: string;
  position: number;
  selectionStart?: number;
  selectionEnd?: number;
  lastActive: number;
  file?: string;
}

export interface DeltaOperation {
  type: 'insert' | 'delete';
  position: number;
  text?: string;
  length?: number;
  userId: string;
  userName: string;
  timestamp: number;
}

export interface CollabUpdateJSON {
  clientID: string;
  changes: unknown;
}

export interface CollabPushPayload {
  file: string;
  version: number;
  updates: CollabUpdateJSON[];
}

export interface SnapshotFileEntry {
  path: string;
  type: 'text' | 'binary';
  sha256: string;
  storageKey?: string;
  content?: string;
}

export interface SnapshotManifest {
  schemaVersion: number;
  projectId: string;
  projectVersion: number;
  mainEntryPath: string;
  files: SnapshotFileEntry[];
}

export interface DocumentSnapshot {
  id: string;
  documentId: string;
  version: number;
  content: string;
  savedBy: string;
  reason: string;
  manifest?: SnapshotManifest;
  createdAt: string;
}

export interface OutboxMutation {
  id?: number;
  idempotencyKey: string;
  documentId: string;
  file: string;
  type: 'PUSH_UPDATES' | 'APPLY_DELTA';
  payload: unknown;
  version: number;
  status: 'pending' | 'acked_memory' | 'confirmed_db';
  timestamp: number;
}

export interface PersistenceAckPayload {
  type: 'PERSISTENCE_ACK';
  snapshotId: string;
  version: number;
  timestamp: number;
}

export interface SnapshotRestoredPayload {
  type: 'SNAPSHOT_RESTORED';
  snapshot: DocumentSnapshot;
  version: number;
  content: string;
  files?: Array<{ path: string; content?: string }>;
  restoredBy?: string;
  time?: string;
}

export interface DocumentData {
  id: string;
  title: string;
  content: string;
  mainEntryPath?: string;
  version: number;
  updatedAt: string;
}

export type SaveStatus = 'synced' | 'pending_debounce' | 'saving' | 'offline';

export interface CommentReply {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  createdAt: string;
}

export interface ReviewComment {
  id: string;
  documentId: string;
  file: string;
  from: number;
  to: number;
  selectedText: string;
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  status: 'open' | 'resolved';
  createdAt: string;
  replies: CommentReply[];
}
