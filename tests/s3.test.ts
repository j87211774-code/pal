import { getPresignedUploadUrl, getPresignedDownloadUrl } from '../src/lib/s3';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: async (_client: any, cmd: any, _opts: any) => {
    return `https://signed.test/${cmd.input.Key}`;
  }
}));

describe('s3 utilities', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.AWS_S3_BUCKET;
  });

  it('throws when bucket not configured', async () => {
    await expect(getPresignedUploadUrl('key')).rejects.toThrow('S3 bucket not configured');
    await expect(getPresignedDownloadUrl('key')).rejects.toThrow('S3 bucket not configured');
  });

  it('returns presigned urls when bucket configured', async () => {
    process.env.AWS_S3_BUCKET = 'my-bucket';
    // reload module to pick up env
    const s3 = require('../src/lib/s3');
    const up = await s3.getPresignedUploadUrl('uploads/file.txt', 'text/plain');
    expect(up).toMatch(/^https:\/\/signed.test\//);

    const down = await s3.getPresignedDownloadUrl('uploads/file.txt');
    expect(down).toMatch(/^https:\/\/signed.test\//);
  });
});
