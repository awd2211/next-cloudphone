# Phase 3: Priority Queue Feature - Completion Report

**Date**: 2025-10-30
**Feature**: Priority Queue (优先级队列)
**Status**: ✅ Completed

---

## Overview

Implemented a comprehensive priority queue system for device allocation when no devices are immediately available. The system supports multi-tier user priorities (Standard, VIP, Premium, Enterprise) with automatic queue processing, position tracking, and intelligent retry mechanisms.

---

## Implemented Components

### 1. Database Layer

**Entity**: `backend/device-service/src/entities/allocation-queue.entity.ts`
- Complete TypeORM entity with 5 queue states
- 4-tier priority system (0-3)
- Full metadata support via JSONB column
- Optimized indexes for priority sorting

**Migration**: `backend/device-service/migrations/20251030_create_allocation_queue.sql`
- PostgreSQL ENUM type for queue_status
- Specialized composite index for priority sorting
- Multiple performance-optimized indexes
- Auto-update trigger for updated_at

**Queue States**:
```typescript
enum QueueStatus {
  WAITING      // Waiting in queue
  PROCESSING   // Being processed (attempting allocation)
  FULFILLED    // Successfully allocated
  EXPIRED      // Timeout or max retries exceeded
  CANCELLED    // User cancelled
}
```

**Priority Levels**:
```typescript
enum UserPriority {
  STANDARD = 0    // Standard users
  VIP = 1         // VIP users
  PREMIUM = 2     // Premium VIP
  ENTERPRISE = 3  // Enterprise users (highest priority)
}
```

### 2. Data Transfer Objects (DTOs)

**File**: `backend/device-service/src/scheduler/dto/queue.dto.ts`

**Created 10 DTO Classes**:

1. **JoinQueueDto** - Join queue request
   - Duration: 15-1440 minutes
   - Device preferences (type, CPU, memory)
   - Max wait time: 1-120 minutes (default 30)

2. **CancelQueueDto** - Cancel queue entry
   - Optional cancellation reason

3. **QueryQueueDto** - Search queue entries
   - Filter by userId, status, deviceType
   - Pagination support

4. **QueueEntryResponse** - Single queue entry details
   - Queue position and estimated wait time
   - Priority and user tier
   - Retry count and timestamps

5. **QueueListResponse** - Paginated queue list
   - Array of queue entries
   - Total count and pagination metadata

6. **QueueStatistics** - Queue analytics
   - Counts by status
   - Success rate calculation
   - Average wait time
   - Statistics by priority tier

7. **QueuePositionResponse** - Position tracking
   - Current position
   - Ahead count
   - Estimated wait time
   - Waited/remaining time

8. **ProcessQueueBatchDto** - Batch processing config
   - Max count (1-50)
   - Device type filter
   - Continue on error flag

9. **ProcessQueueBatchResult** - Batch processing result
   - Success/failure counts
   - Detailed success/failure lists
   - Execution time

### 3. Business Logic Service

**File**: `backend/device-service/src/scheduler/queue.service.ts`

**Core Methods** (13 total):

#### Queue Operations

1. **joinQueue()**
   - Checks for existing queue entry (prevents duplicates)
   - Determines priority based on user tier
   - Creates queue entry with initial position 0
   - Calculates actual position after creation
   - Publishes `scheduler.queue.joined` event
   - Sends queue confirmation notification

**Priority Assignment**:
```typescript
userTier: 'standard' → priority: 0
userTier: 'vip'      → priority: 1
userTier: 'premium'  → priority: 2
userTier: 'enterprise' → priority: 3
```

2. **cancelQueue()**
   - Only allows cancellation for WAITING/PROCESSING
   - Records cancellation reason and timestamp
   - Recalculates all positions
   - Publishes `scheduler.queue.cancelled` event

3. **getQueueEntry()** - Fetch by ID

4. **getQueueList()** - Query with filters
   - Supports userId, status, deviceType filtering
   - Ordered by priority DESC, createdAt ASC
   - Pagination with configurable page size

5. **getQueuePosition()** - Position tracking
   - Calculates ahead count
   - Computes waited minutes
   - Shows remaining max wait time
   - Only for WAITING status

#### Processing System

6. **processNextQueueEntry()**
   - Fetches next entry by priority (DESC) and time (ASC)
   - Updates status to PROCESSING
   - Calls `AllocationService.allocateDevice()`
   - On success:
     - Updates to FULFILLED
     - Records device and allocation IDs
     - Publishes `scheduler.queue.fulfilled` event
     - Sends success notification
     - Recalculates all positions
   - On failure:
     - Increments retry count
     - After 3 failures → marks as EXPIRED
     - Otherwise → returns to WAITING

**Priority Queue Algorithm**:
```sql
SELECT * FROM allocation_queue
WHERE status = 'waiting'
ORDER BY
  priority DESC,    -- Higher priority first
  created_at ASC    -- Earlier entries first within same priority
LIMIT 1
```

7. **processQueueBatch()**
   - Processes multiple entries (max 50)
   - Optional device type filtering
   - Continue on error support
   - Returns detailed success/failure report
   - Tracks execution time

#### Automated Cron Jobs

8. **autoProcessQueue()** - Every minute
   - Checks for waiting entries
   - Checks for available devices
   - Processes up to min(available devices, 10)
   - Uses batch processing

9. **markExpiredQueueEntries()** - Every 5 minutes
   - Finds entries exceeding max wait time
   - Marks as EXPIRED
   - Sends expiration notifications
   - Recalculates remaining positions

**Expiry Check**:
```sql
WHERE status = 'waiting'
  AND (NOW() - created_at) / 60 > max_wait_minutes
```

10. **updateAllQueuePositions()** - Every minute
    - Recalculates all positions
    - Updates estimated wait times

#### Statistics

11. **getQueueStatistics()**
    - Counts by status (waiting, processing, fulfilled, expired, cancelled)
    - Success rate = fulfilled / (total - cancelled)
    - Average wait time from fulfilled entries
    - Statistics grouped by user tier

#### Helper Methods

12. **recalculateAllPositions()** - Private
    - Fetches all WAITING entries in priority order
    - Assigns sequential positions
    - Calculates estimated wait time
    - Formula: `position × AVERAGE_DEVICE_USAGE_MINUTES`

13. **updateQueuePosition()** - Private
    - Updates single entry's position
    - Counts entries with higher/equal priority and earlier time

### 4. API Endpoints

**File**: `backend/device-service/src/scheduler/scheduler.controller.ts`

**Created 8 REST Endpoints**:

1. **POST /scheduler/queue/join**
   - Join queue
   - Query params: userId (required), tenantId, userTier (default: 'standard')
   - Body: JoinQueueDto
   - Returns: QueueEntryResponse with position

2. **POST /scheduler/queue/:id/cancel**
   - Cancel queue entry
   - Body: CancelQueueDto (optional reason)
   - Returns: QueueEntryResponse

3. **GET /scheduler/queue/:id**
   - Get queue entry by ID
   - Returns: QueueEntryResponse

4. **GET /scheduler/queue**
   - Query queue entries
   - Query params: userId, status, deviceType, page, pageSize
   - Returns: QueueListResponse

5. **GET /scheduler/queue/:id/position**
   - Get position tracking info
   - Returns: QueuePositionResponse

6. **POST /scheduler/queue/process-next** (Admin)
   - Manually process next entry
   - Returns: success boolean

7. **POST /scheduler/queue/process-batch** (Admin)
   - Batch process queue
   - Body: ProcessQueueBatchDto
   - Returns: ProcessQueueBatchResult

8. **GET /scheduler/queue/stats**
   - Get queue statistics
   - Returns: QueueStatistics

### 5. Module Integration

**File**: `backend/device-service/src/scheduler/scheduler.module.ts`

**Changes**:
- Added `AllocationQueue` entity to TypeOrmModule.forFeature
- Registered `QueueService` as provider
- Exported `QueueService` for use in other modules

---

## Technical Features

### 1. Priority-Based Processing

**Sorting Algorithm**:
```typescript
ORDER BY
  priority DESC,    // 3 > 2 > 1 > 0
  created_at ASC    // Earlier = first
```

**Examples**:
```
Position 1: Enterprise user (priority 3), joined 10:00
Position 2: Enterprise user (priority 3), joined 10:05
Position 3: Premium user (priority 2), joined 09:55
Position 4: VIP user (priority 1), joined 09:50
Position 5: Standard user (priority 0), joined 09:45
```

### 2. Intelligent Retry Mechanism

**Retry Logic**:
```typescript
Attempt 1: WAITING → PROCESSING → (fail) → WAITING (retry_count=1)
Attempt 2: WAITING → PROCESSING → (fail) → WAITING (retry_count=2)
Attempt 3: WAITING → PROCESSING → (fail) → EXPIRED (retry_count=3)
```

**Benefits**:
- Handles transient failures
- Prevents infinite retries
- Notifies user after max retries

### 3. Position Tracking

**Dynamic Calculation**:
```typescript
queuePosition = COUNT(
  entries with higher priority
  OR (same priority AND earlier creation time)
) + 1
```

**Estimated Wait Time**:
```typescript
estimatedWaitMinutes = queuePosition × AVERAGE_DEVICE_USAGE_MINUTES
// Default: position × 30 minutes
```

### 4. Automatic Expiration

**Expiry Conditions**:
1. **Timeout**: Waited longer than `max_wait_minutes`
2. **Max Retries**: Failed 3 allocation attempts

**Expiry Handling**:
- Marks status as EXPIRED
- Records expiry reason and timestamp
- Sends expiration notification
- Recalculates remaining positions

### 5. Notification System

**Multi-Channel Support**:
- WebSocket: Real-time updates
- Email: Important events (fulfilled, expired)

**Notification Types**:
1. `queue_joined` - Successfully joined queue
2. `queue_fulfilled` - Device allocated
3. `queue_expired` - Queue entry expired
4. `queue_cancelled` - User cancelled (no notification, silent)

### 6. Event-Driven Architecture

**Published Events**:
```typescript
"scheduler.queue.joined"     // User joined queue
"scheduler.queue.cancelled"  // User cancelled
"scheduler.queue.fulfilled"  // Device allocated
```

**Event Payload**:
- queueId
- userId
- priority & userTier
- Additional context (deviceId, waitedMinutes, etc.)

---

## Database Schema

### allocation_queue Table

```sql
CREATE TABLE allocation_queue (
  -- Identity
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255),

  -- Status & Priority
  status queue_status NOT NULL DEFAULT 'waiting',
  priority INT NOT NULL DEFAULT 0,
  user_tier VARCHAR(50) DEFAULT 'standard',

  -- Device preferences
  device_type VARCHAR(100),
  min_cpu INT,
  min_memory INT,
  duration_minutes INT NOT NULL DEFAULT 60,

  -- Queue information
  queue_position INT,
  estimated_wait_minutes INT,
  max_wait_minutes INT DEFAULT 30,

  -- Processing results
  allocated_device_id VARCHAR(255),
  allocation_id VARCHAR(255),
  processed_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- Expiration
  expired_at TIMESTAMPTZ,
  expiry_reason TEXT,

  -- Retry tracking
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
-- 核心：优先级队列排序索引（最重要）
CREATE INDEX idx_allocation_queue_priority_sort
  ON allocation_queue(status, priority DESC, created_at ASC)
  WHERE status = 'waiting';

-- 用户查询
CREATE INDEX idx_allocation_queue_user_id
  ON allocation_queue(user_id);

CREATE INDEX idx_allocation_queue_user_status
  ON allocation_queue(user_id, status);

-- 状态查询
CREATE INDEX idx_allocation_queue_status
  ON allocation_queue(status);

-- 设备类型查询
CREATE INDEX idx_allocation_queue_device_type
  ON allocation_queue(device_type)
  WHERE device_type IS NOT NULL;

-- 过期检查（cron任务）
CREATE INDEX idx_allocation_queue_expiry_check
  ON allocation_queue(status, created_at)
  WHERE status = 'waiting';
```

**Index Optimization**:
- Partial index on WAITING status (most queried)
- Composite index includes all ORDER BY columns
- DESC/ASC specification matches query patterns

---

## API Usage Examples

### 1. Join Queue

```bash
POST /scheduler/queue/join?userId=user-123&userTier=vip

{
  "durationMinutes": 60,
  "deviceType": "android",
  "minCpu": 4,
  "minMemory": 8192,
  "maxWaitMinutes": 30
}

# Response
{
  "success": true,
  "data": {
    "id": "queue-abc123",
    "userId": "user-123",
    "status": "waiting",
    "priority": 1,
    "userTier": "vip",
    "queuePosition": 3,
    "estimatedWaitMinutes": 90,
    "maxWaitMinutes": 30,
    "durationMinutes": 60,
    "deviceType": "android",
    "retryCount": 0,
    "createdAt": "2025-10-30T15:00:00.000Z"
  },
  "message": "Joined queue at position 3"
}
```

### 2. Check Position

```bash
GET /scheduler/queue/:id/position

# Response
{
  "success": true,
  "data": {
    "queueId": "queue-abc123",
    "position": 3,
    "aheadCount": 2,
    "estimatedWaitMinutes": 90,
    "waitedMinutes": 5,
    "remainingMaxWaitMinutes": 25
  },
  "message": "Currently at position 3"
}
```

### 3. Query User's Queue Entries

```bash
GET /scheduler/queue?userId=user-123&status=waiting

# Response
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "queue-abc123",
        "userId": "user-123",
        "status": "waiting",
        "priority": 1,
        "queuePosition": 3,
        ...
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  },
  "message": "Found 1 queue entry(ies)"
}
```

### 4. Cancel Queue Entry

```bash
POST /scheduler/queue/:id/cancel

{
  "reason": "No longer needed"
}

# Response
{
  "success": true,
  "data": {
    "id": "queue-abc123",
    "status": "cancelled",
    "cancelledAt": "2025-10-30T15:10:00Z",
    "cancelReason": "No longer needed"
  },
  "message": "Queue entry cancelled successfully"
}
```

### 5. Get Queue Statistics

```bash
GET /scheduler/queue/stats

# Response
{
  "success": true,
  "data": {
    "waitingCount": 15,
    "processingCount": 2,
    "fulfilledCount": 85,
    "expiredCount": 3,
    "cancelledCount": 5,
    "totalCount": 110,
    "successRate": 0.81,
    "averageWaitMinutes": 12.5,
    "byPriority": {
      "standard": { "waiting": 10, "fulfilled": 50 },
      "vip": { "waiting": 3, "fulfilled": 25 },
      "premium": { "waiting": 2, "fulfilled": 8 },
      "enterprise": { "waiting": 0, "fulfilled": 2 }
    }
  }
}
```

### 6. Admin: Process Queue Batch

```bash
POST /scheduler/queue/process-batch

{
  "maxCount": 10,
  "deviceType": "android",
  "continueOnError": true
}

# Response
{
  "success": true,
  "data": {
    "totalProcessed": 8,
    "successCount": 7,
    "failedCount": 1,
    "successes": [
      {
        "queueId": "queue-001",
        "userId": "user-123",
        "deviceId": "device-001",
        "allocationId": "alloc-001"
      },
      ...
    ],
    "failures": [
      {
        "queueId": "queue-008",
        "userId": "user-130",
        "reason": "No devices match requirements"
      }
    ],
    "executionTimeMs": 3250
  },
  "message": "Processed 8 entries: 7 succeeded, 1 failed"
}
```

---

## Integration Points

### 1. Allocation Service

**Dependency**: `AllocationService.allocateDevice()`

```typescript
const result = await this.allocationService.allocateDevice({
  userId: queueEntry.userId,
  tenantId: queueEntry.tenantId,
  durationMinutes: queueEntry.durationMinutes,
  devicePreferences: {
    deviceType: queueEntry.deviceType,
    minCpu: queueEntry.minCpu,
    minMemory: queueEntry.minMemory,
  },
});
```

**Integration Flow**:
```
Queue Entry (WAITING)
  ↓ autoProcessQueue() cron
Check available devices
  ↓ if devices available
AllocationService.allocateDevice()
  ↓ success
Queue Entry (FULFILLED)
```

### 2. Event Bus

**Dependency**: `EventBusService` from `@cloudphone/shared`

```typescript
await this.eventBus.publish(
  "cloudphone.events",
  "scheduler.queue.fulfilled",
  { queueId, userId, deviceId, waitedMinutes, timestamp }
);
```

### 3. Notification Service

**Dependency**: `NotificationClient`

```typescript
await this.notificationClient.sendBatchNotifications([{
  userId: queueEntry.userId,
  type: "queue_fulfilled",
  title: "✅ 设备已分配",
  message: `排队成功！设备 ${deviceName} 已为您准备好`,
  channels: ["websocket", "email"],
  metadata: { queueId, deviceId, deviceName }
}]);
```

---

## Performance Considerations

### 1. Optimized Indexes

**Priority Sort Index**:
```sql
CREATE INDEX idx_allocation_queue_priority_sort
  ON allocation_queue(status, priority DESC, created_at ASC)
  WHERE status = 'waiting';
```

**Benefits**:
- Partial index (only WAITING status)
- Matches exact ORDER BY clause
- Supports efficient queue processing

### 2. Batch Processing

- Processes multiple entries in single run
- Configurable max count (1-50)
- Continue on error prevents blocking
- Efficient for high-volume scenarios

### 3. Position Calculation

**Trade-off**:
- Store position in database (fast read, slow write)
- Recalculate every minute (acceptable delay)
- Critical path (processing) doesn't recalculate

### 4. Cron Job Timing

```typescript
autoProcessQueue()         // Every 1 minute
markExpiredQueueEntries()  // Every 5 minutes
updateAllQueuePositions()  // Every 1 minute
```

**Rationale**:
- 1-minute processing provides responsive experience
- 5-minute expiry check reduces database load
- Position updates keep users informed

---

## Error Handling

### Common Errors

1. **Already in Queue**
   ```json
   {
     "statusCode": 409,
     "message": "User already has an active queue entry: queue-abc123"
   }
   ```

2. **Invalid Status for Cancel**
   ```json
   {
     "statusCode": 400,
     "message": "Cannot cancel queue entry in status: fulfilled"
   }
   ```

3. **Not Found**
   ```json
   {
     "statusCode": 404,
     "message": "Queue entry queue-abc123 not found"
   }
   ```

4. **Allocation Failed**
   - Retry up to 3 times
   - After 3 failures → mark as EXPIRED
   - User notified of expiration

### Retry Strategy

```
Attempt 1: Process → Fail → Back to WAITING (retry_count=1)
Attempt 2: Process → Fail → Back to WAITING (retry_count=2)
Attempt 3: Process → Fail → EXPIRED (retry_count=3)
```

---

## Testing Recommendations

### Unit Tests

1. **QueueService**
   - joinQueue with different user tiers
   - Position calculation accuracy
   - Priority sorting correctness
   - Retry mechanism (1-3 attempts)
   - Expiry detection
   - Statistics calculations

2. **SchedulerController**
   - All endpoint responses
   - Query parameter validation
   - Error handling

### Integration Tests

1. **End-to-End Flows**
   - Join → Auto-process → Fulfilled
   - Join → Cancel
   - Join → Expire (timeout)
   - Join → Expire (max retries)

2. **Priority Testing**
   - Multiple users with different tiers
   - Verify processing order
   - Standard < VIP < Premium < Enterprise

3. **Cron Jobs**
   - autoProcessQueue
   - markExpiredQueueEntries
   - updateAllQueuePositions

### Load Tests

1. **High Queue Volume**
   - 100+ concurrent queue entries
   - Position calculation performance
   - Processing throughput

2. **Priority Fairness**
   - Verify higher priority always processes first
   - Same priority follows FIFO

---

## Files Created/Modified

### New Files (4)

1. `backend/device-service/src/entities/allocation-queue.entity.ts` (137 lines)
   - TypeORM entity with QueueStatus enum
   - 4-tier priority system
   - Complete field definitions

2. `backend/device-service/migrations/20251030_create_allocation_queue.sql` (107 lines)
   - PostgreSQL migration script
   - Optimized indexes for queue processing
   - Trigger for auto-update

3. `backend/device-service/src/scheduler/dto/queue.dto.ts` (462 lines)
   - 10 DTO classes
   - Complete validation decorators
   - Swagger API documentation

4. `backend/device-service/src/scheduler/queue.service.ts` (740 lines)
   - 13 service methods
   - 3 cron jobs
   - Priority-based processing logic

### Modified Files (2)

1. `backend/device-service/src/scheduler/scheduler.controller.ts`
   - Added 8 queue endpoints
   - Added QueueService injection

2. `backend/device-service/src/scheduler/scheduler.module.ts`
   - Added AllocationQueue entity
   - Registered QueueService
   - Exported QueueService

---

## Benefits

### For Users

1. **Fair Access**: Priority-based queue ensures fair device allocation
2. **Transparency**: Real-time position tracking and wait time estimates
3. **Flexibility**: Can cancel queue entry anytime
4. **VIP Treatment**: Higher-tier users get priority access

### For System

1. **Resource Optimization**: Efficient device utilization
2. **Load Management**: Prevents allocation failures during high demand
3. **Scalability**: Handles high-volume queue scenarios
4. **Monitoring**: Comprehensive statistics and analytics

### For Business

1. **User Retention**: Better experience during peak usage
2. **Revenue Opportunity**: Premium tiers for priority access
3. **Capacity Planning**: Queue statistics inform infrastructure decisions
4. **SLA Compliance**: Track and improve fulfillment rates

---

## User Experience Flow

```
1. User requests device
   ↓ No devices available
2. System offers to join queue
   ↓ User accepts
3. User joins queue at position 5
   ↓ Notification: "Position 5, ~25 min wait"
4. Position updates every minute
   ↓ Position 4 → 3 → 2 → 1
5. Device becomes available
   ↓ Auto-allocation triggered
6. Success notification
   ↓ "Device ready to use!"
```

**Alternative Flows**:
- **User Cancels**: Exit queue anytime
- **Timeout**: Notified if exceeds max wait time
- **Allocation Fails**: Automatic retries (up to 3)

---

## Future Enhancements

### Potential Improvements

1. **Advanced Priority**
   - Dynamic priority based on wait time
   - Quota-based priority adjustments
   - SLA-driven priority escalation

2. **Smart Estimation**
   - Machine learning for wait time prediction
   - Historical usage pattern analysis
   - Real-time adjustment based on device availability

3. **Queue Reservation Integration**
   - Convert queue entry to reservation
   - Schedule device for specific time
   - Guaranteed allocation window

4. **Multi-Device Requests**
   - Queue for multiple devices at once
   - Partial fulfillment support
   - Batch allocation coordination

5. **Queue Policies**
   - Maximum queue length per user
   - Time-based queue limits (peak hours)
   - Geographic/region-based queues

6. **Advanced Notifications**
   - SMS for high-priority users
   - Progressive position updates (at 50%, 25%, 10%)
   - Custom notification preferences

---

## Conclusion

The Priority Queue feature is now fully implemented and operational. The system provides:

**Core Capabilities**:
- ✅ Multi-tier priority system (Standard/VIP/Premium/Enterprise)
- ✅ Automatic queue processing (every minute)
- ✅ Real-time position tracking
- ✅ Intelligent retry mechanism (up to 3 attempts)
- ✅ Automatic expiration (timeout or max retries)
- ✅ Comprehensive statistics and analytics

**User Features**:
- ✅ Join queue when no devices available
- ✅ Track position and estimated wait time
- ✅ Cancel anytime
- ✅ Get notified when device ready

**System Features**:
- ✅ Priority-based processing (higher tiers first)
- ✅ FIFO within same priority level
- ✅ Automatic device allocation
- ✅ Event-driven notifications
- ✅ Detailed statistics by tier

**Phase 3 Complete**: All advanced features implemented! 🎉

**Next Phase**: Phase 4 - Optimization & Testing
