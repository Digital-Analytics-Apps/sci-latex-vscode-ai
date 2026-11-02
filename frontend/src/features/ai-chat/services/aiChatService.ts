import { API_BASE } from '../../../constants/api.constants';
import { store } from '../../../store';
import type {
  ResumeChatPayload,
  SendChatStreamPayload,
  StreamEvent,
} from '../types/chat.types';

function getAuthHeaders(): Record<string, string> {
  const token = store.getState().auth.token || localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token && token !== 'undefined' && token !== 'null') {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function readSseStream(
  response: Response,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  if (!response.body) {
    throw new Error('Corpo de resposta SSE vazio.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        for (const line of trimmed.split('\n')) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const parsed = JSON.parse(jsonStr) as StreamEvent;
              onEvent(parsed);
            } catch (err) {
              console.warn('[aiChatService] Falha ao fazer parse de chunk SSE:', jsonStr, err);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export const aiChatService = {
  async streamChatMessage(
    payload: SendChatStreamPayload,
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const url = `${API_BASE}/ai/chat/stream`;
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Erro na API de IA (${response.status}): ${errText || response.statusText}`);
    }

    await readSseStream(response, onEvent);
  },

  async resumeChatMessage(
    payload: ResumeChatPayload,
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const url = `${API_BASE}/ai/chat/resume`;
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Erro ao retomar IA (${response.status}): ${errText || response.statusText}`);
    }

    await readSseStream(response, onEvent);
  },
};
