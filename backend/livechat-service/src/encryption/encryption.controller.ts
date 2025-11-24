import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EncryptionService } from './encryption.service';
import {
  CreateKeyDto,
  RotateKeyDto,
  RevokeKeyDto,
  QueryKeysDto,
  EncryptDataDto,
  DecryptDataDto,
  InitSessionEncryptionDto,
  SessionKeyExchangeDto,
  QueryAuditLogsDto,
} from './dto';

@ApiTags('Encryption')
@ApiBearerAuth()
@Controller('encryption')
export class EncryptionController {
  constructor(private readonly encryptionService: EncryptionService) {}

  // ========== Key Management ==========

  @Post('keys')
  @ApiOperation({ summary: '创建加密密钥' })
  async createKey(@Request() req, @Body() dto: CreateKeyDto) {
    return this.encryptionService.createKey(
      req.user.tenantId,
      dto,
      req.user.sub,
    );
  }

  @Get('keys')
  @ApiOperation({ summary: '获取密钥列表' })
  async getKeys(@Request() req, @Query() query: QueryKeysDto) {
    return this.encryptionService.getKeys(req.user.tenantId, query);
  }

  @Get('keys/:id')
  @ApiOperation({ summary: '获取密钥详情' })
  async getKey(@Request() req, @Param('id') id: string) {
    return this.encryptionService.getKey(req.user.tenantId, id);
  }

  @Post('keys/:id/rotate')
  @ApiOperation({ summary: '轮换密钥' })
  async rotateKey(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RotateKeyDto,
  ) {
    return this.encryptionService.rotateKey(
      req.user.tenantId,
      id,
      dto,
      req.user.sub,
    );
  }

  @Post('keys/:id/revoke')
  @ApiOperation({ summary: '撤销密钥' })
  async revokeKey(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RevokeKeyDto,
  ) {
    await this.encryptionService.revokeKey(
      req.user.tenantId,
      id,
      dto,
      req.user.sub,
    );
    return { success: true };
  }

  // ========== Encryption Operations ==========

  @Post('encrypt')
  @ApiOperation({ summary: '加密数据' })
  async encryptData(
    @Request() req,
    @Body() dto: EncryptDataDto,
    @Ip() ip: string,
  ) {
    return this.encryptionService.encryptData(
      req.user.tenantId,
      dto,
      req.user.sub,
      ip,
    );
  }

  @Post('decrypt')
  @ApiOperation({ summary: '解密数据' })
  async decryptData(
    @Request() req,
    @Body() dto: DecryptDataDto,
    @Ip() ip: string,
  ) {
    return this.encryptionService.decryptData(
      req.user.tenantId,
      dto,
      req.user.sub,
      ip,
    );
  }

  // ========== Session (E2E) Encryption ==========

  @Post('session/init')
  @ApiOperation({ summary: '初始化会话加密' })
  async initSessionEncryption(
    @Request() req,
    @Body() dto: InitSessionEncryptionDto,
  ) {
    return this.encryptionService.initSessionEncryption(
      req.user.tenantId,
      dto,
      req.user.sub,
    );
  }

  @Post('session/exchange')
  @ApiOperation({ summary: '交换会话密钥' })
  async exchangeSessionKey(
    @Request() req,
    @Body() dto: SessionKeyExchangeDto,
  ) {
    return this.encryptionService.exchangeSessionKey(
      req.user.tenantId,
      dto,
      req.user.sub,
    );
  }

  @Get('session/:conversationId')
  @ApiOperation({ summary: '获取会话加密信息' })
  async getSessionEncryption(
    @Request() req,
    @Param('conversationId') conversationId: string,
  ) {
    return this.encryptionService.getSessionEncryption(
      req.user.tenantId,
      conversationId,
    );
  }

  // ========== Audit Logs ==========

  @Get('audit-logs')
  @ApiOperation({ summary: '获取加密审计日志' })
  async getAuditLogs(@Request() req, @Query() query: QueryAuditLogsDto) {
    return this.encryptionService.getAuditLogs(req.user.tenantId, query);
  }

  // ========== Statistics ==========

  @Get('stats')
  @ApiOperation({ summary: '获取加密统计信息' })
  async getStats(@Request() req) {
    return this.encryptionService.getStats(req.user.tenantId);
  }

  // ========== Configuration ==========

  @Get('config')
  @ApiOperation({ summary: '获取加密配置信息' })
  async getConfig() {
    return {
      enabled: this.encryptionService.isEnabled(),
      supportedAlgorithms: [
        { id: 'aes-256-gcm', name: 'AES-256-GCM', recommended: true },
        { id: 'aes-256-cbc', name: 'AES-256-CBC', recommended: false },
      ],
      keyTypes: [
        { id: 'master', name: '主密钥', description: '用于加密其他密钥' },
        { id: 'data', name: '数据密钥', description: '用于加密普通数据' },
        { id: 'session', name: '会话密钥', description: '用于端到端加密' },
        { id: 'backup', name: '备份密钥', description: '用于备份加密' },
      ],
      defaultKeyLength: 256,
      defaultRotationIntervalDays: 90,
      sessionKeyValidityHours: 24,
    };
  }
}
