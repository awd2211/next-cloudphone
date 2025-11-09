import { INestApplication } from '@nestjs/common';
import { createE2ETestHelper, E2ETestHelper } from '../helpers/e2e-test.helper';

describe('HealthController (E2E)', () => {
  let helper: E2ETestHelper;
  let app: INestApplication;

  beforeAll(async () => {
    helper = await createE2ETestHelper();
    app = helper.getApp();
  });

  afterAll(async () => {
    await helper.closeApp();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await helper.get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health status', async () => {
      const response = await helper.get('/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('GET /health/liveness', () => {
    it('should return liveness probe status', async () => {
      const response = await helper.get('/health/liveness');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });
  });

  describe('GET /health/readiness', () => {
    it('should return readiness probe status', async () => {
      const response = await helper.get('/health/readiness');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });
  });
});
