import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsBoolean,
  IsDateString,
  Matches,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ScheduleStatus, LeaveType, RecurrenceType } from '../../entities';

// ========== Shift Template DTOs ==========

export class CreateShiftTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format' })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be in HH:mm format' })
  endTime: string;

  @IsOptional()
  @IsBoolean()
  crossDay?: boolean;

  @IsOptional()
  @IsArray()
  breakTimes?: {
    startTime: string;
    endTime: string;
    name?: string;
  }[];

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateShiftTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  crossDay?: boolean;

  @IsOptional()
  @IsArray()
  breakTimes?: {
    startTime: string;
    endTime: string;
    name?: string;
  }[];

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ========== Agent Schedule DTOs ==========

export class CreateScheduleDto {
  @IsUUID()
  agentId: string;

  @IsDateString()
  scheduleDate: string;

  @IsOptional()
  @IsUUID()
  shiftTemplateId?: string;

  @IsOptional()
  @IsString()
  shiftName?: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format' })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be in HH:mm format' })
  endTime: string;

  @IsOptional()
  @IsBoolean()
  crossDay?: boolean;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BatchCreateScheduleDto {
  @IsArray()
  @IsUUID('4', { each: true })
  agentIds: string[];

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsUUID()
  shiftTemplateId: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek?: number[]; // 0-6, 0 is Sunday

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsUUID()
  shiftTemplateId?: string;

  @IsOptional()
  @IsString()
  shiftName?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  crossDay?: boolean;

  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RequestLeaveDto {
  @IsUUID()
  scheduleId: string;

  @IsEnum(LeaveType)
  leaveType: LeaveType;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApproveLeaveDto {
  @IsUUID()
  scheduleId: string;

  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CheckInOutDto {
  @IsUUID()
  scheduleId: string;

  @IsString()
  type: 'checkin' | 'checkout';
}

// ========== Recurring Schedule DTOs ==========

export class CreateRecurringScheduleDto {
  @IsUUID()
  agentId: string;

  @IsString()
  name: string;

  @IsEnum(RecurrenceType)
  recurrenceType: RecurrenceType;

  @IsUUID()
  shiftTemplateId: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Max(31, { each: true })
  daysOfMonth?: number[];

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @IsOptional()
  @IsArray()
  @IsDateString({ strict: true }, { each: true })
  excludeDates?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRecurringScheduleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  shiftTemplateId?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfMonth?: number[];

  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;

  @IsOptional()
  @IsArray()
  @IsDateString({ strict: true }, { each: true })
  excludeDates?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ========== Query DTOs ==========

export class QuerySchedulesDto {
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}

export class QueryShiftTemplatesDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}

// ========== Response Types ==========

export interface ScheduleCalendarView {
  date: string;
  schedules: {
    id: string;
    agentId: string;
    agentName: string;
    agentAvatar?: string;
    shiftName: string;
    startTime: string;
    endTime: string;
    status: ScheduleStatus;
    color: string;
  }[];
}

export interface AgentScheduleStats {
  agentId: string;
  agentName: string;
  period: {
    startDate: string;
    endDate: string;
  };
  totalScheduledDays: number;
  totalWorkedDays: number;
  totalAbsentDays: number;
  totalLeaveDays: number;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  avgLateMinutes: number;
  attendance: {
    scheduled: number;
    completed: number;
    absent: number;
    leave: number;
  };
}

export interface DailyScheduleOverview {
  date: string;
  totalAgents: number;
  scheduledAgents: number;
  workingAgents: number;
  onLeaveAgents: number;
  absentAgents: number;
  shifts: {
    shiftName: string;
    agentCount: number;
    color: string;
  }[];
}
