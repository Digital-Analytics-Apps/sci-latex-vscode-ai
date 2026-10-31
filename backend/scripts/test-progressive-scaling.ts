import { execSync } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import { runKind500UsersBenchmark } from './benchmark-kind-500-users';

function getClusterStatus() {
  try {
    const pods = execSync('kubectl get pods -l app=sci-latex-backend --no-headers', {
      encoding: 'utf-8',
    }).trim();
    const hpa = execSync('kubectl get hpa sci-latex-backend-hpa --no-headers', {
      encoding: 'utf-8',
    }).trim();

    const podLines = pods ? pods.split('\n') : [];
    const runningCount = podLines.filter((l) => l.includes('Running')).length;
    const totalCount = podLines.length;
    return { totalCount, runningCount, hpaLine: hpa, rawPods: pods };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { totalCount: 0, runningCount: 0, hpaLine: 'N/A', rawPods: message };
  }
}

function printStatus(phaseTitle: string) {
  const status = getClusterStatus();
  console.log(`\n📊 [Status do Cluster - ${phaseTitle}]`);
  console.log(`   Pods Ativos: ${status.runningCount}/${status.totalCount}`);
  console.log(`   HPA Resumo : ${status.hpaLine}\n`);
}

async function main() {
  const targetPort = process.env.TARGET_PORT ? parseInt(process.env.TARGET_PORT, 10) : 30080;
  const requestedPhase = process.env.PHASE; // '1', '2', '3' ou undefined (roda todas)

  console.log('='.repeat(80));
  console.log('🧪 TESTE PROGRESSIVO DE ESCALONAMENTO DO KUBERNETES (HPA)');
  console.log('   Alvo: ws://localhost:' + targetPort);
  console.log('   Objetivo: Demonstrar 2 pods (mínimo) -> 3-4 pods (+1) -> 6 pods (máximo)');
  console.log('='.repeat(80));

  printStatus('Início do Teste');

  // =========================================================================
  // FASE 1: Limite Base de 2 Pods (Carga Leve)
  // =========================================================================
  if (!requestedPhase || requestedPhase === '1') {
    console.log('\n🔵 FASE 1: Testando Carga Leve (Limite de 2 Pods)');
    console.log('   Configuração: 15 artigos médios, 2 autores por artigo (30 conexões)');
    console.log('   Expectativa : CPU e Memória permanecem baixas; o cluster mantém 2 réplicas.');

    await runKind500UsersBenchmark({
      numProjects: 15,
      authorsPerProject: 2,
      opsPerAuthor: 5,
      delayMs: 50,
      numCompilations: 3,
      targetPort,
    });

    await sleep(2000);
    printStatus('Pós-Fase 1 (Carga Leve)');
  }

  // =========================================================================
  // FASE 2: Subindo +1 a 2 Pods (Carga Moderada)
  // =========================================================================
  if (!requestedPhase || requestedPhase === '2') {
    console.log('\n🟡 FASE 2: Injetando Carga Moderada (Disparo do Scale-Up para 3-4 Pods)');
    console.log('   Configuração: 80 artigos médios, 2 autores por artigo (160 conexões concorrentes + 15 compilações)');
    console.log('   Expectativa : CPU ultrapassa a meta de 70%; HPA adiciona novos pods.');

    await runKind500UsersBenchmark({
      numProjects: 80,
      authorsPerProject: 2,
      opsPerAuthor: 10,
      delayMs: 20,
      numCompilations: 15,
      targetPort,
    });

    console.log('⏳ Aguardando reação do HPA e criação dos novos pods (10s)...');
    await sleep(10000);
    printStatus('Pós-Fase 2 (Scale-Up Ativado)');
  }

  // =========================================================================
  // FASE 3: Testando o Limite Máximo de 6 Pods (Carga Intensa Contínua)
  // =========================================================================
  if (!requestedPhase || requestedPhase === '3') {
    console.log('\n🔴 FASE 3: Testando o Teto Máximo de Réplicas (6 Pods)');
    console.log('   Configuração: 250 artigos médios, 2 autores por artigo (500 autores distribuídos em 250 documentos + 40 compilações)');
    console.log('   Expectativa : Saturação forçada até atingir maxReplicas: 6.');

    await runKind500UsersBenchmark({
      numProjects: 250,
      authorsPerProject: 2,
      opsPerAuthor: 20,
      delayMs: 5,
      numCompilations: 40,
      targetPort,
    });

    console.log('⏳ Aguardando propagação das métricas no HPA e escalonamento para o teto (15s)...');
    await sleep(15000);
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
