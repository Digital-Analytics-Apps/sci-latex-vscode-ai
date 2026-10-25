import { runLatencyBenchmark } from './test-1-collab-latency';
import { runChaosCrashTest } from './test-2-chaos-crash';
import { runFencingTokenTest } from './test-3-fencing-splitbrain';

async function main() {
  console.log('\n' + '#'.repeat(70));
  console.log('🏛️  SUÍTE COMPLETA DE TESTES & BENCHMARKS DE ARQUITETURA (ADR 007 & ADR 007.1)');
  console.log('#'.repeat(70) + '\n');

  try {
    // Teste 1: Latência
    await runLatencyBenchmark({ numClients: 5, opsPerClient: 15, delayBetweenOpsMs: 40 });

    // Teste 3: Fencing & Split-Brain (roda antes do caos para garantir integridade do banco)
    await runFencingTokenTest();

    // Teste 2: Caos & Queda de Container
    await runChaosCrashTest();

    console.log('\n' + '#'.repeat(70));
    console.log('🎉 TODOS OS 3 TESTES DE ARQUITETURA FORAM CONCLUÍDOS COM SUCESSO!');
    console.log('#'.repeat(70) + '\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Falha na execução da suíte de benchmarks:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
