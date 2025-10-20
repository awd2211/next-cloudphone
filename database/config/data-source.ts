import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// 加载环境变量
config({ path: '../../.env' });

// 导入所有实体
// 用户服务
import { User } from '../../backend/user-service/src/entities/user.entity';
import { Role } from '../../backend/user-service/src/entities/role.entity';
import { Permission } from '../../backend/user-service/src/entities/permission.entity';

// 设备服务
import { Device } from '../../backend/device-service/src/entities/device.entity';

// 应用服务
import { Application } from '../../backend/app-service/src/entities/application.entity';
import { DeviceApplication } from '../../backend/app-service/src/entities/device-application.entity';

// 计费服务
import { Order } from '../../backend/billing-service/src/billing/entities/order.entity';
import { Plan } from '../../backend/billing-service/src/billing/entities/plan.entity';
import { UsageRecord } from '../../backend/billing-service/src/billing/entities/usage-record.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'cloudphone',
  entities: [
    User,
    Role,
    Permission,
    Device,
    Application,
    DeviceApplication,
    Order,
    Plan,
    UsageRecord,
  ],
  migrations: ['./migrations/*.ts'],
  synchronize: false, // 生产环境必须为 false
  logging: true,
});
