import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Collaborator,
  CollabUpdateJSON,
  DeltaOperation,
  DocumentData,
  DocumentSnapshot,
  RemoteCursor,
  ReviewComment,
  SaveStatus,
  SnapshotRestoredPayload,
} from '../types/collab.types';
import { EditorTab } from '../components/EditorTabBar';
import { ProjectFile } from '../components/FileTreeSidebar';
import { DEFAULT_SETTINGS, EditorSettings } from '../../../types/settings';
import { useCollabWebSocket } from '../hooks/useCollabWebSocket';
import { useLatexCompiler } from '../hooks/useLatexCompiler';
import { useDocumentHistoryQuery } from '../hooks/useDocumentHistoryQuery';
import { useFlushDocumentMutation } from '../hooks/useFlushDocumentMutation';
import { EditorService } from '../services/editor.service';
import { editorStateCache } from '../services/editorStateCache';
import { outboxDbService } from '../services/outboxDb.service';
import { HistoryStatus } from '../extensions/history/historyExtension';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { useProjectDetails } from '../../../hooks/useProjectQueries';

export interface CollabEditorContextValue {
  documentId: string;
  documentData: DocumentData | null;
  userId: string;
  userName: string;
  collaborators: Collaborator[];
  remoteCursors: Map<string, RemoteCursor>;
  activeFileRemoteCursors: RemoteCursor[];
  activeEditor: { userName: string; color: string; action: string } | null;
  saveStatus: SaveStatus;
  secondarySaveStatus: Record<string, SaveStatus>;
  lastSavedAt: string | null;
  isConnected: boolean;
  isOnline: boolean;
  isSynced: boolean;
  isFlushing: boolean;
  snapshots: DocumentSnapshot[];
  operations: DeltaOperation[];
  activeFile: string;
  setActiveFile: (file: string) => void;
  openTabs: EditorTab[];
  fileContents: Record<string, string>;
  settings: EditorSettings;
  updateSettings: (newSettings: Partial<EditorSettings>) => void;
  layoutMode: 'split' | 'editor' | 'pdf';
  setLayoutMode: (mode: 'split' | 'editor' | 'pdf') => void;
  showHistory: boolean;
  setShowHistory: (show: boolean | ((prev: boolean) => boolean)) => void;
  showReview: boolean;
  setShowReview: (show: boolean | ((prev: boolean) => boolean)) => void;
  comments: ReviewComment[];
  activeCommentId: string | null;
  setActiveCommentId: (id: string | null) => void;
  isReviewer: boolean;
  historyStatus: HistoryStatus;
  setHistoryStatus: (status: HistoryStatus) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  registerEditorActions: (actions: { undo: () => boolean; redo: () => boolean } | null) => void;
  // Compiler
  pdfBlobUrl: string | null;
  isCompiling: boolean;
  compileError: string | null;
  lastCompiledAt: string | null;
  recompile: () => Promise<void>;
  // CodeMirror Collab Integration
  collabVersion: number;
  incomingCollabUpdates: {
    file: string;
    version: number;
    updates: CollabUpdateJSON[];
    timestamp: number;
  } | null;
  incomingRemoteDelta: {
    file: string;
    operation: DeltaOperation;
    timestamp: number;
  } | null;
  handlePushCollabUpdates: (file: string, version: number, updates: CollabUpdateJSON[]) => void;
  handleDocContentChange: (content: string) => void;
  // Handlers
  handleApplyLocalDelta: (delta: Omit<DeltaOperation, 'userId' | 'userName' | 'timestamp'>) => void;
  handleSecondaryDelta: (delta: {
    type: 'insert' | 'delete';
    position: number;
    text?: string;
    length?: number;
  }) => void;
  handleCursorMove: (position: number, selectionStart?: number, selectionEnd?: number) => void;
  handleManualFlush: () => Promise<void>;
  handleOpenFile: (file: ProjectFile) => Promise<void>;
  handleCloseTab: (fileName: string) => void;
  handleInsertSnippet: (snippet: string) => void;
  handleAddComment: (
    content: string,
    explicitSelection?: { from: number; to: number; selectedText: string }
  ) => void;
  handleReplyComment: (commentId: string, content: string) => void;
  handleResolveComment: (commentId: string, status: 'open' | 'resolved') => void;
  handleDeleteComment: (commentId: string) => void;
  registerRemoteDeltaListener: (
    listener: ((op: DeltaOperation, file: string) => void) | null
  ) => void;
  registerReconcileListener: (listener: ((file: string, content: string) => void) | null) => void;
  requestReconcile: (file?: string) => void;
}

const CollabEditorContext = createContext<CollabEditorContextValue | null>(null);

export function useCollabEditor(): CollabEditorContextValue {
  const context = useContext(CollabEditorContext);
  if (!context) {
    throw new Error('useCollabEditor deve ser utilizado dentro de CollabEditorProvider');
  }
  return context;
}

export interface CollabEditorProviderProps {
  documentId: string;
  children: ReactNode;
}

export function CollabEditorProvider({ documentId, children }: CollabEditorProviderProps) {
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Identificação canônica do autor autenticado (sem necessidade de apelido manual)
  const userId = useMemo(() => {
    if (currentUser?.id) return currentUser.id;
    let id = localStorage.getItem('collab_userid');
    if (!id) {
      id = Math.random().toString(36).substring(2, 9);
      localStorage.setItem('collab_userid', id);
    }
    return id;
  }, [currentUser?.id]);

  const userName = useMemo(() => {
    return currentUser?.name || 'Autor';
  }, [currentUser?.name]);

  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const documentDataRef = useRef<DocumentData | null>(null);
  const [operations, setOperations] = useState<DeltaOperation[]>([]);
  const [snapshots, setSnapshots] = useState<DocumentSnapshot[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('synced');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>({
    canUndo: false,
    canRedo: false,
    undoDepth: 0,
    redoDepth: 0,
    canUndoSelection: false,
    canRedoSelection: false,
  });
  const editorActionsRef = useRef<{
    undo: () => boolean;
    redo: () => boolean;
  } | null>(null);

  const handleUndo = useCallback(() => {
    editorActionsRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    editorActionsRef.current?.redo();
  }, []);

  const registerEditorActions = useCallback(
    (actions: { undo: () => boolean; redo: () => boolean } | null) => {
      editorActionsRef.current = actions;
    },
    []
  );
  const { data: projectDetails } = useProjectDetails(documentId);

  const isReviewer = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'REVIEWER') return true;
    if (projectDetails?.members) {
      return projectDetails.members.some(
        (m) =>
          m.role === 'REVIEWER' && (m.userId === currentUser.id || m.user?.id === currentUser.id)
      );
    }
    return false;
  }, [currentUser, projectDetails]);

  // Queries e Mutations do TanStack Query
  const { data: historyData } = useDocumentHistoryQuery(documentId);
  const flushMutation = useFlushDocumentMutation(documentId);
  const isFlushing = flushMutation.isPending;

  // Arquivos e Abas
  const [activeFile, setActiveFile] = useState<string>('');
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const fileContentsRef = useRef<Record<string, string>>({});
  const [secondarySaveStatus, setSecondarySaveStatus] = useState<Record<string, SaveStatus>>({});
  const fileSaveDebounceRef = useRef<Record<string, number>>({});
  const [collabVersion, setCollabVersion] = useState<number>(0);
  const [fileCollabVersions, setFileCollabVersions] = useState<Record<string, number>>({});
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [incomingCollabUpdates, setIncomingCollabUpdates] = useState<{
    file: string;
    version: number;
    updates: CollabUpdateJSON[];
    timestamp: number;
  } | null>(null);
  const [incomingRemoteDelta, setIncomingRemoteDelta] = useState<{
    file: string;
    operation: DeltaOperation;
    timestamp: number;
  } | null>(null);

  // Layout e Painéis
  const [layoutMode, setLayoutMode] = useState<'split' | 'editor' | 'pdf'>('split');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(false);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // Configurações
  const [settings, setSettings] = useState<EditorSettings>(() => {
    try {
      const saved = localStorage.getItem('sci_latex_editor_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Falha ao carregar configurações salvas:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (newSettings: Partial<EditorSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('sci_latex_editor_settings', JSON.stringify(updated));
      } catch (e) {
        console.error('Falha ao salvar configurações:', e);
      }
      return updated;
    });
  };

  // Compilador TeX Live
  const { pdfBlobUrl, isCompiling, compileError, lastCompiledAt, recompile } =
    useLatexCompiler(documentId);

  // Sincroniza abas e arquivo ativo quando o mainEntryPath do documento chega
  useEffect(() => {
    documentDataRef.current = documentData;
    if (documentData?.mainEntryPath) {
      const rootPath = documentData.mainEntryPath;
      setActiveFile((prev) => (!prev || prev === 'main.tex' ? rootPath : prev));
      setOpenTabs((prev) => {
        const hasMain = prev.some((tab) => tab.isMain);
        if (!hasMain) {
          return [{ id: rootPath, name: rootPath, type: 'tex', isMain: true }, ...prev];
        }
        return prev.map((tab) => (tab.isMain ? { ...tab, name: rootPath, id: rootPath } : tab));
      });
    }
  }, [documentData]);

  // Fallback offline a partir do IndexedDB caso o cliente inicie offline ou o socket demore
  useEffect(() => {
    let timer: number | undefined;
    if (!isSynced) {
      timer = window.setTimeout(async () => {
        if (!documentDataRef.current) {
          const cached = await outboxDbService.getCache(documentId, 'main.tex');
          if (cached) {
            const fallbackDoc: DocumentData = {
              id: documentId,
              title: 'Documento (Cache Offline)',
              content: cached.content,
              mainEntryPath: 'main.tex',
              version: cached.version || 1,
              updatedAt: new Date().toISOString(),
            };
            documentDataRef.current = fallbackDoc;
            setDocumentData(fallbackDoc);
            setCollabVersion(cached.version || 1);
            setActiveFile('main.tex');
            setOpenTabs([{ id: 'main.tex', name: 'main.tex', type: 'tex', isMain: true }]);
            setIsSynced(true);
          }
        }
      }, 2500);
    }
    return () => clearTimeout(timer);
  }, [documentId, isSynced]);

  // Sincroniza histórico inicial quando os dados do TanStack Query chegam
  useEffect(() => {
    if (historyData) {
      if (historyData.snapshots) setSnapshots(historyData.snapshots);
      if (historyData.operations) setOperations(historyData.operations.slice(-30).reverse());
    }
  }, [historyData]);

  // Listeners diretos registrados pelo CodeMirror para eliminar batching assíncrono do React
  const remoteDeltaListenerRef = useRef<((op: DeltaOperation, file: string) => void) | null>(null);
  const registerRemoteDeltaListener = useCallback(
    (listener: ((op: DeltaOperation, file: string) => void) | null) => {
      remoteDeltaListenerRef.current = listener;
    },
    []
  );

  const reconcileListenerRef = useRef<((file: string, content: string) => void) | null>(null);
  const registerReconcileListener = useCallback(
    (listener: ((file: string, content: string) => void) | null) => {
      reconcileListenerRef.current = listener;
    },
    []
  );

  // Handlers de WebSocket
  const handleRemoteDelta = useCallback(
    (op: DeltaOperation, targetFile: string, _version: number) => {
      // 1. Aplicação imediata e síncrona no CodeMirror ativo (zero atraso e zero perda de deltas)
      remoteDeltaListenerRef.current?.(op, targetFile);

      setIncomingRemoteDelta({
        file: targetFile,
        operation: op,
        timestamp: Date.now(),
      });

      const rootPath = documentDataRef.current?.mainEntryPath || 'main.tex';
      if (targetFile === rootPath) {
        setDocumentData((prev) => {
          if (!prev) return prev;
          let content = prev.content;
          const pos = Math.max(0, Math.min(op.position, content.length));
          if (op.type === 'insert' && op.text !== undefined) {
            content = content.slice(0, pos) + op.text + content.slice(pos);
          } else if (op.type === 'delete' && op.length !== undefined) {
            content = content.slice(0, pos) + content.slice(pos + op.length);
          }
          return { ...prev, content };
        });
      } else {
        const current = fileContentsRef.current[targetFile] ?? '';
        let updated = current;
        const pos = Math.max(0, Math.min(op.position, current.length));
        if (op.type === 'insert' && op.text !== undefined) {
          updated = current.slice(0, pos) + op.text + current.slice(pos);
        } else if (op.type === 'delete' && op.length !== undefined) {
          updated = current.slice(0, pos) + current.slice(pos + op.length);
        }
        fileContentsRef.current[targetFile] = updated;
        setFileContents((prev) => ({ ...prev, [targetFile]: updated }));
      }

      setOperations((prev) => [op, ...prev.slice(0, 49)]);
      setSaveStatus('pending_debounce');
    },
    []
  );

  const handleSyncInit = useCallback(
    (
      doc: DocumentData,
      _collabs: Collaborator[],
      initialComments?: ReviewComment[],
      initCollabVersion?: number,
      initFileVersions?: Record<string, number>
    ) => {
      const isReconnecting = Boolean(documentDataRef.current);
      documentDataRef.current = doc;
      setDocumentData(doc);
      if (initialComments) setComments(initialComments);
      const rootPath = doc.mainEntryPath || 'main.tex';
      const ver = typeof initCollabVersion === 'number' ? initCollabVersion : doc.version;
      setCollabVersion(ver);
      setFileCollabVersions({
        [rootPath]: ver,
        ...(initFileVersions || {}),
      });
      setActiveFile((prev) => (prev && prev !== 'main.tex' ? prev : rootPath));
      setOpenTabs((prev) => {
        const hasMain = prev.some((tab) => tab.isMain);
        if (!hasMain) {
          return [{ id: rootPath, name: rootPath, type: 'tex', isMain: true }, ...prev];
        }
        return prev.map((tab) => (tab.isMain ? { ...tab, name: rootPath, id: rootPath } : tab));
      });
      setIsSynced(true);

      // Se for reconexão do editor, garante que o CodeMirror sincronize o documento canônico
      if (isReconnecting) {
        reconcileListenerRef.current?.(rootPath, doc.content);
      }
    },
    []
  );
  const handleRemoteCollabUpdates = useCallback(
    (targetFile: string, version: number, updates: CollabUpdateJSON[]) => {
      setIncomingCollabUpdates({
        file: targetFile,
        version,
        updates,
        timestamp: Date.now(),
      });
      setFileCollabVersions((prev) => ({ ...prev, [targetFile]: version }));
      const rootPath = documentData?.mainEntryPath || 'main.tex';
      if (targetFile === rootPath) {
        setCollabVersion(version);
      } else {
        editorStateCache.removeFileState(targetFile);
        delete fileContentsRef.current[targetFile];
      }
      setSaveStatus('pending_debounce');
    },
    [documentData?.mainEntryPath]
  );

  const handleReconcileSync = useCallback((file: string, content: string, version: number) => {
    const rootPath = documentDataRef.current?.mainEntryPath || 'main.tex';
    if (file === rootPath) {
      setDocumentData((prev) => (prev ? { ...prev, content, version } : prev));
      setCollabVersion(version);
    } else {
      fileContentsRef.current[file] = content;
      setFileContents((prev) => ({ ...prev, [file]: content }));
    }
    setSaveStatus('synced');
    reconcileListenerRef.current?.(file, content);
  }, []);

  const handleSnapshotSaved = useCallback((snapshot: DocumentSnapshot, time: string) => {
    setSnapshots((prev) => [snapshot, ...prev]);
    setSaveStatus('synced');
    setLastSavedAt(time);
    setDocumentData((prev) =>
      prev ? { ...prev, content: snapshot.content, version: snapshot.version } : prev
    );
    const rootPath = documentDataRef.current?.mainEntryPath || 'main.tex';
    reconcileListenerRef.current?.(rootPath, snapshot.content);
  }, []);

  const handleSnapshotRestored = useCallback((payload: SnapshotRestoredPayload) => {
    const rootPath = documentDataRef.current?.mainEntryPath || 'main.tex';
    setDocumentData((prev) =>
      prev
        ? {
            ...prev,
            content: payload.snapshot.content,
            version: payload.snapshot.version,
          }
        : prev
    );
    setSaveStatus('synced');
    reconcileListenerRef.current?.(rootPath, payload.snapshot.content);
  }, []);

  const handleCommentAdded = useCallback((comment: ReviewComment) => {
    setComments((prev) => [comment, ...prev.filter((c) => c.id !== comment.id)]);
    setShowReview(true);
    setActiveCommentId(comment.id);
  }, []);

  const handleCommentRepliedOrResolved = useCallback((comment: ReviewComment) => {
    setComments((prev) => prev.map((c) => (c.id === comment.id ? comment : c)));
  }, []);

  const handleCommentDeleted = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setActiveCommentId((prev) => (prev === commentId ? null : prev));
  }, []);

  const {
    isConnected,
    isOnline,
    collaborators,
    remoteCursors,
    activeEditor,
    sendDelta,
    sendCollabUpdates,
    sendCursorMove,
    sendRawMessage,
    requestReconcile,
  } = useCollabWebSocket({
    documentId,
    userId,
    userName,
    activeFile,
    onRemoteDelta: handleRemoteDelta,
    onRemoteCollabUpdates: handleRemoteCollabUpdates,
    onSyncInit: handleSyncInit,
    onSnapshotSaved: handleSnapshotSaved,
    onSnapshotRestored: handleSnapshotRestored,
    onReconcileSync: handleReconcileSync,
    onCommentAdded: handleCommentAdded,
    onCommentRepliedOrResolved: handleCommentRepliedOrResolved,
    onCommentDeleted: handleCommentDeleted,
  });

  // Notifica colaboradores na mudança de arquivo ativo
  useEffect(() => {
    sendCursorMove(0, activeFile);
  }, [activeFile, sendCursorMove]);

  // Referência para garantir que a compilação inicial ocorra apenas uma vez por documento (evitando loop infinito de erros)
  const initialCompileAttemptedRef = useRef<string | null>(null);

  // Compilação automática protegida por rede
  const handleRecompileSafe = useCallback(async () => {
    if (!isOnline) {
      console.warn('[Compiler] Compilação cancelada: cliente em modo offline');
      return;
    }
    return recompile();
  }, [isOnline, recompile]);

  // Compilação inicial automática do documento ao carregar
  useEffect(() => {
    if (documentData?.id && initialCompileAttemptedRef.current !== documentData.id && isOnline) {
      initialCompileAttemptedRef.current = documentData.id;
      handleRecompileSafe();
    }
  }, [documentData?.id, handleRecompileSafe, isOnline]);

  const operationsBufferRef = useRef<DeltaOperation[]>([]);
  const operationsDebounceRef = useRef<number | null>(null);
  const contentDebounceRef = useRef<number | null>(null);
  const cacheDebounceRef = useRef<number | null>(null);
  const pendingCacheContentRef = useRef<{ file: string; content: string } | null>(null);

  // Limpeza de timers e flush de cache pendente no unmount
  useEffect(() => {
    return () => {
      if (contentDebounceRef.current !== null) clearTimeout(contentDebounceRef.current);
      if (operationsDebounceRef.current !== null) clearTimeout(operationsDebounceRef.current);
      if (cacheDebounceRef.current !== null && pendingCacheContentRef.current) {
        clearTimeout(cacheDebounceRef.current);
        outboxDbService
          .saveCache(
            documentId,
            pendingCacheContentRef.current.file,
            pendingCacheContentRef.current.content,
            collabVersion
          )
          .catch(console.warn);
      }
    };
  }, [documentId, collabVersion]);

  // Delta local no main.tex
  const handleApplyLocalDelta = useCallback(
    (delta: Omit<DeltaOperation, 'userId' | 'userName' | 'timestamp'>) => {
      setSaveStatus((prev) => (prev !== 'pending_debounce' ? 'pending_debounce' : prev));

      const fullDelta: DeltaOperation = {
        ...delta,
        userId,
        userName,
        timestamp: Date.now(),
      };

      // Bufferiza operações com debounce de 500ms para evitar re-render em cascata do React a cada caractere
      operationsBufferRef.current = [fullDelta, ...operationsBufferRef.current.slice(0, 49)];
      if (operationsDebounceRef.current !== null) {
        clearTimeout(operationsDebounceRef.current);
      }
      operationsDebounceRef.current = window.setTimeout(() => {
        setOperations(operationsBufferRef.current);
      }, 500);

      const rootPath =
        documentDataRef.current?.mainEntryPath || documentData?.mainEntryPath || 'main.tex';
      sendDelta(rootPath, delta);
    },
    [userId, userName, sendDelta, documentData?.mainEntryPath]
  );

  // Delta em arquivos secundários
  const handleSecondaryDelta = useCallback(
    (delta: { type: 'insert' | 'delete'; position: number; text?: string; length?: number }) => {
      const current = fileContentsRef.current[activeFile] ?? fileContents[activeFile] ?? '';
      let updated = current;
      const pos = Math.max(0, Math.min(delta.position, current.length));
      if (delta.type === 'insert' && delta.text) {
        updated = current.slice(0, pos) + delta.text + current.slice(pos);
      } else if (delta.type === 'delete' && delta.length) {
        updated = current.slice(0, pos) + current.slice(pos + delta.length);
      }

      fileContentsRef.current[activeFile] = updated;
      setSecondarySaveStatus((prev) =>
        prev[activeFile] !== 'pending_debounce'
          ? {
              ...prev,
              [activeFile]: 'pending_debounce',
            }
          : prev
      );

      sendDelta(activeFile, delta);

      const tab = openTabs.find((t) => t.name === activeFile);
      if (!tab || tab.isMain) return;

      if (fileSaveDebounceRef.current[activeFile]) {
        clearTimeout(fileSaveDebounceRef.current[activeFile]);
      }

      fileSaveDebounceRef.current[activeFile] = setTimeout(async () => {
        setSecondarySaveStatus((prev) => ({ ...prev, [activeFile]: 'saving' }));
        try {
          const finalContent = fileContentsRef.current[activeFile] ?? updated;
          await EditorService.updateFileContent({
            documentId,
            fileId: tab.id,
            content: finalContent,
          });
          setSecondarySaveStatus((prev) => ({
            ...prev,
            [activeFile]: 'synced',
          }));
        } catch (err) {
          console.error('[Editor] Erro ao salvar arquivo secundário:', err);
          setSecondarySaveStatus((prev) => ({
            ...prev,
            [activeFile]: 'synced',
          }));
        }
      }, 1000);
    },
    [activeFile, fileContents, openTabs, documentId, sendDelta]
  );
  const handlePushCollabUpdates = useCallback(
    (file: string, version: number, updates: CollabUpdateJSON[]) => {
      sendCollabUpdates(file, version, updates);
      setSaveStatus('pending_debounce');
    },
    [sendCollabUpdates]
  );

  const handleDocContentChange = useCallback(
    (newContent: string) => {
      const rootPath = documentDataRef.current?.mainEntryPath || 'main.tex';
      const targetPath = activeFile || rootPath;

      // Mantém referências síncronas atualizadas instantaneamente na memória
      if (activeFile === rootPath || !activeFile) {
        if (documentDataRef.current) {
          documentDataRef.current.content = newContent;
        }
      } else {
        fileContentsRef.current[activeFile] = newContent;
      }
      pendingCacheContentRef.current = { file: targetPath, content: newContent };

      // 1. Debounce na propagação para o estado React (300ms)
      // Mantém o Workspace responsivo a 60-120fps sem forçar re-render do React a cada tecla
      if (contentDebounceRef.current !== null) {
        clearTimeout(contentDebounceRef.current);
      }
      contentDebounceRef.current = window.setTimeout(() => {
        if (activeFile === rootPath || !activeFile) {
          setDocumentData((prev) => (prev ? { ...prev, content: newContent } : prev));
        } else {
          setFileContents((prev) => ({ ...prev, [activeFile]: newContent }));
        }
      }, 300);

      // 2. Debounce na gravação do IndexedDB (1000ms)
      // Elimina o gargalo de I/O de disco durante digitação contínua
      if (cacheDebounceRef.current !== null) {
        clearTimeout(cacheDebounceRef.current);
      }
      cacheDebounceRef.current = window.setTimeout(() => {
        outboxDbService
          .saveCache(documentId, targetPath, newContent, collabVersion)
          .catch(console.warn);
      }, 1000);
    },
    [activeFile, documentId, collabVersion]
  );

  const handleCursorMove = useCallback(
    (position: number, selectionStart?: number, selectionEnd?: number) => {
      sendCursorMove(position, activeFile, selectionStart, selectionEnd);
    },
    [activeFile, sendCursorMove]
  );

  const handleManualFlush = useCallback(async () => {
    try {
      if (cacheDebounceRef.current !== null && pendingCacheContentRef.current) {
        clearTimeout(cacheDebounceRef.current);
        cacheDebounceRef.current = null;
        await outboxDbService
          .saveCache(
            documentId,
            pendingCacheContentRef.current.file,
            pendingCacheContentRef.current.content,
            collabVersion
          )
          .catch(console.warn);
      }
      const snap = await flushMutation.mutateAsync();
      if (snap) {
        setSnapshots((prev) => [snap, ...prev]);
        setSaveStatus('synced');
        setLastSavedAt(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('[Editor] Erro no flush manual:', err);
    }
  }, [flushMutation, documentId, collabVersion]);

  const handleOpenFile = useCallback(
    async (file: ProjectFile) => {
      setOpenTabs((prev) => {
        if (prev.some((t) => t.name === file.name)) return prev;
        return [
          ...prev,
          {
            id: file.id,
            name: file.name,
            type: file.type,
            isMain: file.isMain,
          },
        ];
      });

      if (!file.isMain) {
        try {
          const freshContent = await EditorService.fetchFileContent({
            documentId,
            fileId: file.id,
          });
          fileContentsRef.current[file.name] = freshContent;
          setFileContents((prev) => ({ ...prev, [file.name]: freshContent }));
        } catch (err) {
          console.error('[Editor] Erro ao buscar conteúdo do arquivo:', err);
          if (file.content !== undefined && file.content !== null) {
            fileContentsRef.current[file.name] = file.content;
            setFileContents((prev) => ({
              ...prev,
              [file.name]: file.content!,
            }));
          }
        }
      }
      setActiveFile(file.name);
    },
    [documentId]
  );

  const handleCloseTab = useCallback(
    (fileName: string) => {
      setOpenTabs((prev) => {
        const filtered = prev.filter((t) => t.name !== fileName);
        if (activeFile === fileName) {
          const rootName = documentData?.mainEntryPath || 'main.tex';
          const next = filtered[filtered.length - 1] || { name: rootName };
          setActiveFile(next.name);
        }
        return filtered;
      });
    },
    [activeFile, documentData?.mainEntryPath]
  );

  const handleInsertSnippet = useCallback(
    (snippet: string) => {
      if (documentData) {
        const insertPos = documentData.content.indexOf('\\end{document}');
        const pos = insertPos !== -1 ? insertPos : documentData.content.length;
        const rootPath = documentData.mainEntryPath || 'main.tex';
        const delta = {
          file: rootPath,
          type: 'insert' as const,
          position: pos,
          text: `\n${snippet}\n`,
          userId,
          userName,
          timestamp: Date.now(),
        };
        sendRawMessage({
          type: 'APPLY_DELTA',
          file: rootPath,
          delta,
        });
      }
    },
    [documentData, userId, userName, sendRawMessage]
  );

  const handleAddComment = useCallback(
    (content: string, explicitSelection?: { from: number; to: number; selectedText: string }) => {
      const newComm = {
        documentId,
        file: activeFile,
        from: explicitSelection ? explicitSelection.from : 0,
        to: explicitSelection ? explicitSelection.to : 0,
        selectedText: explicitSelection ? explicitSelection.selectedText : '',
        content,
      };
      sendRawMessage({
        type: 'ADD_COMMENT',
        comment: newComm,
      });
    },
    [documentId, activeFile, sendRawMessage]
  );

  const handleReplyComment = useCallback(
    (commentId: string, content: string) => {
      sendRawMessage({
        type: 'REPLY_COMMENT',
        commentId,
        content,
      });
    },
    [sendRawMessage]
  );

  const handleResolveComment = useCallback(
    (commentId: string, status: 'open' | 'resolved') => {
      sendRawMessage({
        type: 'RESOLVE_COMMENT',
        commentId,
        status,
      });
    },
    [sendRawMessage]
  );

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      sendRawMessage({
        type: 'DELETE_COMMENT',
        commentId,
      });
    },
    [sendRawMessage]
  );

  const activeFileRemoteCursors = useMemo(() => {
    return Array.from(remoteCursors.values()).filter((c) => (c.file || 'main.tex') === activeFile);
  }, [remoteCursors, activeFile]);

  const effectiveSaveStatus: SaveStatus = !isConnected || !isOnline ? 'offline' : saveStatus;

  const value: CollabEditorContextValue = {
    documentId,
    documentData,
    userId,
    userName,
    collaborators,
    remoteCursors,
    activeFileRemoteCursors,
    activeEditor,
    saveStatus: effectiveSaveStatus,
    secondarySaveStatus,
    lastSavedAt,
    isConnected: isConnected && isOnline,
    isOnline,
    isFlushing,
    snapshots,
    operations,
    activeFile,
    setActiveFile,
    openTabs,
    fileContents,
    settings,
    updateSettings,
    layoutMode,
    setLayoutMode,
    showHistory,
    setShowHistory,
    showReview,
    setShowReview,
    comments,
    activeCommentId,
    setActiveCommentId,
    isReviewer,
    pdfBlobUrl,
    isCompiling,
    compileError,
    lastCompiledAt,
    recompile: handleRecompileSafe,
    isSynced,
    collabVersion:
      fileCollabVersions[activeFile] ??
      (activeFile === (documentData?.mainEntryPath || 'main.tex') ? collabVersion : 0),
    incomingCollabUpdates,
    incomingRemoteDelta,
    handlePushCollabUpdates,
    handleDocContentChange,
    handleApplyLocalDelta,
    handleSecondaryDelta,
    handleCursorMove,
    handleManualFlush,
    handleOpenFile,
    handleCloseTab,
    handleInsertSnippet,
    handleAddComment,
    handleReplyComment,
    handleResolveComment,
    handleDeleteComment,
    historyStatus,
    setHistoryStatus,
    handleUndo,
    handleRedo,
    registerEditorActions,
    registerRemoteDeltaListener,
    registerReconcileListener,
    requestReconcile,
  };

  return <CollabEditorContext.Provider value={value}>{children}</CollabEditorContext.Provider>;
}
