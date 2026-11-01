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

const publicEndpoint = env.MINIO_PUBLIC_URL || 'http://localhost:9000';
const publicUrl = new URL(publicEndpoint);
const PUBLIC_MINIO_HOST = publicUrl.hostname;
const PUBLIC_MINIO_PORT =
  parseInt(publicUrl.port, 10) || (publicUrl.protocol === 'https:' ? 443 : 80);
const PUBLIC_MINIO_USE_SSL = publicUrl.protocol === 'https:';

/**
 * Cliente MinIO dedicado à assinatura de URLs pré-assinadas.
 * O host configurado aqui é injetado diretamente no cabeçalho 'X-Amz-SignedHeaders=host'
 * da assinatura HMAC-SHA256, garantindo que o navegador não receba erro 403 SignatureDoesNotMatch.
 */
export const minioPresignClient = new Minio.Client({
  endPoint: PUBLIC_MINIO_HOST,
  port: PUBLIC_MINIO_PORT,
  useSSL: PUBLIC_MINIO_USE_SSL,
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
 * Gera uma URL pré-assinada para upload direto via HTTP PUT do navegador para o MinIO.
 * Assinada utilizando o endpoint público acessível pelo cliente (MINIO_PUBLIC_URL).
 * @param key Caminho do objeto no bucket (ex: projects/:projId/tasks/:taskId/evidences/:file)
 * @param expirySeconds Tempo de expiração da assinatura em segundos (padrão: 900s = 15 minutos)
 */
export async function generatePresignedPutUrl(
  key: string,
  expirySeconds: number = 900
): Promise<string> {
  return minioPresignClient.presignedPutObject(MINIO_BUCKET, key, expirySeconds);
}

/**
 * Gera uma URL pré-assinada para leitura/download temporário seguro via HTTP GET.
 * Assinada utilizando o endpoint público acessível pelo cliente (MINIO_PUBLIC_URL).
 * @param key Caminho do objeto no bucket
 * @param expirySeconds Tempo de validade do link (padrão: 3600s = 1 hora)
 */
export async function generatePresignedGetUrl(
  key: string,
  expirySeconds: number = 3600
): Promise<string> {
  return minioPresignClient.presignedGetObject(MINIO_BUCKET, key, expirySeconds);
}
