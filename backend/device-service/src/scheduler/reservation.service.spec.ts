import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ReservationService } from "./reservation.service";
import { DeviceReservation, ReservationStatus } from "../entities/device-reservation.entity";
import { AllocationService } from "./allocation.service";
import { EventBusService } from "@cloudphone/shared";
import { NotificationClientService } from "./notification-client.service";
import {
  CreateReservationDto,
  UpdateReservationDto,
  CancelReservationDto,
  QueryReservationsDto,
} from "./dto/reservation.dto";

describe("ReservationService", () => {
  let service: ReservationService;
  let reservationRepository: Repository<DeviceReservation>;
  let allocationService: AllocationService;
  let eventBus: EventBusService;
  let notificationClient: NotificationClient;

  const now = new Date();
  const futureTime = new Date(now.getTime() + 3600000); // 1 hour from now

  const mockReservation: Partial<DeviceReservation> = {
    id: "reservation-1",
    userId: "user-1",
    tenantId: "tenant-1",
    status: ReservationStatus.PENDING,
    reservedStartTime: futureTime,
    reservedEndTime: new Date(futureTime.getTime() + 3600000),
    durationMinutes: 60,
    deviceType: "android",
    remindBeforeMinutes: 15,
    reminderSent: false,
    createdAt: now,
    metadata: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        {
          provide: getRepositoryToken(DeviceReservation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: AllocationService,
          useValue: {
            allocateDevice: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: {
            publish: jest.fn(),
          },
        },
        {
          provide: NotificationClient,
          useValue: {
            sendBatchNotifications: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
    reservationRepository = module.get<Repository<DeviceReservation>>(
      getRepositoryToken(DeviceReservation),
    );
    allocationService = module.get<AllocationService>(AllocationService);
    eventBus = module.get<EventBusService>(EventBusService);
    notificationClient = module.get<NotificationClient>(NotificationClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createReservation", () => {
    const createDto: CreateReservationDto = {
      reservedStartTime: futureTime.toISOString(),
      durationMinutes: 60,
      deviceType: "android",
      remindBeforeMinutes: 15,
    };

    beforeEach(() => {
      jest.spyOn(service, "checkConflict").mockResolvedValue({
        hasConflict: false,
        message: "Time slot is available",
      });
      jest.spyOn(reservationRepository, "create").mockReturnValue(mockReservation as DeviceReservation);
      jest.spyOn(reservationRepository, "save").mockResolvedValue(mockReservation as DeviceReservation);
      jest.spyOn(eventBus, "publish").mockResolvedValue(undefined);
      jest.spyOn(notificationClient, "sendBatchNotifications").mockResolvedValue(undefined);
    });

    it("should successfully create a reservation", async () => {
      const result = await service.createReservation("user-1", "tenant-1", createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe("reservation-1");
      expect(result.status).toBe(ReservationStatus.PENDING);
      expect(reservationRepository.create).toHaveBeenCalled();
      expect(reservationRepository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith(
        "cloudphone.events",
        "scheduler.reservation.created",
        expect.any(Object),
      );
      expect(notificationClient.sendBatchNotifications).toHaveBeenCalled();
    });

    it("should throw BadRequestException for past time", async () => {
      const pastDto = {
        ...createDto,
        reservedStartTime: new Date(now.getTime() - 3600000).toISOString(),
      };

      await expect(service.createReservation("user-1", "tenant-1", pastDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw ConflictException when time slot conflicts", async () => {
      jest.spyOn(service, "checkConflict").mockResolvedValue({
        hasConflict: true,
        conflictingReservations: [mockReservation as any],
        message: "Time slot conflicts",
      });

      await expect(service.createReservation("user-1", "tenant-1", createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should calculate correct end time based on duration", async () => {
      await service.createReservation("user-1", "tenant-1", createDto);

      expect(reservationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMinutes: 60,
          reservedStartTime: expect.any(Date),
          reservedEndTime: expect.any(Date),
        }),
      );
    });
  });

  describe("cancelReservation", () => {
    const cancelDto: CancelReservationDto = {
      reason: "User cancelled",
    };

    it("should successfully cancel a reservation", async () => {
      jest.spyOn(reservationRepository, "findOne").mockResolvedValue(mockReservation as DeviceReservation);
      jest.spyOn(reservationRepository, "save").mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.CANCELLED,
      } as DeviceReservation);
      jest.spyOn(eventBus, "publish").mockResolvedValue(undefined);
      jest.spyOn(notificationClient, "sendBatchNotifications").mockResolvedValue(undefined);

      const result = await service.cancelReservation("reservation-1", cancelDto);

      expect(result.status).toBe(ReservationStatus.CANCELLED);
      expect(reservationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReservationStatus.CANCELLED,
          cancelReason: "User cancelled",
        }),
      );
      expect(eventBus.publish).toHaveBeenCalled();
      expect(notificationClient.sendBatchNotifications).toHaveBeenCalled();
    });

    it("should throw NotFoundException when reservation not found", async () => {
      jest.spyOn(reservationRepository, "findOne").mockResolvedValue(null);

      await expect(service.cancelReservation("reservation-1", cancelDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when status not cancellable", async () => {
      const completedReservation = {
        ...mockReservation,
        status: ReservationStatus.COMPLETED,
      };
      jest.spyOn(reservationRepository, "findOne").mockResolvedValue(
        completedReservation as DeviceReservation,
      );

      await expect(service.cancelReservation("reservation-1", cancelDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("updateReservation", () => {
    const updateDto: UpdateReservationDto = {
      durationMinutes: 90,
      remindBeforeMinutes: 30,
    };

    it("should successfully update a reservation", async () => {
      jest.spyOn(reservationRepository, "findOne").mockResolvedValue(mockReservation as DeviceReservation);
      jest.spyOn(reservationRepository, "save").mockResolvedValue({
        ...mockReservation,
        durationMinutes: 90,
      } as DeviceReservation);
      jest.spyOn(eventBus, "publish").mockResolvedValue(undefined);

      const result = await service.updateReservation("reservation-1", updateDto);

      expect(result.durationMinutes).toBe(90);
      expect(reservationRepository.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it("should throw NotFoundException when reservation not found", async () => {
      jest.spyOn(reservationRepository, "findOne").mockResolvedValue(null);

      await expect(service.updateReservation("reservation-1", updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when status not updatable", async () => {
      const confirmedReservation = {
        ...mockReservation,
        status: ReservationStatus.CONFIRMED,
      };
      jest.spyOn(reservationRepository, "findOne").mockResolvedValue(
        confirmedReservation as DeviceReservation,
      );

      await expect(service.updateReservation("reservation-1", updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should check for conflicts when updating time", async () => {
      const newStartTime = new Date(futureTime.getTime() + 7200000).toISOString();
      const timeUpdateDto: UpdateReservationDto = {
        reservedStartTime: newStartTime,
      };

      jest.spyOn(reservationRepository, "findOne").mockResolvedValue(mockReservation as DeviceReservation);
      jest.spyOn(service, "checkConflict").mockResolvedValue({
        hasConflict: false,
        message: "Time slot is available",
      });
      jest.spyOn(reservationRepository, "save").mockResolvedValue(mockReservation as DeviceReservation);
      jest.spyOn(eventBus, "publish").mockResolvedValue(undefined);

      await service.updateReservation("reservation-1", timeUpdateDto);

      expect(service.checkConflict).toHaveBeenCalled();
    });
  });

  describe("checkConflict", () => {
    const startTime = futureTime;
    const endTime = new Date(futureTime.getTime() + 3600000);

    it("should return no conflict when time slot is available", async () => {
      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(reservationRepository, "createQueryBuilder").mockReturnValue(queryBuilder);

      const result = await service.checkConflict("user-1", startTime, endTime);

      expect(result.hasConflict).toBe(false);
      expect(result.message).toBe("Time slot is available");
    });

    it("should return conflict when overlapping reservations exist", async () => {
      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockReservation]),
      };
      jest.spyOn(reservationRepository, "createQueryBuilder").mockReturnValue(queryBuilder);

      const result = await service.checkConflict("user-1", startTime, endTime);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingReservations).toHaveLength(1);
    });

    it("should exclude specified reservation when checking conflicts", async () => {
      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest.spyOn(reservationRepository, "createQueryBuilder").mockReturnValue(queryBuilder);

      await service.checkConflict("user-1", startTime, endTime, "reservation-1");

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "reservation.id != :excludeId",
        { excludeId: "reservation-1" },
      );
    });
  });

  describe("executeReservation", () => {
    it("should successfully execute a reservation", async () => {
      jest.spyOn(reservationRepository, "findOne").mockResolvedValue(mockReservation as DeviceReservation);
      jest.spyOn(reservationRepository, "save").mockResolvedValue(mockReservation as DeviceReservation);
      jest.spyOn(allocationService, "allocateDevice").mockResolvedValue({
        allocationId: "allocation-1",
        deviceId: "device-1",
        deviceName: "Test Device",
        userId: "user-1",
        allocatedAt: new Date(),
        expiresAt: new Date(),
      } as any);
      jest.spyOn(eventBus, "publish").mockResolvedValue(undefined);
      jest.spyOn(notificationClient, "sendBatchNotifications").mockResolvedValue(undefined);

      await service.executeReservation("reservation-1");

      expect(reservationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReservationStatus.COMPLETED,
          allocatedDeviceId: "device-1",
          allocationId: "allocation-1",
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        "cloudphone.events",
        "scheduler.reservation.executed",
        expect.any(Object),
      );
      expect(notificationClient.sendBatchNotifications).toHaveBeenCalled();
    });

    it("should mark reservation as failed when allocation fails", async () => {
      jest.spyOn(reservationRepository, "findOne").mockResolvedValue(mockReservation as DeviceReservation);
      jest.spyOn(allocationService, "allocateDevice").mockRejectedValue(
        new Error("No devices available"),
      );
      jest.spyOn(reservationRepository, "save").mockResolvedValue(mockReservation as DeviceReservation);
      jest.spyOn(eventBus, "publish").mockResolvedValue(undefined);
      jest.spyOn(notificationClient, "sendBatchNotifications").mockResolvedValue(undefined);

      await service.executeReservation("reservation-1");

      expect(reservationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReservationStatus.FAILED,
          failureReason: "No devices available",
        }),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        "cloudphone.events",
        "scheduler.reservation.failed",
        expect.any(Object),
      );
    });

    it("should not execute when reservation not found", async () => {
      jest.spyOn(reservationRepository, "findOne").mockResolvedValue(null);

      await service.executeReservation("reservation-1");

      expect(allocationService.allocateDevice).not.toHaveBeenCalled();
    });

    it("should not execute when status not executable", async () => {
      const completedReservation = {
        ...mockReservation,
        status: ReservationStatus.COMPLETED,
      };
      jest.spyOn(reservationRepository, "findOne").mockResolvedValue(
        completedReservation as DeviceReservation,
      );

      await service.executeReservation("reservation-1");

      expect(allocationService.allocateDevice).not.toHaveBeenCalled();
    });
  });

  describe("getUserReservations", () => {
    const query: QueryReservationsDto = {
      userId: "user-1",
      page: 1,
      pageSize: 10,
    };

    it("should return paginated reservations", async () => {
      jest.spyOn(reservationRepository, "findAndCount").mockResolvedValue([
        [mockReservation as DeviceReservation],
        1,
      ]);

      const result = await service.getUserReservations(query);

      expect(result.reservations).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it("should filter by status", async () => {
      const queryWithStatus = {
        ...query,
        status: ReservationStatus.PENDING,
      };

      jest.spyOn(reservationRepository, "findAndCount").mockResolvedValue([
        [mockReservation as DeviceReservation],
        1,
      ]);

      await service.getUserReservations(queryWithStatus);

      expect(reservationRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ReservationStatus.PENDING,
          }),
        }),
      );
    });

    it("should filter by time range", async () => {
      const queryWithTimeRange = {
        ...query,
        startTimeFrom: now.toISOString(),
        startTimeTo: futureTime.toISOString(),
      };

      jest.spyOn(reservationRepository, "findAndCount").mockResolvedValue([[], 0]);

      await service.getUserReservations(queryWithTimeRange);

      expect(reservationRepository.findAndCount).toHaveBeenCalled();
    });
  });

  describe("getReservationStatistics", () => {
    it("should return reservation statistics", async () => {
      jest.spyOn(reservationRepository, "count")
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20) // pending
        .mockResolvedValueOnce(60) // completed
        .mockResolvedValueOnce(15) // cancelled
        .mockResolvedValueOnce(5); // failed

      jest.spyOn(reservationRepository, "find").mockResolvedValue([
        {
          createdAt: new Date(now.getTime() - 86400000), // 1 day ago
          reservedStartTime: futureTime,
        } as DeviceReservation,
      ]);

      const stats = await service.getReservationStatistics();

      expect(stats.totalReservations).toBe(100);
      expect(stats.pendingCount).toBe(20);
      expect(stats.completedCount).toBe(60);
      expect(stats.cancelledCount).toBe(15);
      expect(stats.failedCount).toBe(5);
      expect(stats.successRate).toBeDefined();
      expect(stats.averageAdvanceBookingHours).toBeGreaterThan(0);
    });

    it("should filter statistics by user", async () => {
      jest.spyOn(reservationRepository, "count").mockResolvedValue(10);
      jest.spyOn(reservationRepository, "find").mockResolvedValue([]);

      await service.getReservationStatistics("user-1");

      expect(reservationRepository.count).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });
  });

  describe("Cron Jobs", () => {
    describe("executePendingReservations", () => {
      it("should execute reservations due for execution", async () => {
        const dueReservation = {
          ...mockReservation,
          reservedStartTime: new Date(now.getTime() - 30000), // 30 seconds ago
        };

        jest.spyOn(reservationRepository, "find").mockResolvedValue([dueReservation as DeviceReservation]);
        jest.spyOn(service, "executeReservation").mockResolvedValue(undefined);

        await service.executePendingReservations();

        expect(service.executeReservation).toHaveBeenCalledWith("reservation-1");
      });

      it("should handle errors in individual executions", async () => {
        jest.spyOn(reservationRepository, "find").mockResolvedValue([mockReservation as DeviceReservation]);
        jest.spyOn(service, "executeReservation").mockRejectedValue(new Error("Execution failed"));

        await expect(service.executePendingReservations()).resolves.not.toThrow();
      });
    });

    describe("markExpiredReservations", () => {
      it("should mark overdue reservations as expired", async () => {
        const overdueReservation = {
          ...mockReservation,
          reservedStartTime: new Date(now.getTime() - 600000), // 10 minutes ago
        };

        jest.spyOn(reservationRepository, "find").mockResolvedValue([
          overdueReservation as DeviceReservation,
        ]);
        jest.spyOn(reservationRepository, "save").mockResolvedValue(overdueReservation as DeviceReservation);
        jest.spyOn(notificationClient, "sendBatchNotifications").mockResolvedValue(undefined);

        await service.markExpiredReservations();

        expect(reservationRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            status: ReservationStatus.EXPIRED,
          }),
        );
        expect(notificationClient.sendBatchNotifications).toHaveBeenCalled();
      });
    });

    describe("sendReminders", () => {
      it("should send reminders for upcoming reservations", async () => {
        const upcomingReservation = {
          ...mockReservation,
          reservedStartTime: new Date(now.getTime() + 600000), // 10 minutes from now
          remindBeforeMinutes: 15,
          reminderSent: false,
        };

        jest.spyOn(reservationRepository, "createQueryBuilder").mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([upcomingReservation]),
        } as any);

        jest.spyOn(reservationRepository, "save").mockResolvedValue(upcomingReservation as DeviceReservation);
        jest.spyOn(notificationClient, "sendBatchNotifications").mockResolvedValue(undefined);

        await service.sendReminders();

        expect(notificationClient.sendBatchNotifications).toHaveBeenCalled();
        expect(reservationRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            reminderSent: true,
          }),
        );
      });

      it("should not send reminders when already sent", async () => {
        const reminderSentReservation = {
          ...mockReservation,
          reminderSent: true,
        };

        jest.spyOn(reservationRepository, "createQueryBuilder").mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        } as any);

        await service.sendReminders();

        expect(notificationClient.sendBatchNotifications).not.toHaveBeenCalled();
      });
    });
  });
});
