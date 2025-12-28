export const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
export const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || '';
