import type { TaskStatus } from "../constants/status";
import type { UserSimple } from "./user.types";

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  assignedToId?: string;
  assignee?: UserSimple | string;
  stageId?: string;
  startDate?: string;
  startedAt?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  progress?: number;
}

export interface TaskItem {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  status: TaskStatus;
  startDate?: string;
  startedAt?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  assignee?: UserSimple;
  assignedToId?: string;
  stageId?: string;
  progress?: number;
  stage?: {
    id: string;
    title: string;
    order: number;
    isGatekeeper?: boolean;
    gatekeeperType?: string | null;
  };
  isBlockedByPrevious?: boolean;
}

export interface CreateTaskInput {
  title: string;
  assignedToId?: string;
  dueDate?: string;
  stageId?: string;
}

/**
 * Tipos de evidências aceitas para tarefas das Etapas 1 e 2
 */
export type EvidenceType = 'IMAGE' | 'PDF' | 'LINK';

/**
 * Ciclo de vida da evidência (PENDING durante upload direto ao MinIO, CONFIRMED após validação)
 */
export type EvidenceStatus = 'PENDING' | 'CONFIRMED';

/**
 * Estrutura de metadados da evidência retornada pelo backend
 */
export interface TaskEvidenceItem {
  id: string;
  taskId: string;
  projectId: string;
  uploadedById: string;
  type: EvidenceType;
  status: EvidenceStatus;
  title: string;
  url?: string | null;
  storageKey?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Payload para solicitar URL pré-assinada de upload de imagem ou PDF
 */
export interface PresignUploadInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  type: 'IMAGE' | 'PDF';
  title?: string;
}

/**
 * Resposta contendo a URL pré-assinada do MinIO gerada pelo backend
 */
export interface PresignUploadResponse {
  evidenceId: string;
  uploadUrl: string;
  storageKey: string;
}

/**
 * Payload para registrar um link externo como evidência da tarefa
 */
export interface AddLinkEvidenceInput {
  title: string;
  url: string;
}
