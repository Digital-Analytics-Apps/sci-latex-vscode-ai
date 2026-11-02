import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdmZip from 'adm-zip';
import { SYSTEM_TEMPLATES, TemplatesService } from '../templates.service';
import { ITemplatesRepository } from '../../../repositories/templates.repository';

// Mock do MinIO infra
vi.mock('../../../infra/minio', () => ({
  uploadToMinio: vi.fn().mockResolvedValue(undefined),
  getFromMinio: vi.fn().mockResolvedValue({
    buffer: Buffer.from('mock-zip-content'),
    contentType: 'application/zip',
  }),
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
          mainEntryPath: data.mainEntryPath || 'main.tex',
          isSystem: data.isSystem ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      findAll: vi.fn().mockResolvedValue([
        {
          id: 'tpl-1',
          name: 'IEEEtran',
          description: 'IEEE Template',
          targetConference: 'IEEE',
          storageKey: 'templates/tpl-1/bundle.zip',
          mainEntryPath: 'main.tex',
          isSystem: true,
          uploadedById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      findById: vi.fn().mockImplementation((id: string) => {
        const found = SYSTEM_TEMPLATES.find((t) => t.id === id);
        if (found) {
          return Promise.resolve({
            id: found.id,
            name: found.name,
            description: found.description,
            targetConference: found.targetConference,
            storageKey: `templates/${found.id}/bundle.zip`,
            mainEntryPath: 'main.tex',
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

  it('deve listar templates e garantir os templates canônicos do sistema', async () => {
    const list = await service.listTemplates('user-1');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('IEEEtran');
    expect(mockRepo.findAll).toHaveBeenCalledWith('user-1');
  });

  it('deve buscar template por ID', async () => {
    const tpl = await service.getTemplateById('tpl-system-ieeetran');
    expect(tpl).toBeDefined();
    expect(tpl?.name).toContain('IEEEtran');
  });

  it('deve fazer upload de template customizado a partir de um zip válido', async () => {
    const zip = new AdmZip();
    zip.addFile(
      'main.tex',
      Buffer.from(
        '\\documentclass{article}\\title{Custom Article}\\begin{document}\\maketitle\\end{document}'
      )
    );
    zip.addFile('custom.sty', Buffer.from('% Style'));
    const zipBuffer = zip.toBuffer();

    const created = await service.uploadCustomTemplate('user-123', {
      name: 'Meu Template de Lab',
      description: 'Template especial do laboratório',
      targetConference: 'SBSEG 2027',
      zipBuffer,
    });

    expect(created.name).toBe('Meu Template de Lab');
    expect(created.targetConference).toBe('SBSEG 2027');
    expect(created.isSystem).toBe(false);
    expect(created.uploadedById).toBe('user-123');
    expect(mockRepo.create).toHaveBeenCalled();
  });

  it('deve recuperar o bundle ZIP do MinIO com sucesso', async () => {
    const result = await service.getTemplateBundle('tpl-system-ieeetran');
    expect(result.buffer).toBeDefined();
    expect(result.template.id).toBe('tpl-system-ieeetran');
  });

  it('deve lançar erro se o template não existir ao buscar bundle', async () => {
    await expect(service.getTemplateBundle('non-existent')).rejects.toThrow('TEMPLATE_NOT_FOUND');
  });
});
