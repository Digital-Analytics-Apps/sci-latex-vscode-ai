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
          isSystem: data.isSystem ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      upsert: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          ...data,
          id: data.id,
          mainEntryPath: data.mainEntryPath || 'bare_conf.tex',
          isSystem: data.isSystem ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      findAll: vi.fn().mockResolvedValue([
        {
          id: '2026-ieee-conference',
          name: 'IEEE Conference Template',
          description: 'Template oficial IEEE',
          targetConference: 'IEEE',
          storageKey: 'templates/2026-ieee-conference/bundle.zip',
          mainEntryPath: 'IEEE-conference-template-062824.tex',
          isSystem: true,
          uploadedById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      findById: vi.fn().mockImplementation((id: string) => {
        if (id === '2026-ieee-conference') {
          return Promise.resolve({
            id: '2026-ieee-conference',
            name: 'IEEE Conference Template',
            description: 'Template oficial IEEE',
            targetConference: 'IEEE',
            storageKey: 'templates/2026-ieee-conference/bundle.zip',
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
      delete: vi.fn().mockResolvedValue(undefined),
    };

    service = new TemplatesService(mockRepo);
  });

  it('deve listar templates oficiais e do usuário', async () => {
    const list = await service.listTemplates('user-1');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('IEEE Conference Template');
    expect(mockRepo.findAll).toHaveBeenCalledWith('user-1');
  });

  it('deve buscar template por ID', async () => {
    const tpl = await service.getTemplateById('2026-ieee-conference');
    expect(tpl).toBeDefined();
    expect(tpl?.name).toContain('IEEE Conference Template');
    expect(tpl?.mainEntryPath).toBe('IEEE-conference-template-062824.tex');
  });

  it('deve fazer upload de template oficial a partir de um zip válido preservando o mainEntryPath original', async () => {
    const zip = new AdmZip();
    zip.addFile(
      'bare_conf.tex',
      Buffer.from(
        '\\documentclass{IEEEtran}\\title{Custom Article}\\begin{document}\\maketitle\\end{document}'
      )
    );
    zip.addFile('IEEEtran.cls', Buffer.from('% Class file'));
    const zipBuffer = zip.toBuffer();

    const created = await service.uploadCustomTemplate('user-123', {
      name: '2027 IEEE Conference',
      description: 'Template oficial do evento',
      targetConference: 'IEEE',
      zipBuffer,
    });

    expect(created.id).toBe('2027-ieee-conference');
    expect(created.name).toBe('2027 IEEE Conference');
    expect(created.targetConference).toBe('IEEE');
    expect(created.isSystem).toBe(false);
    expect(created.mainEntryPath).toBe('bare_conf.tex');
    expect(created.uploadedById).toBe('user-123');
    expect(mockRepo.create).toHaveBeenCalled();
  });

  it('deve recuperar o bundle ZIP do MinIO com sucesso', async () => {
    const result = await service.getTemplateBundle('2026-ieee-conference');
    expect(result.buffer).toBeDefined();
    expect(result.template.id).toBe('2026-ieee-conference');
  });

  it('deve lançar erro se o template não existir ao buscar bundle', async () => {
    await expect(service.getTemplateBundle('non-existent')).rejects.toThrow('não encontrado');
  });
});
