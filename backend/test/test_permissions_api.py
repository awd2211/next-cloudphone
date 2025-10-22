#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API Gateway 权限接口测试脚本
测试数据范围配置和字段权限配置接口
"""

import requests
import redis
import json
from typing import Dict, Any, Optional

# 配置
API_GATEWAY = 'http://localhost:30000/api'
USER_SERVICE = 'http://localhost:30001'
REDIS_HOST = 'localhost'
REDIS_PORT = 6379

# 测试账号
TEST_USER = {
    'username': 'admin',
    'password': 'admin123'
}


class APITester:
    """API 测试工具类"""
    
    def __init__(self):
        self.token: Optional[str] = None
        self.redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)
        
    def log_section(self, title: str):
        """打印分隔线"""
        print(f"\n{'='*60}")
        print(f"  {title}")
        print('='*60)
        
    def get_captcha(self) -> Dict[str, str]:
        """获取验证码"""
        print('\n📋 步骤 1: 获取验证码...')
        
        response = requests.get(f'{API_GATEWAY}/auth/captcha')
        captcha = response.json()
        
        print(f'✅ 验证码 ID: {captcha["id"]}')
        
        # 从 Redis 获取验证码内容
        captcha_key = f'captcha:{captcha["id"]}'
        captcha_code = self.redis_client.get(captcha_key)
        
        if captcha_code:
            print(f'✅ 从 Redis 获取验证码: {captcha_code}')
            captcha['code'] = captcha_code
        else:
            print('❌ 无法从 Redis 获取验证码')
            
        return captcha
    
    def login(self, username: str, password: str, captcha_id: str, captcha_code: str) -> bool:
        """用户登录"""
        print(f'\n📋 步骤 2: 登录账户 [{username}]...')
        
        payload = {
            'username': username,
            'password': password,
            'captcha': captcha_code,
            'captchaId': captcha_id
        }
        
        response = requests.post(
            f'{API_GATEWAY}/auth/login',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get('access_token') or data.get('token')
            if self.token:
                print(f'✅ 登录成功！')
                print(f'🎫 Token: {self.token[:30]}...')
                return True
            else:
                print(f'❌ 登录响应无 token: {json.dumps(data, indent=2, ensure_ascii=False)}')
                return False
        else:
            print(f'❌ 登录失败 ({response.status_code}):')
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
            return False
    
    def test_api(self, url: str, name: str, use_auth: bool = True) -> Dict[str, Any]:
        """测试 API 接口"""
        headers = {}
        if use_auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
            
        response = requests.get(url, headers=headers)
        
        print(f'\n🔍 测试: {name}')
        print(f'📡 URL: {url}')
        print(f'📊 状态码: {response.status_code}')
        
        try:
            data = response.json()
            
            # 显示关键信息
            if isinstance(data, dict):
                if 'success' in data:
                    print(f"   success: {data.get('success')}")
                if 'total' in data:
                    print(f"   total: {data.get('total')}")
                if 'data' in data and isinstance(data['data'], list):
                    print(f"   data 条数: {len(data['data'])}")
                    if len(data['data']) > 0:
                        print(f"   第一条: {json.dumps(data['data'][0], indent=4, ensure_ascii=False)[:200]}...")
                        
            return data
        except Exception as e:
            print(f'❌ 解析响应失败: {e}')
            print(f'   原始响应: {response.text[:200]}')
            return {}
    
    def run_tests(self):
        """运行所有测试"""
        self.log_section('API Gateway 权限接口测试')
        
        # 1. 获取验证码并登录
        captcha = self.get_captcha()
        if 'code' not in captcha:
            print('❌ 无法获取验证码，测试终止')
            return
            
        if not self.login(TEST_USER['username'], TEST_USER['password'], 
                         captcha['id'], captcha['code']):
            print('❌ 登录失败，测试终止')
            return
        
        # 2. 测试通过 API Gateway
        self.log_section('通过 API Gateway 测试')
        
        gateway_data_scopes = self.test_api(
            f'{API_GATEWAY}/data-scopes?isActive=true',
            '数据范围配置（API Gateway）',
            use_auth=True
        )
        
        gateway_field_perms = self.test_api(
            f'{API_GATEWAY}/field-permissions',
            '字段权限配置（API Gateway）',
            use_auth=True
        )
        
        gateway_permissions = self.test_api(
            f'{API_GATEWAY}/permissions?page=1&limit=100',
            '权限列表（API Gateway）',
            use_auth=True
        )
        
        # 3. 直接测试 User Service
        self.log_section('直接访问 User Service (跳过认证)')
        
        direct_data_scopes = self.test_api(
            f'{USER_SERVICE}/data-scopes?isActive=true',
            '数据范围配置（直连 30001）',
            use_auth=False
        )
        
        # 4. 测试总结
        self.log_section('测试总结报告')
        
        results = [
            {
                'name': '登录功能',
                'status': '✅ 成功' if self.token else '❌ 失败'
            },
            {
                'name': 'API Gateway - data-scopes',
                'status': f"✅ {len(gateway_data_scopes.get('data', []))} 条" if gateway_data_scopes.get('data') else '❌ 无数据',
                'data': gateway_data_scopes
            },
            {
                'name': 'API Gateway - field-permissions',
                'status': f"✅ {len(gateway_field_perms.get('data', []))} 条" if gateway_field_perms.get('data') else '❌ 无数据',
                'data': gateway_field_perms
            },
            {
                'name': 'API Gateway - permissions',
                'status': f"✅ {len(gateway_permissions.get('data', []))} 条" if gateway_permissions.get('data') else '❌ 无数据',
                'data': gateway_permissions
            },
            {
                'name': 'User Service - data-scopes (直连)',
                'status': f"✅ {len(direct_data_scopes.get('data', []))} 条" if direct_data_scopes.get('data') else '❌ 无数据',
                'data': direct_data_scopes
            }
        ]
        
        print('\n测试结果:')
        print('-' * 60)
        for i, result in enumerate(results, 1):
            print(f"{i}. {result['name']:<40} {result['status']}")
        print('-' * 60)
        
        # 详细分析
        print('\n🔍 问题诊断:')
        if gateway_data_scopes.get('data') and len(gateway_data_scopes['data']) == 0:
            print('⚠️  API Gateway 返回空数据，但直连 User Service 有数据')
            print('   → 问题可能在于 API Gateway 的代理配置')
        elif gateway_data_scopes.get('data') and len(gateway_data_scopes['data']) > 0:
            print('✅ API Gateway 工作正常')
        
        if direct_data_scopes.get('data') and len(direct_data_scopes['data']) > 0:
            print(f'✅ User Service 数据库有 {len(direct_data_scopes["data"])} 条数据范围配置')


if __name__ == '__main__':
    tester = APITester()
    try:
        tester.run_tests()
    except KeyboardInterrupt:
        print('\n\n⚠️  测试被中断')
    except Exception as e:
        print(f'\n❌ 测试出错: {e}')
        import traceback
        traceback.print_exc()
    finally:
        tester.redis_client.close()

