import * as Minio from 'minio';
import { env } from '../config/env';

const rawEndpoint = env.MINIO_ENDPOINT || 'http://127.0.0.1:9000';
const endpointUrl = new URL(rawEndpoint);

const MINIO_HOST = endpointUrl.hostname;
const MINIO_PORT =
  parseInt(endpointUrl.port, 10) || (endpointUrl.protocol === 'https:' ? 443 : 80);
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
export async function getFromMinio(
  key: string
): Promise<{ buffer: Buffer; contentType: string }> {
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
