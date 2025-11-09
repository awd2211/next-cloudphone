import { Test, TestingModule } from '@nestjs/testing';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueName } from '../common/config/queue.config';

describe('QueueController', () => {
  let controller: QueueController;
  let queueService: any;

  const mockJob = {
    id: '123',
    name: 'test-job',
    data: { test: 'data' },
    opts: { delay: 0 },
    progress: jest.fn(() => 50),
    attemptsMade: 1,
    timestamp: 1704067200000,
    processedOn: 1704067201000,
    finishedOn: 1704067202000,
    failedReason: null,
    stacktrace: [],
    returnvalue: null,
  };

  const mockQueueService = {
    getAllQueuesStatus: jest.fn(),
    getQueueJobs: jest.fn(),
    getJob: jest.fn(),
    retryJob: jest.fn(),
    removeJob: jest.fn(),
    pauseQueue: jest.fn(),
    resumeQueue: jest.fn(),
    emptyQueue: jest.fn(),
    cleanQueue: jest.fn(),
    sendEmail: jest.fn(),
    sendSms: jest.fn(),
    startDevice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueController],
      providers: [
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    controller = module.get<QueueController>(QueueController);
    queueService = module.get(QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have queueService injected', () => {
      expect(queueService).toBeDefined();
      expect(queueService).toBe(mockQueueService);
    });
  });

  describe('getAllQueuesStatus', () => {
    it('should return all queues status with summary', async () => {
      const mockStatuses = [
        {
          name: 'email',
          counts: { waiting: 10, active: 2, completed: 100, failed: 5 },
        },
        {
          name: 'sms',
          counts: { waiting: 5, active: 1, completed: 50, failed: 2 },
        },
      ];

      mockQueueService.getAllQueuesStatus.mockResolvedValue(mockStatuses);

      const result = await controller.getAllQueuesStatus();

      expect(result.timestamp).toBeDefined();
      expect(result.queues).toEqual(mockStatuses);
      expect(result.summary.totalQueues).toBe(2);
      expect(result.summary.totalWaiting).toBe(15);
      expect(result.summary.totalActive).toBe(3);
      expect(result.summary.totalCompleted).toBe(150);
      expect(result.summary.totalFailed).toBe(7);
      expect(mockQueueService.getAllQueuesStatus).toHaveBeenCalled();
    });

    it('should return empty queues when no queues exist', async () => {
      mockQueueService.getAllQueuesStatus.mockResolvedValue([]);

      const result = await controller.getAllQueuesStatus();

      expect(result.queues).toEqual([]);
      expect(result.summary.totalQueues).toBe(0);
      expect(result.summary.totalWaiting).toBe(0);
    });

    it('should include ISO timestamp', async () => {
      mockQueueService.getAllQueuesStatus.mockResolvedValue([]);

      const result = await controller.getAllQueuesStatus();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('getQueueJobs', () => {
    it('should return queue jobs with pagination', async () => {
      mockQueueService.getQueueJobs.mockResolvedValue([mockJob]);

      const result = await controller.getQueueJobs('email' as QueueName, 'waiting', 0, 10);

      expect(result.queueName).toBe('email');
      expect(result.status).toBe('waiting');
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].id).toBe('123');
      expect(result.jobs[0].progress).toBe(50);
      expect(result.pagination).toEqual({ start: 0, end: 10, count: 1 });
      expect(mockQueueService.getQueueJobs).toHaveBeenCalledWith('email', 'waiting', 0, 10);
    });

    it('should use default parameters', async () => {
      mockQueueService.getQueueJobs.mockResolvedValue([]);

      const result = await controller.getQueueJobs('sms' as QueueName, 'waiting', 0, 10);

      expect(result.status).toBe('waiting');
      expect(result.pagination.start).toBe(0);
      expect(result.pagination.end).toBe(10);
    });

    it('should filter by job status', async () => {
      const statuses: Array<'waiting' | 'active' | 'completed' | 'failed' | 'delayed'> = [
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
      ];

      for (const status of statuses) {
        mockQueueService.getQueueJobs.mockResolvedValue([]);

        const result = await controller.getQueueJobs('email' as QueueName, status, 0, 10);

        expect(result.status).toBe(status);
      }
    });

    it('should map job properties correctly', async () => {
      const job = {
        ...mockJob,
        failedReason: 'Connection timeout',
      };

      mockQueueService.getQueueJobs.mockResolvedValue([job]);

      const result = await controller.getQueueJobs('email' as QueueName, 'failed', 0, 10);

      expect(result.jobs[0].failedReason).toBe('Connection timeout');
      expect(result.jobs[0].attemptsMade).toBe(1);
    });
  });

  describe('getJob', () => {
    it('should return job details', async () => {
      mockQueueService.getJob.mockResolvedValue(mockJob);

      const result = await controller.getJob('email' as QueueName, '123');

      expect(result.id).toBe('123');
      expect(result.name).toBe('test-job');
      expect(result.data).toEqual({ test: 'data' });
      expect(result.progress).toBe(50);
      expect(result.delay).toBe(0);
      expect(mockQueueService.getJob).toHaveBeenCalledWith('email', '123');
    });

    it('should return error when job not found', async () => {
      mockQueueService.getJob.mockResolvedValue(null);

      const result = await controller.getJob('email' as QueueName, '999');

      expect(result.error).toBe('Job 999 not found in queue email');
    });

    it('should include all job details', async () => {
      const detailedJob = {
        ...mockJob,
        stacktrace: ['Error: Test error', 'at line 1'],
        returnvalue: { success: true },
        failedReason: 'Test failure',
      };

      mockQueueService.getJob.mockResolvedValue(detailedJob);

      const result = await controller.getJob('sms' as QueueName, '456');

      expect(result.stacktrace).toEqual(['Error: Test error', 'at line 1']);
      expect(result.returnvalue).toEqual({ success: true });
      expect(result.failedReason).toBe('Test failure');
    });
  });

  describe('retryJob', () => {
    it('should retry failed job', async () => {
      mockQueueService.retryJob.mockResolvedValue(undefined);

      const result = await controller.retryJob('email' as QueueName, '123');

      expect(result.message).toBe('Job 123 in queue email has been retried');
      expect(mockQueueService.retryJob).toHaveBeenCalledWith('email', '123');
    });

    it('should call service with correct parameters', async () => {
      mockQueueService.retryJob.mockResolvedValue(undefined);

      await controller.retryJob('device-start' as QueueName, '789');

      expect(mockQueueService.retryJob).toHaveBeenCalledWith('device-start', '789');
    });
  });

  describe('removeJob', () => {
    it('should remove job from queue', async () => {
      mockQueueService.removeJob.mockResolvedValue(undefined);

      const result = await controller.removeJob('email' as QueueName, '123');

      expect(result.message).toBe('Job 123 removed from queue email');
      expect(mockQueueService.removeJob).toHaveBeenCalledWith('email', '123');
    });

    it('should handle different queue types', async () => {
      mockQueueService.removeJob.mockResolvedValue(undefined);

      const queues = ['email', 'sms', 'device-start'];
      for (const queue of queues) {
        await controller.removeJob(queue as QueueName, '123');
        expect(mockQueueService.removeJob).toHaveBeenCalledWith(queue, '123');
      }
    });
  });

  describe('pauseQueue', () => {
    it('should pause queue', async () => {
      mockQueueService.pauseQueue.mockResolvedValue(undefined);

      const result = await controller.pauseQueue('email' as QueueName);

      expect(result.message).toBe('Queue email paused');
      expect(mockQueueService.pauseQueue).toHaveBeenCalledWith('email');
    });

    it('should pause different queues', async () => {
      mockQueueService.pauseQueue.mockResolvedValue(undefined);

      await controller.pauseQueue('sms' as QueueName);
      await controller.pauseQueue('device-start' as QueueName);

      expect(mockQueueService.pauseQueue).toHaveBeenCalledTimes(2);
    });
  });

  describe('resumeQueue', () => {
    it('should resume paused queue', async () => {
      mockQueueService.resumeQueue.mockResolvedValue(undefined);

      const result = await controller.resumeQueue('email' as QueueName);

      expect(result.message).toBe('Queue email resumed');
      expect(mockQueueService.resumeQueue).toHaveBeenCalledWith('email');
    });

    it('should resume different queues', async () => {
      mockQueueService.resumeQueue.mockResolvedValue(undefined);

      await controller.resumeQueue('sms' as QueueName);
      await controller.resumeQueue('device-start' as QueueName);

      expect(mockQueueService.resumeQueue).toHaveBeenCalledTimes(2);
    });
  });

  describe('emptyQueue', () => {
    it('should empty queue', async () => {
      mockQueueService.emptyQueue.mockResolvedValue(undefined);

      const result = await controller.emptyQueue('email' as QueueName);

      expect(result.message).toBe('Queue email emptied');
      expect(mockQueueService.emptyQueue).toHaveBeenCalledWith('email');
    });

    it('should empty different queues', async () => {
      mockQueueService.emptyQueue.mockResolvedValue(undefined);

      await controller.emptyQueue('sms' as QueueName);

      expect(mockQueueService.emptyQueue).toHaveBeenCalledWith('sms');
    });
  });

  describe('cleanQueue', () => {
    it('should clean completed jobs with default grace period', async () => {
      mockQueueService.cleanQueue.mockResolvedValue(undefined);

      const result = await controller.cleanQueue('email' as QueueName, 24 * 3600 * 1000, 'completed');

      expect(result.message).toContain('Cleaned completed jobs');
      expect(result.message).toContain('86400000ms');
      expect(mockQueueService.cleanQueue).toHaveBeenCalledWith('email', 24 * 3600 * 1000, 'completed');
    });

    it('should clean failed jobs', async () => {
      mockQueueService.cleanQueue.mockResolvedValue(undefined);

      const result = await controller.cleanQueue('email' as QueueName, 3600000, 'failed');

      expect(result.message).toContain('Cleaned failed jobs');
      expect(result.message).toContain('3600000ms');
      expect(mockQueueService.cleanQueue).toHaveBeenCalledWith('email', 3600000, 'failed');
    });

    it('should use custom grace period', async () => {
      mockQueueService.cleanQueue.mockResolvedValue(undefined);

      const customGrace = 7200000; // 2 hours
      await controller.cleanQueue('sms' as QueueName, customGrace, 'completed');

      expect(mockQueueService.cleanQueue).toHaveBeenCalledWith('sms', customGrace, 'completed');
    });
  });

  describe('testSendEmail', () => {
    it('should create email job', async () => {
      const emailJob = { id: 'email-123' };
      mockQueueService.sendEmail.mockResolvedValue(emailJob);

      const body = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      };

      const result = await controller.testSendEmail(body);

      expect(result.message).toBe('Email job created');
      expect(result.jobId).toBe('email-123');
      expect(mockQueueService.sendEmail).toHaveBeenCalledWith(body);
    });

    it('should handle different email recipients', async () => {
      mockQueueService.sendEmail.mockResolvedValue({ id: 'test' });

      const emails = ['user1@test.com', 'user2@test.com'];
      for (const email of emails) {
        await controller.testSendEmail({
          to: email,
          subject: 'Test',
          html: '<p>Test</p>',
        });
      }

      expect(mockQueueService.sendEmail).toHaveBeenCalledTimes(2);
    });
  });

  describe('testSendSms', () => {
    it('should create SMS job', async () => {
      const smsJob = { id: 'sms-456' };
      mockQueueService.sendSms.mockResolvedValue(smsJob);

      const body = {
        phone: '+1234567890',
        message: 'Test SMS',
      };

      const result = await controller.testSendSms(body);

      expect(result.message).toBe('SMS job created');
      expect(result.jobId).toBe('sms-456');
      expect(mockQueueService.sendSms).toHaveBeenCalledWith(body);
    });

    it('should handle different phone numbers', async () => {
      mockQueueService.sendSms.mockResolvedValue({ id: 'test' });

      const phones = ['+1234567890', '+9876543210'];
      for (const phone of phones) {
        await controller.testSendSms({ phone, message: 'Test' });
      }

      expect(mockQueueService.sendSms).toHaveBeenCalledTimes(2);
    });
  });

  describe('testStartDevice', () => {
    it('should create device start job', async () => {
      const deviceJob = { id: 'device-789' };
      mockQueueService.startDevice.mockResolvedValue(deviceJob);

      const body = {
        deviceId: 'device-123',
        userId: 'user-456',
      };

      const result = await controller.testStartDevice(body);

      expect(result.message).toBe('Device start job created');
      expect(result.jobId).toBe('device-789');
      expect(mockQueueService.startDevice).toHaveBeenCalledWith('device-123', 'user-456');
    });

    it('should handle optional userId', async () => {
      mockQueueService.startDevice.mockResolvedValue({ id: 'test' });

      await controller.testStartDevice({ deviceId: 'device-999' });

      expect(mockQueueService.startDevice).toHaveBeenCalledWith('device-999', undefined);
    });

    it('should create jobs for multiple devices', async () => {
      mockQueueService.startDevice.mockResolvedValue({ id: 'test' });

      const devices = ['device-1', 'device-2', 'device-3'];
      for (const deviceId of devices) {
        await controller.testStartDevice({ deviceId });
      }

      expect(mockQueueService.startDevice).toHaveBeenCalledTimes(3);
    });
  });

  describe('Response Format', () => {
    it('should return standard response format for status', async () => {
      mockQueueService.getAllQueuesStatus.mockResolvedValue([]);

      const result = await controller.getAllQueuesStatus();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('queues');
      expect(result).toHaveProperty('summary');
    });

    it('should return consistent message format for queue operations', async () => {
      mockQueueService.pauseQueue.mockResolvedValue(undefined);
      mockQueueService.resumeQueue.mockResolvedValue(undefined);
      mockQueueService.emptyQueue.mockResolvedValue(undefined);

      const pause = await controller.pauseQueue('email' as QueueName);
      const resume = await controller.resumeQueue('email' as QueueName);
      const empty = await controller.emptyQueue('email' as QueueName);

      expect(pause).toHaveProperty('message');
      expect(resume).toHaveProperty('message');
      expect(empty).toHaveProperty('message');
    });

    it('should return jobId for test endpoints', async () => {
      mockQueueService.sendEmail.mockResolvedValue({ id: 'test-1' });
      mockQueueService.sendSms.mockResolvedValue({ id: 'test-2' });
      mockQueueService.startDevice.mockResolvedValue({ id: 'test-3' });

      const email = await controller.testSendEmail({
        to: 'test@test.com',
        subject: 'Test',
        html: 'Test',
      });
      const sms = await controller.testSendSms({ phone: '+123', message: 'Test' });
      const device = await controller.testStartDevice({ deviceId: 'test' });

      expect(email.jobId).toBe('test-1');
      expect(sms.jobId).toBe('test-2');
      expect(device.jobId).toBe('test-3');
    });
  });
});
