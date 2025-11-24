import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  TrainingCourse,
  CourseStatus,
  TrainingEnrollment,
  EnrollmentStatus,
  Exam,
  ExamStatus,
  ExamAttempt,
  Agent,
} from '../entities';
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
  CourseStats,
  AgentTrainingStats,
  LeaderboardEntry,
} from './dto';

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(
    @InjectRepository(TrainingCourse)
    private courseRepository: Repository<TrainingCourse>,
    @InjectRepository(TrainingEnrollment)
    private enrollmentRepository: Repository<TrainingEnrollment>,
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    @InjectRepository(ExamAttempt)
    private attemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ========== Course Management ==========

  async createCourse(
    tenantId: string,
    dto: CreateCourseDto,
    createdBy: string,
  ): Promise<TrainingCourse> {
    const course = this.courseRepository.create({
      tenantId,
      ...dto,
      createdBy,
    });

    return this.courseRepository.save(course);
  }

  async updateCourse(
    tenantId: string,
    id: string,
    dto: UpdateCourseDto,
  ): Promise<TrainingCourse> {
    const course = await this.courseRepository.findOne({
      where: { id, tenantId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    Object.assign(course, dto);

    if (dto.status === CourseStatus.PUBLISHED && !course.publishedAt) {
      course.publishedAt = new Date();
    }

    return this.courseRepository.save(course);
  }

  async deleteCourse(tenantId: string, id: string): Promise<void> {
    const course = await this.courseRepository.findOne({
      where: { id, tenantId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if course has enrollments
    const enrollmentCount = await this.enrollmentRepository.count({
      where: { courseId: id },
    });

    if (enrollmentCount > 0) {
      throw new BadRequestException('Cannot delete course with existing enrollments');
    }

    await this.courseRepository.remove(course);
  }

  async getCourses(
    tenantId: string,
    query: QueryCoursesDto,
  ): Promise<{ items: TrainingCourse[]; total: number }> {
    const { type, status, isMandatory, search, tags, page = 1, pageSize = 20 } = query;

    const qb = this.courseRepository.createQueryBuilder('course')
      .where('course.tenantId = :tenantId', { tenantId });

    if (type) {
      qb.andWhere('course.type = :type', { type });
    }

    if (status) {
      qb.andWhere('course.status = :status', { status });
    }

    if (isMandatory !== undefined) {
      qb.andWhere('course.isMandatory = :isMandatory', { isMandatory });
    }

    if (search) {
      qb.andWhere('(course.title ILIKE :search OR course.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (tags && tags.length > 0) {
      qb.andWhere('course.tags ?| :tags', { tags });
    }

    qb.orderBy('course.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getCourse(tenantId: string, id: string): Promise<TrainingCourse> {
    const course = await this.courseRepository.findOne({
      where: { id, tenantId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  // ========== Enrollment Management ==========

  async enrollCourse(
    tenantId: string,
    dto: EnrollCourseDto,
    agentId: string,
  ): Promise<TrainingEnrollment> {
    const course = await this.courseRepository.findOne({
      where: { id: dto.courseId, tenantId, status: CourseStatus.PUBLISHED },
    });

    if (!course) {
      throw new NotFoundException('Course not found or not published');
    }

    // Check if already enrolled
    const existing = await this.enrollmentRepository.findOne({
      where: { courseId: dto.courseId, agentId },
    });

    if (existing) {
      throw new BadRequestException('Already enrolled in this course');
    }

    const enrollment = this.enrollmentRepository.create({
      tenantId,
      agentId,
      courseId: dto.courseId,
      enrollmentSource: 'self',
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    });

    return this.enrollmentRepository.save(enrollment);
  }

  async assignCourse(
    tenantId: string,
    dto: AssignCourseDto,
    assignedBy: string,
  ): Promise<{ enrolled: number; skipped: number }> {
    const course = await this.courseRepository.findOne({
      where: { id: dto.courseId, tenantId, status: CourseStatus.PUBLISHED },
    });

    if (!course) {
      throw new NotFoundException('Course not found or not published');
    }

    let enrolled = 0;
    let skipped = 0;

    for (const agentId of dto.agentIds) {
      const existing = await this.enrollmentRepository.findOne({
        where: { courseId: dto.courseId, agentId },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const enrollment = this.enrollmentRepository.create({
        tenantId,
        agentId,
        courseId: dto.courseId,
        enrollmentSource: 'assigned',
        assignedBy,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      });

      await this.enrollmentRepository.save(enrollment);
      enrolled++;

      // Emit event for notification
      this.eventEmitter.emit('training.course_assigned', {
        enrollment,
        course,
        agentId,
      });
    }

    return { enrolled, skipped };
  }

  async updateProgress(
    tenantId: string,
    dto: UpdateProgressDto,
    agentId: string,
  ): Promise<TrainingEnrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: dto.enrollmentId, tenantId, agentId },
      relations: ['course'],
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    // Update completed lessons
    const lessonKey = `${dto.chapterId}:${dto.lessonId}`;
    const isAlreadyCompleted = enrollment.completedLessons.some(
      (l) => l.chapterId === dto.chapterId && l.lessonId === dto.lessonId,
    );

    if (dto.completed && !isAlreadyCompleted) {
      enrollment.completedLessons.push({
        chapterId: dto.chapterId,
        lessonId: dto.lessonId,
        completedAt: new Date().toISOString(),
        duration: dto.duration,
      });
    }

    // Update study time
    if (dto.duration) {
      enrollment.totalStudyTime += dto.duration;
    }

    enrollment.lastStudyAt = new Date();
    enrollment.currentPosition = {
      chapterId: dto.chapterId,
      lessonId: dto.lessonId,
    };

    // Calculate progress
    const totalLessons = enrollment.course?.chapters?.reduce(
      (sum, ch) => sum + (ch.lessons?.length || 0),
      0,
    ) || 1;
    enrollment.progress = (enrollment.completedLessons.length / totalLessons) * 100;

    // Update status
    if (enrollment.status === EnrollmentStatus.ENROLLED) {
      enrollment.status = EnrollmentStatus.IN_PROGRESS;
    }

    // Check if course is completed
    if (enrollment.progress >= 100) {
      await this.checkCourseCompletion(enrollment);
    }

    return this.enrollmentRepository.save(enrollment);
  }

  private async checkCourseCompletion(enrollment: TrainingEnrollment): Promise<void> {
    const course = enrollment.course || await this.courseRepository.findOne({
      where: { id: enrollment.courseId },
    });

    if (!course) return;

    const requirements = course.passRequirements;
    let passed = true;

    if (requirements?.requireExamPass && course.examId) {
      if (!enrollment.isPassed) {
        passed = false;
      }
    }

    if (requirements?.minExamScore && enrollment.examScore !== null) {
      if (enrollment.examScore < requirements.minExamScore) {
        passed = false;
      }
    }

    if (passed) {
      enrollment.status = EnrollmentStatus.COMPLETED;
      enrollment.isPassed = true;
      enrollment.passedAt = new Date();

      // Issue certificate if enabled
      if (course.certificate?.enabled) {
        enrollment.certificateId = uuidv4();
        enrollment.certificateIssuedAt = new Date();
        if (course.certificate.validityDays) {
          enrollment.certificateExpiresAt = new Date(
            Date.now() + course.certificate.validityDays * 24 * 60 * 60 * 1000,
          );
        }

        this.eventEmitter.emit('training.certificate_issued', {
          enrollment,
          course,
        });
      }
    }
  }

  async addNote(
    tenantId: string,
    dto: AddNoteDto,
    agentId: string,
  ): Promise<TrainingEnrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: dto.enrollmentId, tenantId, agentId },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    enrollment.notes.push({
      lessonId: dto.lessonId,
      content: dto.content,
      createdAt: new Date().toISOString(),
    });

    return this.enrollmentRepository.save(enrollment);
  }

  async getEnrollments(
    tenantId: string,
    query: QueryEnrollmentsDto,
  ): Promise<{ items: TrainingEnrollment[]; total: number }> {
    const { agentId, courseId, status, isPassed, page = 1, pageSize = 20 } = query;

    const qb = this.enrollmentRepository.createQueryBuilder('enrollment')
      .where('enrollment.tenantId = :tenantId', { tenantId })
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('enrollment.agent', 'agent');

    if (agentId) {
      qb.andWhere('enrollment.agentId = :agentId', { agentId });
    }

    if (courseId) {
      qb.andWhere('enrollment.courseId = :courseId', { courseId });
    }

    if (status) {
      qb.andWhere('enrollment.status = :status', { status });
    }

    if (isPassed !== undefined) {
      qb.andWhere('enrollment.isPassed = :isPassed', { isPassed });
    }

    qb.orderBy('enrollment.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getMyEnrollments(
    tenantId: string,
    agentId: string,
  ): Promise<TrainingEnrollment[]> {
    return this.enrollmentRepository.find({
      where: { tenantId, agentId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });
  }

  // ========== Exam Management ==========

  async createExam(
    tenantId: string,
    dto: CreateExamDto,
    createdBy: string,
  ): Promise<Exam> {
    const exam = this.examRepository.create({
      tenantId,
      ...dto,
      createdBy,
    });

    return this.examRepository.save(exam);
  }

  async updateExam(
    tenantId: string,
    id: string,
    dto: UpdateExamDto,
  ): Promise<Exam> {
    const exam = await this.examRepository.findOne({
      where: { id, tenantId },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    Object.assign(exam, dto);

    if (dto.status === ExamStatus.PUBLISHED && !exam.publishedAt) {
      exam.publishedAt = new Date();
    }

    return this.examRepository.save(exam);
  }

  async deleteExam(tenantId: string, id: string): Promise<void> {
    const exam = await this.examRepository.findOne({
      where: { id, tenantId },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Check if exam has attempts
    const attemptCount = await this.attemptRepository.count({
      where: { examId: id },
    });

    if (attemptCount > 0) {
      throw new BadRequestException('Cannot delete exam with existing attempts');
    }

    await this.examRepository.remove(exam);
  }

  async getExams(
    tenantId: string,
    query: QueryExamsDto,
  ): Promise<{ items: Exam[]; total: number }> {
    const { status, search, courseId, page = 1, pageSize = 20 } = query;

    const qb = this.examRepository.createQueryBuilder('exam')
      .where('exam.tenantId = :tenantId', { tenantId });

    if (status) {
      qb.andWhere('exam.status = :status', { status });
    }

    if (search) {
      qb.andWhere('(exam.title ILIKE :search OR exam.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (courseId) {
      qb.andWhere('exam.courseId = :courseId', { courseId });
    }

    qb.orderBy('exam.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getExam(tenantId: string, id: string): Promise<Exam> {
    const exam = await this.examRepository.findOne({
      where: { id, tenantId },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  async startExam(
    tenantId: string,
    dto: StartExamDto,
    agentId: string,
  ): Promise<ExamAttempt> {
    const exam = await this.examRepository.findOne({
      where: { id: dto.examId, tenantId, status: ExamStatus.PUBLISHED },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found or not published');
    }

    // Check attempt count
    const attemptCount = await this.attemptRepository.count({
      where: { examId: dto.examId, agentId },
    });

    if (exam.maxAttempts > 0 && attemptCount >= exam.maxAttempts) {
      throw new ForbiddenException('Maximum attempts exceeded');
    }

    // Check for ongoing attempt
    const ongoingAttempt = await this.attemptRepository.findOne({
      where: { examId: dto.examId, agentId, status: 'in_progress' },
    });

    if (ongoingAttempt) {
      return ongoingAttempt;
    }

    // Create question order (randomize if enabled)
    let questionOrder = exam.questions.map((q) => q.id);
    if (exam.randomizeQuestions) {
      questionOrder = this.shuffleArray(questionOrder);
      if (exam.randomQuestionCount > 0 && exam.randomQuestionCount < questionOrder.length) {
        questionOrder = questionOrder.slice(0, exam.randomQuestionCount);
      }
    }

    const attempt = this.attemptRepository.create({
      tenantId,
      agentId,
      examId: dto.examId,
      startedAt: new Date(),
      attemptNumber: attemptCount + 1,
      questionOrder,
    });

    return this.attemptRepository.save(attempt);
  }

  async submitAnswer(
    tenantId: string,
    dto: SubmitAnswerDto,
    agentId: string,
  ): Promise<ExamAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: dto.attemptId, tenantId, agentId, status: 'in_progress' },
    });

    if (!attempt) {
      throw new NotFoundException('Exam attempt not found');
    }

    // Update or add answer
    const answerIndex = attempt.answers.findIndex((a) => a.questionId === dto.questionId);
    const answerRecord = {
      questionId: dto.questionId,
      answer: dto.answer,
      answeredAt: new Date().toISOString(),
    };

    if (answerIndex >= 0) {
      attempt.answers[answerIndex] = answerRecord;
    } else {
      attempt.answers.push(answerRecord);
    }

    return this.attemptRepository.save(attempt);
  }

  async submitExam(
    tenantId: string,
    dto: SubmitExamDto,
    agentId: string,
  ): Promise<ExamAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: dto.attemptId, tenantId, agentId, status: 'in_progress' },
    });

    if (!attempt) {
      throw new NotFoundException('Exam attempt not found');
    }

    const exam = await this.examRepository.findOne({
      where: { id: attempt.examId },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Grade the exam
    let totalScore = 0;
    for (const answer of attempt.answers) {
      const question = exam.questions.find((q) => q.id === answer.questionId);
      if (!question) continue;

      let isCorrect = false;
      if (question.type === 'single_choice' || question.type === 'true_false') {
        const correctOption = question.options?.find((o) => o.isCorrect);
        isCorrect = correctOption?.id === answer.answer;
      } else if (question.type === 'multiple_choice') {
        const correctIds = question.options?.filter((o) => o.isCorrect).map((o) => o.id) || [];
        const answerIds = Array.isArray(answer.answer) ? answer.answer : [];
        isCorrect =
          correctIds.length === answerIds.length &&
          correctIds.every((id) => answerIds.includes(id));
      } else if (question.type === 'fill_blank') {
        isCorrect = question.correctAnswer === answer.answer;
      }

      answer.isCorrect = isCorrect;
      answer.score = isCorrect ? question.score : 0;
      totalScore += answer.score || 0;
    }

    attempt.score = totalScore;
    attempt.isPassed = totalScore >= exam.passingScore;
    attempt.submittedAt = new Date();
    attempt.duration = Math.round(
      (attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000,
    );
    attempt.status = 'graded';

    const saved = await this.attemptRepository.save(attempt);

    // Update enrollment if linked to a course
    if (exam.courseId) {
      const enrollment = await this.enrollmentRepository.findOne({
        where: { courseId: exam.courseId, agentId },
      });

      if (enrollment) {
        enrollment.examScore = totalScore;
        enrollment.examAttempts += 1;
        if (attempt.isPassed && !enrollment.isPassed) {
          enrollment.isPassed = true;
          enrollment.passedAt = new Date();
        }
        await this.enrollmentRepository.save(enrollment);
        await this.checkCourseCompletion(enrollment);
      }
    }

    return saved;
  }

  async getMyAttempts(
    tenantId: string,
    examId: string,
    agentId: string,
  ): Promise<ExamAttempt[]> {
    return this.attemptRepository.find({
      where: { tenantId, examId, agentId },
      order: { createdAt: 'DESC' },
    });
  }

  // ========== Statistics ==========

  async getCourseStats(tenantId: string, courseId: string): Promise<CourseStats> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, tenantId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { courseId },
    });

    const completed = enrollments.filter((e) => e.status === EnrollmentStatus.COMPLETED);
    const passed = enrollments.filter((e) => e.isPassed);

    return {
      courseId,
      title: course.title,
      totalEnrollments: enrollments.length,
      completedCount: completed.length,
      inProgressCount: enrollments.filter((e) => e.status === EnrollmentStatus.IN_PROGRESS).length,
      passRate: enrollments.length > 0 ? (passed.length / enrollments.length) * 100 : 0,
      avgScore: passed.length > 0
        ? passed.reduce((sum, e) => sum + (e.examScore || 0), 0) / passed.length
        : 0,
      avgCompletionTime: completed.length > 0
        ? completed.reduce((sum, e) => sum + e.totalStudyTime, 0) / completed.length
        : 0,
    };
  }

  async getAgentStats(tenantId: string, agentId: string): Promise<AgentTrainingStats> {
    const agent = await this.agentRepository.findOne({
      where: { id: agentId, tenantId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { agentId },
    });

    const completed = enrollments.filter((e) => e.status === EnrollmentStatus.COMPLETED);
    const inProgress = enrollments.filter((e) => e.status === EnrollmentStatus.IN_PROGRESS);
    const withScore = enrollments.filter((e) => e.examScore !== null);
    const withCert = enrollments.filter((e) => e.certificateId !== null);

    return {
      agentId,
      agentName: agent.displayName,
      totalCourses: enrollments.length,
      completedCourses: completed.length,
      inProgressCourses: inProgress.length,
      totalStudyTime: enrollments.reduce((sum, e) => sum + e.totalStudyTime, 0),
      avgExamScore: withScore.length > 0
        ? withScore.reduce((sum, e) => sum + (e.examScore || 0), 0) / withScore.length
        : 0,
      certificates: withCert.length,
    };
  }

  async getLeaderboard(tenantId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
    const enrollments = await this.enrollmentRepository.find({
      where: { tenantId },
      relations: ['agent'],
    });

    // Group by agent
    const agentStats = new Map<string, {
      agent: Agent;
      totalScore: number;
      completedCourses: number;
      certificates: number;
    }>();

    for (const enrollment of enrollments) {
      if (!enrollment.agent) continue;

      const key = enrollment.agentId;
      if (!agentStats.has(key)) {
        agentStats.set(key, {
          agent: enrollment.agent,
          totalScore: 0,
          completedCourses: 0,
          certificates: 0,
        });
      }

      const stats = agentStats.get(key)!;
      stats.totalScore += enrollment.examScore || 0;
      if (enrollment.status === EnrollmentStatus.COMPLETED) {
        stats.completedCourses++;
      }
      if (enrollment.certificateId) {
        stats.certificates++;
      }
    }

    // Sort and rank
    const sorted = Array.from(agentStats.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);

    return sorted.map((s, index) => ({
      rank: index + 1,
      agentId: s.agent.id,
      agentName: s.agent.displayName,
      agentAvatar: s.agent.avatar,
      totalScore: s.totalScore,
      completedCourses: s.completedCourses,
      certificates: s.certificates,
    }));
  }

  // ========== Helper Methods ==========

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
