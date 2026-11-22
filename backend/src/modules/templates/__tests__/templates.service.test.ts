import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdmZip from 'adm-zip';
import { TemplatesService } from '../templates.service';
import { ITemplatesRepository } from '../../../repositories/templates.repository';

// Mock do MinIO infra
vi.mock('../../../infra/minio', () => ({
  uploadToMinio: vi.fn().mockResolvedValue(undefined),
  getFromMinio: vi.fn().mockResolvedValue({
    buffer: Buffer.from('mock-zip-content'),
    contentType: 'application/zip',
  }),
  deleteFromMinio: vi.fn().mockResolvedValue(undefined),
  objectExistsInMinio: vi.fn().mockResolvedValue(false),
  generatePresignedGetUrl: vi.fn().mockResolvedValue('https://minio.test/presigned-url'),
  StoragePathBuilder: {
    templateBundle: vi.fn((id: string, name: string) => `templates/${id}/${name}`),
  },
}));

describe('TemplatesService', () => {
  let mockRepo: ITemplatesRepository;
  let service: TemplatesService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepo = {
      create: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          ...data,
          id: data.id || 'tpl-uuid',
          mainEntryPath: data.mainEntryPath || 'bare_conf.tex',
          isSystem: data.isSystem ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      upsert: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          ...data,
          id: data.id,
          mainEntryPath: data.mainEntryPath || 'bare_conf.tex',
          isSystem: data.isSystem ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      findAll: vi.fn().mockResolvedValue([
        {
          id: 'ieee-artigo',
          name: 'IEEE - Artigo',
          description: 'Template oficial IEEE',
          publisher: 'IEEE',
          templateType: 'artigo',
          targetConference: 'IEEE',
          storageKey: 'templates/ieee-artigo/conference-template.zip',
          originalFileName: 'conference-template.zip',
          mainEntryPath: 'IEEE-conference-template-062824.tex',
          isSystem: true,
          uploadedById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === 'ieee-artigo') {
          return Promise.resolve({
            id: 'ieee-artigo',
            name: 'IEEE - Artigo',
            description: 'Template oficial IEEE',
            publisher: 'IEEE',
            templateType: 'artigo',
            targetConference: 'IEEE',
            storageKey: 'templates/ieee-artigo/conference-template.zip',
            originalFileName: 'conference-template.zip',
            mainEntryPath: 'IEEE-conference-template-062824.tex',
            isSystem: true,
            uploadedById: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        return Promise.resolve(null);
      }),
      findByName: vi.fn().mockResolvedValue(null),
      countProjects: vi.fn().mockResolvedValue(0),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    service = new TemplatesService(mockRepo);
  });

  it('deve listar todos os templates institucionais', async () => {
    const list = await service.listTemplates();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('ieee-artigo');
    expect(mockRepo.findAll).toHaveBeenCalled();
  });

  it('deve buscar template por ID', async () => {
    const tpl = await service.getTemplateById('ieee-artigo');
    expect(tpl).toBeDefined();
    expect(tpl?.name).toContain('IEEE - Artigo');
    expect(tpl?.mainEntryPath).toBe('IEEE-conference-template-062824.tex');
  });

  it('deve gerar slug no padrão estrito [editora]-[tipo]', () => {
    expect(service.generateSlug('IEEE', 'artigo')).toBe('ieee-artigo');
    expect(service.generateSlug('SBC', 'Resumo Expandido')).toBe('sbc-resumo-expandido');
    expect(service.generateSlug('ACM SIGCOMM', 'Artigo')).toBe('acm-sigcomm-artigo');
  });

  it('deve fazer upload de template oficial com sobrescrita e nome dinâmico', async () => {
    const zip = new AdmZip();
    zip.addFile(
      'bare_conf.tex',
      Buffer.from(
        '\\documentclass{IEEEtran}\\title{Custom Article}\\begin{document}\\maketitle\\end{document}'
      )
    );
    zip.addFile('IEEEtran.cls', Buffer.from('% Class file'));
    const zipBuffer = zip.toBuffer();

    const created = await service.uploadTemplate('admin-123', {
      name: 'IEEE Transactions',
      description: 'Template oficial IEEE para artigos',
      publisher: 'IEEE',
      templateType: 'artigo',
      originalFileName: 'conference-template-letter.zip',
      zipBuffer,
    });

    expect(created.id).toBe('ieee-artigo');
    expect(created.publisher).toBe('IEEE');
    expect(created.templateType).toBe('artigo');
    expect(created.originalFileName).toBe('conference-template-letter.zip');
    expect(created.storageKey).toBe('templates/ieee-artigo/conference-template-letter.zip');
    expect(created.mainEntryPath).toBe('bare_conf.tex');
    expect(mockRepo.upsert).toHaveBeenCalled();
  });

  it('deve rejeitar upload quando o nome de exibição do template não for fornecido', async () => {
    const zip = new AdmZip();
    zip.addFile(
      'bare_conf.tex',
      Buffer.from(
        '\\documentclass{IEEEtran}\\title{Custom Article}\\begin{document}\\maketitle\\end{document}'
      )
    );
    const zipBuffer = zip.toBuffer();

    await expect(
      service.uploadTemplate('admin-123', {
        name: '',
        publisher: 'IEEE',
        templateType: 'artigo',
        originalFileName: 'test.zip',
        zipBuffer,
      })
    ).rejects.toThrow('O nome de exibição do template é obrigatório.');
  });

  it('deve excluir template do MinIO e do banco com sucesso', async () => {
    await expect(service.deleteTemplate('ieee-artigo')).resolves.not.toThrow();
    expect(mockRepo.delete).toHaveBeenCalledWith('ieee-artigo');
  });

  it('deve gerar URL assinada para download do template', async () => {
    const result = await service.getTemplateDownloadUrl('ieee-artigo');
    expect(result.downloadUrl).toBe('https://minio.test/presigned-url');
    expect(result.fileName).toBe('conference-template.zip');
  });

  it('deve recuperar o bundle ZIP do MinIO com sucesso', async () => {
    const result = await service.getTemplateBundle('ieee-artigo');
    expect(result.buffer).toBeDefined();
    expect(result.template.id).toBe('ieee-artigo');
  });
});
