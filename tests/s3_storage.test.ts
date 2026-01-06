/**
 * S3 integration-style test (mocked) for export storage
 */

// Mock AWS S3 client and presigner with an in-memory store
jest.mock('@aws-sdk/client-s3', () => {
  const store = new Map<string, Buffer>();
  class PutObjectCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  }
  class GetObjectCommand {
    input: any;
    constructor(input: any) { this.input = input; }
  }
  class S3Client {
    async send(cmd: any) {
      const key = cmd.input?.Key;
      if (!key) return {};
      // Put
      if (cmd.input?.Body !== undefined) {
        let body = cmd.input.Body;
        if (typeof body === 'string') body = Buffer.from(body, 'utf8');
        if (Buffer.isBuffer(body)) {
          store.set(key, body);
          return {};
        }
        // handle stream-like
        const chunks: Buffer[] = [];
        for await (const c of body) chunks.push(Buffer.from(c));
        store.set(key, Buffer.concat(chunks));
        return {};
      }
      // Get
      const val = store.get(key);
      if (!val) throw new Error('NotFound');
      // Return object with async iterable Body
      const { Readable } = require('stream');
      const stream = Readable.from([val]);
      return { Body: stream };
    }
  }
  return { S3Client, PutObjectCommand, GetObjectCommand };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: async (_client: any, cmd: any, _opts: any) => {
    return `https://signed.test/${cmd.input.Key}`;
  }
}));

describe('S3-backed storage (mocked)', () => {
  beforeAll(() => {
    process.env.EXPORT_STORAGE = 's3';
    process.env.S3_BUCKET = 'test-bucket';
  });

  it('saveExport, listExports, getExportPath should work with S3 mock', async () => {
    jest.resetModules(); // ensure storage reads env
    const storage = require('../src/lib/storage');
    const projectId = 'proj-s3-test';
    const filename = 'export-test.xlsx';
    const buf = Buffer.from('hello');

    const entry = await storage.saveExport(projectId, filename, buf, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(entry).toBeDefined();
    expect(entry.filename).toBe(filename);

    const list = await storage.listExports(projectId);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].filename).toBe(filename);

    const path = await storage.getExportPath(projectId, filename);
    expect(typeof path).toBe('string');
    expect(path).toMatch(/^https:\/\/signed.test\//);
  });
});
