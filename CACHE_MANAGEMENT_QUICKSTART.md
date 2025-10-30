# Cache Management - Quick Start Guide

## 🚀 Quick Access

**URL**: http://localhost:5173/system/cache

**Menu Path**: 系统管理 → 缓存管理

---

## 📊 What You'll See

### Statistics Dashboard (8 Metrics)

**Row 1 - Cache Performance**:
- **L1 命中数**: In-memory cache hits (fastest)
- **L2 命中数**: Redis cache hits (fast)
- **未命中数**: Cache misses (slow, requires database query)
- **总请求数**: Total cache requests

**Row 2 - Cache Health**:
- **命中率**: Hit rate percentage (higher is better)
- **未命中率**: Miss rate percentage (lower is better)
- **L1 缓存大小**: Number of keys in memory cache
- **L2 缓存大小**: Number of keys in Redis cache

**Performance Colors**:
- 🟢 Green (≥80%): Excellent performance
- 🔵 Blue (50-80%): Normal performance
- 🔴 Red (<50%): Needs optimization

---

## 🛠️ Available Operations

### 1. Refresh Stats (刷新统计)
- **Action**: Click "刷新统计" button
- **Effect**: Manually refresh statistics
- **Note**: Stats auto-refresh every 10 seconds

### 2. Reset Stats (重置统计)
- **Action**: Click "重置统计" button
- **Effect**: Reset all counters to zero
- **Use Case**: Starting fresh after optimization

### 3. Delete Specific Key (删除指定键)
- **Action**: Click "删除指定键" button
- **Input**: Enter exact cache key (e.g., `user:123`)
- **Effect**: Deletes single cache entry
- **Use Case**: Remove stale or incorrect data

### 4. Delete by Pattern (按模式删除)
- **Action**: Click "按模式删除" button
- **Input**: Enter pattern with wildcards
  - `user:*` - All keys starting with "user:"
  - `session:123*` - All keys starting with "session:123"
  - `*:temp` - All keys ending with ":temp"
- **Effect**: Deletes all matching keys
- **Result**: Shows deletion count
- **Use Case**: Bulk cleanup of related data

### 5. Check Key Exists (检查键存在)
- **Action**: Click "检查键存在" button
- **Input**: Enter cache key (e.g., `user:456`)
- **Result**: Shows whether key exists in cache
- **Use Case**: Debugging cache issues

### 6. Flush All Cache (清空所有缓存)
- **Action**: Click "清空所有缓存" button (red button)
- **Confirmation**: Requires confirmation
- **Effect**: Clears L1 and L2 completely
- **Warning**: ⚠️ **Use with caution** - affects all users
- **Use Case**: Major system updates or critical bugs

---

## 🎯 Common Use Cases

### Scenario 1: User Reports Stale Data
```
Problem: User sees outdated information
Solution:
1. Click "删除指定键"
2. Enter: user:{userId}
3. Click "删除"
Result: User's cache cleared, will fetch fresh data
```

### Scenario 2: Clear All User Caches
```
Problem: User table updated, need to clear all user caches
Solution:
1. Click "按模式删除"
2. Enter: user:*
3. Click "删除"
Result: All user caches cleared (shows count, e.g., "已删除 150 个缓存键")
```

### Scenario 3: Check Cache Performance
```
Task: Verify cache is working well
Steps:
1. Look at "命中率" card
2. Check color indicator:
   - Green: ✅ Cache is healthy
   - Blue: ⚠️ Could be better
   - Red: ❌ Needs investigation
3. If red, consider:
   - Increasing cache TTL
   - Pre-warming cache
   - Optimizing queries
```

### Scenario 4: Debug Missing Data
```
Problem: Data should be cached but seems missing
Steps:
1. Click "检查键存在"
2. Enter suspected key (e.g., device:789)
3. View result:
   - "键存在" → Cache is fine, issue elsewhere
   - "键不存在" → Cache miss, check why
```

### Scenario 5: After Major Deployment
```
Problem: New code deployed with schema changes
Solution:
1. Click "清空所有缓存"
2. Confirm in dialog
3. Verify stats reset to zero
4. Monitor as cache rebuilds
Result: Clean slate for new code
```

---

## 📖 Understanding the Cache System

### Two-Layer Architecture

```
Request → Check L1 (NodeCache) → Found? Return ✅
              ↓ Miss
          Check L2 (Redis) → Found? Return + Backfill L1 ✅
              ↓ Miss
          Query Database → Return + Cache in L1 & L2 ✅
```

### Key Characteristics

| Layer | Type | Speed | Scope | Persistence |
|-------|------|-------|-------|-------------|
| **L1** | NodeCache | Fastest | Single process | Memory only |
| **L2** | Redis | Fast | All services | Can persist |
| **DB** | PostgreSQL | Slow | All services | Persistent |

### Performance Guidelines

**Good Cache Hit Rate**:
- Total hit rate (L1+L2) ≥ 80%
- Indicates queries rarely hit database
- Reduces database load and improves response time

**Poor Cache Hit Rate**:
- Total hit rate < 50%
- Too many database queries
- Possible causes:
  - Cache TTL too short
  - Cache keys changing frequently
  - Data not suitable for caching
  - Cache size too small (eviction)

---

## ⚠️ Important Notes

### Safety Considerations

1. **Flush Cache**: Dangerous operation, use sparingly
   - Affects **all users** system-wide
   - Causes temporary performance drop as cache rebuilds
   - Only use for major updates or critical bugs

2. **Pattern Delete**: Powerful but be specific
   - `*` alone would delete everything
   - Double-check pattern before confirming
   - Example: `user:123*` not `user*` (too broad)

3. **Key Naming**: Follow conventions
   - Format: `{entity}:{id}` or `{entity}:{id}:{field}`
   - Examples: `user:123`, `device:456`, `session:abc123`

### Best Practices

1. **Monitor Regularly**: Check stats weekly
2. **Investigate Red Flags**: Hit rate < 50% needs attention
3. **Use Patterns Wisely**: Test with specific keys first
4. **Document Actions**: Note why you flushed cache
5. **Off-Peak Operations**: Flush during low-traffic times

---

## 🐛 Troubleshooting

### Problem: Page Won't Load
```
Solution:
1. Check backend services running:
   pm2 list
2. Ensure user-service is online:
   pm2 restart user-service
3. Check API gateway:
   curl http://localhost:30000/health
```

### Problem: Stats Show All Zeros
```
Possible causes:
1. Cache recently flushed
2. No traffic yet
3. Backend issue

Solution:
1. Wait 1 minute for traffic
2. Check backend logs:
   pm2 logs user-service
3. Try manual refresh
```

### Problem: "加载缓存统计失败"
```
Cause: Backend API unreachable

Solution:
1. Verify backend running:
   pm2 logs user-service | grep cache
2. Check network:
   curl http://localhost:30001/cache/stats
3. Check auth token:
   - Logout and login again
```

### Problem: Delete Operation Fails
```
Possible causes:
1. Invalid key name
2. Key doesn't exist (not an error, but no change)
3. Backend connection issue

Solution:
1. Verify key exists first (use "检查键存在")
2. Check exact key spelling
3. Check backend logs for errors
```

---

## 📞 Need Help?

If you encounter issues:

1. **Check Backend Logs**:
   ```bash
   pm2 logs user-service --lines 50
   ```

2. **Check Backend Health**:
   ```bash
   curl http://localhost:30001/health
   ```

3. **Check Cache Stats API**:
   ```bash
   curl http://localhost:30001/cache/stats
   ```

4. **Browser Console**: Check for JavaScript errors (F12 → Console)

---

**Last Updated**: 2025-10-30
**Version**: 1.0
**Status**: Production Ready
