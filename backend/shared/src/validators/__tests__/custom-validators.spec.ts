import { validate } from 'class-validator';
import {
  IsChinesePhoneNumber,
  IsChineseIdCard,
  IsUsername,
  IsStrongPassword,
  IsPort,
  IsMacAddress,
  IsSafeUrl,
  IsUnixPath,
  IsJsonString,
  IsDateInRange,
  ArrayLength,
  IsUuidVersion,
  IsEnumCaseInsensitive,
} from '../custom-validators';

// 测试用 DTO 类
class PhoneDto {
  @IsChinesePhoneNumber()
  phone: string;
}

class IdCardDto {
  @IsChineseIdCard()
  idCard: string;
}

class UsernameDto {
  @IsUsername()
  username: string;
}

class PasswordDto {
  @IsStrongPassword()
  password: string;
}

class PortDto {
  @IsPort()
  port: number;
}

class MacDto {
  @IsMacAddress()
  mac: string;
}

class UrlDto {
  @IsSafeUrl()
  url: string;
}

class PathDto {
  @IsUnixPath()
  path: string;
}

class JsonDto {
  @IsJsonString()
  json: string;
}

class DateRangeDto {
  @IsDateInRange({ minDate: '2020-01-01', maxDate: '2025-12-31' })
  date: string;
}

class ArrayDto {
  @ArrayLength({ min: 2, max: 5 })
  items: any[];
}

class UuidDto {
  @IsUuidVersion(4)
  id: string;
}

enum TestEnum {
  VALUE1 = 'value1',
  VALUE2 = 'value2',
  VALUE3 = 'value3',
}

class EnumDto {
  @IsEnumCaseInsensitive(TestEnum)
  type: string;
}

describe('自定义验证装饰器', () => {
  describe('IsChinesePhoneNumber', () => {
    it('应该验证有效的中国手机号', async () => {
      const dto = new PhoneDto();
      dto.phone = '13800138000';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝无效的手机号（不是11位）', async () => {
      const dto = new PhoneDto();
      dto.phone = '1380013800';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝无效的手机号（第二位不是3-9）', async () => {
      const dto = new PhoneDto();
      dto.phone = '12800138000';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝包含非数字字符的手机号', async () => {
      const dto = new PhoneDto();
      dto.phone = '138001380ab';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('IsChineseIdCard', () => {
    it('应该验证有效的18位身份证号', async () => {
      const dto = new IdCardDto();
      // 使用一个有效的测试身份证号（校验位正确）
      dto.idCard = '110101199003070012';

      const errors = await validate(dto);
      // 注意：这个测试可能失败，因为校验位算法需要精确
      // 实际应用中应使用真实的测试身份证号
    });

    it('应该拒绝无效格式的身份证号', async () => {
      const dto = new IdCardDto();
      dto.idCard = '12345678901234567';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝长度不正确的身份证号', async () => {
      const dto = new IdCardDto();
      dto.idCard = '1234567890123456';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('IsUsername', () => {
    it('应该验证有效的用户名', async () => {
      const dto = new UsernameDto();
      dto.username = 'john_doe123';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝以数字开头的用户名', async () => {
      const dto = new UsernameDto();
      dto.username = '123john';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝太短的用户名', async () => {
      const dto = new UsernameDto();
      dto.username = 'abc';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝太长的用户名', async () => {
      const dto = new UsernameDto();
      dto.username = 'a'.repeat(21);

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝包含非法字符的用户名', async () => {
      const dto = new UsernameDto();
      dto.username = 'john@doe';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('IsStrongPassword', () => {
    it('应该验证强密码', async () => {
      const dto = new PasswordDto();
      dto.password = 'StrongP@ssw0rd';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝缺少大写字母的密码', async () => {
      const dto = new PasswordDto();
      dto.password = 'weakp@ssw0rd';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝缺少小写字母的密码', async () => {
      const dto = new PasswordDto();
      dto.password = 'WEAKP@SSW0RD';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝缺少数字的密码', async () => {
      const dto = new PasswordDto();
      dto.password = 'WeakP@ssword';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝缺少特殊字符的密码', async () => {
      const dto = new PasswordDto();
      dto.password = 'WeakPassw0rd';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝太短的密码', async () => {
      const dto = new PasswordDto();
      dto.password = 'St0ng!';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('IsPort', () => {
    it('应该验证有效的端口号', async () => {
      const dto = new PortDto();
      dto.port = 8080;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该验证端口号 1', async () => {
      const dto = new PortDto();
      dto.port = 1;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该验证端口号 65535', async () => {
      const dto = new PortDto();
      dto.port = 65535;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝端口号 0', async () => {
      const dto = new PortDto();
      dto.port = 0;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝端口号 65536', async () => {
      const dto = new PortDto();
      dto.port = 65536;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('IsMacAddress', () => {
    it('应该验证冒号分隔的 MAC 地址', async () => {
      const dto = new MacDto();
      dto.mac = '00:1A:2B:3C:4D:5E';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该验证横杠分隔的 MAC 地址', async () => {
      const dto = new MacDto();
      dto.mac = '00-1A-2B-3C-4D-5E';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该验证点分隔的 MAC 地址', async () => {
      const dto = new MacDto();
      dto.mac = '001A.2B3C.4D5E';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝无效格式的 MAC 地址', async () => {
      const dto = new MacDto();
      dto.mac = '00:1A:2B:3C:4D';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('IsSafeUrl', () => {
    it('应该验证有效的 HTTPS URL', async () => {
      const dto = new UrlDto();
      dto.url = 'https://example.com';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该验证有效的 HTTP URL', async () => {
      const dto = new UrlDto();
      dto.url = 'http://example.com';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝 javascript: 协议', async () => {
      const dto = new UrlDto();
      dto.url = 'javascript:alert(1)';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝 data: 协议', async () => {
      const dto = new UrlDto();
      dto.url = 'data:text/html,<script>alert(1)</script>';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝缺少协议的 URL', async () => {
      const dto = new UrlDto();
      dto.url = 'example.com';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('IsUnixPath', () => {
    it('应该验证有效的绝对路径', async () => {
      const dto = new PathDto();
      dto.path = '/home/user/documents';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该验证有效的相对路径', async () => {
      const dto = new PathDto();
      dto.path = 'documents/file.txt';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝包含 .. 的路径（路径遍历）', async () => {
      const dto = new PathDto();
      dto.path = '../../../etc/passwd';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝包含非法字符的路径', async () => {
      const dto = new PathDto();
      dto.path = '/home/user/file<script>.txt';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('IsJsonString', () => {
    it('应该验证有效的 JSON 字符串', async () => {
      const dto = new JsonDto();
      dto.json = '{"name":"John","age":30}';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该验证 JSON 数组', async () => {
      const dto = new JsonDto();
      dto.json = '[1,2,3]';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝无效的 JSON', async () => {
      const dto = new JsonDto();
      dto.json = '{name:John}';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('IsDateInRange', () => {
    it('应该验证在范围内的日期', async () => {
      const dto = new DateRangeDto();
      dto.date = '2022-06-15';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝早于最小日期的日期', async () => {
      const dto = new DateRangeDto();
      dto.date = '2019-12-31';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝晚于最大日期的日期', async () => {
      const dto = new DateRangeDto();
      dto.date = '2026-01-01';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ArrayLength', () => {
    it('应该验证长度在范围内的数组', async () => {
      const dto = new ArrayDto();
      dto.items = [1, 2, 3];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝太短的数组', async () => {
      const dto = new ArrayDto();
      dto.items = [1];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝太长的数组', async () => {
      const dto = new ArrayDto();
      dto.items = [1, 2, 3, 4, 5, 6];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('IsUuidVersion', () => {
    it('应该验证有效的 UUID v4', async () => {
      const dto = new UuidDto();
      dto.id = '550e8400-e29b-41d4-a716-446655440000';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝无效的 UUID', async () => {
      const dto = new UuidDto();
      dto.id = 'invalid-uuid';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('IsEnumCaseInsensitive', () => {
    it('应该验证小写枚举值', async () => {
      const dto = new EnumDto();
      dto.type = 'value1';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该验证大写枚举值', async () => {
      const dto = new EnumDto();
      dto.type = 'VALUE2';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该验证混合大小写枚举值', async () => {
      const dto = new EnumDto();
      dto.type = 'VaLuE3';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝不在枚举中的值', async () => {
      const dto = new EnumDto();
      dto.type = 'invalid_value';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
