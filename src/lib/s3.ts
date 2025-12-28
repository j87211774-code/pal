import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const region = process.env.AWS_S3_REGION || 'us-east-1';
const bucket = process.env.AWS_S3_BUCKET || '';

const s3 = new S3Client({ region });

export async function getPresignedUploadUrl(key: string, contentType = 'application/octet-stream') {
  if (!bucket) throw new Error('S3 bucket not configured');
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 10 }); // 10 minutes
  return url;
}

export async function getPresignedDownloadUrl(key: string) {
  if (!bucket) throw new Error('S3 bucket not configured');
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 }); // 1 hour
  return url;
}
