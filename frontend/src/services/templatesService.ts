import { api } from './api';
import type { LatexTemplateItem, UploadTemplateInput } from '../types/template.types';

const TEMPLATES_URL = '/templates';

export const templatesService = {
  // Buscar lista de todos os templates institucionais disponíveis
  async getTemplatesList(): Promise<LatexTemplateItem[]> {
    const response = await api.get<{ templates: LatexTemplateItem[] }>(TEMPLATES_URL);
    return response.data.templates || [];
  },

  // Obter detalhes de um template específico
  async getTemplateDetails(id: string): Promise<LatexTemplateItem> {
    const response = await api.get<{ template: LatexTemplateItem }>(`${TEMPLATES_URL}/${id}`);
    return response.data.template;
  },

  // Fazer upload / sobrescrita de template LaTeX no catálogo (exclusivo ADMIN)
  async uploadTemplate(input: UploadTemplateInput): Promise<LatexTemplateItem> {
    const formData = new FormData();
    formData.append('publisher', input.publisher);
    formData.append('templateType', input.templateType);
    if (input.name) {
      formData.append('name', input.name);
    }
    if (input.description) {
      formData.append('description', input.description);
    }
    formData.append('file', input.file);

    const response = await api.post<{ template: LatexTemplateItem }>(
      `${TEMPLATES_URL}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.template;
  },

  // Obter URL assinada para download do pacote .zip original (exclusivo ADMIN)
  async getTemplateDownloadUrl(id: string): Promise<{ downloadUrl: string; fileName: string }> {
    const response = await api.get<{ downloadUrl: string; fileName: string }>(
      `${TEMPLATES_URL}/${id}/download`
    );
    return response.data;
  },

  // Excluir template do catálogo (exclusivo ADMIN)
  async deleteTemplate(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`${TEMPLATES_URL}/${id}`);
    return response.data;
  },
};
