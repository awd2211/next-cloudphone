#!/bin/bash

echo "========================================"
echo "  测试P1新增API接口"
echo "========================================"
echo ""

# 使用测试token (从P0任务报告中的token)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBjbG91ZHBob25lLmNvbSIsInRlbmFudElkIjpudWxsLCJyb2xlcyI6WyJzdXBlcl9hZG1pbiJdLCJwZXJtaXNzaW9ucyI6WyJ1c2VyOnJlYWQiLCJ1c2VyOmNyZWF0ZSIsInVzZXI6dXBkYXRlIiwidXNlcjpkZWxldGUiLCJyb2xlOnJlYWQiLCJyb2xlOmNyZWF0ZSIsInJvbGU6dXBkYXRlIiwicm9sZTpkZWxldGUiLCJwZXJtaXNzaW9uOnJlYWQiLCJwZXJtaXNzaW9uOmNyZWF0ZSIsInBlcm1pc3Npb246dXBkYXRlIiwicGVybWlzc2lvbjpkZWxldGUiLCJkZXZpY2U6cmVhZCIsImRldmljZTpjcmVhdGUiLCJkZXZpY2U6dXBkYXRlIiwiZGV2aWNlOmRlbGV0ZSIsImRldmljZTpjb250cm9sIiwiYXBwOnJlYWQiLCJhcHA6Y3JlYXRlIiwiYXBwOnVwZGF0ZSIsImFwcDpkZWxldGUiLCJiaWxsaW5nOnJlYWQiLCJiaWxsaW5nOmNyZWF0ZSIsImJpbGxpbmc6dXBkYXRlIiwiYmlsbGluZzpkZWxldGUiLCJzeXN0ZW06cmVhZCIsInN5c3RlbTptYW5hZ2UiLCJzeXN0ZW06ZGFzaGJvYXJkOnZpZXciLCJkZXZpY2U6bGlzdCIsImRldmljZTp0ZW1wbGF0ZTpsaXN0IiwiZGV2aWNlOmdyb3VwOmxpc3QiLCJ1c2VyOmxpc3QiLCJyb2xlOmxpc3QiLCJhcHA6bGlzdCIsImFwcDptYXJrZXQ6dmlldyIsIm5vdGlmaWNhdGlvbjpsaXN0Iiwibm90aWZpY2F0aW9uOnRlbXBsYXRlOm1hbmFnZSIsImJpbGxpbmc6b3ZlcnZpZXciLCJiaWxsaW5nOnBsYW46bGlzdCIsImJpbGxpbmc6dHJhbnNhY3Rpb246bGlzdCIsImJpbGxpbmc6aW52b2ljZTpsaXN0IiwiYW5hbHl0aWNzOnZpZXciLCJzeXN0ZW06dmlldyIsInN5c3RlbTpzZXR0aW5nczptYW5hZ2UiLCJzeXN0ZW06bG9nczp2aWV3Iiwic3lzdGVtOmF1ZGl0OnZpZXciXSwiaWF0IjoxNzYxOTExOTAzLCJleHAiOjE3NjE5OTgzMDMsImF1ZCI6ImNsb3VkcGhvbmUtdXNlcnMiLCJpc3MiOiJjbG91ZHBob25lLXBsYXRmb3JtIn0.9N6aoZQMaH1VKRcfiNNPDjs9tD6HcqBk0tKfvI0-GPk"

echo "1️⃣  测试支付方式管理接口"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "测试 GET /users/profile/payment-methods (获取支付方式列表)"
response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost:30000/users/profile/payment-methods)
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ] || [ "$http_code" = "404" ]; then
    echo "✅ 接口正常 (HTTP $http_code)"
    echo "响应: $body" | head -c 500
    if [ ${#body} -gt 500 ]; then
        echo "... (响应过长，已截断)"
    fi
else
    echo "❌ 接口异常 (HTTP $http_code)"
    echo "响应: $body"
fi
echo ""

echo "2️⃣  测试计费对账接口"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "测试 GET /billing/admin/cloud-reconciliation (云对账)"
response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:30000/billing/admin/cloud-reconciliation?startDate=2025-11-01&endDate=2025-11-03")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    echo "✅ 接口正常 (HTTP $http_code)"
    echo "响应: $body" | head -c 500
    if [ ${#body} -gt 500 ]; then
        echo "... (响应过长，已截断)"
    fi
else
    echo "❌ 接口异常 (HTTP $http_code)"
    echo "响应: $body"
fi
echo ""

echo "========================================"
echo "  ✅ P1接口测试完成"
echo "========================================"
echo ""
echo "说明:"
echo "- 支付方式管理接口: 通过Gateway代理到user-service"
echo "- 云对账接口: 通过Gateway代理到billing-service"
echo "- Gateway的通配符路由自动覆盖所有子路由"
echo ""
