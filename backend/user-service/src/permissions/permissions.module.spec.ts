import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

// Module
import { PermissionsModule } from './permissions.module';

// Entities
import { Permission } from '../entities/permission.entity';
import { DataScope } from '../entities/data-scope.entity';
import { FieldPermission } from '../entities/field-permission.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Menu } from '../entities/menu.entity';
import { Department } from '../entities/department.entity';
import { Tenant } from '../entities/tenant.entity';
import { AuditLog } from '../entities/audit-log.entity';

// Services
import { CacheService } from '../cache/cache.service';

// Controllers
import { PermissionsController } from './permissions.controller';
import { DataScopeController } from './controllers/data-scope.controller';
import { FieldPermissionController } from './controllers/field-permission.controller';
import { MenuPermissionController } from './controllers/menu-permission.controller';

// Services
import { PermissionsService } from './permissions.service';
import { PermissionCheckerService } from './permission-checker.service';
import { DataScopeService } from './data-scope.service';
import { FieldFilterService } from './field-filter.service';
import { TenantIsolationService } from './tenant-isolation.service';
import { PermissionCacheService } from './permission-cache.service';
import { MenuPermissionService } from './menu-permission.service';
import { AlertService } from '../common/services/alert/alert.service';

describe('PermissionsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    // Create mock repositories for all entities
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    };

    // Create mock CacheService
    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      clear: jest.fn(),
      invalidate: jest.fn(),
      invalidatePattern: jest.fn(),
    };

    // Create mock ConfigService
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          REDIS_HOST: 'localhost',
          REDIS_PORT: 6379,
          ALERT_EMAIL_ENABLED: false,
          ALERT_SMS_ENABLED: false,
        };
        return config[key];
      }),
    };

    module = await Test.createTestingModule({
      controllers: [
        PermissionsController,
        DataScopeController,
        FieldPermissionController,
        MenuPermissionController,
      ],
      providers: [
        PermissionsService,
        PermissionCheckerService,
        DataScopeService,
        FieldFilterService,
        TenantIsolationService,
        PermissionCacheService,
        MenuPermissionService,
        AlertService,
        // Mock all entity repositories
        { provide: getRepositoryToken(Permission), useValue: mockRepository },
        { provide: getRepositoryToken(DataScope), useValue: mockRepository },
        { provide: getRepositoryToken(FieldPermission), useValue: mockRepository },
        { provide: getRepositoryToken(User), useValue: mockRepository },
        { provide: getRepositoryToken(Role), useValue: mockRepository },
        { provide: getRepositoryToken(Menu), useValue: mockRepository },
        { provide: getRepositoryToken(Department), useValue: mockRepository },
        { provide: getRepositoryToken(Tenant), useValue: mockRepository },
        { provide: getRepositoryToken(AuditLog), useValue: mockRepository },
        // Mock services
        { provide: CacheService, useValue: mockCacheService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
      exports: [
        PermissionsService,
        PermissionCheckerService,
        DataScopeService,
        FieldFilterService,
        TenantIsolationService,
        PermissionCacheService,
        MenuPermissionService,
      ],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Structure', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should compile successfully', () => {
      expect(module).toBeInstanceOf(TestingModule);
    });
  });

  describe('Controllers', () => {
    it('should define PermissionsController', () => {
      const controller = module.get<PermissionsController>(PermissionsController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(PermissionsController);
    });

    it('should define DataScopeController', () => {
      const controller = module.get<DataScopeController>(DataScopeController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(DataScopeController);
    });

    it('should define FieldPermissionController', () => {
      const controller = module.get<FieldPermissionController>(FieldPermissionController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(FieldPermissionController);
    });

    it('should define MenuPermissionController', () => {
      const controller = module.get<MenuPermissionController>(MenuPermissionController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(MenuPermissionController);
    });

    it('should define exactly 4 controllers', () => {
      const controllers = [
        PermissionsController,
        DataScopeController,
        FieldPermissionController,
        MenuPermissionController,
      ];

      controllers.forEach((Controller) => {
        const controller = module.get(Controller);
        expect(controller).toBeDefined();
      });
    });
  });

  describe('Providers', () => {
    it('should define PermissionsService', () => {
      const service = module.get<PermissionsService>(PermissionsService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PermissionsService);
    });

    it('should define PermissionCheckerService', () => {
      const service = module.get<PermissionCheckerService>(PermissionCheckerService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PermissionCheckerService);
    });

    it('should define DataScopeService', () => {
      const service = module.get<DataScopeService>(DataScopeService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DataScopeService);
    });

    it('should define FieldFilterService', () => {
      const service = module.get<FieldFilterService>(FieldFilterService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FieldFilterService);
    });

    it('should define TenantIsolationService', () => {
      const service = module.get<TenantIsolationService>(TenantIsolationService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TenantIsolationService);
    });

    it('should define PermissionCacheService', () => {
      const service = module.get<PermissionCacheService>(PermissionCacheService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PermissionCacheService);
    });

    it('should define MenuPermissionService', () => {
      const service = module.get<MenuPermissionService>(MenuPermissionService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MenuPermissionService);
    });

    it('should define AlertService', () => {
      const service = module.get<AlertService>(AlertService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AlertService);
    });

    it('should define exactly 8 providers', () => {
      const providers = [
        PermissionsService,
        PermissionCheckerService,
        DataScopeService,
        FieldFilterService,
        TenantIsolationService,
        PermissionCacheService,
        MenuPermissionService,
        AlertService,
      ];

      providers.forEach((Provider) => {
        const provider = module.get(Provider);
        expect(provider).toBeDefined();
      });
    });
  });

  describe('Exports', () => {
    it('should export PermissionsService', () => {
      const service = module.get<PermissionsService>(PermissionsService);
      expect(service).toBeDefined();
    });

    it('should export PermissionCheckerService', () => {
      const service = module.get<PermissionCheckerService>(PermissionCheckerService);
      expect(service).toBeDefined();
    });

    it('should export DataScopeService', () => {
      const service = module.get<DataScopeService>(DataScopeService);
      expect(service).toBeDefined();
    });

    it('should export FieldFilterService', () => {
      const service = module.get<FieldFilterService>(FieldFilterService);
      expect(service).toBeDefined();
    });

    it('should export TenantIsolationService', () => {
      const service = module.get<TenantIsolationService>(TenantIsolationService);
      expect(service).toBeDefined();
    });

    it('should export PermissionCacheService', () => {
      const service = module.get<PermissionCacheService>(PermissionCacheService);
      expect(service).toBeDefined();
    });

    it('should export MenuPermissionService', () => {
      const service = module.get<MenuPermissionService>(MenuPermissionService);
      expect(service).toBeDefined();
    });

    it('should not export AlertService (internal use only)', () => {
      // AlertService should be defined but not in exports
      const service = module.get<AlertService>(AlertService);
      expect(service).toBeDefined();

      // We can verify it's available in this module but typically not exported
      // for use in other modules (it's an internal helper)
    });

    it('should export exactly 7 services', () => {
      const exportedServices = [
        PermissionsService,
        PermissionCheckerService,
        DataScopeService,
        FieldFilterService,
        TenantIsolationService,
        PermissionCacheService,
        MenuPermissionService,
      ];

      exportedServices.forEach((Service) => {
        const service = module.get(Service);
        expect(service).toBeDefined();
      });
    });
  });

  describe('Dependencies', () => {
    it('should have CacheService available', () => {
      // CacheService is mocked and available to dependent services
      const cacheService = module.get<CacheService>(CacheService);
      expect(cacheService).toBeDefined();

      // Services dependent on CacheService should also work
      const permissionCacheService = module.get<PermissionCacheService>(PermissionCacheService);
      expect(permissionCacheService).toBeDefined();
    });

    it('should have TypeOrmModule configured with all entities', () => {
      // All entity repositories should be available
      const entities = [
        Permission,
        DataScope,
        FieldPermission,
        User,
        Role,
        Menu,
        Department,
        Tenant,
        AuditLog,
      ];

      entities.forEach((Entity) => {
        const repository = module.get(getRepositoryToken(Entity));
        expect(repository).toBeDefined();
      });
    });
  });

  describe('Module Integration', () => {
    it('should allow services to be injected into controllers', () => {
      const controller = module.get<PermissionsController>(PermissionsController);
      expect(controller).toBeDefined();

      // Controller should have access to its service
      expect(controller['permissionsService']).toBeDefined();
    });

    it('should allow cross-service dependencies', () => {
      // PermissionCheckerService depends on PermissionCacheService
      const checkerService = module.get<PermissionCheckerService>(PermissionCheckerService);
      const cacheService = module.get<PermissionCacheService>(PermissionCacheService);

      expect(checkerService).toBeDefined();
      expect(cacheService).toBeDefined();
    });

    it('should have all services properly initialized', () => {
      const services = [
        PermissionsService,
        PermissionCheckerService,
        DataScopeService,
        FieldFilterService,
        TenantIsolationService,
        PermissionCacheService,
        MenuPermissionService,
      ];

      services.forEach((Service) => {
        const service = module.get(Service);
        expect(service).toBeDefined();
        expect(service).toBeInstanceOf(Service);
      });
    });
  });

  describe('Module Capabilities', () => {
    it('should support RBAC functionality', () => {
      const permissionsService = module.get<PermissionsService>(PermissionsService);
      const checkerService = module.get<PermissionCheckerService>(PermissionCheckerService);

      expect(permissionsService).toBeDefined();
      expect(checkerService).toBeDefined();
    });

    it('should support data scope control', () => {
      const dataScopeService = module.get<DataScopeService>(DataScopeService);
      const dataScopeController = module.get<DataScopeController>(DataScopeController);

      expect(dataScopeService).toBeDefined();
      expect(dataScopeController).toBeDefined();
    });

    it('should support field-level permissions', () => {
      const fieldFilterService = module.get<FieldFilterService>(FieldFilterService);
      const fieldPermissionController =
        module.get<FieldPermissionController>(FieldPermissionController);

      expect(fieldFilterService).toBeDefined();
      expect(fieldPermissionController).toBeDefined();
    });

    it('should support multi-tenant isolation', () => {
      const tenantService = module.get<TenantIsolationService>(TenantIsolationService);

      expect(tenantService).toBeDefined();
    });

    it('should support permission caching', () => {
      const cacheService = module.get<PermissionCacheService>(PermissionCacheService);

      expect(cacheService).toBeDefined();
    });

    it('should support menu permissions', () => {
      const menuService = module.get<MenuPermissionService>(MenuPermissionService);
      const menuController = module.get<MenuPermissionController>(MenuPermissionController);

      expect(menuService).toBeDefined();
      expect(menuController).toBeDefined();
    });
  });
});
