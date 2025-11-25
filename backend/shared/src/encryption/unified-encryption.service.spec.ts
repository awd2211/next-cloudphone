import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnifiedEncryptionService, EncryptionAlgorithm } from './unified-encryption.service';

describe('UnifiedEncryptionService', () => {
  let service: UnifiedEncryptionService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        ENCRYPTION_KEY: 'test-encryption-key-must-be-32-chars!!',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UnifiedEncryptionService,
          useFactory: () => {
            return new UnifiedEncryptionService(
              mockConfigService as unknown as ConfigService,
              { keyEnvName: 'ENCRYPTION_KEY' },
            );
          },
        },
      ],
    }).compile();

    service = module.get<UnifiedEncryptionService>(UnifiedEncryptionService);
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'Hello, World!';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted.ciphertext).not.toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'Same text';

      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should handle empty string', () => {
      const plaintext = '';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    it('should handle unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا';

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryptToString/decryptFromString', () => {
    it('should encrypt to string and decrypt from string', () => {
      const plaintext = 'Secret data';

      const encryptedString = service.encryptToString(plaintext);
      const decrypted = service.decryptFromString(encryptedString);

      expect(decrypted).toBe(plaintext);
      expect(encryptedString).toContain(':'); // Format: algorithm:iv:tag:ciphertext
    });

    it('should produce a gcm: prefixed string', () => {
      const plaintext = 'Test';

      const encryptedString = service.encryptToString(plaintext);

      expect(encryptedString.startsWith('gcm:')).toBe(true);
    });
  });

  describe('hash', () => {
    it('should produce consistent hash for same input', () => {
      const data = 'test data';

      const hash1 = service.hash(data);
      const hash2 = service.hash(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = service.hash('data1');
      const hash2 = service.hash('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce hex string', () => {
      const hash = service.hash('test');

      expect(hash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('masking functions', () => {
    describe('maskPhone', () => {
      it('should mask phone number correctly', () => {
        expect(service.maskPhone('13812345678')).toBe('138****5678');
        expect(service.maskPhone('12345678901')).toBe('123****8901');
      });

      it('should handle short phone numbers', () => {
        expect(service.maskPhone('1234')).toBe('***');
      });

      it('should handle empty string', () => {
        expect(service.maskPhone('')).toBe('***');
      });
    });

    describe('maskEmail', () => {
      it('should mask email correctly', () => {
        expect(service.maskEmail('test@example.com')).toBe('t***@example.com');
        // Note: the implementation uses min(username.length - 1, 3) stars
        expect(service.maskEmail('john.doe@domain.org')).toBe('j***@domain.org');
      });

      it('should handle short local part', () => {
        expect(service.maskEmail('a@b.com')).toBe('*@b.com');
      });

      it('should handle invalid email', () => {
        expect(service.maskEmail('notanemail')).toBe('***@***.com');
      });
    });

    describe('maskIdCard', () => {
      it('should mask ID card correctly', () => {
        expect(service.maskIdCard('110101199001011234')).toBe('110101********1234');
      });

      it('should handle short ID', () => {
        expect(service.maskIdCard('123456')).toBe('******');
      });
    });

    describe('maskBankCard', () => {
      it('should mask bank card correctly', () => {
        // Implementation uses format: `${start} **** **** ${end}`
        expect(service.maskBankCard('6222021234567890123')).toBe('6222 **** **** 0123');
      });

      it('should handle short card number', () => {
        expect(service.maskBankCard('1234')).toBe('****');
      });
    });

    describe('maskName', () => {
      it('should mask Chinese name correctly', () => {
        expect(service.maskName('张三')).toBe('张*');
        // Implementation: name[0] + '*'.repeat(name.length - 1)
        expect(service.maskName('张三丰')).toBe('张**');
      });

      it('should mask English name correctly', () => {
        // Implementation: name[0] + '*'.repeat(name.length - 1)
        expect(service.maskName('John Doe')).toBe('J*******');
      });

      it('should handle single character', () => {
        expect(service.maskName('A')).toBe('*');
      });
    });
  });

  describe('batch operations', () => {
    describe('encryptFields', () => {
      it('should encrypt specified fields', () => {
        const obj = {
          name: 'John',
          password: 'secret123',
          email: 'john@example.com',
        };

        const result = service.encryptFields(obj, ['password']);

        expect(result.name).toBe('John');
        expect(result.email).toBe('john@example.com');
        expect(result.password).not.toBe('secret123');
        expect(result.password).toContain(':'); // Encrypted format
      });
    });

    describe('decryptFields', () => {
      it('should decrypt specified fields', () => {
        const originalPassword = 'secret123';
        const encrypted = service.encryptToString(originalPassword);

        const obj = {
          name: 'John',
          password: encrypted,
        };

        const result = service.decryptFields(obj, ['password']);

        expect(result.name).toBe('John');
        expect(result.password).toBe(originalPassword);
      });
    });

    describe('maskFields', () => {
      it('should mask multiple fields with different types', () => {
        const obj = {
          name: '张三',
          phone: '13812345678',
          email: 'test@example.com',
          idCard: '110101199001011234',
        };

        // MaskType is a string union type, not an enum
        const result = service.maskFields(obj, {
          name: 'name',
          phone: 'phone',
          email: 'email',
          idCard: 'idCard',
        });

        expect(result.name).toBe('张*');
        expect(result.phone).toBe('138****5678');
        expect(result.email).toBe('t***@example.com');
        expect(result.idCard).toBe('110101********1234');
      });
    });
  });

  describe('HMAC', () => {
    it('should generate HMAC signature', () => {
      const data = 'message to sign';
      const key = 'secret-key';

      const signature = service.hmac(data, key);

      expect(signature).toMatch(/^[a-f0-9]+$/);
    });

    it('should produce same signature for same data and key', () => {
      const data = 'message';
      const key = 'key';

      const sig1 = service.hmac(data, key);
      const sig2 = service.hmac(data, key);

      expect(sig1).toBe(sig2);
    });

    it('should produce different signature for different keys', () => {
      const data = 'message';

      const sig1 = service.hmac(data, 'key1');
      const sig2 = service.hmac(data, 'key2');

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('utility methods', () => {
    describe('generateToken', () => {
      it('should generate random token of specified length', () => {
        const token = service.generateToken(16);
        // 16 bytes = 32 hex characters
        expect(token).toMatch(/^[a-f0-9]{32}$/);
      });

      it('should generate different tokens each time', () => {
        const token1 = service.generateToken();
        const token2 = service.generateToken();
        expect(token1).not.toBe(token2);
      });
    });

    describe('generateUUID', () => {
      it('should generate valid UUID', () => {
        const uuid = service.generateUUID();
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });
    });

    describe('compare', () => {
      it('should return true for matching plaintext and encrypted', () => {
        const plaintext = 'secret';
        const encrypted = service.encryptToString(plaintext);

        expect(service.compare(plaintext, encrypted)).toBe(true);
      });

      it('should return false for non-matching', () => {
        const encrypted = service.encryptToString('secret');

        expect(service.compare('wrong', encrypted)).toBe(false);
      });
    });

    describe('secureCompare', () => {
      it('should return true for identical strings', () => {
        expect(service.secureCompare('test', 'test')).toBe(true);
      });

      it('should return false for different strings', () => {
        expect(service.secureCompare('test', 'test2')).toBe(false);
      });

      it('should return false for different length strings', () => {
        expect(service.secureCompare('short', 'longer string')).toBe(false);
      });
    });

    describe('mask (generic)', () => {
      it('should mask middle characters', () => {
        expect(service.mask('secret_key_value', 4)).toBe('secr********alue');
      });

      it('should handle short strings', () => {
        expect(service.mask('short', 4)).toBe('*****');
      });
    });
  });
});
