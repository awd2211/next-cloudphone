import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../auth/jwt.strategy';
import { TrainingService } from './training.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  EnrollCourseDto,
  AssignCourseDto,
  UpdateProgressDto,
  AddNoteDto,
  CreateExamDto,
  UpdateExamDto,
  StartExamDto,
  SubmitAnswerDto,
  SubmitExamDto,
  QueryCoursesDto,
  QueryEnrollmentsDto,
  QueryExamsDto,
} from './dto';

@ApiTags('Training')
@ApiBearerAuth()
@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  // ========== Course Management ==========

  @Post('courses')
  @ApiOperation({ summary: '创建培训课程' })
  async createCourse(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateCourseDto,
  ) {
    const createdBy = req.user.sub;
    return this.trainingService.createCourse(req.user.tenantId, dto, createdBy);
  }

  @Put('courses/:id')
  @ApiOperation({ summary: '更新培训课程' })
  async updateCourse(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.trainingService.updateCourse(req.user.tenantId, id, dto);
  }

  @Delete('courses/:id')
  @ApiOperation({ summary: '删除培训课程' })
  async deleteCourse(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.trainingService.deleteCourse(req.user.tenantId, id);
    return { success: true };
  }

  @Get('courses')
  @ApiOperation({ summary: '获取培训课程列表' })
  async getCourses(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryCoursesDto,
  ) {
    return this.trainingService.getCourses(req.user.tenantId, query);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: '获取培训课程详情' })
  async getCourse(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.trainingService.getCourse(req.user.tenantId, id);
  }

  // ========== Enrollment Management ==========

  @Post('enroll')
  @ApiOperation({ summary: '报名课程' })
  async enrollCourse(
    @Request() req: AuthenticatedRequest,
    @Body() dto: EnrollCourseDto,
  ) {
    const agentId = req.user.agentId || req.user.sub;
    return this.trainingService.enrollCourse(req.user.tenantId, dto, agentId);
  }

  @Post('assign')
  @ApiOperation({ summary: '指派课程' })
  async assignCourse(
    @Request() req: AuthenticatedRequest,
    @Body() dto: AssignCourseDto,
  ) {
    const assignedBy = req.user.sub;
    return this.trainingService.assignCourse(req.user.tenantId, dto, assignedBy);
  }

  @Post('progress')
  @ApiOperation({ summary: '更新学习进度' })
  async updateProgress(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProgressDto,
  ) {
    const agentId = req.user.agentId || req.user.sub;
    return this.trainingService.updateProgress(req.user.tenantId, dto, agentId);
  }

  @Post('notes')
  @ApiOperation({ summary: '添加学习笔记' })
  async addNote(
    @Request() req: AuthenticatedRequest,
    @Body() dto: AddNoteDto,
  ) {
    const agentId = req.user.agentId || req.user.sub;
    return this.trainingService.addNote(req.user.tenantId, dto, agentId);
  }

  @Get('enrollments')
  @ApiOperation({ summary: '获取报名列表' })
  async getEnrollments(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryEnrollmentsDto,
  ) {
    return this.trainingService.getEnrollments(req.user.tenantId, query);
  }

  @Get('my-enrollments')
  @ApiOperation({ summary: '获取我的学习列表' })
  async getMyEnrollments(@Request() req: AuthenticatedRequest) {
    const agentId = req.user.agentId || req.user.sub;
    return this.trainingService.getMyEnrollments(req.user.tenantId, agentId);
  }

  // ========== Exam Management ==========

  @Post('exams')
  @ApiOperation({ summary: '创建考试' })
  async createExam(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateExamDto,
  ) {
    const createdBy = req.user.sub;
    return this.trainingService.createExam(req.user.tenantId, dto, createdBy);
  }

  @Put('exams/:id')
  @ApiOperation({ summary: '更新考试' })
  async updateExam(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.trainingService.updateExam(req.user.tenantId, id, dto);
  }

  @Delete('exams/:id')
  @ApiOperation({ summary: '删除考试' })
  async deleteExam(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    await this.trainingService.deleteExam(req.user.tenantId, id);
    return { success: true };
  }

  @Get('exams')
  @ApiOperation({ summary: '获取考试列表' })
  async getExams(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryExamsDto,
  ) {
    return this.trainingService.getExams(req.user.tenantId, query);
  }

  @Get('exams/:id')
  @ApiOperation({ summary: '获取考试详情' })
  async getExam(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.trainingService.getExam(req.user.tenantId, id);
  }

  @Post('exams/start')
  @ApiOperation({ summary: '开始考试' })
  async startExam(
    @Request() req: AuthenticatedRequest,
    @Body() dto: StartExamDto,
  ) {
    const agentId = req.user.agentId || req.user.sub;
    return this.trainingService.startExam(req.user.tenantId, dto, agentId);
  }

  @Post('exams/answer')
  @ApiOperation({ summary: '提交答案' })
  async submitAnswer(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SubmitAnswerDto,
  ) {
    const agentId = req.user.agentId || req.user.sub;
    return this.trainingService.submitAnswer(req.user.tenantId, dto, agentId);
  }

  @Post('exams/submit')
  @ApiOperation({ summary: '提交考试' })
  async submitExam(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SubmitExamDto,
  ) {
    const agentId = req.user.agentId || req.user.sub;
    return this.trainingService.submitExam(req.user.tenantId, dto, agentId);
  }

  @Get('exams/:examId/my-attempts')
  @ApiOperation({ summary: '获取我的考试记录' })
  async getMyAttempts(
    @Request() req: AuthenticatedRequest,
    @Param('examId') examId: string,
  ) {
    const agentId = req.user.agentId || req.user.sub;
    return this.trainingService.getMyAttempts(req.user.tenantId, examId, agentId);
  }

  // ========== Statistics ==========

  @Get('stats/course/:courseId')
  @ApiOperation({ summary: '获取课程统计' })
  async getCourseStats(
    @Request() req: AuthenticatedRequest,
    @Param('courseId') courseId: string,
  ) {
    return this.trainingService.getCourseStats(req.user.tenantId, courseId);
  }

  @Get('stats/agent/:agentId')
  @ApiOperation({ summary: '获取客服培训统计' })
  async getAgentStats(
    @Request() req: AuthenticatedRequest,
    @Param('agentId') agentId: string,
  ) {
    return this.trainingService.getAgentStats(req.user.tenantId, agentId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: '获取培训排行榜' })
  async getLeaderboard(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: number,
  ) {
    return this.trainingService.getLeaderboard(req.user.tenantId, limit || 10);
  }
}
