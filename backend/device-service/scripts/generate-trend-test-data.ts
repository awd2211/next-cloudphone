/**
 * 生成趋势分析测试数据
 * 用于演示和测试资源使用趋势功能
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🚀 开始生成趋势分析测试数据...\n');

  try {
    // 1. 检查是否存在测试节点
    const nodeResult = await dataSource.query(
      `SELECT id, name FROM nodes WHERE name LIKE 'test-node-%' LIMIT 1`
    );

    let testNodeId: string;

    if (nodeResult.length === 0) {
      console.log('📦 创建测试节点...');
      const nodeInsert = await dataSource.query(
        `INSERT INTO nodes (id, name, host, port, status, capacity, usage, load_score, region, zone, labels)
         VALUES (
           gen_random_uuid(),
           'test-node-1',
           '192.168.1.100',
           50051,
           'online',
           '{"totalCpuCores": 16, "totalMemoryMB": 32768, "totalStorageGB": 500, "maxDevices": 50}'::jsonb,
           '{"usedCpuCores": 0, "usedMemoryMB": 0, "usedStorageGB": 0, "activeDevices": 0, "cpuUsagePercent": 0, "memoryUsagePercent": 0, "storageUsagePercent": 0}'::jsonb,
           0,
           'us-west',
           'us-west-1a',
           '{"env": "test"}'::jsonb
         )
         RETURNING id`
      );
      testNodeId = nodeInsert[0].id;
      console.log(`✅ 测试节点创建成功: ${testNodeId}\n`);
    } else {
      testNodeId = nodeResult[0].id;
      console.log(`✅ 使用现有测试节点: ${nodeResult[0].name} (${testNodeId})\n`);
    }

    // 2. 生成过去24小时的节点历史数据（每5分钟一条）
    console.log('📊 生成节点历史数据（过去24小时）...');

    const now = new Date();
    const hoursToGenerate = 24;
    const intervalMinutes = 5;
    const dataPoints = (hoursToGenerate * 60) / intervalMinutes; // 288个数据点

    let insertedCount = 0;
    const batchSize = 50;
    const batches = Math.ceil(dataPoints / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const values: string[] = [];

      for (let i = 0; i < batchSize && (batch * batchSize + i) < dataPoints; i++) {
        const pointIndex = batch * batchSize + i;
        const timestamp = new Date(now.getTime() - (dataPoints - pointIndex - 1) * intervalMinutes * 60 * 1000);

        // 生成有趋势的随机数据（模拟真实场景）
        const timeOfDay = timestamp.getHours();
        const isBusinessHours = timeOfDay >= 9 && timeOfDay <= 18;

        // 业务时间负载更高
        const baseLoad = isBusinessHours ? 60 : 30;
        const randomVariation = Math.random() * 20 - 10; // -10 到 +10

        const cpuUsage = Math.max(10, Math.min(95, baseLoad + randomVariation));
        const memoryUsage = Math.max(15, Math.min(90, baseLoad + randomVariation + 5));
        const storageUsage = Math.max(20, Math.min(80, 30 + Math.random() * 10));

        const usedCpu = (16 * cpuUsage / 100).toFixed(2);
        const usedMemory = Math.floor(32768 * memoryUsage / 100);
        const usedStorage = (500 * storageUsage / 100).toFixed(2);
        const activeDevices = Math.floor(50 * cpuUsage / 100);
        const loadScore = ((cpuUsage + memoryUsage) / 2).toFixed(2);

        values.push(
          `(gen_random_uuid(), '${testNodeId}', '${timestamp.toISOString()}',
            ${cpuUsage.toFixed(2)}, ${usedCpu}, 16,
            ${memoryUsage.toFixed(2)}, ${usedMemory}, 32768,
            ${storageUsage.toFixed(2)}, ${usedStorage}, 500,
            ${activeDevices}, 50, ${loadScore}, 'online', NULL)`
        );
      }

      if (values.length > 0) {
        await dataSource.query(
          `INSERT INTO resource_usage_history (
            id, node_id, recorded_at,
            cpu_usage_percent, used_cpu_cores, total_cpu_cores,
            memory_usage_percent, used_memory_mb, total_memory_mb,
            storage_usage_percent, used_storage_gb, total_storage_gb,
            active_devices, max_devices, load_score, node_status, metadata
          ) VALUES ${values.join(', ')}`
        );
        insertedCount += values.length;
      }

      // 显示进度
      if ((batch + 1) % 2 === 0 || batch === batches - 1) {
        const progress = Math.floor(((batch + 1) / batches) * 100);
        process.stdout.write(`\r   进度: ${progress}% (${insertedCount}/${dataPoints} 数据点)`);
      }
    }

    console.log(`\n✅ 节点历史数据生成完成: ${insertedCount} 条记录\n`);

    // 3. 生成集群级别历史数据
    console.log('📊 生成集群历史数据（过去24小时）...');

    insertedCount = 0;

    for (let batch = 0; batch < batches; batch++) {
      const values: string[] = [];

      for (let i = 0; i < batchSize && (batch * batchSize + i) < dataPoints; i++) {
        const pointIndex = batch * batchSize + i;
        const timestamp = new Date(now.getTime() - (dataPoints - pointIndex - 1) * intervalMinutes * 60 * 1000);

        const timeOfDay = timestamp.getHours();
        const isBusinessHours = timeOfDay >= 9 && timeOfDay <= 18;

        const baseLoad = isBusinessHours ? 55 : 25;
        const randomVariation = Math.random() * 15 - 7.5;

        const cpuUsage = Math.max(10, Math.min(90, baseLoad + randomVariation));
        const memoryUsage = Math.max(15, Math.min(85, baseLoad + randomVariation + 5));
        const storageUsage = Math.max(20, Math.min(75, 35 + Math.random() * 10));

        // 假设集群有4个节点
        const totalCpu = 64;
        const totalMemory = 131072;
        const totalStorage = 2000;
        const totalMaxDevices = 200;

        const usedCpu = (totalCpu * cpuUsage / 100).toFixed(2);
        const usedMemory = Math.floor(totalMemory * memoryUsage / 100);
        const usedStorage = (totalStorage * storageUsage / 100).toFixed(2);
        const activeDevices = Math.floor(totalMaxDevices * cpuUsage / 100);
        const loadScore = ((cpuUsage + memoryUsage) / 2).toFixed(2);

        const onlineNodes = 4; // 固定4个在线节点

        values.push(
          `(gen_random_uuid(), NULL, '${timestamp.toISOString()}',
            ${cpuUsage.toFixed(2)}, ${usedCpu}, ${totalCpu},
            ${memoryUsage.toFixed(2)}, ${usedMemory}, ${totalMemory},
            ${storageUsage.toFixed(2)}, ${usedStorage}, ${totalStorage},
            ${activeDevices}, ${totalMaxDevices}, ${loadScore}, 'cluster',
            '{"onlineNodes": ${onlineNodes}, "offlineNodes": 0, "totalNodes": ${onlineNodes}}'::jsonb)`
        );
      }

      if (values.length > 0) {
        await dataSource.query(
          `INSERT INTO resource_usage_history (
            id, node_id, recorded_at,
            cpu_usage_percent, used_cpu_cores, total_cpu_cores,
            memory_usage_percent, used_memory_mb, total_memory_mb,
            storage_usage_percent, used_storage_gb, total_storage_gb,
            active_devices, max_devices, load_score, node_status, metadata
          ) VALUES ${values.join(', ')}`
        );
        insertedCount += values.length;
      }

      if ((batch + 1) % 2 === 0 || batch === batches - 1) {
        const progress = Math.floor(((batch + 1) / batches) * 100);
        process.stdout.write(`\r   进度: ${progress}% (${insertedCount}/${dataPoints} 数据点)`);
      }
    }

    console.log(`\n✅ 集群历史数据生成完成: ${insertedCount} 条记录\n`);

    // 4. 显示统计信息
    console.log('📈 数据统计:');

    const nodeStats = await dataSource.query(
      `SELECT
        COUNT(*) as total,
        MIN(recorded_at) as earliest,
        MAX(recorded_at) as latest,
        AVG(cpu_usage_percent)::numeric(5,2) as avg_cpu,
        AVG(memory_usage_percent)::numeric(5,2) as avg_memory,
        AVG(active_devices)::numeric(5,2) as avg_devices
       FROM resource_usage_history
       WHERE node_id = $1`,
      [testNodeId]
    );

    const clusterStats = await dataSource.query(
      `SELECT
        COUNT(*) as total,
        MIN(recorded_at) as earliest,
        MAX(recorded_at) as latest,
        AVG(cpu_usage_percent)::numeric(5,2) as avg_cpu,
        AVG(memory_usage_percent)::numeric(5,2) as avg_memory,
        AVG(active_devices)::numeric(5,2) as avg_devices
       FROM resource_usage_history
       WHERE node_id IS NULL`
    );

    console.log('\n   节点数据:');
    console.log(`   - 总记录数: ${nodeStats[0].total}`);
    console.log(`   - 时间范围: ${nodeStats[0].earliest} ~ ${nodeStats[0].latest}`);
    console.log(`   - 平均CPU使用率: ${nodeStats[0].avg_cpu}%`);
    console.log(`   - 平均内存使用率: ${nodeStats[0].avg_memory}%`);
    console.log(`   - 平均活跃设备数: ${nodeStats[0].avg_devices}`);

    console.log('\n   集群数据:');
    console.log(`   - 总记录数: ${clusterStats[0].total}`);
    console.log(`   - 时间范围: ${clusterStats[0].earliest} ~ ${clusterStats[0].latest}`);
    console.log(`   - 平均CPU使用率: ${clusterStats[0].avg_cpu}%`);
    console.log(`   - 平均内存使用率: ${clusterStats[0].avg_memory}%`);
    console.log(`   - 平均活跃设备数: ${clusterStats[0].avg_devices}`);

    console.log('\n✨ 测试数据生成完成！');
    console.log('\n💡 现在可以测试趋势API:');
    console.log(`   curl -H "Authorization: Bearer $TOKEN" \\`);
    console.log(`     "http://localhost:30002/scheduler/nodes/${testNodeId}/usage-trend?hours=24"`);
    console.log('\n   curl -H "Authorization: Bearer $TOKEN" \\');
    console.log('     "http://localhost:30002/scheduler/cluster/usage-trend?hours=24"');

  } catch (error) {
    console.error('\n❌ 生成测试数据时出错:', error.message);
    console.error(error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
