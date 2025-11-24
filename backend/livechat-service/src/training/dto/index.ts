import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CourseType, CourseStatus, EnrollmentStatus, ExamStatus, QuestionType } from '../../entities';

// ========== Course DTOs ==========

class LessonDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  type: 'video' | 'document' | 'quiz' | 'practice';

  @IsString()
  content: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsNumber()
  order: number;
}

class ChapterDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  order: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonDto)
  lessons: LessonDto[];
}

export class CreateCourseDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CourseType)
  type?: CourseType;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChapterDto)
  chapters?: ChapterDto[];

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetGroupIds?: string[];

  @IsOptional()
  passRequirements?: {
    minLessonsCompleted?: number;
    requireExamPass?: boolean;
    minExamScore?: number;
  };

  @IsOptional()
  @IsUUID()
  examId?: string;

  @IsOptional()
  certificate?: {
    enabled: boolean;
    templateName?: string;
    validityDays?: number;
  };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CourseType)
  type?: CourseType;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @IsOptional()
  @IsArray()
  chapters?: ChapterDto[];

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsArray()
  targetGroupIds?: string[];

  @IsOptional()
  passRequirements?: {
    minLessonsCompleted?: number;
    requireExamPass?: boolean;
    minExamScore?: number;
  };

  @IsOptional()
  @IsUUID()
  examId?: string;

  @IsOptional()
  certificate?: {
    enabled: boolean;
    templateName?: string;
    validityDays?: number;
  };

  @IsOptional()
  @IsArray()
  tags?: string[];
}

// ========== Enrollment DTOs ==========

export class EnrollCourseDto {
  @IsUUID()
  courseId: string;

  @IsOptional()
  dueDate?: string;
}

export class AssignCourseDto {
  @IsUUID()
  courseId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  agentIds: string[];

  @IsOptional()
  dueDate?: string;
}

export class UpdateProgressDto {
  @IsUUID()
  enrollmentId: string;

  @IsString()
  chapterId: string;

  @IsString()
  lessonId: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class AddNoteDto {
  @IsUUID()
  enrollmentId: string;

  @IsString()
  lessonId: string;

  @IsString()
  content: string;
}

// ========== Exam DTOs ==========

class QuestionOptionDto {
  @IsString()
  id: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}

class QuestionDto {
  @IsString()
  id: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @IsOptional()
  correctAnswer?: string | string[];

  @IsNumber()
  @Min(1)
  score: number;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsNumber()
  order: number;
}

export class CreateExamDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  totalScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  passingScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAttempts?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions?: QuestionDto[];

  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @IsOptional()
  @IsNumber()
  randomQuestionCount?: number;

  @IsOptional()
  @IsBoolean()
  randomizeOptions?: boolean;

  @IsOptional()
  @IsBoolean()
  showExplanation?: boolean;

  @IsOptional()
  @IsString()
  explanationTiming?: 'immediately' | 'after_submit' | 'after_all_attempts';

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateExamDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsNumber()
  totalScore?: number;

  @IsOptional()
  @IsNumber()
  passingScore?: number;

  @IsOptional()
  @IsNumber()
  maxAttempts?: number;

  @IsOptional()
  @IsArray()
  questions?: QuestionDto[];

  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @IsOptional()
  @IsNumber()
  randomQuestionCount?: number;

  @IsOptional()
  @IsBoolean()
  randomizeOptions?: boolean;

  @IsOptional()
  @IsBoolean()
  showExplanation?: boolean;

  @IsOptional()
  @IsString()
  explanationTiming?: 'immediately' | 'after_submit' | 'after_all_attempts';

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class StartExamDto {
  @IsUUID()
  examId: string;
}

export class SubmitAnswerDto {
  @IsUUID()
  attemptId: string;

  @IsString()
  questionId: string;

  answer: string | string[];
}

export class SubmitExamDto {
  @IsUUID()
  attemptId: string;
}

// ========== Query DTOs ==========

export class QueryCoursesDto {
  @IsOptional()
  @IsEnum(CourseType)
  type?: CourseType;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}

export class QueryEnrollmentsDto {
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @IsOptional()
  @IsBoolean()
  isPassed?: boolean;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}

export class QueryExamsDto {
  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}

// ========== Response Types ==========

export interface CourseStats {
  courseId: string;
  title: string;
  totalEnrollments: number;
  completedCount: number;
  inProgressCount: number;
  passRate: number;
  avgScore: number;
  avgCompletionTime: number;
}

export interface AgentTrainingStats {
  agentId: string;
  agentName: string;
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalStudyTime: number;
  avgExamScore: number;
  certificates: number;
}

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string;
  agentAvatar?: string;
  totalScore: number;
  completedCourses: number;
  certificates: number;
}
