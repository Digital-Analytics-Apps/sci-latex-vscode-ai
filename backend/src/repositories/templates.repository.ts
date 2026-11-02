import { LatexTemplate } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface CreateTemplateData {
  id?: string;
  name: string;
  description?: string;
  targetConference?: string;
  storageKey: string;
  mainEntryPath?: string;
  isSystem?: boolean;
  uploadedById?: string;
}

export interface ITemplatesRepository {
  create(data: CreateTemplateData): Promise<LatexTemplate>;
  findAll(userId?: string): Promise<LatexTemplate[]>;
  findById(id: string): Promise<LatexTemplate | null>;
  findByName(name: string): Promise<LatexTemplate | null>;
  delete(id: string): Promise<void>;
}

export class PrismaTemplatesRepository implements ITemplatesRepository {
  async create(data: CreateTemplateData): Promise<LatexTemplate> {
    return prisma.latexTemplate.create({
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        targetConference: data.targetConference,
        storageKey: data.storageKey,
        mainEntryPath: data.mainEntryPath ?? 'main.tex',
        isSystem: data.isSystem ?? false,
        uploadedById: data.uploadedById,
      },
    });
  }

  async findAll(userId?: string): Promise<LatexTemplate[]> {
    return prisma.latexTemplate.findMany({
      where: userId
        ? {
            OR: [{ isSystem: true }, { uploadedById: userId }],
          }
        : { isSystem: true },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async findById(id: string): Promise<LatexTemplate | null> {
    return prisma.latexTemplate.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findByName(name: string): Promise<LatexTemplate | null> {
    return prisma.latexTemplate.findFirst({
      where: { name },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.latexTemplate.delete({
      where: { id },
    });
  }
}
