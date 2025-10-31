#!/usr/bin/env node

/**
 * API Gateway 权限接口测试脚本
 * 自动获取验证码、登录并测试权限相关接口
 */

const Redis = require('ioredis');

const API_BASE = 'http://localhost:30000/api';
const USER_SERVICE = 'http://localhost:30001';

async function main() {
  console.log('🚀 开始 API 权限接口测试\n');

  // 连接 Redis
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    db: 0,
  });

  try {
    // 步骤 1: 获取验证码
    console.log('📋 步骤 1: 获取验证码...');
    const captchaRes = await fetch(`${API_BASE}/auth/captcha`);
    const captcha = await captchaRes.json();
    console.log('✅ 验证码 ID:', captcha.id);

    // 从 Redis 获取验证码实际内容
    const captchaCode = await redis.get(`captcha:${captcha.id}`);
    console.log('✅ 从 Redis 获取验证码:', captchaCode);

    if (!captchaCode) {
      console.error('❌ 无法从 Redis 获取验证码');
      return;
    }

    // 步骤 2: 登录
    console.log('\n📋 步骤 2: 使用 admin 账号登录...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
        captcha: captchaCode,
        captchaId: captcha.id,
      }),
    });

    const loginData = await loginRes.json();

    if (loginRes.status !== 200 || !loginData.access_token) {
      console.error('❌ 登录失败:', loginData);
      return;
    }

    console.log('✅ 登录成功！');
    console.log('🎫 Token:', loginData.access_token.substring(0, 30) + '...');

    const token = loginData.access_token;

    // 步骤 3: 测试通过 API Gateway 访问 data-scopes
    console.log('\n📋 步骤 3: 测试数据范围接口（通过 API Gateway）...');
    const gatewayDataScopesRes = await fetch(`${API_BASE}/data-scopes?isActive=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('📊 响应状态:', gatewayDataScopesRes.status);
    const gatewayDataScopes = await gatewayDataScopesRes.json();
    console.log('📊 响应数据:', JSON.stringify(gatewayDataScopes, null, 2));

    if (gatewayDataScopes.data) {
      console.log(`✅ 通过 Gateway 获取到 ${gatewayDataScopes.data.length} 条数据范围配置`);
    } else {
      console.log('❌ 通过 Gateway 未获取到数据');
    }

    // 步骤 4: 测试通过 API Gateway 访问 field-permissions
    console.log('\n📋 步骤 4: 测试字段权限接口（通过 API Gateway）...');
    const gatewayFieldPermRes = await fetch(`${API_BASE}/field-permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('📊 响应状态:', gatewayFieldPermRes.status);
    const gatewayFieldPerm = await gatewayFieldPermRes.json();
    console.log('📊 响应数据:', JSON.stringify(gatewayFieldPerm, null, 2));

    if (gatewayFieldPerm.data) {
      console.log(`✅ 通过 Gateway 获取到 ${gatewayFieldPerm.data.length} 条字段权限配置`);
    } else {
      console.log('❌ 通过 Gateway 未获取到数据');
    }

    // 步骤 5: 对比直接访问 User Service
    console.log('\n📋 步骤 5: 直接访问 User Service (30001)...');
    const directDataScopesRes = await fetch(`${USER_SERVICE}/data-scopes?isActive=true`);
    const directDataScopes = await directDataScopesRes.json();
    console.log(`📊 直接访问返回: ${directDataScopes.data?.length || 0} 条数据范围配置`);

    const directFieldPermRes = await fetch(`${USER_SERVICE}/field-permissions`);
    console.log('📊 字段权限响应状态:', directFieldPermRes.status);
    const directFieldPerm = await directFieldPermRes.json();
    console.log(`📊 直接访问返回: ${directFieldPerm.data?.length || 0} 条字段权限配置`);

    // 测试总结
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试总结');
    console.log('='.repeat(60));
    console.log(`✅ 登录: 成功`);
    console.log(
      `${gatewayDataScopes.data?.length > 0 ? '✅' : '❌'} API Gateway - data-scopes: ${gatewayDataScopes.data?.length || 0} 条`
    );
    console.log(
      `${gatewayFieldPerm.data?.length > 0 ? '✅' : '❌'} API Gateway - field-permissions: ${gatewayFieldPerm.data?.length || 0} 条`
    );
    console.log(`✅ User Service - data-scopes (直连): ${directDataScopes.data?.length || 0} 条`);
    console.log(
      `${directFieldPerm.data?.length > 0 ? '✅' : '⚠️'} User Service - field-permissions (直连): ${directFieldPerm.data?.length || 0} 条`
    );
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await redis.quit();
  }
}

main();
