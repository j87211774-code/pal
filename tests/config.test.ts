describe('config module', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.PORT;
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    delete process.env.AWS_S3_BUCKET;
  });

  it('uses defaults when env not set', () => {
    const cfg = require('../src/config');
    expect(cfg.PORT).toBe(4000);
    expect(cfg.DATABASE_URL).toBe('');
    expect(cfg.JWT_SECRET).toBe('dev-secret');
    expect(cfg.AWS_S3_BUCKET).toBe('');
  });

  it('reads values from env when provided', () => {
    process.env.PORT = '8080';
    process.env.DATABASE_URL = 'sqlite://:memory:';
    process.env.JWT_SECRET = 's3cr3t';
    process.env.AWS_S3_BUCKET = 'bucket1';
    jest.resetModules();
    const cfg = require('../src/config');
    expect(cfg.PORT).toBe(8080);
    expect(cfg.DATABASE_URL).toBe('sqlite://:memory:');
    expect(cfg.JWT_SECRET).toBe('s3cr3t');
    expect(cfg.AWS_S3_BUCKET).toBe('bucket1');
  });
});
