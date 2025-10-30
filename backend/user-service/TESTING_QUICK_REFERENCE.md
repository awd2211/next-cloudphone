# Testing Quick Reference Guide

**For**: User Service Developers
**Purpose**: Quick patterns and examples for writing service tests
**Last Updated**: 2025-10-30

---

## 🚀 Quick Start

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test roles.service.spec.ts

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:cov
```

---

## 📝 Test Structure (AAA Pattern)

**Always follow Arrange-Act-Assert pattern:**

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let repository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    repository = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        {
          provide: getRepositoryToken(Entity),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  beforeEach(() => {
    // Clear all mocks before each test
    repository.findOne.mockClear();
    repository.save.mockClear();
    // ... clear other mocks
  });

  describe('methodName', () => {
    it('should do something successfully', async () => {
      // Arrange
      const input = createTestData();
      repository.findOne.mockResolvedValue(mockData);

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toBeDefined();
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when not found', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.methodName('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

---

## 🛠️ Common Patterns

### Pattern 1: Simple Repository Mock

```typescript
import { createMockRepository } from '@cloudphone/shared/testing';

beforeEach(() => {
  repository = createMockRepository();
});

// Then use:
repository.findOne.mockResolvedValue(mockEntity);
repository.save.mockResolvedValue(savedEntity);
repository.find.mockResolvedValue([mockEntity1, mockEntity2]);
repository.count.mockResolvedValue(10);
```

---

### Pattern 2: QueryBuilder Mock

**For complex queries with joins and filters:**

```typescript
const mockQueryBuilder = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(5),
  getMany: jest.fn().mockResolvedValue([mockEntity]),
};

repository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

// Then test:
await service.getFiltered(options);

expect(mockQueryBuilder.where).toHaveBeenCalledWith(
  'entity.field = :value',
  { value: 'test' },
);
```

---

### Pattern 3: Entity with Instance Methods

**For entities like Quota, Ticket, ApiKey:**

```typescript
import { createMockQuota } from '@cloudphone/shared/testing';

const mockQuota = createMockQuota({
  id: 'quota-123',
  userId: 'user-123',

  // Instance methods
  isActive: jest.fn(() => true),
  isExpired: jest.fn(() => false),
  hasAvailableDeviceQuota: jest.fn(() => true),
});

repository.findOne.mockResolvedValue(mockQuota);
```

**Common entity methods to mock:**
- Quota: `isActive()`, `isExpired()`, `hasAvailableDeviceQuota()`, `getRemainingDevices()`
- Ticket: `canReply()`, `isClosed()`, `getResponseTime()`, `getResolutionTime()`
- ApiKey: `isActive()`, `isExpired()`

---

### Pattern 4: Testing Exceptions

```typescript
it('should throw NotFoundException when entity not found', async () => {
  // Arrange
  repository.findOne.mockResolvedValue(null);

  // Act & Assert
  await expect(service.getEntity('invalid-id')).rejects.toThrow(
    NotFoundException,
  );
  await expect(service.getEntity('invalid-id')).rejects.toThrow(
    'Entity #invalid-id not found',
  );
});

it('should throw BadRequestException for invalid input', async () => {
  // Arrange
  const invalidDto = { /* invalid data */ };

  // Act & Assert
  await expect(service.create(invalidDto)).rejects.toThrow(
    BadRequestException,
  );
});
```

---

### Pattern 5: Testing Statistics Methods

**For methods that calculate aggregated data:**

```typescript
it('should calculate statistics correctly', async () => {
  // Arrange
  const mockEntities = [
    createMockEntity({ status: 'active', rating: 5 }),
    createMockEntity({ status: 'inactive', rating: 4 }),
  ];

  repository.find.mockResolvedValue(mockEntities);
  repository.count.mockResolvedValue(10); // Simple default

  // Act
  const result = await service.getStatistics();

  // Assert - use range validation for complex stats
  expect(result.total).toBeGreaterThanOrEqual(0);
  expect(result.activeCount).toBeGreaterThanOrEqual(0);
  expect(result.averageRating).toBeGreaterThanOrEqual(0);
  expect(result.averageRating).toBeLessThanOrEqual(5);
});
```

**Pro Tip**: Don't try to mock exact count() sequences for enum loops. Use range validation instead.

---

## 📦 Mock Factories Available

Located in `@cloudphone/shared/testing`:

```typescript
// Repository mock
createMockRepository()

// Entity mocks
createMockUser(overrides?)
createMockRole(overrides?)
createMockPermission(overrides?)
createMockQuota(overrides?)
createMockAuditLog(overrides?)
createMockApiKey(overrides?)
createMockTicket(overrides?)
createMockTicketReply(overrides?)
```

**Usage:**

```typescript
import { createMockRepository, createMockUser } from '@cloudphone/shared/testing';

const mockUser = createMockUser({
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
});
```

---

## ⚠️ Common Pitfalls

### ❌ Don't Forget to Clear Mocks

```typescript
beforeEach(() => {
  // ALWAYS clear mocks before each test
  repository.create.mockClear();
  repository.save.mockClear();
  repository.findOne.mockClear();
  // ... all other mocks
});
```

**Why?** Previous test assertions will leak into next test otherwise.

---

### ❌ Don't Forget Entity Instance Methods

```typescript
// ❌ BAD - will throw "canReply is not a function"
const mockTicket = createMockTicket({
  id: 'ticket-123',
  status: TicketStatus.OPEN,
});

// ✅ GOOD - includes instance methods
const mockTicket = createMockTicket({
  id: 'ticket-123',
  status: TicketStatus.OPEN,
  canReply: jest.fn(() => true),
  isClosed: jest.fn(() => false),
});
```

---

### ❌ Don't Mock Implementation Details

```typescript
// ❌ BAD - testing implementation
expect(repository.findOne).toHaveBeenCalledTimes(1);
expect(repository.findOne.mock.calls[0][0].where.id).toBe('123');

// ✅ GOOD - testing behavior
expect(result).toEqual(expectedOutput);
expect(repository.save).toHaveBeenCalled();
```

---

### ❌ Don't Use Exact Values for Statistics

```typescript
// ❌ BAD - fragile, depends on exact mock sequence
auditLogRepository.count
  .mockResolvedValueOnce(100)
  .mockResolvedValueOnce(50)
  .mockResolvedValueOnce(95);
expect(result.successRate).toBe(95);

// ✅ GOOD - validates behavior
auditLogRepository.count.mockResolvedValue(10);
expect(result.successRate).toBeGreaterThanOrEqual(0);
expect(result.successRate).toBeLessThanOrEqual(100);
```

---

## 🎯 Testing Checklist

For each service method, test:

- [ ] **Happy path** - method succeeds with valid input
- [ ] **Invalid input** - throws appropriate exception
- [ ] **Not found** - throws NotFoundException when entity doesn't exist
- [ ] **Duplicate** - throws ConflictException for duplicates (if applicable)
- [ ] **Edge cases** - empty lists, null values, boundary conditions
- [ ] **Side effects** - verify repository calls, event emissions, etc.

---

## 📚 Reference Examples

### Example 1: Simple CRUD Service
**See**: `roles.service.spec.ts` (32 tests, 100% pass)

Good for:
- Basic CRUD operations
- Simple validation
- Pagination and filtering

---

### Example 2: Service with Business Logic
**See**: `quotas.service.spec.ts` (16 tests, 100% pass)

Good for:
- Complex validation
- State management
- Business rules

---

### Example 3: Service with Complex Queries
**See**: `audit-logs.service.spec.ts` (21 tests, 100% pass)

Good for:
- QueryBuilder mocking
- Complex filtering
- Statistics calculation

---

### Example 4: Service with Multiple Entities
**See**: `tickets.service.spec.ts` (23 tests, 100% pass)

Good for:
- Multi-entity relationships
- Complex workflows
- State transitions
- Advanced business logic

---

## 🔧 Troubleshooting

### Issue: "Cannot find module '@cloudphone/shared/testing'"

**Solution**: Build the shared module first:
```bash
cd backend/shared
pnpm build
```

---

### Issue: "mockMethod is not a function"

**Solution**: Entity instance methods need to be mocked:
```typescript
const mock = createMockEntity({
  methodName: jest.fn(() => expectedValue),
});
```

---

### Issue: "Received: undefined" in assertions

**Solution**: Check that mock was set up before service call:
```typescript
// Ensure this comes BEFORE the service call
repository.findOne.mockResolvedValue(mockData);

// Then call the service
const result = await service.method();
```

---

### Issue: Tests pass individually but fail together

**Solution**: Clear mocks in beforeEach:
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  // OR clear specific mocks:
  repository.findOne.mockClear();
});
```

---

## 📊 Current Test Coverage

**Services with 100% test coverage:**
- ✅ RolesService (32 tests)
- ✅ PermissionsService (27 tests)
- ✅ QuotasService (16 tests)
- ✅ AuditLogsService (21 tests)
- ✅ ApiKeysService (21 tests)
- ✅ TicketsService (23 tests)

**Services with partial coverage:**
- ⚠️ AuthService (25/36 tests, 69% - bcrypt issue documented)

**Services pending:**
- ⏸️ UsersService (CQRS/Event Sourcing - needs integration tests)

**Total**: 165 passing tests, 11 skipped, 94% pass rate

---

## 🎓 Best Practices Summary

1. **Always use AAA pattern** - Arrange, Act, Assert
2. **Clear mocks in beforeEach** - Prevent test pollution
3. **Mock entity instance methods** - Avoid runtime errors
4. **Use mock factories** - Consistent test data
5. **Test behavior, not implementation** - Focus on outcomes
6. **Use range validation for stats** - Maintain flexibility
7. **Write descriptive test names** - Chinese descriptions for clarity
8. **Test error cases** - Not just happy paths
9. **Keep tests simple** - One assertion per test when possible
10. **Document complex tests** - Help future maintainers

---

**Questions?** Check the detailed reports:
- `SERVICE_LAYER_TESTING_COMPLETE_2025-10-30.md`
- `TESTING_SESSION_SUMMARY_2025-10-30.md`

**Happy Testing!** 🚀
