import AdmZip from 'adm-zip';
import crypto from 'node:crypto';
import { LatexTemplate } from '@prisma/client';
import {
  getFromMinio,
  objectExistsInMinio,
  StoragePathBuilder,
  uploadToMinio,
} from '../../infra/minio';
import {
  ITemplatesRepository,
  PrismaTemplatesRepository,
} from '../../repositories/templates.repository';
import { parseLatexZip } from '../../utils/latex-zip-parser';

export interface CreateCustomTemplateDTO {
  name: string;
  description?: string;
  targetConference?: string;
  zipBuffer: Buffer;
}

export interface SystemTemplateDefinition {
  id: string;
  name: string;
  description: string;
  targetConference: string;
  mainTex: string;
  referencesBib: string;
}

export const SYSTEM_TEMPLATES: SystemTemplateDefinition[] = [
  {
    id: 'tpl-system-ieeetran',
    name: 'IEEEtran (IEEE Conference & Transactions)',
    description:
      'Template oficial padrão para artigos IEEE e conferências internacionais de engenharia e computação.',
    targetConference: 'IEEE',
    mainTex: `\\documentclass[conference]{IEEEtran}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{Artigo Científico IEEE}
\\author{\\IEEEauthorblockN{Autores do Artigo}}

\\begin{document}
\\maketitle

\\begin{abstract}
Resumo do artigo científico no formato oficial IEEE.
\\end{abstract}

\\section{Introdução}
Escreva a introdução e motivação do trabalho aqui.

\\section{Metodologia}
Descreva o modelo, hipóteses e procedimentos experimentais.

\\section{Resultados}
Apresente os dados obtidos e análise comparativa.

\\section{Conclusão}
Síntese das contribuições e direcionamentos futuros.

\\bibliographystyle{IEEEtran}
\\bibliography{references}
\\end{document}`,
    referencesBib: `@article{ref_ieee_sample,
  author = {Silva, A. and Santos, B.},
  title = {Arquitetura de Sistemas TeX Distribuídos},
  journal = {IEEE Transactions on Cloud Computing},
  year = {2026}
}`,
  },
  {
    id: 'tpl-system-sbc',
    name: 'SBC (Sociedade Brasileira de Computação)',
    description:
      'Template oficial para submissões em simpósios e congressos da SBC (CSBC, SBSEG, SBRC, WebMedia).',
    targetConference: 'SBC',
    mainTex: `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{Artigo no Padrão da SBC}
\\author{Autores do Trabalho}

\\begin{document}
\\maketitle

\\begin{abstract}
Resumo do artigo em inglês (Abstract).
\\end{abstract}

\\begin{resumo}
Resumo do artigo em português no padrão da Sociedade Brasileira de Computação.
\\end{resumo}

\\section{Introdução}
Introdução e contexto da pesquisa.

\\section{Metodologia}
Metodologia, materiais e métodos utilizados.

\\section{Resultados e Discussão}
Resultados experimentais obtidos e comparativos.

\\section{Conclusão}
Considerações finais e trabalhos futuros.

\\bibliographystyle{plain}
\\bibliography{references}
\\end{document}`,
    referencesBib: `@inproceedings{sbc_sample_2026,
  author = {Oliveira, C. and Souza, D.},
  title = {Pesquisa e Inovação em Ciência da Computação},
  booktitle = {Anais do CSBC},
  year = {2026}
}`,
  },
  {
    id: 'tpl-system-acm',
    name: 'ACM sigconf (ACM Conference Format)',
    description: 'Template oficial para conferências da ACM (SIGCOMM, SIGMOD, CHI, CCS).',
    targetConference: 'ACM',
    mainTex: `\\documentclass[sigconf]{acmart}
\\usepackage[utf8]{inputenc}

\\title{ACM Conference Research Paper}
\\author{Author Names}

\\begin{document}

\\begin{abstract}
This is the abstract of the ACM research paper.
\\end{abstract}

\\maketitle

\\section{Introduction}
Introduction and motivation.

\\section{System Design}
Architecture and detailed methodology.

\\section{Evaluation}
Experimental evaluation and benchmarks.

\\section{Conclusion}
Summary of findings and future work.

\\bibliographystyle{ACM-Reference-Format}
\\bibliography{references}
\\end{document}`,
    referencesBib: `@inproceedings{acm_sample_2026,
  author = {Johnson, E. and Lee, F.},
  title = {Scalable Distributed Systems},
  booktitle = {Proceedings of the ACM Conference},
  year = {2026}
}`,
  },
  {
    id: 'tpl-system-springer',
    name: 'Springer LNCS (Lecture Notes in Computer Science)',
    description:
      'Template oficial para livros e anais publicados pela editora Springer (LNCS/LNAI/CCIS).',
    targetConference: 'Springer',
    mainTex: `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{Springer LNCS Scientific Contribution}
\\author{Contributing Authors}

\\begin{document}
\\maketitle

\\begin{abstract}
The abstract should summarize the contents of the paper in short terms.
\\end{abstract}

\\section{Introduction}
Background and research challenge.

\\section{Methodology}
Proposed algorithms and theoretical framework.

\\section{Experiments and Results}
Empirical results and validation.

\\section{Conclusion}
Concluding remarks.

\\bibliographystyle{plain}
\\bibliography{references}
\\end{document}`,
    referencesBib: `@article{springer_sample_2026,
  author = {Schmidt, H. and Muller, K.},
  title = {Advances in Computer Science},
  journal = {Lecture Notes in Computer Science},
  year = {2026}
}`,
  },
];

export class TemplatesService {
  constructor(
    private readonly templatesRepository: ITemplatesRepository = new PrismaTemplatesRepository()
  ) {}

  async listTemplates(userId?: string): Promise<LatexTemplate[]> {
    await this.ensureSystemTemplates();
    return this.templatesRepository.findAll(userId);
  }

  async getTemplateById(id: string): Promise<LatexTemplate | null> {
    await this.ensureSystemTemplates();
    return this.templatesRepository.findById(id);
  }

  async uploadCustomTemplate(
    userId: string,
    data: CreateCustomTemplateDTO
  ): Promise<LatexTemplate> {
    const parsed = parseLatexZip(data.zipBuffer);
    const templateId = crypto.randomUUID();
    const storageKey = StoragePathBuilder.templateBundle(templateId, 'bundle.zip');

    // Salva o bundle ZIP diretamente no MinIO
    await uploadToMinio(storageKey, data.zipBuffer, 'application/zip');

    const templateName = data.name?.trim() || parsed.detectedTitle || 'Template Customizado LaTeX';
    const mainEntryPath = parsed.rootDoc?.path || 'main.tex';

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
      throw new Error('TEMPLATE_NOT_FOUND');
    }

    const { buffer } = await getFromMinio(template.storageKey);
    return { buffer, template };
  }

  /**
   * Garante que os templates canônicos do sistema (IEEEtran, SBC, ACM, Springer)
   * estejam devidamente gravados no MinIO e cadastrados no banco relacional.
   */
  async ensureSystemTemplates(): Promise<void> {
    for (const sysTpl of SYSTEM_TEMPLATES) {
      const existing = await this.templatesRepository.findById(sysTpl.id);
      const storageKey = StoragePathBuilder.templateBundle(sysTpl.id, 'bundle.zip');

      let existsInMinio = false;
      try {
        existsInMinio = await objectExistsInMinio(storageKey);
      } catch {
        existsInMinio = false;
      }

      if (!existsInMinio) {
        const zip = new AdmZip();
        zip.addFile('main.tex', Buffer.from(sysTpl.mainTex, 'utf-8'));
        zip.addFile('references.bib', Buffer.from(sysTpl.referencesBib, 'utf-8'));
        const bundleBuffer = zip.toBuffer();

        try {
          await uploadToMinio(storageKey, bundleBuffer, 'application/zip');
        } catch (err) {
          console.warn(`[TemplatesService] Falha ao enviar bundle ${sysTpl.id} para o MinIO:`, err);
        }
      }

      if (!existing) {
        try {
          await this.templatesRepository.create({
            id: sysTpl.id,
            name: sysTpl.name,
            description: sysTpl.description,
            targetConference: sysTpl.targetConference,
            storageKey,
            mainEntryPath: 'main.tex',
            isSystem: true,
          });
        } catch (err) {
          // Em caso de concorrência ou registro já existente
          console.warn(
            `[TemplatesService] Registro do template ${sysTpl.id} já existente ou ignorado:`,
            err
          );
        }
      }
    }
  }
}
