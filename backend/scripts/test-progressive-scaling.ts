import { execSync } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import { runKind500UsersBenchmark } from './benchmark-kind-500-users';

function getClusterStatus() {
  try {
    const backendPods = execSync('kubectl get pods -l app=sci-latex-backend --no-headers', {
      encoding: 'utf-8',
    }).trim();
    const compilerPods = execSync('kubectl get pods -l app=sci-latex-compiler --no-headers', {
      encoding: 'utf-8',
    }).trim();
    const backendHpa = execSync('kubectl get hpa sci-latex-backend-hpa --no-headers', {
      encoding: 'utf-8',
    }).trim();
    const compilerHpa = execSync('kubectl get hpa sci-latex-compiler-hpa --no-headers', {
      encoding: 'utf-8',
    }).trim();

    const bLines = backendPods ? backendPods.split('\n') : [];
    const cLines = compilerPods ? compilerPods.split('\n') : [];
    return {
      backendRunning: bLines.filter((l) => l.includes('Running')).length,
      backendTotal: bLines.length,
      compilerRunning: cLines.filter((l) => l.includes('Running')).length,
      compilerTotal: cLines.length,
      backendHpa,
      compilerHpa,
    };
  } catch (err: unknown) {
    return {
      backendRunning: 0,
      backendTotal: 0,
      compilerRunning: 0,
      compilerTotal: 0,
      backendHpa: 'N/A',
      compilerHpa: 'N/A',
    };
  }
}

function printStatus(phaseTitle: string) {
  const status = getClusterStatus();
  console.log(`\n📊 [Status do Cluster no ArgoCD - ${phaseTitle}]`);
  console.log(`   🔹 Backend  (HPA min:2, max:6): ${status.backendRunning}/${status.backendTotal} Pods ativos | HPA: ${status.backendHpa}`);
  console.log(`   🔸 Compiler (HPA min:1, max:4): ${status.compilerRunning}/${status.compilerTotal} Pods ativos | HPA: ${status.compilerHpa}\n`);
}

async function main() {
  const targetPort = process.env.TARGET_PORT ? parseInt(process.env.TARGET_PORT, 10) : 30080;
  const requestedPhase = process.env.PHASE; // '1', '2', '3' ou undefined (roda todas)

  console.log('='.repeat(80));
  console.log('🧪 TESTE PROGRESSIVO DE ESCALONAMENTO HPA COM TEMPLATE NAPOpen (MinIO)');
  console.log('   Alvo: ws://localhost:' + targetPort);
  console.log('   Visualização em tempo real no ArgoCD: https://localhost:8443');
  console.log('   Capacidades:');
  console.log('     * Backend : Mínimo 2 Pods -> Máximo 6 Pods (Alvo CPU: 70%, Mem: 80%)');
  console.log('     * Compiler: Mínimo 1 Pod  -> Máximo 4 Pods (Alvo CPU: 80%)');
  console.log('='.repeat(80));

  printStatus('Início do Teste');

  // =========================================================================
  // FASE 1: Limite Base de 2 Pods (Carga Leve)
  // =========================================================================
  if (!requestedPhase || requestedPhase === '1') {
    console.log('\n🔵 FASE 1: Testando Carga Leve (Capacidade Mínima: 2 Backend / 1 Compiler)');
    console.log('   Configuração: 4 artigos NAPOpen, 5 autores por artigo (20 conexões WS) + 2 compilações');
    console.log('   Expectativa : Consumo baixo; cluster permanece na capacidade mínima.');

    await runKind500UsersBenchmark({
      numProjects: 4,
      authorsPerProject: 5,
      opsPerAuthor: 5,
      delayMs: 50,
      numCompilations: 2,
      targetPort,
    });

    await sleep(2000);
    printStatus('Pós-Fase 1 (Capacidade Mínima)');
  }

  // =========================================================================
  // FASE 2: Subindo +1 a 2 Pods (Carga Moderada)
  // =========================================================================
  if (!requestedPhase || requestedPhase === '2') {
    console.log('\n🟡 FASE 2: Injetando Carga Moderada (Disparo do Scale-Up no ArgoCD)');
    console.log('   Configuração: 15 artigos NAPOpen, 5 autores por artigo (75 conexões WS + 8 compilações pesadas concorrentes)');
    console.log('   Expectativa : CPU ultrapassa targets; HPA escala Backend para 3-4 pods e Compiler para 2-3 pods.');

    await runKind500UsersBenchmark({
      numProjects: 15,
      authorsPerProject: 5,
      opsPerAuthor: 10,
      delayMs: 20,
      numCompilations: 8,
      targetPort,
    });

    console.log('⏳ Aguardando reação do HPA e subida dos novos pods no ArgoCD (15s)...');
    await sleep(15000);
    printStatus('Pós-Fase 2 (Scale-Up Intermediário)');
  }

  // =========================================================================
  // FASE 3: Testando o Limite Máximo de 6 Pods (Carga Intensa Contínua)
  // =========================================================================
  if (!requestedPhase || requestedPhase === '3') {
    console.log('\n🔴 FASE 3: Testando a Capacidade Máxima do Cluster (Teto: 6 Backend / 4 Compiler)');
    console.log('   Configuração: 30 artigos NAPOpen, 5 autores por artigo (150 conexões WS + 20 compilações concorrentes)');
    console.log('   Expectativa : Saturação de CPU induzindo HPA aos limites máximos (4 pods no Compiler e 6 pods no Backend).');

    await runKind500UsersBenchmark({
      numProjects: 30,
      authorsPerProject: 5,
      opsPerAuthor: 15,
      delayMs: 10,
      numCompilations: 20,
      targetPort,
    });

    console.log('⏳ Aguardando propagação das métricas no HPA e escalonamento para o teto no ArgoCD (20s)...');
    await sleep(20000);
    printStatus('Pós-Fase 3 (Teto Máximo)');
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 TESTE PROGRESSIVO FINALIZADO!');
  console.log('💡 Dica: Acompanhe o scale-down gradual de volta para 2 réplicas com:');
  console.log('   watch -n 3 "kubectl get pods -l app=sci-latex-backend && kubectl get hpa"');
  console.log('='.repeat(80) + '\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Erro durante o teste:', err);
      process.exit(1);
    });
}
