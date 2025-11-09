import { INestApplication } from '@nestjs/common';
import { createE2ETestHelper, E2ETestHelper } from '../helpers/e2e-test.helper';

describe('TemplatesController (E2E)', () => {
  let helper: E2ETestHelper;
  let app: INestApplication;
  let createdTemplateId: string;
  let createdTemplateCode: string;

  beforeAll(async () => {
    helper = await createE2ETestHelper();
    app = helper.getApp();
    createdTemplateCode = 'test-template-' + Date.now();
  });

  afterAll(async () => {
    await helper.closeApp();
  });

  describe('POST /templates', () => {
    it('should create a new template', async () => {
      const dto = {
        code: createdTemplateCode,
        name: 'Test Template',
        type: 'system',
        language: 'zh-CN',
        subject: 'Test Subject {{name}}',
        body: 'Hello {{name}}, this is a test template.',
        description: 'A test template for E2E testing',
      };

      const response = await helper.post('/templates').send(dto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.code).toBe(dto.code);
      expect(response.body.name).toBe(dto.name);
      expect(response.body.type).toBe(dto.type);
      expect(response.body.language).toBe(dto.language);
      expect(response.body.subject).toBe(dto.subject);
      expect(response.body.body).toBe(dto.body);
      expect(response.body.active).toBe(true);

      // Save template ID for later tests
      createdTemplateId = response.body.id;
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        // Missing required fields
        name: 'Invalid Template',
      };

      const response = await helper.post('/templates').send(invalidDto);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate template type', async () => {
      const invalidDto = {
        code: 'invalid-type-template-' + Date.now(),
        name: 'Invalid Type',
        type: 'invalid-type',
        language: 'zh-CN',
        subject: 'Subject',
        body: 'Body',
      };

      const response = await helper.post('/templates').send(invalidDto);

      expect(response.status).toBe(400);
    });

    it('should prevent duplicate template codes', async () => {
      const dto = {
        code: createdTemplateCode, // Same code as before
        name: 'Duplicate Template',
        type: 'system',
        language: 'zh-CN',
        subject: 'Subject',
        body: 'Body',
      };

      const response = await helper.post('/templates').send(dto);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /templates', () => {
    it('should get all templates with default pagination', async () => {
      const response = await helper.get('/templates');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter templates by type', async () => {
      const response = await helper.get('/templates?type=system');

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(0);

      // All returned templates should be of type 'system'
      response.body.data.forEach((template: any) => {
        expect(template.type).toBe('system');
      });
    });

    it('should filter templates by language', async () => {
      const response = await helper.get('/templates?language=zh-CN');

      expect(response.status).toBe(200);
      response.body.data.forEach((template: any) => {
        expect(template.language).toBe('zh-CN');
      });
    });

    it('should support custom pagination', async () => {
      const response = await helper.get('/templates?page=1&limit=5');

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should filter by active status', async () => {
      const response = await helper.get('/templates?active=true');

      expect(response.status).toBe(200);
      response.body.data.forEach((template: any) => {
        expect(template.active).toBe(true);
      });
    });
  });

  describe('GET /templates/:id', () => {
    it('should get a template by ID', async () => {
      const response = await helper.get(`/templates/${createdTemplateId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(createdTemplateId);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('type');
    });

    it('should return 404 for non-existent template', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await helper.get(`/templates/${nonExistentId}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await helper.get('/templates/invalid-uuid');

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /templates/:id', () => {
    it('should update a template', async () => {
      const updateDto = {
        name: 'Updated Template Name',
        description: 'Updated description',
      };

      const response = await helper.patch(`/templates/${createdTemplateId}`).send(updateDto);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateDto.name);
      expect(response.body.description).toBe(updateDto.description);
    });

    it('should update template body', async () => {
      const updateDto = {
        body: 'Updated body with {{variable}}',
      };

      const response = await helper.patch(`/templates/${createdTemplateId}`).send(updateDto);

      expect(response.status).toBe(200);
      expect(response.body.body).toBe(updateDto.body);
    });

    it('should return 404 when updating non-existent template', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await helper.patch(`/templates/${nonExistentId}`).send({ name: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /templates/:id', () => {
    it('should delete a template', async () => {
      // Create a template to delete
      const createResponse = await helper.post('/templates').send({
        code: 'delete-test-' + Date.now(),
        name: 'To Delete',
        type: 'system',
        language: 'zh-CN',
        subject: 'Subject',
        body: 'Body',
      });
      const templateId = createResponse.body.id;

      const response = await helper.delete(`/templates/${templateId}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await helper.get(`/templates/${templateId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent template', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await helper.delete(`/templates/${nonExistentId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /templates/:id/toggle', () => {
    it('should toggle template active status', async () => {
      const response = await helper.patch(`/templates/${createdTemplateId}/toggle`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('active');

      // Toggle again
      const response2 = await helper.patch(`/templates/${createdTemplateId}/toggle`);
      expect(response2.status).toBe(200);
      expect(response2.body.active).toBe(!response.body.active);
    });

    it('should return 404 for non-existent template', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await helper.patch(`/templates/${nonExistentId}/toggle`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /templates/by-code/:code', () => {
    it('should get template by code', async () => {
      const response = await helper.get(`/templates/by-code/${createdTemplateCode}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code');
      expect(response.body.code).toBe(createdTemplateCode);
    });

    it('should get template by code with language filter', async () => {
      const response = await helper.get(`/templates/by-code/${createdTemplateCode}?language=zh-CN`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(createdTemplateCode);
      expect(response.body.language).toBe('zh-CN');
    });

    it('should return 404 for non-existent code', async () => {
      const nonExistentCode = 'non-existent-code-' + Date.now();
      const response = await helper.get(`/templates/by-code/${nonExistentCode}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /templates/render', () => {
    it('should render template with data', async () => {
      const renderDto = {
        templateCode: createdTemplateCode,
        data: {
          name: 'John Doe',
        },
        language: 'zh-CN',
      };

      const response = await helper.post('/templates/render').send(renderDto);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('subject');
      expect(response.body).toHaveProperty('body');
      expect(response.body.subject).toContain('John Doe');
      expect(response.body.body).toContain('John Doe');
    });

    it('should render template without optional language', async () => {
      const renderDto = {
        templateCode: createdTemplateCode,
        data: {
          name: 'Jane Smith',
        },
      };

      const response = await helper.post('/templates/render').send(renderDto);

      expect(response.status).toBe(201);
      expect(response.body.body).toContain('Jane Smith');
    });

    it('should return 404 for non-existent template code', async () => {
      const renderDto = {
        templateCode: 'non-existent-' + Date.now(),
        data: { name: 'Test' },
      };

      const response = await helper.post('/templates/render').send(renderDto);

      expect(response.status).toBe(404);
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        data: { name: 'Test' },
        // Missing templateCode
      };

      const response = await helper.post('/templates/render').send(invalidDto);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /templates/validate', () => {
    it('should validate correct Handlebars syntax', async () => {
      const validTemplate = 'Hello {{name}}, welcome to {{company}}!';
      const response = await helper.post('/templates/validate').send({ template: validTemplate });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('valid');
      expect(response.body.valid).toBe(true);
    });

    it('should detect invalid Handlebars syntax', async () => {
      const invalidTemplate = 'Hello {{name}, missing closing bracket';
      const response = await helper.post('/templates/validate').send({ template: invalidTemplate });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('valid');
      expect(response.body.valid).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate templates with helpers', async () => {
      const templateWithHelpers = 'Total: {{#if showPrice}}${{price}}{{else}}Hidden{{/if}}';
      const response = await helper.post('/templates/validate').send({ template: templateWithHelpers });

      expect(response.status).toBe(201);
      expect(response.body.valid).toBe(true);
    });

    it('should return error when template is missing', async () => {
      const response = await helper.post('/templates/validate').send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /templates/bulk', () => {
    it('should bulk create templates', async () => {
      const templates = [
        {
          code: 'bulk-template-1-' + Date.now(),
          name: 'Bulk Template 1',
          type: 'system',
          language: 'zh-CN',
          subject: 'Subject 1',
          body: 'Body 1',
        },
        {
          code: 'bulk-template-2-' + Date.now(),
          name: 'Bulk Template 2',
          type: 'system',
          language: 'zh-CN',
          subject: 'Subject 2',
          body: 'Body 2',
        },
      ];

      const response = await helper.post('/templates/bulk').send({ templates });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('created');
      expect(response.body.created).toBe(2);
      expect(response.body).toHaveProperty('templates');
      expect(response.body.templates.length).toBe(2);
    });

    it('should validate all templates in bulk operation', async () => {
      const templates = [
        {
          code: 'valid-template-' + Date.now(),
          name: 'Valid',
          type: 'system',
          language: 'zh-CN',
          subject: 'Subject',
          body: 'Body',
        },
        {
          // Invalid template - missing required fields
          code: 'invalid-template-' + Date.now(),
          name: 'Invalid',
        },
      ];

      const response = await helper.post('/templates/bulk').send({ templates });

      expect(response.status).toBe(400);
    });

    it('should return error when templates array is empty', async () => {
      const response = await helper.post('/templates/bulk').send({ templates: [] });

      expect(response.status).toBe(400);
    });

    it('should return error when templates is missing', async () => {
      const response = await helper.post('/templates/bulk').send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /templates/clear-cache', () => {
    it('should clear template cache', async () => {
      const response = await helper.post('/templates/clear-cache');

      expect(response.status).toBe(204);
    });

    it('should allow multiple cache clear operations', async () => {
      const response1 = await helper.post('/templates/clear-cache');
      const response2 = await helper.post('/templates/clear-cache');

      expect(response1.status).toBe(204);
      expect(response2.status).toBe(204);
    });
  });

  describe('Complex Scenarios', () => {
    it('should create, update, toggle, and delete template in sequence', async () => {
      // Create
      const createResponse = await helper.post('/templates').send({
        code: 'sequence-test-' + Date.now(),
        name: 'Sequence Test',
        type: 'system',
        language: 'zh-CN',
        subject: 'Original Subject',
        body: 'Original Body',
      });
      expect(createResponse.status).toBe(201);
      const templateId = createResponse.body.id;

      // Update
      const updateResponse = await helper.patch(`/templates/${templateId}`).send({
        subject: 'Updated Subject',
      });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.subject).toBe('Updated Subject');

      // Toggle
      const toggleResponse = await helper.patch(`/templates/${templateId}/toggle`);
      expect(toggleResponse.status).toBe(200);
      expect(toggleResponse.body.active).toBe(false);

      // Delete
      const deleteResponse = await helper.delete(`/templates/${templateId}`);
      expect(deleteResponse.status).toBe(204);
    });

    it('should handle template with complex Handlebars features', async () => {
      const complexTemplate = {
        code: 'complex-template-' + Date.now(),
        name: 'Complex Template',
        type: 'system',
        language: 'zh-CN',
        subject: 'Order #{{orderId}}',
        body: `
          Hello {{user.name}},
          {{#if premium}}
            Thank you for being a premium member!
          {{/if}}
          {{#each items}}
            - {{this.name}}: \${{this.price}}
          {{/each}}
          Total: \${{total}}
        `,
      };

      const createResponse = await helper.post('/templates').send(complexTemplate);
      expect(createResponse.status).toBe(201);

      // Render with complex data
      const renderResponse = await helper.post('/templates/render').send({
        templateCode: complexTemplate.code,
        data: {
          orderId: '12345',
          user: { name: 'Alice' },
          premium: true,
          items: [
            { name: 'Item 1', price: 10 },
            { name: 'Item 2', price: 20 },
          ],
          total: 30,
        },
      });

      expect(renderResponse.status).toBe(201);
      expect(renderResponse.body.subject).toContain('12345');
      expect(renderResponse.body.body).toContain('Alice');
      expect(renderResponse.body.body).toContain('premium member');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed JSON', async () => {
      const response = await helper
        .post('/templates')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should handle concurrent template updates', async () => {
      const updates = [
        helper.patch(`/templates/${createdTemplateId}`).send({ name: 'Update 1' }),
        helper.patch(`/templates/${createdTemplateId}`).send({ name: 'Update 2' }),
      ];

      const responses = await Promise.all(updates);

      // Both should succeed (last write wins)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
