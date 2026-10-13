import type { ClassifiedFileDiff } from './classification.service';

export class ProgressDescriptionService {
  // Gera uma descrição determinística padrão com base no resumo acadêmico das alterações
  generateDefaultDescription(files: ClassifiedFileDiff[], taskTitle?: string): string {
    if (files.length === 0) {
      return taskTitle ? `Atualização de rascunho: ${taskTitle}` : 'Atualização de rascunho';
    }

    const labels = files.map((f) => {
      if (f.additions > 0 || f.deletions > 0) {
        return `${f.label} (+${f.additions}/-${f.deletions})`;
      }
      return f.label;
    });

    if (labels.length === 1) {
      return `Atualização em ${labels[0]}`;
    }

    if (labels.length === 2) {
      return `Atualização em ${labels[0]} e ${labels[1]}`;
    }

    const firstTwo = labels.slice(0, 2).join(', ');
    const remainingCount = labels.length - 2;
    return `Atualização em ${firstTwo} e mais ${remainingCount} arquivo(s)`;
  }
}

export const progressDescriptionService = new ProgressDescriptionService();
