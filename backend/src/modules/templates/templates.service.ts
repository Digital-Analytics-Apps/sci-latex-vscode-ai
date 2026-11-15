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
  year?: string;
  templateType?: string;
  zipBuffer: Buffer;
}

export class TemplatesService {
  constructor(
    private readonly templatesRepository: ITemplatesRepository = new PrismaTemplatesRepository()
  ) {}

  /**
   * Constrói o slug canônico [ANO]-[CONGRESSO]-[FORMATO] conforme a governança do ADR-017.
   * Elimina caracteres especiais, acentos e espaços para compatibilidade total com S3 e TeXLive.
   */
  private generateSemanticSlug(data: {
    name?: string;
    targetConference?: string;
    year?: string;
    templateType?: string;
  }): string {
    const yearMatch = (data.year || data.name || data.targetConference || '').match(
      /\b(20\d{2})\b/
    );
    const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());

    let conf = data.targetConference?.trim() || '';
    if (!conf && data.name) {
      conf = data.name.replace(/\b20\d{2}\b/g, '').trim();
    }
    if (!conf) conf = 'conference';

    let format = data.templateType?.trim() || '';
    if (!format && data.name) {
      const lower = data.name.toLowerCase();
      if (lower.includes('resumo')) format = 'resumo';
      else if (lower.includes('conference')) format = 'conference';
      else if (lower.includes('transactions')) format = 'transactions';
      else if (lower.includes('periodico') || lower.includes('journal')) format = 'journal';
      else format = 'artigo';
    }
    if (!format) format = 'artigo';

    const sanitize = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const cleanConf = sanitize(conf);
    const cleanFormat = sanitize(format);

    let slug = `${year}-${cleanConf}-${cleanFormat}`.replace(/-+/g, '-');
    return slug;
  }

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

    // Gera slug semântico padronizado [ANO]-[CONGRESSO]-[FORMATO] (ADR-017)
    const baseSlug = this.generateSemanticSlug(data);
    let templateId = baseSlug;
    let counter = 1;
    while (await this.templatesRepository.findById(templateId)) {
      counter++;
      templateId = `${baseSlug}-v${counter}`;
    }

    const storageKey = StoragePathBuilder.templateBundle(templateId, 'bundle.zip');

    // Salva o bundle ZIP diretamente e intacto no MinIO no catálogo global
    await uploadToMinio(storageKey, data.zipBuffer, 'application/zip');

    const templateName =
      data.name?.trim() || parsed.detectedTitle || `${data.targetConference || 'Oficial'} Template`;
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
   * e garante a persistência no MinIO e PostgreSQL.
   */
  async seedBaselineTemplates(customTemplatesDir?: string): Promise<LatexTemplate[]> {
    // 1. Localiza a pasta oficial de templates baseline
    const possibleDirs = [
      customTemplatesDir,
      path.resolve(process.cwd(), './src/modules/templates/seed-templates/'),
      path.resolve(process.cwd(), 'src/modules/templates/seed-templates/'),
      path.resolve(process.cwd(), '../latex-templates'),
      path.resolve(process.cwd(), 'latex-templates'),
      path.resolve(__dirname, 'seed-templates'),
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

    // 2. Processa e sobe cada template oficial real
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
