import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { LatexTemplate } from '@prisma/client';
import {
  deleteFromMinio,
  getFromMinio,
  StoragePathBuilder,
  uploadToMinio,
} from '../../infra/minio';
import {
  ITemplatesRepository,
  PrismaTemplatesRepository,
} from '../../repositories/templates.repository';
import { parseLatexZip } from '../../utils/latex-zip-parser';

export interface CreateCustomTemplateDTO {
  name?: string;
  description?: string;
  targetConference?: string;
  zipBuffer: Buffer;
}

export class TemplatesService {
  constructor(
    private readonly templatesRepository: ITemplatesRepository = new PrismaTemplatesRepository()
  ) {}

  async listTemplates(userId?: string): Promise<LatexTemplate[]> {
    return this.templatesRepository.findAll(userId);
  }

  async getTemplateById(id: string): Promise<LatexTemplate | null> {
    return this.templatesRepository.findById(id);
  }

  async uploadCustomTemplate(
    userId: string,
    data: CreateCustomTemplateDTO
  ): Promise<LatexTemplate> {
    const parsed = parseLatexZip(data.zipBuffer);
    const templateId = crypto.randomUUID();
    const storageKey = StoragePathBuilder.templateBundle(templateId, 'bundle.zip');

    // Salva o bundle ZIP diretamente e intacto no MinIO
    await uploadToMinio(storageKey, data.zipBuffer, 'application/zip');

    const templateName =
      data.name?.trim() || parsed.detectedTitle || 'Template Oficial de Conferência';
    const mainEntryPath = parsed.rootDoc.path;

    return this.templatesRepository.create({
      id: templateId,
      name: templateName,
      description: data.description,
      targetConference: data.targetConference,
      storageKey,
      mainEntryPath,
      isSystem: false,
      uploadedById: userId,
    });
  }

  async getTemplateBundle(
    templateId: string
  ): Promise<{ buffer: Buffer; template: LatexTemplate }> {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`[TemplatesService] Template "${templateId}" não encontrado.`);
    }

    const { buffer } = await getFromMinio(template.storageKey);
    return { buffer, template };
  }

  /**
   * Sincroniza a semente mínima (baseline) de templates oficiais reais a partir da pasta 'latex-templates/'.
   * Expura templates legados com dados mockados/fictícios e garante a persistência no MinIO e PostgreSQL.
   */
  async seedBaselineTemplates(customTemplatesDir?: string): Promise<LatexTemplate[]> {
    const legacyFakeIds = [
      'tpl-system-ieeetran',
      'tpl-system-sbc',
      'tpl-system-acm',
      'tpl-system-springer',
    ];

    // 1. Limpeza de templates fictícios antigos do banco e storage
    for (const legacyId of legacyFakeIds) {
      try {
        await this.templatesRepository.delete(legacyId);
        const legacyKey = StoragePathBuilder.templateBundle(legacyId, 'bundle.zip');
        await deleteFromMinio(legacyKey);
      } catch {
        // Ignora se o registro antigo já não existia
      }
    }

    // 2. Localiza a pasta oficial de templates
    const possibleDirs = [
      customTemplatesDir,
      path.resolve(process.cwd(), '../latex-templates'),
      path.resolve(process.cwd(), 'latex-templates'),
      path.resolve(__dirname, '../../../../latex-templates'),
    ].filter(Boolean) as string[];

    let targetDir = '';
    for (const dir of possibleDirs) {
      try {
        const stat = await fs.stat(dir);
        if (stat.isDirectory()) {
          targetDir = dir;
          break;
        }
      } catch {
        // Continua procurando
      }
    }

    if (!targetDir) {
      throw new Error(
        `[TemplatesService] Diretório de templates oficiais não encontrado. Locais verificados: ${possibleDirs.join(', ')}`
      );
    }

    const dirEntries = await fs.readdir(targetDir);
    const zipFiles = dirEntries.filter((file) => file.toLowerCase().endsWith('.zip'));

    if (zipFiles.length === 0) {
      throw new Error(
        `[TemplatesService] Nenhum pacote .zip de template oficial encontrado em "${targetDir}". A aplicação requer ao menos um template baseline para inicialização.`
      );
    }

    const seededTemplates: LatexTemplate[] = [];

    // 3. Processa e sobe cada template oficial real
    for (const zipFileName of zipFiles) {
      const fullPath = path.join(targetDir, zipFileName);
      const zipBuffer = await fs.readFile(fullPath);
      const parsed = parseLatexZip(zipBuffer);

      // Slug semântico canônico [ANO]-[CONGRESSO]-[TIPO] a partir do nome do arquivo
      const slug = zipFileName
        .replace(/\.zip$/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-');
      const storageKey = StoragePathBuilder.templateBundle(slug, 'bundle.zip');

      // Faz upload do binário oficial integral para o MinIO
      await uploadToMinio(storageKey, zipBuffer, 'application/zip');

      const template = await this.templatesRepository.upsert({
        id: slug,
        name: parsed.detectedTitle || `Template Oficial ${slug.toUpperCase()}`,
        description: `Template oficial homologado para submissões acadêmicas (${slug}).`,
        targetConference: slug.includes('ieee')
          ? 'IEEE'
          : slug.includes('sbc')
            ? 'SBC'
            : slug.includes('acm')
              ? 'ACM'
              : 'OFICIAL',
        storageKey,
        mainEntryPath: parsed.rootDoc.path,
        isSystem: true,
      });

      seededTemplates.push(template);
      console.log(
        `   - Template oficial "${template.id}" sincronizado no MinIO e banco (mainEntry: ${template.mainEntryPath})`
      );
    }

    return seededTemplates;
  }
}
