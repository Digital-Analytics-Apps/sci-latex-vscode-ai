import { minioClient } from '../src/infra/minio';
import { parseLatexZip } from '../src/utils/latex-zip-parser';
import * as fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

async function testCompilerWithNapOpen() {
  console.log('='.repeat(70));
  console.log('TESTE DO COMPILADOR TEX LIVE COM TEMPLATE NAPOpen DO MinIO');
  console.log('='.repeat(70));

  const templateStorageKey = 'templates/7747a833-7842-43fa-b026-9a8b16dadfdf/bundle.zip';
  console.log(`\n1. Baixando bundle do MinIO: bucket="collab-assets", key="${templateStorageKey}"...`);
  
  const startTime = performance.now();
  const stream = await minioClient.getObject('collab-assets', templateStorageKey);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const zipBuffer = Buffer.concat(chunks);
  const downloadDuration = (performance.now() - startTime).toFixed(1);
  console.log(`   -> Bundle baixado com sucesso: ${zipBuffer.length} bytes em ${downloadDuration}ms.`);

  console.log('\n2. Descompactando e estruturando os arquivos do template LaTeX...');
  const parsed = parseLatexZip(zipBuffer);
  console.log(`   -> Root document detectado: "${parsed.rootDoc?.path}"`);
  console.log(`   -> Título detectado: "${parsed.detectedTitle}"`);
  console.log(`   -> Total de arquivos no pacote: ${parsed.files.length + 1}`);

  const filesPayload: Array<{
    path: string;
    type: 'text' | 'binary_base64';
    content?: string;
  }> = [];

  // 1. Adiciona o main.tex
  if (parsed.rootDoc) {
    filesPayload.push({
      path: 'main.tex',
      type: 'text',
      content: parsed.rootDoc.content,
    });
  }

  // 2. Adiciona os arquivos auxiliares e assets (.cls, .bbx, .cbx, .bib, .png)
  for (const file of parsed.files) {
    if (file.path === 'main.tex') continue;

    if (!file.isBinary && file.content !== undefined) {
      filesPayload.push({
        path: file.path,
        type: 'text',
        content: file.content,
      });
      console.log(`      * [TEXT]   ${file.path} (${file.sizeBytes} bytes)`);
    } else if (file.buffer) {
      filesPayload.push({
        path: file.path,
        type: 'binary_base64',
        content: file.buffer.toString('base64'),
      });
      console.log(`      * [BINARY] ${file.path} (${file.sizeBytes} bytes - base64 encoded)`);
    }
  }

  console.log(`\n3. Enviando manifesto de compilação para o serviço TeX Live (http://localhost:4000/compile)...`);
  const compileStart = performance.now();

  const response = await fetch('http://localhost:4000/compile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentId: 'napopen-test-run',
      mainEntry: 'main.tex',
      files: filesPayload,
    }),
  });

  const compileDuration = ((performance.now() - compileStart) / 1000).toFixed(2);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`\n❌ ERRO NA COMPILAÇÃO (HTTP ${response.status}):`);
    console.error(errorBody);
    process.exit(1);
  }

  const pdfArrayBuffer = await response.arrayBuffer();
  const pdfBuffer = Buffer.from(pdfArrayBuffer);
  const outPath = '/tmp/napopen-compiled.pdf';
  await fs.writeFile(outPath, pdfBuffer);

  console.log(`\n4. Resultado da Compilação:`);
  console.log(`   -> Status HTTP: 200 OK`);
  console.log(`   -> Content-Type retornado: ${response.headers.get('content-type')}`);
  console.log(`   -> Tamanho do PDF gerado: ${pdfBuffer.length} bytes`);
  console.log(`   -> Tempo total de compilação (pdflatex + biber + pdflatex passes): ${compileDuration}s`);
  console.log(`   -> Arquivo PDF salvo em: ${outPath}`);
  console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO: Template NAPOpen compilou perfeitamente.');
}

testCompilerWithNapOpen().catch((err) => {
  console.error('Falha no script de teste:', err);
  process.exit(1);
});
