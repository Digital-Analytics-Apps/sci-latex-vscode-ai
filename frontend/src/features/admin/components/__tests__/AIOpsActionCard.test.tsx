import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AiopsRcaSuggestedAction } from '../../types/aiops.types';
import { AIOpsActionCard } from '../AIOpsActionCard';

describe('AIOpsActionCard', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockAction: AiopsRcaSuggestedAction = {
    actionId: 'act-1',
    actionType: 'K8S_DEPLOYMENT_RESTART',
    title: 'Reiniciar Pods do Compilador',
    description: 'Executar rollout restart para liberar memória do cgroup.',
    commandPreview: 'kubectl rollout restart deployment/compiler-worker -n production',
    riskLevel: 'LOW',
    requiresConfirmation: true,
    payloadParameters: { deployment: 'compiler-worker' },
  };

  it('deve renderizar os detalhes da ação remediadora com pré-visualização do comando', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AIOpsActionCard action={mockAction} />
      </QueryClientProvider>
    );

    expect(screen.getByText('Reiniciar Pods do Compilador')).toBeDefined();
    expect(
      screen.getByText('Executar rollout restart para liberar memória do cgroup.')
    ).toBeDefined();
    expect(
      screen.getByText('kubectl rollout restart deployment/compiler-worker -n production')
    ).toBeDefined();
    expect(screen.getByText('Aprovar e Executar Ação')).toBeDefined();
    expect(screen.getByText('Risco Baixo')).toBeDefined();
  });
});
