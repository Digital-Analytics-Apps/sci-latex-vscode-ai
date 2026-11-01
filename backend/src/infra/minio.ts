import * as Minio from 'minio';
import { env } from '../config/env';

const rawEndpoint = env.MINIO_ENDPOINT || 'http://127.0.0.1:9000';
const endpointUrl = new URL(rawEndpoint);

const MINIO_HOST = endpointUrl.hostname;
const MINIO_PORT = parseInt(endpointUrl.port, 10) || (endpointUrl.protocol === 'https:' ? 443 : 80);
const MINIO_USE_SSL = endpointUrl.protocol === 'https:';

const MINIO_ACCESS_KEY = env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = env.MINIO_SECRET_KEY || 'minioadmin123';
export const MINIO_BUCKET = env.MINIO_BUCKET || 'collab-assets';

export const minioClient = new Minio.Client({
  endPoint: MINIO_HOST,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

/**
 * Inicializa a conexão com o MinIO e garante que o bucket de assets existe com leitura liberada
 */
export async function initMinio(): Promise<void> {
  try {
    const bucketExists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!bucketExists) {
      await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
      console.log(`🪣 Bucket MinIO "${MINIO_BUCKET}" criado com sucesso.`);

      // Política de download público read-only para renderização imediata de figuras TeX
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicRead',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`],
          },
        ],
      };

      await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(policy));
      console.log(`🔓 Política de leitura pública aplicada ao bucket "${MINIO_BUCKET}".`);
    } else {
      console.log(`🪣 Bucket MinIO "${MINIO_BUCKET}" já existente.`);
    }
  } catch (err: unknown) {
    console.warn(`⚠️ Aviso na inicialização do MinIO:`, err);
  }
}

/**
 * Faz upload de um arquivo/imagem diretamente para o bucket MinIO via SDK oficial
 */
export async function uploadToMinio(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  await minioClient.putObject(MINIO_BUCKET, key, buffer, buffer.length, {
    'Content-Type': contentType,
  });
}

/**
 * Baixa um arquivo do bucket MinIO como Buffer via SDK oficial
 */
export async function getFromMinio(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const dataStream = await minioClient.getObject(MINIO_BUCKET, key);
  const chunks: Buffer[] = [];
  let resolve!: (val: { buffer: Buffer; contentType: string }) => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<{ buffer: Buffer; contentType: string }>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  dataStream.on('data', (chunk: Buffer) => chunks.push(chunk));
  dataStream.on('end', () => {
    resolve({
      buffer: Buffer.concat(chunks),
      contentType: 'application/octet-stream',
    });
  });
  dataStream.on('error', (err: Error) => reject(err));

  return promise;
}

/**
 * Remove um arquivo do bucket MinIO via SDK oficial
 */
export async function deleteFromMinio(key: string): Promise<void> {
  await minioClient.removeObject(MINIO_BUCKET, key);
}

/**
 * Verifica se um objeto/arquivo já existe no bucket MinIO
 */
export async function objectExistsInMinio(key: string): Promise<boolean> {
  try {
    await minioClient.statObject(MINIO_BUCKET, key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retorna a URL interna direta para o compilador baixar o asset do bucket MinIO
 */
export function getInternalMinioUrl(key: string): string {
  return `${rawEndpoint}/${MINIO_BUCKET}/${key}`;
}
/**
 * Reescreve a URL pré-assinada se MINIO_PUBLIC_URL estiver configurada.
 * Essencial para cenários Docker/K8s onde o backend fala via rede interna
 * (ex: minio:9000), mas o navegador do cliente precisa acessar via host público (ex: localhost:9000).
 */
function formatPublicUrl(presignedUrl: string): string {
  if (!env.MINIO_PUBLIC_URL) return presignedUrl;
  try {
    const generated = new URL(presignedUrl);
    const target = new URL(env.MINIO_PUBLIC_URL);
    generated.protocol = target.protocol;
    generated.hostname = target.hostname;
    generated.port = target.port;
    return generated.toString();
  } catch {
    return presignedUrl;
  }
}

/**
 * Gera uma URL pré-assinada para upload direto via HTTP PUT do navegador para o MinIO.
 * O cliente pode enviar o arquivo diretamente para o storage sem onerar a memória do backend.
 * @param key Caminho do objeto no bucket (ex: projects/:projId/tasks/:taskId/evidences/:file)
 * @param expirySeconds Tempo de expiração da assinatura em segundos (padrão: 900s = 15 minutos)
 */
export async function generatePresignedPutUrl(
  key: string,
  expirySeconds: number = 900
): Promise<string> {
  const rawUrl = await minioClient.presignedPutObject(MINIO_BUCKET, key, expirySeconds);
  return formatPublicUrl(rawUrl);
}

/**
 * Gera uma URL pré-assinada para leitura/download temporário seguro via HTTP GET.
 * Permite que arquivos privados de pesquisas sejam renderizados ou baixados pelo navegador com tempo de vida limitado.
 * @param key Caminho do objeto no bucket
 * @param expirySeconds Tempo de validade do link (padrão: 3600s = 1 hora)
 */
export async function generatePresignedGetUrl(
  key: string,
  expirySeconds: number = 3600
): Promise<string> {
  const rawUrl = await minioClient.presignedGetObject(MINIO_BUCKET, key, expirySeconds);
  return formatPublicUrl(rawUrl);
}
