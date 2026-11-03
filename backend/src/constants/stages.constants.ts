export interface OfficialStageDefinition {
  order: number;
  title: string;
  description: string;
  weight: number;
  isGatekeeper: boolean;
  gatekeeperType: 'NIT' | 'TARGET_CONFERENCE' | null;
}

/**
 * As 6 Etapas Institucionais Fixas e Imutáveis da Plataforma SCIA (ADR-008).
 * Única Fonte da Verdade (SSOT) para ordem, títulos oficiais, pesos e gatekeepers.
 */
export const OFFICIAL_SCIA_STAGES: readonly OfficialStageDefinition[] = [
  {
    order: 1,
    title: 'Planejamento e Pesquisa',
    description: 'Levantamento bibliográfico e estruturação TeX',
    weight: 0.10,
    isGatekeeper: false,
    gatekeeperType: null,
  },
  {
    order: 2,
    title: 'Desenvolvimento e Experimentos',
    description: 'Coleta de dados e benchmarks experimentais',
    weight: 0.25,
    isGatekeeper: false,
    gatekeeperType: null,
  },
  {
    order: 3,
    title: 'Escrita do Artigo',
    description: 'Redação das seções em tarefas paralelas',
    weight: 0.40,
    isGatekeeper: false,
    gatekeeperType: null,
  },
  {
    order: 4,
    title: 'Revisão Técnica e Científica',
    description: 'Revisão geral do manuscrito consolidado',
    weight: 0.15,
    isGatekeeper: false,
    gatekeeperType: null,
  },
  {
    order: 5,
    title: 'Parecer do NIT (Gatekeeper 1)',
    description: 'Validação de propriedade intelectual e patentes',
    weight: 0.05,
    isGatekeeper: true,
    gatekeeperType: 'NIT',
  },
  {
    order: 6,
    title: 'Submissão ao Congresso Alvo (Gatekeeper 2)',
    description: 'Submissão externa do artigo compilado',
    weight: 0.05,
    isGatekeeper: true,
    gatekeeperType: 'TARGET_CONFERENCE',
  },
] as const;
