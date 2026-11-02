import { useState, useRef, useCallback, useEffect } from 'react';
import { aiChatService } from '../services/aiChatService';
import type {
  AgentName,
  ChatMessage,
  InterruptActionRequest,
  StreamEvent,
} from '../types/chat.types';

interface UseAiChatStreamOptions {
  conversationId: string;
  initialContext?: Record<string, unknown>;
}

function extractActionRequest(event: StreamEvent): InterruptActionRequest | null {
  if (event.type === 'interrupt') {
    if (Array.isArray(event.action_requests) && event.action_requests.length > 0) {
      return event.action_requests[0];
    }
    const rawData = event.data;
    if (Array.isArray(rawData)) {
      for (const item of rawData) {
        if (item && typeof item === 'object') {
          const target =
            'value' in item && item.value && typeof item.value === 'object'
              ? item.value
              : item;
          if (
            'action_requests' in target &&
            Array.isArray(target.action_requests) &&
            target.action_requests.length > 0
          ) {
            const candidate = target.action_requests[0];
            if (
              candidate &&
              typeof candidate === 'object' &&
              'name' in candidate &&
              typeof candidate.name === 'string'
            ) {
              const actionName = candidate.name;
              const actionArgs =
                'args' in candidate && candidate.args && typeof candidate.args === 'object'
                  ? (candidate.args as Record<string, unknown>)
                  : {};
              const actionDesc =
                'description' in candidate && typeof candidate.description === 'string'
                  ? candidate.description
                  : '';
              return {
                name: actionName,
                args: actionArgs,
                description: actionDesc,
              };
            }
          }
        }
      }
    }
  }

  if (event.type === 'action_request') {
    const reqs = event.data?.action_requests;
    if (Array.isArray(reqs) && reqs.length > 0) {
      return reqs[0];
    }
  }

  if (event.type === 'articles_found') {
    if (Array.isArray(event.articles) && event.articles.length > 0) {
      return {
        name: 'present_articles_to_user_for_selection',
        args: { articles: event.articles },
        description: 'Selecione os artigos científicos que deseja utilizar como base referencial.',
      };
    }
  }

  if (event.type === 'roadmap_generated') {
    return {
      name: 'approve_article_proposal',
      args: {
        title: event.title || 'Novo Artigo Científico',
        abstract: event.abstract || '',
        stages: event.stages || [],
        tasks: [],
        articles: [],
      },
      description: 'Revise o título, resumo e a distribuição de datas nas 6 etapas fixas do projeto.',
    };
  }

  return null;
}
export function useAiChatStream({
  conversationId,
  initialContext,
}: UseAiChatStreamOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [currentAgent, setCurrentAgent] = useState<AgentName>('supervisor');
  const [statusMessage, setStatusMessage] = useState('Pronto');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeInterrupt, setActiveInterrupt] = useState<InterruptActionRequest | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const resetChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setStreamingContent('');
    setActiveInterrupt(null);
    setError(null);
    setStatusMessage('Pronto');
    setIsStreaming(false);
  }, []);

  // Reseta automaticamente as mensagens quando a conversationId mudar
  useEffect(() => {
    resetChat();
  }, [conversationId, resetChat]);
  const handleStreamEvent = useCallback(
    (
      event: StreamEvent,
      accumulatedRef: { text: string; agent: AgentName; interrupt: InterruptActionRequest | null }
    ) => {
      switch (event.type) {
        case 'token':
          accumulatedRef.text += event.content;
          setStreamingContent(accumulatedRef.text);
          break;

        case 'agent':
          accumulatedRef.agent = event.name;
          setCurrentAgent(event.name);
          break;

        case 'status':
          setStatusMessage(event.message);
          break;

        case 'interrupt':
        case 'action_request':
        case 'articles_found':
        case 'roadmap_generated': {
          const req = extractActionRequest(event);
          if (req) {
            accumulatedRef.interrupt = req;
            setActiveInterrupt(req);
          }
          break;
        }

        case 'error':
          setError(event.message);
          setStatusMessage('Erro na comunicação');
          break;

        case 'done':
          break;
      }
    },
    []
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
        status: 'complete',
      };

      setMessages((prev) => [...prev, userMessage]);
      setStreamingContent('');
      setError(null);
      setIsStreaming(true);
      setStatusMessage('Consultando especialistas do SCIA...');

      const accumulated = {
        text: '',
        agent: 'supervisor' as AgentName,
        interrupt: null as InterruptActionRequest | null,
      };

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        await aiChatService.streamChatMessage(
          {
            conversationId,
            message: text.trim(),
            context: initialContext,
          },
          (event) => handleStreamEvent(event, accumulated),
          abortController.signal
        );

        if (accumulated.text || accumulated.interrupt) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: accumulated.text,
            agent: accumulated.agent,
            timestamp: Date.now(),
            status: 'complete',
            interrupt: accumulated.interrupt,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          setStatusMessage('Geração interrompida pelo usuário.');
        } else {
          const msg = err instanceof Error ? err.message : 'Falha na comunicação com o assistente';
          setError(msg);
          setStatusMessage('Erro');
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        abortControllerRef.current = null;
      }
    },
    [conversationId, handleStreamEvent, initialContext, isStreaming]
  );

  const submitDecision = useCallback(
    async (decision: Record<string, unknown>) => {
      if (isStreaming) return;

      setActiveInterrupt(null);
      setStreamingContent('');
      setError(null);
      setIsStreaming(true);
      setStatusMessage('Retomando o fluxo com sua escolha...');

      const accumulated = {
        text: '',
        agent: currentAgent,
        interrupt: null as InterruptActionRequest | null,
      };

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        await aiChatService.resumeChatMessage(
          {
            conversationId,
            decision,
          },
          (event) => handleStreamEvent(event, accumulated),
          abortController.signal
        );

        if (accumulated.text || accumulated.interrupt) {
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: accumulated.text,
            agent: accumulated.agent,
            timestamp: Date.now(),
            status: 'complete',
            interrupt: accumulated.interrupt,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          setStatusMessage('Geração interrompida pelo usuário.');
        } else {
          const msg = err instanceof Error ? err.message : 'Erro ao processar decisão';
          setError(msg);
          setStatusMessage('Erro');
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        abortControllerRef.current = null;
      }
    },
    [conversationId, currentAgent, handleStreamEvent, isStreaming]
  );

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, []);

  return {
    messages,
    streamingContent,
    currentAgent,
    statusMessage,
    isStreaming,
    error,
    activeInterrupt,
    sendMessage,
    submitDecision,
    abortStream,
    resetChat,
  };
}
