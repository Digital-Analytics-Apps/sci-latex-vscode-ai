import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessageBubble } from '../ChatMessageBubble';
import type { ChatMessage } from '../../../features/ai-chat/types/chat.types';

describe('ChatMessageBubble', () => {
  it('renders user message properly', () => {
    const message: ChatMessage = {
      id: 'msg-1',
      role: 'user',
      content: 'Olá assistente, quero criar um artigo',
      timestamp: 1730500000000,
    };

    render(<ChatMessageBubble message={message} />);
    expect(screen.getByText('Olá assistente, quero criar um artigo')).toBeDefined();
  });

  it('renders assistant message with agent badge', () => {
    const message: ChatMessage = {
      id: 'msg-2',
      role: 'assistant',
      content: 'Localizei 5 artigos relevantes no arXiv.',
      agent: 'search_specialist',
      timestamp: 1730500000000,
    };

    render(<ChatMessageBubble message={message} />);
    expect(screen.getByText('Localizei 5 artigos relevantes no arXiv.')).toBeDefined();
    expect(screen.getByText('Especialista de Busca')).toBeDefined();
  });
});
