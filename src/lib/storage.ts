import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BASE = path.resolve(process.cwd(), 'data', 'exports');
const STORAGE = (process.env.EXPORT_STORAGE || 'local').toLowerCase();
const S3_BUCKET = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const s3 = STORAGE === 's3' ? new S3Client({ region: process.env.AWS_REGION || 'us-east-1' }) : null;

async function readS3Json(key: string) {
  if (!s3 || !S3_BUCKET) return null;
  try {
    const out = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    const stream = out.Body as any;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '[]');
  } catch (err) {
    return null;
  }
}

async function writeS3(key: string, body: Buffer | string, contentType?: string) {
  if (!s3 || !S3_BUCKET) throw new Error('S3 not configured');
  await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
}

export async function saveExport(projectId: string, filename: string, buffer: Buffer, mimetype: string) {
  if (STORAGE === 's3') {
    if (!S3_BUCKET) throw new Error('S3_BUCKET not configured');
    const key = `${projectId}/${filename}`;
    await writeS3(key, buffer, mimetype);
    // update metadata.json
    const metaKey = `${projectId}/metadata.json`;
    const existing = (await readS3Json(metaKey)) || [];
    const entry = { filename, mimetype, size: buffer.length, createdAt: new Date().toISOString() };
    existing.unshift(entry);
    await writeS3(metaKey, JSON.stringify(existing, null, 2), 'application/json');
    return entry;
  }

  const dir = path.join(BASE, projectId);
  ensureDir(dir);
  const filePath = path.join(dir, filename);
  await fs.promises.writeFile(filePath, buffer);
  const metaPath = path.join(dir, 'metadata.json');
  let meta: any[] = [];
  if (fs.existsSync(metaPath)) {
    try { meta = JSON.parse(await fs.promises.readFile(metaPath, 'utf8') || '[]'); } catch (_) { meta = []; }
  }
  const entry = { filename, mimetype, size: buffer.length, createdAt: new Date().toISOString() };
  meta.unshift(entry);
  await fs.promises.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  return entry;
}

export async function listExports(projectId: string) {
  if (STORAGE === 's3') {
    const metaKey = `${projectId}/metadata.json`;
    const list = await readS3Json(metaKey);
    return Array.isArray(list) ? list : [];
  }
  const dir = path.join(BASE, projectId);
  const metaPath = path.join(dir, 'metadata.json');
  if (!fs.existsSync(metaPath)) return [];
  try { return JSON.parse(fs.readFileSync(metaPath, 'utf8') || '[]'); } catch (_) { return []; }
}

export async function getExportPath(projectId: string, filename: string) {
  if (STORAGE === 's3') {
    if (!s3 || !S3_BUCKET) return null;
    const key = `${projectId}/${filename}`;
    try {
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }), { expiresIn: 60 });
      return url;
    } catch (err) { return null; }
  }
  const filePath = path.join(BASE, projectId, filename);
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}
