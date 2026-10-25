import { axiosClient } from '../../api/axiosClient';

export const sendMessage = async (
  conversationId: string,
  message: string,
  searchSource: string = 'semantic_scholar',
  extraContext: any = {},
) => {
  const token = localStorage.getItem('access_token');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const body = {
    conversation_id: conversationId,
    message: message,
    search_source: searchSource,
    project_context: extraContext,
  };

  const response = await fetch(`${apiUrl}/api/v1/onboarding/chat/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Erro ao enviar mensagem');
  }

  return response;
};

export const resumeMessage = async (
  conversationId: string,
  interruptId: string,
  decision: any,
  searchSource: string = 'semantic_scholar',
) => {
  const token = localStorage.getItem('access_token');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const body = {
    conversation_id: conversationId,
    interrupt_id: interruptId,
    decision: decision,
    search_source: searchSource,
  };

  const response = await fetch(`${apiUrl}/api/v1/onboarding/chat/reply_interrupt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Erro ao enviar aprovação');
  }

  return response;
};
export interface InterruptActionRequest {
  name: string;
  args: Record<string, any>;
  description?: string;
}

export interface InterruptReviewConfig {
  action_name: string;
  allowed_decisions: string[];
}

export interface InterruptPayload {
  action_requests?: InterruptActionRequest[];
  review_configs?: InterruptReviewConfig[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'article_selection' | 'roadmap_approval' | 'project_info' | 'selection_summary';
  data?: any; // Flexible for now, or define specific types
}

export interface Article {
  title: string;
  authors: string[];
  year: number;
  url: string;
  snippet: string;
  citation_count: number;
}

export interface RoadmapTask {
  title: string;
  due_in_days: number;
  description: string;
}

export interface ChatResponse {
  message: string;
  structured_data?: {
    suggested_articles?: Article[];
    roadmap?: RoadmapTask[];
    project_title?: string;
    project_structure?: { abstract: string };
  };
}

export const onboardingApi = {
  sendMessage: async (message: string, context?: any): Promise<ChatResponse> => {
    const response = await axiosClient.post<ChatResponse>('/onboarding/chat', {
      message,
      // Use local storage or context for real ID
      conversation_id: context?.conversation_id || 'temp-id',
      project_context: context,
    });
    return response.data;
  },

  createProjectFromOnboarding: async (data: {
    topic: string;
    roadmap: RoadmapTask[];
    selected_articles: Article[];
    project_title?: string;
    project_structure?: { abstract: string };
  }): Promise<any> => {
    const response = await axiosClient.post('/onboarding/create-project', data);
    return response.data;
  },

  getSessions: async (): Promise<any[]> => {
    const response = await axiosClient.get('/onboarding/chat/sessions');
    return response.data;
  },

  getSessionHistory: async (conversationId: string): Promise<any> => {
    const response = await axiosClient.get(`/onboarding/chat/sessions/${conversationId}/history`);
    return response.data;
  },

  deleteSession: async (conversationId: string): Promise<void> => {
    await axiosClient.delete(`/onboarding/chat/sessions/${conversationId}`);
  },
};
