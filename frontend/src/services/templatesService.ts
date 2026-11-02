import { api } from "./api";
import type {
  LatexTemplateItem,
  UploadTemplateInput,
} from "../types/template.types";

const TEMPLATES_URL = "/templates";

export const templatesService = {
  // Buscar lista de templates oficiais e customizados do usuário
  async getTemplatesList(): Promise<LatexTemplateItem[]> {
    const response = await api.get<{ templates: LatexTemplateItem[] }>(
      TEMPLATES_URL
    );
    return response.data.templates || [];
  },

  // Obter detalhes de um template específico
  async getTemplateDetails(id: string): Promise<LatexTemplateItem> {
    const response = await api.get<{ template: LatexTemplateItem }>(
      `${TEMPLATES_URL}/${id}`
    );
    return response.data.template;
  },

  // Enviar pacote .zip de template customizado para o MinIO
  async uploadTemplate(input: UploadTemplateInput): Promise<LatexTemplateItem> {
    const formData = new FormData();
    formData.append("file", input.file);
    if (input.name) {
      formData.append("name", input.name);
    }
    if (input.description) {
      formData.append("description", input.description);
    }
    if (input.targetConference) {
      formData.append("targetConference", input.targetConference);
    }

    const response = await api.post<{ template: LatexTemplateItem }>(
      `${TEMPLATES_URL}/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data.template;
  },
};
