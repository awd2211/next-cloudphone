import { Module } from '@nestjs/common';
import { ApkParserService } from './apk-parser.service';

@Module({
  providers: [ApkParserService],
  exports: [ApkParserService],
})
export class ApkModule {}
