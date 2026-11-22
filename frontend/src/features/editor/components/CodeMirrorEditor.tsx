import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import {
  bracketMatching,
  codeFolding,
  defaultHighlightStyle,
  foldGutter,
  indentOnInput,
  StreamLanguage,
  syntaxHighlighting,
} from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { Diagnostic, forceLinting, linter, lintGutter } from '@codemirror/lint';
import { highlightSelectionMatches, search } from '@codemirror/search';
import { EditorState, Transaction } from '@codemirror/state';
import {
  crosshairCursor,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  lineNumbers,
  placeholder,
  rectangularSelection,
  scrollPastEnd,
} from '@codemirror/view';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Extensões Modulares e Serviços
import {
  commentsField,
  setActiveCommentEffect,
  setCommentsEffect,
} from '../extensions/comments/commentsExtension';
import {
  autoCloseBracketsCompart,
  autocompleteCompart,
  editorConfigCompart,
  getEditorConfigExtension,
  getSpellcheckExtension,
  grammarLinterCompart,
  linterCompart,
  readOnlyCompart,
  spellcheckCompart,
  themeCompart,
  wordWrapCompart,
} from '../extensions/config/editorCompartments';
import {
  highPriorityKeymap,
  lowPriorityKeymap,
  standardKeymap,
} from '../extensions/config/editorKeymaps';
import { editorPortuguesePhrasesExtension } from '../extensions/config/editorPhrases';
import {
  remoteCursorsField,
  setRemoteCursorsEffect,
} from '../extensions/cursors/remoteCursorsExtension';
import {
  createHistoryExtension,
  getHistoryStatus,
  historyField,
  type HistoryStatus,
  triggerRedo,
  triggerUndo,
} from '../extensions/history/historyExtension';
import {
  createBibHoverTooltip,
  createLatexCompletionSource,
} from '../extensions/latex/latexAutocomplete';
import { latexFoldService } from '../extensions/latex/latexFolding';
import { createLatexLinterSource } from '../extensions/latex/latexLinter';
import { codeMirrorDarkTheme, codeMirrorLightTheme } from '../extensions/theme/editorThemes';
import { editorStateCache } from '../services/editorStateCache';

// Utilitários e Componentes Menores Reutilizáveis
import Box from '@mui/material/Box';
import { DEFAULT_SETTINGS, EditorSettings } from '../../../types/settings';
import { checkGrammarAndSpelling } from '../services/languagetool.service';
import { DeltaOperation, RemoteCursor, ReviewComment, SaveStatus } from '../types/collab.types';
import { EditorCommentDialog, SelectionPopupData } from './EditorCommentDialog';
import { EditorStatusBar } from './EditorStatusBar';

export interface EditorLineLayoutInfo {
  commentLineTops: Record<string, { lineNumber: number; top: number }>;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export interface CodeMirrorEditorProps {
  content: string;
  version: number;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  remoteCursors: RemoteCursor[];
  activeEditor: { userName: string; color: string; action: string } | null;
  currentUserColor?: string;
  currentUserName?: string;
  theme?: 'dark' | 'light';
  bibContent?: string;
  compileError?: string | null;
  settings?: EditorSettings;
  comments?: ReviewComment[];
  activeCommentId?: string | null;
  pendingCommentSelection?: {
    from: number;
    to: number;
    selectedText: string;
  } | null;
  onLinePositionsChange?: (info: EditorLineLayoutInfo) => void;
  externalScrollTop?: number;
  onSelectComment?: (commentId: string | null) => void;
  onRequestAddComment?: (from: number, to: number, selectedText: string, content?: string) => void;
  onApplyLocalDelta: (delta: Omit<DeltaOperation, 'userId' | 'userName' | 'timestamp'>) => void;
  onCursorMove: (position: number, selectionStart?: number, selectionEnd?: number) => void;
  currentUserId?: string;
  activeFile?: string;
  onDocContentChange?: (content: string) => void;
  onHistoryChange?: (status: HistoryStatus) => void;
  onRegisterActions?: (actions: { undo: () => boolean; redo: () => boolean } | null) => void;
  onRegisterRemoteDeltaListener?: (
    listener: ((op: DeltaOperation, file: string) => void) | null
  ) => void;
  onRegisterReconcileListener?: (
    listener: ((file: string, content: string) => void) | null
  ) => void;
  readOnly?: boolean;
}

export function CodeMirrorEditor({
  content,
  version: _version = 1,
  saveStatus,
  lastSavedAt,
  remoteCursors,
  activeEditor,
  currentUserColor,
  currentUserName = 'Você',
  theme = 'dark',
  bibContent = '',
  compileError = null,
  settings = DEFAULT_SETTINGS,
  comments = [],
  activeCommentId = null,
  pendingCommentSelection: _pendingCommentSelection = null,
  onLinePositionsChange,
  externalScrollTop,
  onSelectComment,
  onRequestAddComment,
  onApplyLocalDelta,
  onCursorMove,
  currentUserId,
  activeFile = '',
  onDocContentChange,
  onHistoryChange,
  onRegisterActions,
  onRegisterRemoteDeltaListener,
  onRegisterReconcileListener,
  readOnly = false,
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const bibContentRef = useRef<string>(bibContent);
  bibContentRef.current = bibContent;
  const compileErrorRef = useRef<string | null>(compileError);
  compileErrorRef.current = compileError;
  const onSelectCommentRef = useRef(onSelectComment);
  onSelectCommentRef.current = onSelectComment;
  const onLinePositionsChangeRef = useRef(onLinePositionsChange);
  onLinePositionsChangeRef.current = onLinePositionsChange;
  const currentUserIdRef = useRef<string | undefined>(currentUserId);
  currentUserIdRef.current = currentUserId;
  const activeFileRef = useRef<string>(activeFile);
  activeFileRef.current = activeFile;
  const onDocContentChangeRef = useRef(onDocContentChange);
  onDocContentChangeRef.current = onDocContentChange;
  const onHistoryChangeRef = useRef(onHistoryChange);
  onHistoryChangeRef.current = onHistoryChange;
  const onRegisterActionsRef = useRef(onRegisterActions);
  onRegisterActionsRef.current = onRegisterActions;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onApplyLocalDeltaRef = useRef(onApplyLocalDelta);
  onApplyLocalDeltaRef.current = onApplyLocalDelta;

  const [selectionPopup, setSelectionPopup] = useState<SelectionPopupData | null>(null);
  const [isInlineBoxOpen, setIsInlineBoxOpen] = useState<boolean>(false);
  const [inlineCommentInput, setInlineCommentInput] = useState<string>('');
  const isInlineBoxOpenRef = useRef(isInlineBoxOpen);
  isInlineBoxOpenRef.current = isInlineBoxOpen;

  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const isMouseDownRef = useRef(false);
  const isProgrammaticSelectionRef = useRef(false);
  const lastScrolledCommentIdRef = useRef<string | null>(null);
  const lastSentLayoutRef = useRef<{ scrollTop: number; topsKey: string }>({
    scrollTop: -1,
    topsKey: '',
  });

  const latexCompletionSource = useMemo(
    () => createLatexCompletionSource(() => bibContentRef.current),
    []
  );
  const bibHoverTooltip = useMemo(() => createBibHoverTooltip(() => bibContentRef.current), []);
  const latexLinterSource = useMemo(
    () => createLatexLinterSource(() => compileErrorRef.current),
    []
  );

  const grammarLinterSource = async (view: EditorView): Promise<Diagnostic[]> => {
    const currentSettings = settingsRef.current;
    if (!currentSettings.spellcheck) return [];
    const text = view.state.doc.toString();
    if (!text.trim()) return [];

    try {
      const matches = await checkGrammarAndSpelling(
        text,
        currentSettings.spellcheckLanguage || 'pt-BR'
      );
      const docLength = view.state.doc.length;

      return matches.map((match): Diagnostic => {
        const from = Math.min(match.offset, docLength);
        const to = Math.min(match.offset + match.length, docLength);
        const isSpelling = match.rule?.issueType === 'misspelling';
        const severity: 'error' | 'warning' = isSpelling ? 'error' : 'warning';

        return {
          from,
          to,
          severity,
          message: match.message,
          actions: match.replacements.slice(0, 3).map((rep) => ({
            name: `Substituir por "${rep.value}"`,
            apply(targetView, actionFrom, actionTo) {
              targetView.dispatch({
                changes: { from: actionFrom, to: actionTo, insert: rep.value },
              });
            },
          })),
        };
      });
    } catch {
      return [];
    }
  };

  const updateLinePositions = (view: EditorView) => {
    if (!onLinePositionsChangeRef.current) return;
    const currentComments = commentsRef.current;
    if (!currentComments || currentComments.length === 0) return;

    const tops: Record<string, { lineNumber: number; top: number }> = {};
    const scroller = view.scrollDOM;
    const scrollerRect = scroller.getBoundingClientRect();
    const doc = view.state.doc;

    for (const comment of currentComments) {
      const clampedPos = Math.max(0, Math.min(comment.from, doc.length));
      const line = doc.lineAt(clampedPos);
      const coords = view.coordsAtPos(line.from);
      if (coords) {
        const relativeTop = coords.top - scrollerRect.top + scroller.scrollTop;
        tops[comment.id] = {
          lineNumber: line.number,
          top: Math.max(0, relativeTop),
        };
      }
    }

    const topsKey = Object.entries(tops)
      .map(([id, val]) => `${id}:${val.lineNumber}:${Math.round(val.top)}`)
      .sort()
      .join('|');

    if (
      Math.abs(scroller.scrollTop - lastSentLayoutRef.current.scrollTop) > 2 ||
      topsKey !== lastSentLayoutRef.current.topsKey
    ) {
      lastSentLayoutRef.current = { scrollTop: scroller.scrollTop, topsKey };
      onLinePositionsChangeRef.current({
        commentLineTops: tops,
        scrollTop: scroller.scrollTop,
        scrollHeight: scroller.scrollHeight,
        clientHeight: scroller.clientHeight,
      });
    }
  };

  // Inicializa o CodeMirror 6 na montagem com todas as extensões e superpoderes nativos
  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      wordWrapCompart.of(settings.wordWrap ? EditorView.lineWrapping : []),

      // Ergonomia de Visualização Nativa
      scrollPastEnd(),
      placeholder('Digite seu documento ou comando LaTeX aqui (ex: \\documentclass{article})...'),
      editorPortuguesePhrasesExtension,

      // Code Folding e Multi-Seleção
      latexFoldService,
      foldGutter(),
      codeFolding(),
      EditorState.allowMultipleSelections.of(true),
      rectangularSelection(),
      crosshairCursor(),
      dropCursor(),
      highlightSelectionMatches(),

      // Pareamento e Fechamento Automático de Chaves
      bracketMatching(),
      autoCloseBracketsCompart.of(settings.autoCloseBrackets ? closeBrackets() : []),
      indentOnInput(),

      // Busca e Histórico
      createHistoryExtension({ minDepth: 300 }),
      search({ top: true }),

      // Diagnósticos e Linter
      linterCompart.of(
        settings.codeCheck
          ? [lintGutter(), linter(latexLinterSource), lowPriorityKeymap]
          : settings.spellcheck
            ? [lintGutter(), lowPriorityKeymap]
            : []
      ),
      grammarLinterCompart.of(
        settings.spellcheck ? [linter(grammarLinterSource, { delay: 800 })] : []
      ),

      // Tooltips e Atalhos de Teclado Hierárquicos com Prec
      bibHoverTooltip,
      highPriorityKeymap,
      standardKeymap,

      // Sintaxe LaTeX com suporte a comentários (%) para toggleComment
      StreamLanguage.define({
        ...stex,
        languageData: {
          commentTokens: { line: '%' },
          closeBrackets: { brackets: ['(', '[', '{', "'", '"', '`', '$'] },
        },
      }),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

      autocompleteCompart.of(
        settings.autoComplete
          ? autocompletion({
              override: [latexCompletionSource],
              defaultKeymap: true,
            })
          : []
      ),
      remoteCursorsField,
      commentsField,
      themeCompart.of(theme === 'light' ? codeMirrorLightTheme : codeMirrorDarkTheme),
      spellcheckCompart.of(
        getSpellcheckExtension(settings.spellcheck, settings.spellcheckLanguage)
      ),
      editorConfigCompart.of(
        getEditorConfigExtension(settings.fontSize, settings.lineHeight, settings.nonBlinkingCursor)
      ),
      readOnlyCompart.of(EditorState.readOnly.of(Boolean(readOnly))),
      EditorView.domEventHandlers({
        click(event) {
          const target = event.target as HTMLElement | null;
          const mark = target?.closest('.cm-comment-mark') as HTMLElement | null;
          if (mark) {
            const commentId = mark.getAttribute('data-comment-id');
            if (commentId && onSelectCommentRef.current) {
              onSelectCommentRef.current(commentId);
            }
          }
        },
      }),
      EditorView.updateListener.of((update) => {
        const isRemote = update.transactions.some((tr) => tr.annotation(Transaction.remote));

        if (update.selectionSet && !isRemote) {
          const main = update.state.selection.main;
          const start = Math.min(main.anchor, main.head);
          const end = Math.max(main.anchor, main.head);
          onCursorMove(
            main.head,
            start !== end ? start : undefined,
            start !== end ? end : undefined
          );

          if (start === end && !isInlineBoxOpenRef.current) {
            setSelectionPopup(null);
          }
        }

        if (update.docChanged || update.selectionSet) {
          onHistoryChangeRef.current?.(getHistoryStatus(update.state));
        }

        if (update.docChanged) {
          updateLinePositions(update.view);
          onDocContentChangeRef.current?.(update.state.doc.toString());

          // Padrão Overleaf: se a transação veio de outro autor via WebSocket (remote), não envia de volta
          if (!isRemote) {
            update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
              const insertedText = inserted.toString();
              const deletedLength = toA - fromA;

              if (deletedLength > 0) {
                onApplyLocalDeltaRef.current?.({
                  type: 'delete',
                  position: fromA,
                  length: deletedLength,
                });
              }

              if (insertedText.length > 0) {
                onApplyLocalDeltaRef.current?.({
                  type: 'insert',
                  position: fromA,
                  text: insertedText,
                });
              }
            });
          }
        }
      }),
    ];

    let startState: EditorState;
    const cached = activeFile ? editorStateCache.getFileState(activeFile) : undefined;
    if (cached && typeof cached.doc === 'string' && cached.doc === content) {
      try {
        startState = EditorState.fromJSON(cached, { extensions }, { history: historyField });
      } catch {
        startState = EditorState.create({ doc: content, extensions });
      }
    } else {
      startState = EditorState.create({ doc: content, extensions });
    }

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });

    viewRef.current = view;
    if (onHistoryChangeRef.current) {
      onHistoryChangeRef.current(getHistoryStatus(view.state));
    }
    if (onRegisterActionsRef.current) {
      onRegisterActionsRef.current({
        undo: () => (viewRef.current ? triggerUndo(viewRef.current) : false),
        redo: () => (viewRef.current ? triggerRedo(viewRef.current) : false),
      });
    }

    const handleMouseDown = () => {
      isMouseDownRef.current = true;
      if (!isInlineBoxOpenRef.current) {
        setSelectionPopup(null);
      }
    };

    const handleMouseUp = () => {
      if (!isMouseDownRef.current) return;
      isMouseDownRef.current = false;

      setTimeout(() => {
        const currentView = viewRef.current;
        if (!currentView || isProgrammaticSelectionRef.current) return;

        const main = currentView.state.selection.main;
        const start = Math.min(main.anchor, main.head);
        const end = Math.max(main.anchor, main.head);

        if (start < end) {
          const selText = currentView.state.sliceDoc(start, end).trim();
          if (selText.length > 0) {
            const headCoords = currentView.coordsAtPos(end);
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (headCoords && containerRect) {
              const top = Math.max(8, headCoords.bottom - containerRect.top + 6);
              const left = Math.max(
                12,
                Math.min(headCoords.left - containerRect.left - 40, containerRect.width - 320)
              );
              setSelectionPopup({
                from: start,
                to: end,
                text: selText,
                top,
                left,
              });
              setIsInlineBoxOpen(false);
            }
          } else if (!isInlineBoxOpenRef.current) {
            setSelectionPopup(null);
          }
        } else if (!isInlineBoxOpenRef.current) {
          setSelectionPopup(null);
        }
      }, 20);
    };

    const dom = view.dom;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      onRegisterActionsRef.current?.(null);
      if (viewRef.current && activeFileRef.current) {
        editorStateCache.saveFileState(activeFileRef.current, viewRef.current.state);
      }
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      view.destroy();
      viewRef.current = null;
    };
    // Inicialização do EditorView intencionalmente restrita à montagem do componente.
    // Reconfigurações dinâmicas de tema, configurações e permissões são tratadas em efeitos dedicados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconfigura o tema do CodeMirror dinamicamente quando a prop `theme` mudar
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: themeCompart.reconfigure(
          theme === 'light' ? codeMirrorLightTheme : codeMirrorDarkTheme
        ),
      });
    }
  }, [theme]);

  // Reconfigura dinamicamente todas as extensões baseadas nas configurações do usuário
  useEffect(() => {
    if (viewRef.current && settings) {
      viewRef.current.dispatch({
        effects: [
          wordWrapCompart.reconfigure(settings.wordWrap ? EditorView.lineWrapping : []),
          autoCloseBracketsCompart.reconfigure(settings.autoCloseBrackets ? closeBrackets() : []),
          autocompleteCompart.reconfigure(
            settings.autoComplete
              ? autocompletion({
                  override: [latexCompletionSource],
                  defaultKeymap: true,
                })
              : []
          ),
          linterCompart.reconfigure(
            settings.codeCheck
              ? [lintGutter(), linter(latexLinterSource), lowPriorityKeymap]
              : settings.spellcheck
                ? [lintGutter(), lowPriorityKeymap]
                : []
          ),
          grammarLinterCompart.reconfigure(
            settings.spellcheck ? [linter(grammarLinterSource, { delay: 800 })] : []
          ),
          spellcheckCompart.reconfigure(
            getSpellcheckExtension(settings.spellcheck, settings.spellcheckLanguage)
          ),
          editorConfigCompart.reconfigure(
            getEditorConfigExtension(
              settings.fontSize,
              settings.lineHeight,
              settings.nonBlinkingCursor
            )
          ),
        ],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings?.wordWrap,
    settings?.autoCloseBrackets,
    settings?.autoComplete,
    settings?.codeCheck,
    settings?.spellcheck,
    settings?.spellcheckLanguage,
    settings?.fontSize,
    settings?.lineHeight,
    settings?.nonBlinkingCursor,
  ]);
  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: readOnlyCompart.reconfigure(EditorState.readOnly.of(Boolean(readOnly))),
    });
  }, [readOnly]);

  // Atualiza cursores remotos
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: setRemoteCursorsEffect.of(remoteCursors),
      });
    }
  }, [remoteCursors]);

  // Força atualização dos diagnósticos de lint quando houver erro de compilação
  useEffect(() => {
    if (viewRef.current) {
      forceLinting(viewRef.current);
    }
  }, [compileError]);

  // Sincroniza comentários de revisão no CodeMirror
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: setCommentsEffect.of(comments),
      });
    }
  }, [comments]);

  // Atualiza comentário ativo e rola até ele se selecionado
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: setActiveCommentEffect.of(activeCommentId || null),
      });
      if (activeCommentId && activeCommentId !== lastScrolledCommentIdRef.current) {
        lastScrolledCommentIdRef.current = activeCommentId;
        const currentComments = commentsRef.current;
        const comm = currentComments.find((c) => c.id === activeCommentId);
        if (comm) {
          const doc = viewRef.current.state.doc;
          const from = Math.max(0, Math.min(comm.from, doc.length));
          const to = Math.max(from, Math.min(comm.to, doc.length));
          isProgrammaticSelectionRef.current = true;
          viewRef.current.dispatch({
            selection: { anchor: from, head: to },
            effects: EditorView.scrollIntoView(from, { y: 'center' }),
          });
          setTimeout(() => {
            isProgrammaticSelectionRef.current = false;
          }, 100);
        }
      } else if (!activeCommentId) {
        lastScrolledCommentIdRef.current = null;
      }
    }
  }, [activeCommentId]);

  // Reconciliação canônica com algoritmo diff de prefixo/sufixo comum (preserva cursor e ergonomia)
  const reconcileContent = useCallback(
    (targetFile: string, newContent: string) => {
      if (targetFile !== activeFile || !viewRef.current) return;
      const currentDoc = viewRef.current.state.doc.toString();
      if (currentDoc === newContent) return;

      let start = 0;
      while (
        start < currentDoc.length &&
        start < newContent.length &&
        currentDoc[start] === newContent[start]
      ) {
        start++;
      }

      let oldEnd = currentDoc.length;
      let newEnd = newContent.length;
      while (
        oldEnd > start &&
        newEnd > start &&
        currentDoc[oldEnd - 1] === newContent[newEnd - 1]
      ) {
        oldEnd--;
        newEnd--;
      }

      const replacement = newContent.slice(start, newEnd);
      const sel = viewRef.current.state.selection.main;

      viewRef.current.dispatch({
        changes: { from: start, to: oldEnd, insert: replacement },
        annotations: [Transaction.remote.of(true), Transaction.addToHistory.of(false)],
      });

      try {
        const mappedAnchor = Math.max(0, Math.min(sel.anchor, viewRef.current.state.doc.length));
        const mappedHead = Math.max(0, Math.min(sel.head, viewRef.current.state.doc.length));
        viewRef.current.dispatch({
          selection: { anchor: mappedAnchor, head: mappedHead },
        });
      } catch {
        // Seleção mantida graciosamente
      }
      updateLinePositions(viewRef.current);
    },
    [activeFile]
  );

  // Aplicação direta e síncrona de deltas remotos de outros autores (Padrão Overleaf com Transaction.remote)
  const applyRemoteDelta = useCallback(
    (op: DeltaOperation, targetFile: string) => {
      if (targetFile !== activeFile || !viewRef.current) return;

      try {
        const doc = viewRef.current.state.doc;
        const pos = Math.max(0, Math.min(op.position, doc.length));

        if (op.type === 'insert' && op.text) {
          viewRef.current.dispatch({
            changes: { from: pos, insert: op.text },
            annotations: [Transaction.remote.of(true), Transaction.addToHistory.of(false)],
          });
          updateLinePositions(viewRef.current);
        } else if (op.type === 'delete' && op.length) {
          const to = Math.min(pos + op.length, doc.length);
          viewRef.current.dispatch({
            changes: { from: pos, to },
            annotations: [Transaction.remote.of(true), Transaction.addToHistory.of(false)],
          });
          updateLinePositions(viewRef.current);
        }
      } catch (err) {
        console.warn('[Collab Remote Delta] Falha ao aplicar delta remoto no editor:', err);
      }
    },
    [activeFile]
  );

  // Registra os listeners diretos no contexto pai (elimina perdas de delta por batching de estado do React)
  useEffect(() => {
    onRegisterRemoteDeltaListener?.(applyRemoteDelta);
    return () => {
      onRegisterRemoteDeltaListener?.(null);
    };
  }, [applyRemoteDelta, onRegisterRemoteDeltaListener]);

  useEffect(() => {
    onRegisterReconcileListener?.(reconcileContent);
    return () => {
      onRegisterReconcileListener?.(null);
    };
  }, [reconcileContent, onRegisterReconcileListener]);

  // Sincronização externa de scroll
  useEffect(() => {
    if (externalScrollTop !== undefined && viewRef.current) {
      const scroller = viewRef.current.scrollDOM;
      if (Math.abs(scroller.scrollTop - externalScrollTop) > 5) {
        scroller.scrollTop = externalScrollTop;
      }
    }
  }, [externalScrollTop]);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'background.default',
        overflow: 'hidden',
      }}
    >
      <EditorStatusBar
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        activeEditor={activeEditor}
      />

      <Box
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          ref={containerRef}
          sx={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            '--cm-cursor-color': currentUserColor || '#059669',
            '--cm-font-size': settings.fontSize || '13.5px',
            '--cm-line-height': settings.lineHeight || '1.65',
            '--cm-cursor-animation': settings.nonBlinkingCursor
              ? 'none !important'
              : 'cm-blink 1.2s ease-in-out infinite',
          }}
        />

        <EditorCommentDialog
          selectionPopup={selectionPopup}
          isInlineBoxOpen={isInlineBoxOpen}
          inlineCommentInput={inlineCommentInput}
          currentUserName={currentUserName}
          currentUserColor={currentUserColor}
          onOpenInlineBox={() => setIsInlineBoxOpen(true)}
          onClose={() => {
            setIsInlineBoxOpen(false);
            setSelectionPopup(null);
            setInlineCommentInput('');
          }}
          onCommentChange={setInlineCommentInput}
          onSaveComment={(from, to, text, contentText) => {
            if (onRequestAddComment) {
              onRequestAddComment(from, to, text, contentText);
            }
            setIsInlineBoxOpen(false);
            setSelectionPopup(null);
            setInlineCommentInput('');
          }}
        />
      </Box>
    </Box>
  );
}
