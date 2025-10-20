import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Invoice, InvoiceStatus, InvoiceType, InvoiceItem } from './entities/invoice.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface CreateInvoiceDto {
  userId: string;
  type: InvoiceType;
  items: InvoiceItem[];
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  tax?: number;
  discount?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface PayInvoiceDto {
  invoiceId: string;
  paymentId: string;
  paymentMethod: string;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
  ) {}

  /**
   * 创建账单
   */
  async createInvoice(dto: CreateInvoiceDto): Promise<Invoice> {
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = this.invoiceRepository.create({
      invoiceNumber,
      userId: dto.userId,
      type: dto.type,
      status: InvoiceStatus.DRAFT,
      items: dto.items,
      billingPeriodStart: dto.billingPeriodStart,
      billingPeriodEnd: dto.billingPeriodEnd,
      dueDate: dto.dueDate,
      tax: dto.tax || 0,
      discount: dto.discount || 0,
      notes: dto.notes,
      metadata: dto.metadata,
    });

    invoice.calculateTotal();

    const savedInvoice = await this.invoiceRepository.save(invoice);
    this.logger.log(
      `账单已创建 - 用户: ${dto.userId}, 账单号: ${invoiceNumber}, 金额: ${savedInvoice.total}`,
    );

    return savedInvoice;
  }

  /**
   * 获取账单
   */
  async getInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`账单 ${invoiceId} 未找到`);
    }

    // 检查是否逾期
    if (invoice.isOverdue() && invoice.status === InvoiceStatus.PENDING) {
      invoice.status = InvoiceStatus.OVERDUE;
      await this.invoiceRepository.save(invoice);
    }

    return invoice;
  }

  /**
   * 获取用户账单列表
   */
  async getUserInvoices(
    userId: string,
    options?: {
      status?: InvoiceStatus;
      type?: InvoiceType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ invoices: Invoice[]; total: number }> {
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.userId = :userId', { userId });

    if (options?.status) {
      queryBuilder.andWhere('invoice.status = :status', {
        status: options.status,
      });
    }

    if (options?.type) {
      queryBuilder.andWhere('invoice.type = :type', { type: options.type });
    }

    if (options?.startDate && options?.endDate) {
      queryBuilder.andWhere(
        'invoice.billingPeriodStart BETWEEN :startDate AND :endDate',
        { startDate: options.startDate, endDate: options.endDate },
      );
    }

    queryBuilder.orderBy('invoice.createdAt', 'DESC');

    const total = await queryBuilder.getCount();

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    const invoices = await queryBuilder.getMany();

    return { invoices, total };
  }

  /**
   * 发布账单（从草稿变为待支付）
   */
  async publishInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.getInvoice(invoiceId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('只能发布草稿账单');
    }

    invoice.status = InvoiceStatus.PENDING;
    const updatedInvoice = await this.invoiceRepository.save(invoice);

    this.logger.log(`账单已发布 - 账单号: ${invoice.invoiceNumber}`);

    return updatedInvoice;
  }

  /**
   * 支付账单
   */
  async payInvoice(dto: PayInvoiceDto): Promise<Invoice> {
    const invoice = await this.getInvoice(dto.invoiceId);

    if (invoice.status !== InvoiceStatus.PENDING) {
      throw new BadRequestException('只能支付待支付状态的账单');
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = new Date();
    invoice.paymentId = dto.paymentId;
    invoice.paymentMethod = dto.paymentMethod;

    const updatedInvoice = await this.invoiceRepository.save(invoice);

    this.logger.log(
      `账单已支付 - 账单号: ${invoice.invoiceNumber}, 金额: ${invoice.total}`,
    );

    return updatedInvoice;
  }

  /**
   * 取消账单
   */
  async cancelInvoice(invoiceId: string, reason: string): Promise<Invoice> {
    const invoice = await this.getInvoice(invoiceId);

    if (!invoice.canCancel()) {
      throw new BadRequestException('该账单无法取消');
    }

    invoice.status = InvoiceStatus.CANCELLED;
    invoice.notes = invoice.notes
      ? `${invoice.notes}\n取消原因: ${reason}`
      : `取消原因: ${reason}`;

    const updatedInvoice = await this.invoiceRepository.save(invoice);

    this.logger.log(`账单已取消 - 账单号: ${invoice.invoiceNumber}`);

    return updatedInvoice;
  }

  /**
   * 生成月度账单（每月1号凌晨）
   */
  @Cron('0 0 1 * *')
  async generateMonthlyInvoices(): Promise<void> {
    this.logger.log('开始生成月度账单...');

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // 这里应该从 metering 服务获取所有用户的使用记录
    // 然后为每个用户生成账单
    // 简化实现，实际应该查询所有活跃用户

    this.logger.log(
      `月度账单生成完成 - 账期: ${lastMonth.toISOString().split('T')[0]} 至 ${lastMonthEnd.toISOString().split('T')[0]}`,
    );
  }

  /**
   * 检查逾期账单（每天凌晨）
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkOverdueInvoices(): Promise<void> {
    const now = new Date();
    const overdueInvoices = await this.invoiceRepository.find({
      where: {
        status: InvoiceStatus.PENDING,
        dueDate: Between(new Date('1970-01-01'), now),
      },
    });

    for (const invoice of overdueInvoices) {
      invoice.status = InvoiceStatus.OVERDUE;
      await this.invoiceRepository.save(invoice);
      this.logger.warn(
        `账单已逾期 - 账单号: ${invoice.invoiceNumber}, 用户: ${invoice.userId}`,
      );
    }

    if (overdueInvoices.length > 0) {
      this.logger.log(`检测到 ${overdueInvoices.length} 个逾期账单`);
    }
  }

  /**
   * 获取账单统计
   */
  async getInvoiceStatistics(userId: string): Promise<{
    totalInvoices: number;
    pendingInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    totalAmount: number;
    pendingAmount: number;
    paidAmount: number;
  }> {
    const [
      totalInvoices,
      pendingInvoices,
      paidInvoices,
      overdueInvoices,
    ] = await Promise.all([
      this.invoiceRepository.count({ where: { userId } }),
      this.invoiceRepository.count({
        where: { userId, status: InvoiceStatus.PENDING },
      }),
      this.invoiceRepository.count({
        where: { userId, status: InvoiceStatus.PAID },
      }),
      this.invoiceRepository.count({
        where: { userId, status: InvoiceStatus.OVERDUE },
      }),
    ]);

    const allInvoices = await this.invoiceRepository.find({ where: { userId } });

    const totalAmount = allInvoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0,
    );
    const pendingAmount = allInvoices
      .filter((inv) => inv.status === InvoiceStatus.PENDING)
      .reduce((sum, inv) => sum + Number(inv.total), 0);
    const paidAmount = allInvoices
      .filter((inv) => inv.status === InvoiceStatus.PAID)
      .reduce((sum, inv) => sum + Number(inv.total), 0);

    return {
      totalInvoices,
      pendingInvoices,
      paidInvoices,
      overdueInvoices,
      totalAmount,
      pendingAmount,
      paidAmount,
    };
  }

  // 私有辅助方法
  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 查询本月最后一个账单号
    const lastInvoice = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.invoiceNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('invoice.invoiceNumber', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }
}
