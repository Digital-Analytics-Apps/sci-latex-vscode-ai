export interface LatexTemplateItem {
  id: string; // Slug canônico: ex. "ieee-artigo", "sbc-artigo"
  name: string;
  description?: string | null;
  publisher: string;
  templateType: string;
  targetConference?: string | null;
  storageKey: string;
  originalFileName: string;
  mainEntryPath: string;
  isSystem: boolean;
  uploadedById?: string | null;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  _count?: {
    projects: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UploadTemplateInput {
  file: File;
  publisher: string;
  templateType: string;
  name: string;
  description?: string;
}
