import fs from 'node:fs/promises';
import path from 'node:path';
import { LatexTemplate } from '@prisma/client';
import {
  deleteFromMinio,
  generatePresignedGetUrl,
  getFromMinio,
  StoragePathBuilder,
  uploadToMinio,
} from '../../infra/minio';
import {
  ITemplatesRepository,
  PrismaTemplatesRepository,
} from '../../repositories/templates.repository';
import { parseLatexZip } from '../../utils/latex-zip-parser';

export interface CreateTemplateDTO {
  name: string;
  description?: string;
  publisher: string;
  templateType: string;
  originalFileName: string;
  zipBuffer: Buffer;
}

export class TemplatesService {
  constructor(
    private readonly templatesRepository: ITemplatesRepository = new PrismaTemplatesRepository()
  ) {}

  /**
   * Constrói o slug canônico [EDITORA]-[TIPO] conforme a governança do ADR-017.
   * Elimina caracteres especiais, acentos e espaços para compatibilidade total com S3 e TeXLive.
   * Exemplo: "ieee-artigo", "sbc-resumo", "acm-artigo"
   */
  public generateSlug(publisher: string, templateType: string): string {
    const sanitize = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const cleanPublisher = sanitize(publisher) || 'template';
    const cleanType = sanitize(templateType) || 'artigo';

    return `${cleanPublisher}-${cleanType}`.replace(/-+/g, '-');
  }

  async listTemplates(): Promise<LatexTemplate[]> {
    return this.templatesRepository.findAll();
  }

  async getTemplateById(id: string): Promise<LatexTemplate | null> {
    return this.templatesRepository.findById(id);
  }

  /**
   * Upload e cadastro de template exclusivo para ADMIN.
   * Aplica política de sobrescrita mandatória: se o slug já existir, substitui o zip no MinIO e atualiza o banco.
   */
  async uploadTemplate(userId: string, data: CreateTemplateDTO): Promise<LatexTemplate> {
    const parsed = parseLatexZip(data.zipBuffer);

    // Slug semântico canônico [EDITORA]-[TIPO] (ADR-017)
    const slug = this.generateSlug(data.publisher, data.templateType);

    // Sanitiza o nome original do arquivo zip enviado (sem chumbar bundle.zip)
    const originalFileName = data.originalFileName || `${slug}.zip`;
    const cleanFileName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = StoragePathBuilder.templateBundle(slug, cleanFileName);

    // Salva o binário ZIP diretamente no MinIO sob o caminho dinâmico (sobrescrevendo se existir)
    await uploadToMinio(storageKey, data.zipBuffer, 'application/zip');

    const publisherUpper = data.publisher.trim().toUpperCase();
    const templateTypeLower = data.templateType.trim().toLowerCase();
    const templateName = data.name.trim();

    if (!templateName) {
      throw new Error('O nome de exibição do template é obrigatório.');
    }

    const mainEntryPath = parsed.rootDoc.path;

    return this.templatesRepository.upsert({
      id: slug,
      name: templateName,
      description: data.description,
      publisher: publisherUpper,
      templateType: templateTypeLower,
      targetConference: publisherUpper,
      storageKey,
      originalFileName: cleanFileName,
      mainEntryPath,
      isSystem: true,
      uploadedById: userId,
    });
  }

  /**
   * Remove template do MinIO e do banco de dados (exclusivo ADMIN).
   * Projetos existentes têm seu templateId desvinculado via onDelete: SetNull,
   * preservando todos os seus arquivos TeX extraídos de forma autônoma.
   */
  async deleteTemplate(id: string): Promise<void> {
    const template = await this.getTemplateById(id);
    if (!template) {
      throw new Error(`Template "${id}" não encontrado.`);
    }

    try {
      await deleteFromMinio(template.storageKey);
    } catch (err) {
      console.warn(`[TemplatesService] Aviso ao remover do MinIO: ${(err as Error).message}`);
    }

    await this.templatesRepository.delete(id);
  }

  /**
   * Gera URL pré-assinada para download temporário do arquivo .zip original pelo Admin.
   */
  async getTemplateDownloadUrl(id: string): Promise<{ downloadUrl: string; fileName: string }> {
    const template = await this.getTemplateById(id);
    if (!template) {
      throw new Error(`Template "${id}" não encontrado.`);
    }

    const downloadUrl = await generatePresignedGetUrl(template.storageKey, 3600);
    return {
      downloadUrl,
      fileName: template.originalFileName || `${template.id}.zip`,
    };
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
   * Sincroniza a semente mínima (baseline) de templates oficiais reais a partir da pasta 'latex-templates/'
   * e garante a persistência no MinIO e PostgreSQL.
   */
  async seedBaselineTemplates(customTemplatesDir?: string): Promise<LatexTemplate[]> {
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

    for (const zipFileName of zipFiles) {
      const fullPath = path.join(targetDir, zipFileName);
      const zipBuffer = await fs.readFile(fullPath);
      const parsed = parseLatexZip(zipBuffer);

      // Infere editora e tipo a partir do nome do arquivo baseline
      const lower = zipFileName.toLowerCase();
      let publisher = 'OFICIAL';
      if (lower.includes('ieee')) publisher = 'IEEE';
      else if (lower.includes('sbc')) publisher = 'SBC';
      else if (lower.includes('acm')) publisher = 'ACM';
      else if (lower.includes('springer')) publisher = 'SPRINGER';
      else if (lower.includes('napopen')) publisher = 'NAPOPEN';

      let templateType = 'artigo';
      if (lower.includes('resumo')) templateType = 'resumo';
      else if (lower.includes('periodico') || lower.includes('journal')) templateType = 'periodico';
      else if (lower.includes('poster')) templateType = 'poster';

      const slug = this.generateSlug(publisher, templateType);
      const cleanFileName = zipFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = StoragePathBuilder.templateBundle(slug, cleanFileName);

      // Faz upload do binário oficial integral para o MinIO
      await uploadToMinio(storageKey, zipBuffer, 'application/zip');

      const cleanTypeLabel =
        templateType.charAt(0).toUpperCase() + templateType.slice(1).toLowerCase();
      const templateName = `${publisher} - ${cleanTypeLabel}`;

      const template = await this.templatesRepository.upsert({
        id: slug,
        name: templateName,
        description: `Template oficial homologado para submissões acadêmicas (${slug}).`,
        publisher,
        templateType,
        targetConference: publisher,
        storageKey,
        originalFileName: cleanFileName,
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
