export type ChatRole = 'user' | 'assistant' | 'system';

export type AgentName =
  | 'supervisor'
  | 'idea_refiner'
  | 'search_specialist'
  | 'curation_manager'
  | 'writer';

export interface ArticleItem {
  title: string;
  authors: string[];
  year?: number | null;
  venue?: string;
  snippet: string;
  url: string;
  pdf_url?: string | null;
  doi?: string | null;
  citation_count?: number;
  primary_category?: string;
}

export interface StageTimelineItem {
  order: number;
  title: string;
  description: string;
  planned_days: number;
  cumulative_day: number;
  is_gatekeeper: boolean;
  gatekeeper_type?: string | null;
}

export interface ArticleProposalData {
  title: string;
  abstract: string;
  topic?: string;
  conference?: string;
  template_id?: string;
  coordinator_id?: string | null;
  manager_id?: string | null;
  coordinator_name?: string | null;
  manager_name?: string | null;
  reviewer_id?: string | null;
  reviewer_name?: string | null;
  submission_deadline?: string;
  stages: StageTimelineItem[];
  tasks: unknown[];
  articles: ArticleItem[];
}

export interface PresentArticlesArgs {
  articles: ArticleItem[];
}

export interface InterruptActionRequest {
  name: string;
  args: Record<string, unknown>;
  description: string;
}

export interface InterruptPayload {
  action_requests?: InterruptActionRequest[];
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  agent?: AgentName;
  timestamp: number;
  status?: 'sending' | 'streaming' | 'complete' | 'error';
  interrupt?: InterruptActionRequest | null;
}

export type StreamEvent =
  | { type: 'token'; content: string; agent?: string }
  | { type: 'agent'; name: AgentName }
  | { type: 'interrupt'; data?: unknown; action_requests?: InterruptActionRequest[] }
  | { type: 'action_request'; data?: InterruptPayload }
  | { type: 'articles_found'; articles: ArticleItem[] }
  | { type: 'roadmap_generated'; title?: string; abstract?: string; stages?: StageTimelineItem[] }
  | { type: 'status'; message: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

export interface SendChatStreamPayload {
  conversationId: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface ResumeChatPayload {
  conversationId: string;
  decision: Record<string, unknown>;
}
