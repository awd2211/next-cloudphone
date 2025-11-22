import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import {
  LegalDocumentType,
  ContentType,
} from '../entities/legal-document.entity';

export class CreateLegalDocumentDto {
  @IsEnum(LegalDocumentType)
  type: LegalDocumentType;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}

export class UpdateLegalDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}
