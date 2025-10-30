import { IsString, IsObject, IsOptional } from 'class-validator';

export class RenderTemplateDto {
  @IsString()
  templateCode: string;

  @IsObject()
  data: Record<string, unknown>;

  @IsString()
  @IsOptional()
  language?: string;
}
