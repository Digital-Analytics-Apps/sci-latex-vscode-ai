import path from 'node:path';
import type { RawFileDiffFact } from '../../../infra/git/git.service';

export interface ClassifiedFileDiff extends RawFileDiffFact {
  category: 'section' | 'bibliography' | 'figure' | 'other';
  label: string;
}

export class ClassificationService {
  // Classifica um arquivo bruto do Git para uma categoria acadêmica e nome amigável
  classifyFile(fact: RawFileDiffFact): ClassifiedFileDiff {
    const normalized = fact.path.replaceAll('\\', '/');
    const fileName = path.basename(normalized).toLowerCase();
    const ext = path.extname(fileName);

    let category: ClassifiedFileDiff['category'] = 'other';
    let label = fileName;

    if (ext === '.bib') {
      category = 'bibliography';
      label = 'Referências Bibliográficas';
    } else if (
      ['.png', '.jpg', '.jpeg', '.pdf', '.svg', '.eps'].includes(ext) &&
      (normalized.includes('fig') || normalized.includes('img') || normalized.includes('image'))
    ) {
      category = 'figure';
      label = `Figura (${fileName})`;
    } else if (['.png', '.jpg', '.jpeg', '.pdf', '.svg', '.eps'].includes(ext)) {
      category = 'figure';
      label = `Arquivo de Imagem (${fileName})`;
    } else if (normalized.includes('sections/') || ext === '.tex') {
      category = 'section';
      if (fileName.includes('intro') || fileName.includes('01')) {
        label = 'Introdução & Trabalhos Relacionados';
      } else if (fileName.includes('method') || fileName.includes('02')) {
        label = 'Metodologia & Formulação';
      } else if (fileName.includes('result') || fileName.includes('03')) {
        label = 'Resultados & Experimentos';
      } else if (fileName.includes('conclus') || fileName.includes('04')) {
        label = 'Conclusão';
      } else if (fileName === 'main.tex') {
        label = 'Estrutura Principal (main.tex)';
      } else {
        label = `Seção (${fileName})`;
      }
    }

    return {
      ...fact,
      category,
      label,
    };
  }

  // Classifica a lista de alterações e verifica se há modificações além do arquivo principal
  classifyDiffFacts(
    facts: RawFileDiffFact[],
    taskTitle?: string
  ): { classifiedFiles: ClassifiedFileDiff[]; hasChangesInOtherFiles: boolean } {
    const classifiedFiles = facts.map((fact) => this.classifyFile(fact));

    // Determina se há múltiplos arquivos alterados ou modificações adicionais além de um único arquivo de seção
    const sectionFiles = classifiedFiles.filter((f) => f.category === 'section');
    const hasChangesInOtherFiles =
      classifiedFiles.length > 1 ||
      (sectionFiles.length > 0 && classifiedFiles.some((f) => f.category !== 'section'));

    return {
      classifiedFiles,
      hasChangesInOtherFiles,
    };
  }
}

export const classificationService = new ClassificationService();
