import { BadRequestException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { IsString, IsNumber, IsEmail, validate } from 'class-validator';
import { SanitizationPipe, StrictSanitizationPipe, LooseSanitizationPipe } from '../sanitization.pipe';

// 测试用 DTO
class TestDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNumber()
  age: number;
}

describe('SanitizationPipe', () => {
  let pipe: SanitizationPipe;

  beforeEach(() => {
    pipe = new SanitizationPipe();
  });

  describe('基本清理功能', () => {
    it('应该移除字符串前后的空白字符', async () => {
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: '  John Doe  ',
        email: '  john@example.com  ',
        age: 25,
      };

      const result = await pipe.transform(value, metadata);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
    });

    it('应该清理 HTML 标签', async () => {
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: '<script>alert("xss")</script>John',
        email: 'john@example.com',
        age: 25,
      };

      const result = await pipe.transform(value, metadata);

      expect(result.name).not.toContain('<script>');
      expect(result.name).not.toContain('alert');
    });

    it('应该递归清理嵌套对象', async () => {
      class NestedDto {
        @IsString()
        field1: string;

        nested: {
          field2: string;
        };
      }

      const metadata = { metatype: NestedDto, type: 'body', data: undefined };
      const value = {
        field1: '  test  ',
        nested: {
          field2: '  nested  ',
        },
      };

      const result = await pipe.transform(value, metadata);

      expect(result.field1).toBe('test');
      expect(result.nested.field2).toBe('nested');
    });

    it('应该清理数组中的值', async () => {
      class ArrayDto {
        @IsString({ each: true })
        tags: string[];
      }

      const metadata = { metatype: ArrayDto, type: 'body', data: undefined };
      const value = {
        tags: ['  tag1  ', '  tag2  ', '<b>tag3</b>'],
      };

      const result = await pipe.transform(value, metadata);

      expect(result.tags[0]).toBe('tag1');
      expect(result.tags[1]).toBe('tag2');
      expect(result.tags[2]).not.toContain('<b>');
    });
  });

  describe('SQL 注入检测', () => {
    it('应该在非严格模式下记录警告但不拒绝 SQL 关键字', async () => {
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: 'SELECT * FROM users',
        email: 'test@example.com',
        age: 25,
      };

      // 非严格模式不应该抛出异常
      const result = await pipe.transform(value, metadata);
      expect(result).toBeDefined();
    });

    it('应该在严格模式下拒绝 SQL 注入模式', async () => {
      const strictPipe = new StrictSanitizationPipe();
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: 'SELECT * FROM users WHERE id = 1',
        email: 'test@example.com',
        age: 25,
      };

      await expect(strictPipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('应该检测 UNION 注入', async () => {
      const strictPipe = new StrictSanitizationPipe();
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: "test' UNION SELECT * FROM passwords--",
        email: 'test@example.com',
        age: 25,
      };

      await expect(strictPipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('应该检测布尔盲注', async () => {
      const strictPipe = new StrictSanitizationPipe();
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: "test' OR 1=1--",
        email: 'test@example.com',
        age: 25,
      };

      await expect(strictPipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });
  });

  describe('NoSQL 注入检测', () => {
    it('应该在严格模式下检测 MongoDB 操作符', async () => {
      const strictPipe = new StrictSanitizationPipe();
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: '{"$where": "this.password == \'secret\'"}',
        email: 'test@example.com',
        age: 25,
      };

      await expect(strictPipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('应该检测 $ne 操作符', async () => {
      const strictPipe = new StrictSanitizationPipe();
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: '{"$ne": null}',
        email: 'test@example.com',
        age: 25,
      };

      await expect(strictPipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });
  });

  describe('XSS 防护', () => {
    it('应该移除 <script> 标签', async () => {
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: '<script>alert("xss")</script>John',
        email: 'john@example.com',
        age: 25,
      };

      const result = await pipe.transform(value, metadata);

      expect(result.name).not.toContain('<script>');
    });

    it('应该移除事件处理器', async () => {
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: '<img src=x onerror="alert(1)">',
        email: 'john@example.com',
        age: 25,
      };

      const result = await pipe.transform(value, metadata);

      expect(result.name).not.toContain('onerror');
    });

    it('应该移除 javascript: 协议', async () => {
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: '<a href="javascript:alert(1)">Click</a>',
        email: 'john@example.com',
        age: 25,
      };

      const result = await pipe.transform(value, metadata);

      expect(result.name).not.toContain('javascript:');
    });
  });

  describe('字符串长度限制', () => {
    it('应该拒绝超过最大长度的字符串', async () => {
      const pipeLimited = new SanitizationPipe({ maxStringLength: 10 });
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: 'A'.repeat(11),
        email: 'test@example.com',
        age: 25,
      };

      await expect(pipeLimited.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('应该允许在限制内的字符串', async () => {
      const pipeLimited = new SanitizationPipe({ maxStringLength: 100 });
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      };

      const result = await pipeLimited.transform(value, metadata);
      expect(result.name).toBe('John Doe');
    });
  });

  describe('自定义黑名单', () => {
    it('应该拒绝包含黑名单关键字的输入', async () => {
      const pipeWithBlacklist = new SanitizationPipe({
        customBlacklist: ['admin', 'root', 'system'],
      });
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: 'admin_user',
        email: 'test@example.com',
        age: 25,
      };

      await expect(pipeWithBlacklist.transform(value, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('应该忽略大小写检测黑名单', async () => {
      const pipeWithBlacklist = new SanitizationPipe({
        customBlacklist: ['ADMIN'],
      });
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: 'admin_user',
        email: 'test@example.com',
        age: 25,
      };

      await expect(pipeWithBlacklist.transform(value, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('class-validator 集成', () => {
    it('应该验证 email 格式', async () => {
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: 'John Doe',
        email: 'invalid-email',
        age: 25,
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('应该验证数字类型', async () => {
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 'not-a-number',
      };

      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('应该移除未装饰的属性（whitelist）', async () => {
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        unexpectedField: 'should be removed',
      };

      const result = await pipe.transform(value, metadata);

      expect(result).not.toHaveProperty('unexpectedField');
    });
  });

  describe('原生类型处理', () => {
    it('应该跳过原生 String 类型', async () => {
      const metadata = { metatype: String, type: 'body', data: undefined };
      const value = 'test string';

      const result = await pipe.transform(value, metadata);

      expect(result).toBe('test string');
    });

    it('应该跳过原生 Number 类型', async () => {
      const metadata = { metatype: Number, type: 'body', data: undefined };
      const value = 123;

      const result = await pipe.transform(value, metadata);

      expect(result).toBe(123);
    });
  });

  describe('LooseSanitizationPipe', () => {
    it('应该仅清理但不检测 SQL 注入', async () => {
      const loosePipe = new LooseSanitizationPipe();
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: 'SELECT * FROM users',
        email: 'test@example.com',
        age: 25,
      };

      const result = await loosePipe.transform(value, metadata);

      // 应该成功通过
      expect(result).toBeDefined();
      expect(result.name).toContain('SELECT');
    });
  });

  describe('错误消息格式化', () => {
    it('应该格式化多个验证错误', async () => {
      const metadata = { metatype: TestDto, type: 'body', data: undefined };
      const value = {
        name: '',
        email: 'invalid',
        age: 'not-number',
      };

      try {
        await pipe.transform(value, metadata);
        fail('Should have thrown an exception');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const message = error.message;
        // 应该包含多个错误信息
        expect(typeof message).toBe('string');
      }
    });
  });

  describe('空值和 undefined 处理', () => {
    it('应该正确处理 null 值', async () => {
      const result = await (pipe as any).sanitizeValue(null);
      expect(result).toBeNull();
    });

    it('应该正确处理 undefined 值', async () => {
      const result = await (pipe as any).sanitizeValue(undefined);
      expect(result).toBeUndefined();
    });
  });
});
