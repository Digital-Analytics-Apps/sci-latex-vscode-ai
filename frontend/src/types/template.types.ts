export interface LatexTemplateItem {
  id: string;
  name: string;
  description?: string | null;
  targetConference?: string | null;
  storageKey: string;
  mainEntryPath: string;
  isSystem: boolean;
  uploadedById?: string | null;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadTemplateInput {
  file: File;
  name?: string;
  description?: string;
  targetConference?: string;
}
