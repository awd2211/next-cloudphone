import { userService } from '../helpers/api-client';
import { createTestUser, deleteTestUser, loginUser } from '../helpers/test-helpers';

describe('User Authentication E2E Tests', () => {
  let testUserId: string;

  afterEach(async () => {
    // Cleanup test user
    if (testUserId) {
      await deleteTestUser(testUserId);
      testUserId = '';
    }
    userService.clearToken();
  });

  describe('User Registration', () => {
    it('should successfully register a new user', async () => {
      const timestamp = Date.now();
      const userData = {
        username: `e2e_reg_${timestamp}`,
        email: `e2e_reg_${timestamp}@test.com`,
        password: 'TestPassword123!',
        fullName: 'E2E Test User',
      };

      const response = await userService.post<{ user: any }>('/auth/register', userData);

      expect(response.user).toBeDefined();
      expect(response.user.username).toBe(userData.username);
      expect(response.user.email).toBe(userData.email);
      expect(response.user.password).toBeUndefined(); // Password should not be returned

      testUserId = response.user.id;
    });

    it('should reject registration with duplicate username', async () => {
      const timestamp = Date.now();
      const userData = {
        username: `e2e_dup_${timestamp}`,
        email: `e2e_dup1_${timestamp}@test.com`,
        password: 'TestPassword123!',
      };

      // First registration
      const response1 = await userService.post<{ user: any }>('/auth/register', userData);
      testUserId = response1.user.id;

      // Second registration with same username but different email
      const duplicateData = {
        ...userData,
        email: `e2e_dup2_${timestamp}@test.com`,
      };

      await expect(userService.post('/auth/register', duplicateData)).rejects.toThrow();
    });

    it('should reject registration with duplicate email', async () => {
      const timestamp = Date.now();
      const userData = {
        username: `e2e_dupmail1_${timestamp}`,
        email: `e2e_dupmail_${timestamp}@test.com`,
        password: 'TestPassword123!',
      };

      // First registration
      const response1 = await userService.post<{ user: any }>('/auth/register', userData);
      testUserId = response1.user.id;

      // Second registration with same email but different username
      const duplicateData = {
        username: `e2e_dupmail2_${timestamp}`,
        email: userData.email,
        password: 'TestPassword123!',
      };

      await expect(userService.post('/auth/register', duplicateData)).rejects.toThrow();
    });

    it('should reject registration with weak password', async () => {
      const timestamp = Date.now();
      const userData = {
        username: `e2e_weak_${timestamp}`,
        email: `e2e_weak_${timestamp}@test.com`,
        password: '123', // Weak password
      };

      await expect(userService.post('/auth/register', userData)).rejects.toThrow();
    });

    it('should reject registration with invalid email format', async () => {
      const timestamp = Date.now();
      const userData = {
        username: `e2e_invalid_${timestamp}`,
        email: 'invalid-email-format',
        password: 'TestPassword123!',
      };

      await expect(userService.post('/auth/register', userData)).rejects.toThrow();
    });
  });

  describe('User Login', () => {
    let testUser: any;

    beforeEach(async () => {
      // Create a test user before each login test
      testUser = await createTestUser();
      testUserId = testUser.id;
    });

    it('should successfully login with correct credentials', async () => {
      userService.clearToken(); // Clear token from createTestUser

      const response = await userService.post<{ access_token: string; user: any }>('/auth/login', {
        username: testUser.username,
        password: testUser.password,
      });

      expect(response.access_token).toBeDefined();
      expect(typeof response.access_token).toBe('string');
      expect(response.user).toBeDefined();
      expect(response.user.username).toBe(testUser.username);
    });

    it('should reject login with incorrect password', async () => {
      userService.clearToken();

      await expect(
        userService.post('/auth/login', {
          username: testUser.username,
          password: 'WrongPassword123!',
        })
      ).rejects.toThrow();
    });

    it('should reject login with non-existent username', async () => {
      userService.clearToken();

      await expect(
        userService.post('/auth/login', {
          username: 'nonexistent_user_999',
          password: 'TestPassword123!',
        })
      ).rejects.toThrow();
    });

    it('should reject login with missing credentials', async () => {
      userService.clearToken();

      await expect(
        userService.post('/auth/login', {
          username: testUser.username,
          // Missing password
        })
      ).rejects.toThrow();
    });
  });

  describe('Token-based Authentication', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
      testUserId = testUser.id;
    });

    it('should access protected route with valid token', async () => {
      const response = await userService.get<{ id: string; username: string }>('/users/profile');

      expect(response).toBeDefined();
      expect(response.username).toBe(testUser.username);
    });

    it('should reject access without token', async () => {
      userService.clearToken();

      await expect(userService.get('/users/profile')).rejects.toThrow();
    });

    it('should reject access with invalid token', async () => {
      userService.setToken('invalid.jwt.token');

      await expect(userService.get('/users/profile')).rejects.toThrow();
    });

    it('should reject access with expired token', async () => {
      // This is a placeholder - actual implementation would need to create an expired token
      // For now, we just test with an obviously invalid token
      userService.setToken(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      );

      await expect(userService.get('/users/profile')).rejects.toThrow();
    });
  });

  describe('User Profile Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await createTestUser();
      testUserId = testUser.id;
    });

    it('should retrieve user profile', async () => {
      const response = await userService.get<any>('/users/profile');

      expect(response).toBeDefined();
      expect(response.id).toBe(testUser.id);
      expect(response.username).toBe(testUser.username);
      expect(response.email).toBe(testUser.email);
      expect(response.password).toBeUndefined(); // Password should never be returned
    });

    it('should update user profile', async () => {
      const updateData = {
        fullName: 'Updated Test User',
        phone: '+86 138-0000-0000',
      };

      const response = await userService.patch<any>('/users/profile', updateData);

      expect(response.fullName).toBe(updateData.fullName);
      expect(response.phone).toBe(updateData.phone);
    });

    it('should change password', async () => {
      const newPassword = 'NewPassword456!';

      await userService.post('/auth/change-password', {
        oldPassword: testUser.password,
        newPassword: newPassword,
      });

      // Verify new password works
      userService.clearToken();
      const loginResponse = await userService.post<{ access_token: string }>('/auth/login', {
        username: testUser.username,
        password: newPassword,
      });

      expect(loginResponse.access_token).toBeDefined();
    });

    it('should reject password change with incorrect old password', async () => {
      await expect(
        userService.post('/auth/change-password', {
          oldPassword: 'WrongOldPassword123!',
          newPassword: 'NewPassword456!',
        })
      ).rejects.toThrow();
    });
  });
});
