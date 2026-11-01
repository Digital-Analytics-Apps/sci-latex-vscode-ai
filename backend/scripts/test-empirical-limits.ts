import WebSocket from 'ws';
import { execSync } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import { ChangeSet } from '@codemirror/state';
import { prisma } from '../src/db/prisma';
import { generateRealisticPaper } from './benchmark-kind-500-users';

interface StepResult {
  stepName: string;
  numProjects: number;
  totalConnections: number;
  totalOps: number;
  cpuPercent: number;
  memoryPercent: number;
  currentReplicas: number;
  desiredReplicas: number;
  scaledUp: boolean;
  avgLatencyMs: number;
  p95LatencyMs: number;
  successRate: string;
}

function queryHpaMetrics(): { cpu: number; memory: number; currentReplicas: number; desiredReplicas: number } {
  try {
    const raw = execSync('kubectl get hpa sci-latex-backend-hpa -o json', { encoding: 'utf-8' });
    const parsed = JSON.parse(raw);

    const currentReplicas = parsed.status?.currentReplicas ?? 0;
    const desiredReplicas = parsed.status?.desiredReplicas ?? 0;

    let cpu = 0;
    let memory = 0;

    const currentMetrics = parsed.status?.current?.metrics || [];
    for (const m of currentMetrics) {
      if (m.type === 'Resource' && m.resource?.name === 'cpu') {
        cpu = m.resource.current?.averageUtilization ?? 0;
      }
      if (m.type === 'Resource' && m.resource?.name === 'memory') {
        memory = m.resource.current?.averageUtilization ?? 0;
      }
    }

    return { cpu, memory, currentReplicas, desiredReplicas };
  } catch {
    return { cpu: 0, memory: 0, currentReplicas: 0, desiredReplicas: 0 };
  }
}

async function runStepLoad(
  numProjects: number,
  authorsPerProject: number,
  opsPerAuthor: number,
  delayMs: number,
  targetPort: number
): Promise<{ avgLatency: number; p95Latency: number; successRate: string }> {
  const totalUsers = numProjects * authorsPerProject;
  const defaultUser = await prisma.user.upsert({
    where: { email: 'benchmark-admin@scia.internal' },
    create: {
      name: 'Benchmark Admin',
      email: 'benchmark-admin@scia.internal',
      passwordHash: 'dummy',
    },
    update: {},
  });

  const projectIds: string[] = [];
  for (let i = 1; i <= numProjects; i++) {
    const id = `bench-artigo-${String(i).padStart(3, '0')}`;
    projectIds.push(id);
    const content = generateRealisticPaper(i);

    await prisma.project.upsert({
      where: { id },
      create: {
        id,
        name: `Artigo Científico ${i} - Benchmark KinD`,
        coordinatorId: defaultUser.id,
        managerId: defaultUser.id,
        currentVersion: 1,
        ownerGeneration: 0,
        files: {
          create: {
            path: 'main.tex',
            fileType: 'text',
            mimeType: 'text/x-tex',
            sizeBytes: BigInt(Buffer.byteLength(content, 'utf-8')),
            content,
          },
        },
      },
      update: {},
    });
  }

  const sockets: WebSocket[] = [];
  const connectionPromises: Promise<void>[] = [];
  const clientVersions: Record<string, number> = {};
  const clientDocLengths: Record<string, number> = {};
  const clientQueues: Record<string, number[]> = {};
  const samples: number[] = [];

  const batchSize = 50;
  for (let pIdx = 0; pIdx < numProjects; pIdx++) {
    const projectId = projectIds[pIdx];
    for (let aIdx = 1; aIdx <= authorsPerProject; aIdx++) {
      const clientId = `${projectId}-a${aIdx}`;
      clientQueues[clientId] = [];

      const wsUrl = `ws://localhost:${targetPort}/ws/documents/${projectId}?userId=${clientId}&userName=Autor-${aIdx}`;
      const ws = new WebSocket(wsUrl);

      const { promise, resolve, reject } = Promise.withResolvers<void>();
      ws.on('open', () => resolve());
      ws.on('error', (err) => reject(err));
      ws.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'SYNC_INIT') {
            clientVersions[clientId] = msg.version || 0;
            clientDocLengths[clientId] = msg.document?.content?.length || 1000;
          } else if (msg.type === 'PULL_UPDATES_RESPONSE') {
            if (msg.author && msg.author.userId === clientId) {
              const sendTime = clientQueues[clientId].shift();
              if (sendTime !== undefined) {
                samples.push(performance.now() - sendTime);
              }
            }
            clientVersions[clientId] = msg.version;
            if (Array.isArray(msg.updates)) {
              for (const u of msg.updates) {
                const cs = ChangeSet.fromJSON(u.changes);
                clientDocLengths[clientId] = cs.newLength;
              }
            }
          }
        } catch {}
      });

      connectionPromises.push(promise);
      sockets.push(ws);

      if (sockets.length % batchSize === 0) {
        await sleep(15);
      }
    }
  }

  await Promise.all(connectionPromises);

  let successfulOps = 0;
  let totalOpsPlanned = totalUsers * opsPerAuthor;

  for (let op = 0; op < opsPerAuthor; op++) {
    const sendBatch = sockets.map(async (ws, idx) => {
      const pIdx = Math.floor(idx / authorsPerProject);
      const aIdx = (idx % authorsPerProject) + 1;
      const projectId = projectIds[pIdx];
      const clientId = `${projectId}-a${aIdx}`;

      const text = ` % [A${aIdx}:${op}]\n`;
      const len = clientDocLengths[clientId] || 1000;
      const insertPos = Math.max(0, len - 20);
      const change = ChangeSet.of([{ from: insertPos, insert: text }], len);

      clientQueues[clientId].push(performance.now());
      const ver = clientVersions[clientId] || 0;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'PUSH_UPDATES',
            file: 'main.tex',
            version: ver,
            updates: [{ clientID: clientId, changes: change.toJSON() }],
          })
        );
        successfulOps++;
      }
      await sleep(delayMs);
    });

    await Promise.all(sendBatch);
  }

  // Permite flush e fechamento
  await sleep(1000);
  for (const ws of sockets) {
    try {
      ws.close();
    } catch {}
  }

  const latencies = samples.sort((a, b) => a - b);
  const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
  const rate = totalOpsPlanned > 0 ? `${((successfulOps / totalOpsPlanned) * 100).toFixed(1)}%` : '100%';

  return { avgLatency: avg, p95Latency: p95, successRate: rate };
}

async function testThresholdTwoPods(targetPort: number) {
  console.log('\n' + '='.repeat(80));
  console.log('🔬 TESTE 1: DETERMINAÇÃO DO LIMITE MÁXIMO DE 2 PODS (ANTES DE ESCALAR)');
  console.log('='.repeat(80));
  console.log('Regra de Escalonamento do HPA: CPU >= 70% OU Memória >= 80%');
  console.log('Objetivo: Descobrir o número exato de artigos e conexões que 2 pods sustentam.\n');

  const steps = [
    { numProjects: 5, authors: 5 },   // 25 conexões
    { numProjects: 10, authors: 5 },  // 50 conexões
    { numProjects: 15, authors: 5 },  // 75 conexões
    { numProjects: 20, authors: 5 },  // 100 conexões
    { numProjects: 25, authors: 5 },  // 125 conexões
    { numProjects: 30, authors: 5 },  // 150 conexões
    { numProjects: 40, authors: 5 },  // 200 conexões
  ];

  const results: StepResult[] = [];
  let tippingPointFound = false;

  for (const step of steps) {
    const totalConns = step.numProjects * step.authors;
    console.log(`\n▶️  Degrau: ${step.numProjects} artigos × ${step.authors} autores = ${totalConns} conexões WebSocket`);

    const perf = await runStepLoad(step.numProjects, step.authors, 8, 20, targetPort);

    // Amostra o HPA após a carga do degrau
    await sleep(4000);
    const metrics = queryHpaMetrics();

    const scaled = metrics.desiredReplicas > 2 || metrics.currentReplicas > 2;

    results.push({
      stepName: `${totalConns} conexões (${step.numProjects} artigos)`,
      numProjects: step.numProjects,
      totalConnections: totalConns,
      totalOps: totalConns * 8,
      cpuPercent: metrics.cpu,
      memoryPercent: metrics.memory,
      currentReplicas: metrics.currentReplicas,
      desiredReplicas: metrics.desiredReplicas,
      scaledUp: scaled,
      avgLatencyMs: Math.round(perf.avgLatency),
      p95LatencyMs: Math.round(perf.p95Latency),
      successRate: perf.successRate,
    });

    console.log(`   📊 CPU: ${metrics.cpu}%/70% | RAM: ${metrics.memory}%/80% | Réplicas: ${metrics.currentReplicas} -> Desejadas: ${metrics.desiredReplicas}`);

    if (scaled) {
      console.log(`\n🚨 PONTO DE INFLEXÃO ATINGIDO NO DEGRAU: ${totalConns} conexões!`);
      console.log(`   O HPA detectou sobrecarga e solicitou ${metrics.desiredReplicas} réplicas.`);
      tippingPointFound = true;
      break;
    } else {
      console.log(`   ✅ 2 pods suportaram perfeitamente sem escalar.`);
    }

    await sleep(3000);
  }

  console.log('\n' + '-'.repeat(80));
  console.log('📋 RELATÓRIO DO LIMITE DE 2 PODS:');
  console.table(
    results.map((r) => ({
      'Cenário': r.stepName,
      'CPU (%)': `${r.cpuPercent}% / 70%`,
      'RAM (%)': `${r.memoryPercent}% / 80%`,
      'Réplicas': `${r.currentReplicas} -> ${r.desiredReplicas}`,
      'Escalou?': r.scaledUp ? '🚨 SIM' : '✅ NÃO',
      'Latência P95 (ms)': r.p95LatencyMs,
    }))
  );

  return results;
}

async function testInfrastructureMaxCapacity(targetPort: number) {
  console.log('\n' + '='.repeat(80));
  console.log('🔥 TESTE 2: LIMITE MÁXIMO ABSOLUTO DA INFRAESTRUTURA (CAPACIDADE MÁXIMA)');
  console.log('='.repeat(80));
  console.log('Teto configurado: 6 Pods Backend (3.0 Cores CPU / 3.0 GB RAM) + 4 Pods Compiler');
  console.log('Objetivo: Testar o limite real sustentável de conexões e throughput até a saturação.\n');

  const stressLevels = [
    { numProjects: 80, authors: 5, ops: 10, delay: 15 },   // 400 conexões
    { numProjects: 160, authors: 5, ops: 15, delay: 10 },  // 800 conexões
    { numProjects: 250, authors: 5, ops: 20, delay: 5 },   // 1.250 conexões
    { numProjects: 350, authors: 5, ops: 20, delay: 5 },   // 1.750 conexões
  ];

  interface MaxStressResult {
    'Conexões': number;
    'Artigos': number;
    'Operações': number;
    'Tempo (s)': string;
    'CPU Média': string;
    'RAM Média': string;
    'Pods Backend': number;
    'Status': string;
    'Latência P95': string;
  }

  const results: MaxStressResult[] = [];
  for (const level of stressLevels) {
    const totalConns = level.numProjects * level.authors;
    const totalOps = totalConns * level.ops;
    console.log(`\n🚀 Disparando Mega Carga: ${level.numProjects} artigos × ${level.authors} autores = ${totalConns} conexões (${totalOps} ops)`);

    const start = performance.now();
    let perf;
    let errorOccurred: string | null = null;

    try {
      perf = await runStepLoad(level.numProjects, level.authors, level.ops, level.delay, targetPort);
    } catch (err: unknown) {
      errorOccurred = err instanceof Error ? err.message : String(err);
    }

    const duration = ((performance.now() - start) / 1000).toFixed(1);
    await sleep(3000);
    const metrics = queryHpaMetrics();

    results.push({
      'Conexões': totalConns,
      'Artigos': level.numProjects,
      'Operações': totalOps,
      'Tempo (s)': `${duration}s`,
      'CPU Média': `${metrics.cpu}%`,
      'RAM Média': `${metrics.memory}%`,
      'Pods Backend': metrics.currentReplicas,
      'Status': errorOccurred ? `❌ Falha: ${errorOccurred.substring(0, 30)}` : '✅ Sucesso 100%',
      'Latência P95': perf ? `${Math.round(perf.p95Latency)}ms` : 'N/A',
    });

    console.table([results[results.length - 1]]);

    if (errorOccurred) {
      console.log(`\n⚠️  LIMITE DE SATURAÇÃO ENCONTRADO EM ${totalConns} CONEXÕES!`);
      break;
    }
  }

  console.log('\n' + '-'.repeat(80));
  console.log('🏆 RELATÓRIO DE CAPACIDADE MÁXIMA DA INFRAESTRUTURA:');
  console.table(results);
}

async function main() {
  const targetPort = process.env.TARGET_PORT ? parseInt(process.env.TARGET_PORT, 10) : 30080;
  const testMode = process.env.MODE || 'all'; // 'threshold' (2 pods), 'max' (capacidade máxima), ou 'all'

  if (testMode === 'threshold' || testMode === 'all') {
    await testThresholdTwoPods(targetPort);
  }

  if (testMode === 'max' || testMode === 'all') {
    await testInfrastructureMaxCapacity(targetPort);
  }

  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('❌ Erro no teste empírico:', err);
    process.exit(1);
  });
}
