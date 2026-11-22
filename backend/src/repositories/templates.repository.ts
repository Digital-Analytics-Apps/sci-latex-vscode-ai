import { LatexTemplate } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateTemplateData {
  id?: string;
  name: string;
  description?: string;
  publisher: string;
  templateType: string;
  targetConference?: string;
  storageKey: string;
  originalFileName: string;
  mainEntryPath?: string;
  isSystem?: boolean;
  uploadedById?: string;
}

export interface ITemplatesRepository {
  create(data: CreateTemplateData): Promise<LatexTemplate>;
  upsert(data: CreateTemplateData & { id: string }): Promise<LatexTemplate>;
  findAll(): Promise<LatexTemplate[]>;
  findById(id: string): Promise<LatexTemplate | null>;
  findByName(name: string): Promise<LatexTemplate | null>;
  countProjects(id: string): Promise<number>;
  delete(id: string): Promise<void>;
}

export class PrismaTemplatesRepository implements ITemplatesRepository {
  async upsert(data: CreateTemplateData & { id: string }): Promise<LatexTemplate> {
    return prisma.latexTemplate.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        name: data.name,
        description: data.description,
        publisher: data.publisher,
        templateType: data.templateType,
        targetConference: data.targetConference,
        storageKey: data.storageKey,
        originalFileName: data.originalFileName,
        mainEntryPath: data.mainEntryPath ?? 'main.tex',
        isSystem: data.isSystem ?? true,
        uploadedById: data.uploadedById,
      },
      update: {
        name: data.name,
        description: data.description,
        publisher: data.publisher,
        templateType: data.templateType,
        targetConference: data.targetConference,
        storageKey: data.storageKey,
        originalFileName: data.originalFileName,
        mainEntryPath: data.mainEntryPath ?? 'main.tex',
        isSystem: data.isSystem ?? true,
      },
    });
  }

  async create(data: CreateTemplateData): Promise<LatexTemplate> {
    return prisma.latexTemplate.create({
      data: {
        id: data.id ?? crypto.randomUUID(),
        name: data.name,
        description: data.description,
        publisher: data.publisher,
        templateType: data.templateType,
        targetConference: data.targetConference,
        storageKey: data.storageKey,
        originalFileName: data.originalFileName,
        mainEntryPath: data.mainEntryPath ?? 'main.tex',
        isSystem: data.isSystem ?? true,
        uploadedById: data.uploadedById,
      },
    });
  }

  async findAll(): Promise<LatexTemplate[]> {
    return prisma.latexTemplate.findMany({
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { projects: true },
        },
      },
      orderBy: [{ publisher: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string): Promise<LatexTemplate | null> {
    return prisma.latexTemplate.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { projects: true },
        },
      },
    });
  }

  async findByName(name: string): Promise<LatexTemplate | null> {
    return prisma.latexTemplate.findFirst({
      where: { name },
    });
  }

  async countProjects(id: string): Promise<number> {
    return prisma.project.count({
      where: { templateId: id },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.latexTemplate.delete({
      where: { id },
    });
  }
}
