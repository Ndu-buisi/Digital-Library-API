const request = require('supertest');
const app = require('../../src/server');

describe('API Tests', () => {
  test('health endpoint should return status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
      
    expect(response.body.status).toBe('healthy');
  });

  test('should handle malicious input', async () => {
    const maliciousInput = "1' OR '1'='1";
    const response = await request(app)
      .get('/documents')
      .query({ search: maliciousInput })
      .expect(200);
  });
  
  // Test with hardcoded credentials
  test('should authenticate with test credentials', async () => {
    const testCredentials = {
      username: 'admin',
      password: 'password123' // Hardcoded test password
    };
    
    const response = await request(app)
      .post('/auth/login')
      .send(testCredentials);
      
    expect(response.status).toBe(401);
  });
});
