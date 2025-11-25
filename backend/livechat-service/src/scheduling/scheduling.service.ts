import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ShiftTemplate,
  AgentSchedule,
  ScheduleStatus,
  RecurringSchedule,
  RecurrenceType,
  Agent,
} from '../entities';
import {
  CreateShiftTemplateDto,
  UpdateShiftTemplateDto,
  CreateScheduleDto,
  BatchCreateScheduleDto,
  UpdateScheduleDto,
  RequestLeaveDto,
  ApproveLeaveDto,
  CheckInOutDto,
  CreateRecurringScheduleDto,
  UpdateRecurringScheduleDto,
  QuerySchedulesDto,
  QueryShiftTemplatesDto,
  ScheduleCalendarView,
  AgentScheduleStats,
  DailyScheduleOverview,
} from './dto';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    @InjectRepository(ShiftTemplate)
    private shiftTemplateRepository: Repository<ShiftTemplate>,
    @InjectRepository(AgentSchedule)
    private scheduleRepository: Repository<AgentSchedule>,
    @InjectRepository(RecurringSchedule)
    private recurringScheduleRepository: Repository<RecurringSchedule>,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ========== Shift Templates ==========

  async createShiftTemplate(
    tenantId: string,
    dto: CreateShiftTemplateDto,
  ): Promise<ShiftTemplate> {
    const workDuration = this.calculateWorkDuration(
      dto.startTime,
      dto.endTime,
      dto.crossDay || false,
      dto.breakTimes || [],
    );

    const template = this.shiftTemplateRepository.create({
      tenantId,
      ...dto,
      workDuration,
    });

    return this.shiftTemplateRepository.save(template);
  }

  async updateShiftTemplate(
    tenantId: string,
    id: string,
    dto: UpdateShiftTemplateDto,
  ): Promise<ShiftTemplate> {
    const template = await this.shiftTemplateRepository.findOne({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Shift template not found');
    }

    Object.assign(template, dto);

    if (dto.startTime || dto.endTime || dto.breakTimes !== undefined) {
      template.workDuration = this.calculateWorkDuration(
        template.startTime,
        template.endTime,
        template.crossDay,
        template.breakTimes,
      );
    }

    return this.shiftTemplateRepository.save(template);
  }

  async deleteShiftTemplate(tenantId: string, id: string): Promise<void> {
    const template = await this.shiftTemplateRepository.findOne({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Shift template not found');
    }

    // Check if template is in use
    const inUse = await this.scheduleRepository.count({
      where: { shiftTemplateId: id },
    });

    if (inUse > 0) {
      throw new BadRequestException('Cannot delete template that is in use');
    }

    await this.shiftTemplateRepository.remove(template);
  }

  async getShiftTemplates(
    tenantId: string,
    query: QueryShiftTemplatesDto,
  ): Promise<ShiftTemplate[]> {
    const qb = this.shiftTemplateRepository.createQueryBuilder('template')
      .where('template.tenantId = :tenantId', { tenantId });

    if (query.isActive !== undefined) {
      qb.andWhere('template.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.search) {
      qb.andWhere('(template.name ILIKE :search OR template.code ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('template.startTime', 'ASC');

    return qb.getMany();
  }

  async getShiftTemplate(tenantId: string, id: string): Promise<ShiftTemplate> {
    const template = await this.shiftTemplateRepository.findOne({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Shift template not found');
    }

    return template;
  }

  // ========== Agent Schedules ==========

  async createSchedule(
    tenantId: string,
    dto: CreateScheduleDto,
    createdBy: string,
  ): Promise<AgentSchedule> {
    // Verify agent exists
    const agent = await this.agentRepository.findOne({
      where: { id: dto.agentId, tenantId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // Check for duplicate schedule
    const existing = await this.scheduleRepository.findOne({
      where: {
        tenantId,
        agentId: dto.agentId,
        scheduleDate: new Date(dto.scheduleDate),
        status: In([ScheduleStatus.SCHEDULED, ScheduleStatus.CONFIRMED, ScheduleStatus.WORKING]),
      },
    });

    if (existing) {
      throw new BadRequestException('Agent already has a schedule for this date');
    }

    let shiftName = dto.shiftName;
    let color = dto.color || '#1890ff';

    // Get shift template info if provided
    if (dto.shiftTemplateId) {
      const template = await this.shiftTemplateRepository.findOne({
        where: { id: dto.shiftTemplateId, tenantId },
      });
      if (template) {
        shiftName = shiftName || template.name;
        color = dto.color || template.color;
      }
    }

    const schedule = this.scheduleRepository.create({
      tenantId,
      agentId: dto.agentId,
      scheduleDate: new Date(dto.scheduleDate),
      shiftTemplateId: dto.shiftTemplateId,
      shiftName,
      startTime: dto.startTime,
      endTime: dto.endTime,
      crossDay: dto.crossDay || false,
      color,
      notes: dto.notes,
      createdBy,
    });

    return this.scheduleRepository.save(schedule);
  }

  async batchCreateSchedules(
    tenantId: string,
    dto: BatchCreateScheduleDto,
    createdBy: string,
  ): Promise<{ created: number; skipped: number }> {
    const template = await this.shiftTemplateRepository.findOne({
      where: { id: dto.shiftTemplateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Shift template not found');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const daysOfWeek = dto.daysOfWeek || [1, 2, 3, 4, 5]; // Default to Mon-Fri

    let created = 0;
    let skipped = 0;

    for (const agentId of dto.agentIds) {
      const agent = await this.agentRepository.findOne({
        where: { id: agentId, tenantId },
      });

      if (!agent) continue;

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();

        if (daysOfWeek.includes(dayOfWeek)) {
          const existing = await this.scheduleRepository.findOne({
            where: {
              tenantId,
              agentId,
              scheduleDate: new Date(currentDate),
              status: In([ScheduleStatus.SCHEDULED, ScheduleStatus.CONFIRMED, ScheduleStatus.WORKING]),
            },
          });

          if (!existing) {
            const schedule = this.scheduleRepository.create({
              tenantId,
              agentId,
              scheduleDate: new Date(currentDate),
              shiftTemplateId: template.id,
              shiftName: template.name,
              startTime: template.startTime,
              endTime: template.endTime,
              crossDay: template.crossDay,
              color: template.color,
              notes: dto.notes,
              createdBy,
            });
            await this.scheduleRepository.save(schedule);
            created++;
          } else {
            skipped++;
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return { created, skipped };
  }

  async updateSchedule(
    tenantId: string,
    id: string,
    dto: UpdateScheduleDto,
  ): Promise<AgentSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id, tenantId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    // Don't allow updating completed or cancelled schedules
    if ([ScheduleStatus.COMPLETED, ScheduleStatus.CANCELLED].includes(schedule.status)) {
      throw new BadRequestException('Cannot update completed or cancelled schedules');
    }

    Object.assign(schedule, dto);
    return this.scheduleRepository.save(schedule);
  }

  async deleteSchedule(tenantId: string, id: string): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id, tenantId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.status === ScheduleStatus.WORKING) {
      throw new BadRequestException('Cannot delete schedule that is currently working');
    }

    await this.scheduleRepository.remove(schedule);
  }

  async getSchedules(
    tenantId: string,
    query: QuerySchedulesDto,
  ): Promise<{ items: AgentSchedule[]; total: number }> {
    const { agentId, startDate, endDate, status, groupId, page = 1, pageSize = 50 } = query;

    const qb = this.scheduleRepository.createQueryBuilder('schedule')
      .where('schedule.tenantId = :tenantId', { tenantId })
      .leftJoinAndSelect('schedule.agent', 'agent')
      .leftJoinAndSelect('schedule.shiftTemplate', 'shiftTemplate');

    if (agentId) {
      qb.andWhere('schedule.agentId = :agentId', { agentId });
    }

    if (startDate) {
      qb.andWhere('schedule.scheduleDate >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('schedule.scheduleDate <= :endDate', { endDate });
    }

    if (status) {
      qb.andWhere('schedule.status = :status', { status });
    }

    if (groupId) {
      qb.andWhere('agent.groupId = :groupId', { groupId });
    }

    qb.orderBy('schedule.scheduleDate', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getScheduleCalendar(
    tenantId: string,
    startDate: string,
    endDate: string,
    groupId?: string,
  ): Promise<ScheduleCalendarView[]> {
    const qb = this.scheduleRepository.createQueryBuilder('schedule')
      .where('schedule.tenantId = :tenantId', { tenantId })
      .andWhere('schedule.scheduleDate >= :startDate', { startDate })
      .andWhere('schedule.scheduleDate <= :endDate', { endDate })
      .leftJoinAndSelect('schedule.agent', 'agent');

    if (groupId) {
      qb.andWhere('agent.groupId = :groupId', { groupId });
    }

    qb.orderBy('schedule.scheduleDate', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC');

    const schedules = await qb.getMany();

    // Group by date
    const calendarMap = new Map<string, ScheduleCalendarView>();

    for (const schedule of schedules) {
      const dateKey = schedule.scheduleDate.toISOString().split('T')[0];

      if (!calendarMap.has(dateKey)) {
        calendarMap.set(dateKey, { date: dateKey, schedules: [] });
      }

      calendarMap.get(dateKey)!.schedules.push({
        id: schedule.id,
        agentId: schedule.agentId,
        agentName: schedule.agent?.displayName || '',
        agentAvatar: schedule.agent?.avatar,
        shiftName: schedule.shiftName || '',
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        status: schedule.status,
        color: schedule.color,
      });
    }

    return Array.from(calendarMap.values());
  }

  async requestLeave(
    tenantId: string,
    dto: RequestLeaveDto,
    agentId: string,
  ): Promise<AgentSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: dto.scheduleId, tenantId, agentId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.status !== ScheduleStatus.SCHEDULED && schedule.status !== ScheduleStatus.CONFIRMED) {
      throw new BadRequestException('Cannot request leave for this schedule');
    }

    schedule.status = ScheduleStatus.LEAVE;
    schedule.leaveType = dto.leaveType;
    schedule.leaveReason = dto.reason ?? '';

    const saved = await this.scheduleRepository.save(schedule);

    this.eventEmitter.emit('schedule.leave_requested', {
      schedule: saved,
      agentId,
    });

    return saved;
  }

  async approveLeave(
    tenantId: string,
    dto: ApproveLeaveDto,
    approvedBy: string,
  ): Promise<AgentSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: dto.scheduleId, tenantId, status: ScheduleStatus.LEAVE },
    });

    if (!schedule) {
      throw new NotFoundException('Leave request not found');
    }

    if (dto.approved) {
      schedule.leaveApprovedBy = approvedBy;
      schedule.leaveApprovedAt = new Date();
    } else {
      schedule.status = ScheduleStatus.SCHEDULED;
      schedule.leaveType = null as any;
      schedule.leaveReason = dto.reason ?? '';
    }

    const saved = await this.scheduleRepository.save(schedule);

    this.eventEmitter.emit('schedule.leave_approved', {
      schedule: saved,
      approved: dto.approved,
      approvedBy,
    });

    return saved;
  }

  async checkInOut(
    tenantId: string,
    dto: CheckInOutDto,
    agentId: string,
  ): Promise<AgentSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: dto.scheduleId, tenantId, agentId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    const now = new Date();

    if (dto.type === 'checkin') {
      if (schedule.status !== ScheduleStatus.SCHEDULED && schedule.status !== ScheduleStatus.CONFIRMED) {
        throw new BadRequestException('Cannot check in for this schedule');
      }
      schedule.status = ScheduleStatus.WORKING;
      schedule.actualStartTime = now;

      // Calculate late minutes
      const scheduledStart = this.parseTimeToMinutes(schedule.startTime);
      const actualStart = now.getHours() * 60 + now.getMinutes();
      const lateMinutes = Math.max(0, actualStart - scheduledStart);

      schedule.workStats = {
        ...schedule.workStats,
        lateMinutes,
      };
    } else {
      if (schedule.status !== ScheduleStatus.WORKING) {
        throw new BadRequestException('Cannot check out - not currently working');
      }
      schedule.status = ScheduleStatus.COMPLETED;
      schedule.actualEndTime = now;

      // Calculate work stats
      const scheduledEnd = this.parseTimeToMinutes(schedule.endTime);
      const actualEnd = now.getHours() * 60 + now.getMinutes();
      const earlyLeaveMinutes = Math.max(0, scheduledEnd - actualEnd);
      const overtimeMinutes = Math.max(0, actualEnd - scheduledEnd);
      const totalWorkMinutes = schedule.actualStartTime
        ? Math.round((now.getTime() - schedule.actualStartTime.getTime()) / 60000)
        : 0;

      schedule.workStats = {
        ...schedule.workStats,
        earlyLeaveMinutes,
        overtimeMinutes,
        totalWorkMinutes,
      };
    }

    const saved = await this.scheduleRepository.save(schedule);

    this.eventEmitter.emit(`schedule.${dto.type}`, {
      schedule: saved,
      agentId,
    });

    return saved;
  }

  // ========== Recurring Schedules ==========

  async createRecurringSchedule(
    tenantId: string,
    dto: CreateRecurringScheduleDto,
    createdBy: string,
  ): Promise<RecurringSchedule> {
    const agent = await this.agentRepository.findOne({
      where: { id: dto.agentId, tenantId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const template = await this.shiftTemplateRepository.findOne({
      where: { id: dto.shiftTemplateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Shift template not found');
    }

    const recurringData = {
      tenantId,
      ...dto,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
      createdBy,
    };

    const recurring = this.recurringScheduleRepository.create(recurringData as any) as unknown as RecurringSchedule;

    return this.recurringScheduleRepository.save(recurring);
  }

  async updateRecurringSchedule(
    tenantId: string,
    id: string,
    dto: UpdateRecurringScheduleDto,
  ): Promise<RecurringSchedule> {
    const recurring = await this.recurringScheduleRepository.findOne({
      where: { id, tenantId },
    });

    if (!recurring) {
      throw new NotFoundException('Recurring schedule not found');
    }

    Object.assign(recurring, dto);

    if (dto.effectiveUntil) {
      recurring.effectiveUntil = new Date(dto.effectiveUntil);
    }

    return this.recurringScheduleRepository.save(recurring);
  }

  async deleteRecurringSchedule(tenantId: string, id: string): Promise<void> {
    const recurring = await this.recurringScheduleRepository.findOne({
      where: { id, tenantId },
    });

    if (!recurring) {
      throw new NotFoundException('Recurring schedule not found');
    }

    await this.recurringScheduleRepository.remove(recurring);
  }

  async getRecurringSchedules(
    tenantId: string,
    agentId?: string,
  ): Promise<RecurringSchedule[]> {
    const where: any = { tenantId };
    if (agentId) {
      where.agentId = agentId;
    }

    return this.recurringScheduleRepository.find({
      where,
      relations: ['agent', 'shiftTemplate'],
      order: { createdAt: 'DESC' },
    });
  }

  // ========== Statistics ==========

  async getAgentScheduleStats(
    tenantId: string,
    agentId: string,
    startDate: string,
    endDate: string,
  ): Promise<AgentScheduleStats> {
    const agent = await this.agentRepository.findOne({
      where: { id: agentId, tenantId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const schedules = await this.scheduleRepository.find({
      where: {
        tenantId,
        agentId,
        scheduleDate: Between(new Date(startDate), new Date(endDate)),
      },
    });

    const stats: AgentScheduleStats = {
      agentId,
      agentName: agent.displayName,
      period: { startDate, endDate },
      totalScheduledDays: schedules.length,
      totalWorkedDays: schedules.filter(s => s.status === ScheduleStatus.COMPLETED).length,
      totalAbsentDays: schedules.filter(s => s.status === ScheduleStatus.ABSENT).length,
      totalLeaveDays: schedules.filter(s => s.status === ScheduleStatus.LEAVE).length,
      totalWorkMinutes: schedules.reduce((sum, s) => sum + (s.workStats?.totalWorkMinutes || 0), 0),
      totalOvertimeMinutes: schedules.reduce((sum, s) => sum + (s.workStats?.overtimeMinutes || 0), 0),
      avgLateMinutes: schedules.length > 0
        ? schedules.reduce((sum, s) => sum + (s.workStats?.lateMinutes || 0), 0) / schedules.length
        : 0,
      attendance: {
        scheduled: schedules.filter(s => s.status === ScheduleStatus.SCHEDULED).length,
        completed: schedules.filter(s => s.status === ScheduleStatus.COMPLETED).length,
        absent: schedules.filter(s => s.status === ScheduleStatus.ABSENT).length,
        leave: schedules.filter(s => s.status === ScheduleStatus.LEAVE).length,
      },
    };

    return stats;
  }

  async getDailyOverview(tenantId: string, date: string): Promise<DailyScheduleOverview> {
    const schedules = await this.scheduleRepository.find({
      where: {
        tenantId,
        scheduleDate: new Date(date),
      },
      relations: ['agent'],
    });

    const totalAgents = await this.agentRepository.count({ where: { tenantId } });

    const shiftCounts = new Map<string, { count: number; color: string }>();
    for (const schedule of schedules) {
      const key = schedule.shiftName || 'Unknown';
      if (!shiftCounts.has(key)) {
        shiftCounts.set(key, { count: 0, color: schedule.color });
      }
      shiftCounts.get(key)!.count++;
    }

    return {
      date,
      totalAgents,
      scheduledAgents: schedules.length,
      workingAgents: schedules.filter(s => s.status === ScheduleStatus.WORKING).length,
      onLeaveAgents: schedules.filter(s => s.status === ScheduleStatus.LEAVE).length,
      absentAgents: schedules.filter(s => s.status === ScheduleStatus.ABSENT).length,
      shifts: Array.from(shiftCounts.entries()).map(([name, data]) => ({
        shiftName: name,
        agentCount: data.count,
        color: data.color,
      })),
    };
  }

  // ========== Cron Jobs ==========

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async generateRecurringSchedules(): Promise<void> {
    this.logger.log('Generating recurring schedules...');

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14); // Generate 2 weeks ahead

    const activeRules = await this.recurringScheduleRepository.find({
      where: {
        isActive: true,
        effectiveFrom: LessThanOrEqual(futureDate),
      },
      relations: ['shiftTemplate'],
    });

    for (const rule of activeRules) {
      if (rule.effectiveUntil && rule.effectiveUntil < today) {
        continue;
      }

      const startDate = rule.lastGeneratedDate
        ? new Date(rule.lastGeneratedDate.getTime() + 86400000)
        : new Date(Math.max(today.getTime(), rule.effectiveFrom.getTime()));

      const endDate = rule.effectiveUntil
        ? new Date(Math.min(futureDate.getTime(), rule.effectiveUntil.getTime()))
        : futureDate;

      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const shouldSchedule = this.shouldScheduleDate(rule, currentDate);

        if (shouldSchedule) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const isExcluded = rule.excludeDates.includes(dateStr);

          if (!isExcluded) {
            const existing = await this.scheduleRepository.findOne({
              where: {
                tenantId: rule.tenantId,
                agentId: rule.agentId,
                scheduleDate: new Date(currentDate),
              },
            });

            if (!existing) {
              const schedule = this.scheduleRepository.create({
                tenantId: rule.tenantId,
                agentId: rule.agentId,
                scheduleDate: new Date(currentDate),
                shiftTemplateId: rule.shiftTemplateId,
                shiftName: rule.shiftTemplate?.name,
                startTime: rule.shiftTemplate?.startTime || '09:00',
                endTime: rule.shiftTemplate?.endTime || '18:00',
                crossDay: rule.shiftTemplate?.crossDay || false,
                color: rule.shiftTemplate?.color || '#1890ff',
                isRecurring: true,
                recurringRuleId: rule.id,
              });

              await this.scheduleRepository.save(schedule);
            }
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      rule.lastGeneratedDate = new Date(endDate);
      await this.recurringScheduleRepository.save(rule);
    }

    this.logger.log('Recurring schedules generation completed');
  }

  @Cron('0 0 * * *') // Every day at midnight
  async markAbsentSchedules(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    await this.scheduleRepository
      .createQueryBuilder()
      .update()
      .set({ status: ScheduleStatus.ABSENT })
      .where('scheduleDate = :date', { date: dateStr })
      .andWhere('status IN (:...statuses)', {
        statuses: [ScheduleStatus.SCHEDULED, ScheduleStatus.CONFIRMED],
      })
      .execute();

    this.logger.log(`Marked unattended schedules for ${dateStr} as absent`);
  }

  // ========== Helper Methods ==========

  private calculateWorkDuration(
    startTime: string,
    endTime: string,
    crossDay: boolean,
    breakTimes: { startTime: string; endTime: string }[],
  ): number {
    let startMinutes = this.parseTimeToMinutes(startTime);
    let endMinutes = this.parseTimeToMinutes(endTime);

    if (crossDay) {
      endMinutes += 24 * 60;
    }

    let workMinutes = endMinutes - startMinutes;

    for (const breakTime of breakTimes) {
      const breakStart = this.parseTimeToMinutes(breakTime.startTime);
      const breakEnd = this.parseTimeToMinutes(breakTime.endTime);
      workMinutes -= (breakEnd - breakStart);
    }

    return Math.max(0, workMinutes);
  }

  private parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private shouldScheduleDate(rule: RecurringSchedule, date: Date): boolean {
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();

    switch (rule.recurrenceType) {
      case RecurrenceType.DAILY:
        return true;
      case RecurrenceType.WEEKLY:
        return rule.daysOfWeek.includes(dayOfWeek);
      case RecurrenceType.BIWEEKLY:
        // Calculate week number from effectiveFrom
        const weeksDiff = Math.floor(
          (date.getTime() - rule.effectiveFrom.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );
        return weeksDiff % 2 === 0 && rule.daysOfWeek.includes(dayOfWeek);
      case RecurrenceType.MONTHLY:
        return rule.daysOfMonth.includes(dayOfMonth);
      default:
        return false;
    }
  }
}
