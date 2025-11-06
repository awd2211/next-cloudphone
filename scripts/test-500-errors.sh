#!/bin/bash

echo "========================================"
echo "  测试500错误的接口"
echo "========================================"
echo ""

# 从P0报告获取的测试token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBjbG91ZHBob25lLmNvbSIsInRlbmFudElkIjpudWxsLCJyb2xlcyI6WyJzdXBlcl9hZG1pbiJdLCJwZXJtaXNzaW9ucyI6WyJ1c2VyOnJlYWQiLCJ1c2VyOmNyZWF0ZSIsInVzZXI6dXBkYXRlIiwidXNlcjpkZWxldGUiLCJyb2xlOnJlYWQiLCJyb2xlOmNyZWF0ZSIsInJvbGU6dXBkYXRlIiwicm9sZTpkZWxldGUiLCJwZXJtaXNzaW9uOnJlYWQiLCJwZXJtaXNzaW9uOmNyZWF0ZSIsInBlcm1pc3Npb246dXBkYXRlIiwicGVybWlzc2lvbjpkZWxldGUiLCJkZXZpY2U6cmVhZCIsImRldmljZTpjcmVhdGUiLCJkZXZpY2U6dXBkYXRlIiwiZGV2aWNlOmRlbGV0ZSIsImRldmljZTpjb250cm9sIiwiYXBwOnJlYWQiLCJhcHA6Y3JlYXRlIiwiYXBwOnVwZGF0ZSIsImFwcDpkZWxldGUiLCJiaWxsaW5nOnJlYWQiLCJiaWxsaW5nOmNyZWF0ZSIsImJpbGxpbmc6dXBkYXRlIiwiYmlsbGluZzpkZWxldGUiLCJzeXN0ZW06cmVhZCIsInN5c3RlbTptYW5hZ2UiLCJzeXN0ZW06ZGFzaGJvYXJkOnZpZXciLCJkZXZpY2U6bGlzdCIsImRldmljZTp0ZW1wbGF0ZTpsaXN0IiwiZGV2aWNlOmdyb3VwOmxpc3QiLCJ1c2VyOmxpc3QiLCJyb2xlOmxpc3QiLCJhcHA6bGlzdCIsImFwcDptYXJrZXQ6dmlldyIsIm5vdGlmaWNhdGlvbjpsaXN0Iiwibm90aWZpY2F0aW9uOnRlbXBsYXRlOm1hbmFnZSIsImJpbGxpbmc6b3ZlcnZpZXciLCJiaWxsaW5nOnBsYW46bGlzdCIsImJpbGxpbmc6dHJhbnNhY3Rpb246bGlzdCIsImJpbGxpbmc6aW52b2ljZTpsaXN0IiwiYW5hbHl0aWNzOnZpZXciLCJzeXN0ZW06dmlldyIsInN5c3RlbTpzZXR0aW5nczptYW5hZ2UiLCJzeXN0ZW06bG9nczp2aWV3Iiwic3lzdGVtOmF1ZGl0OnZpZXciXSwiaWF0IjoxNzYxOTExOTAzLCJleHAiOjE3NjE5OTgzMDMsImF1ZCI6ImNsb3VkcGhvbmUtdXNlcnMiLCJpc3MiOiJjbG91ZHBob25lLXBsYXRmb3JtIn0.9N6aoZQMaH1VKRcfiNNPDjs9tD6HcqBk0tKfvI0-GPk"

USER_ID="adff5704-873b-4014-8413-d42ff84f9f79"

echo "1️⃣  测试 GET /notifications/user/:userId"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" \
  "http://localhost:30000/notifications/user/$USER_ID")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

echo "HTTP Status: $http_code"
echo "Response: $body" | head -c 500
echo ""
echo ""

echo "2️⃣  测试 GET /sms (通过Gateway)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" \
  "http://localhost:30000/sms?page=1&limit=10")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

echo "HTTP Status: $http_code"
echo "Response: $body" | head -c 500
echo ""
echo ""

echo "3️⃣  测试 GET /sms/stats (通过Gateway)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" \
  "http://localhost:30000/sms/stats")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

echo "HTTP Status: $http_code"
echo "Response: $body" | head -c 500
echo ""
echo ""

echo "4️⃣  直接测试 notification-service (绕过Gateway)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" \
  "http://localhost:30006/notifications/user/$USER_ID")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

echo "HTTP Status: $http_code"
echo "Response: $body" | head -c 500
echo ""
echo ""

echo "========================================"
echo "  测试完成"
echo "========================================"
