import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";

export class ShellCommandDto {
  @ApiProperty({
    description: "Shell 命令",
    example: "pm list packages",
  })
  @IsString()
  @IsNotEmpty()
  command: string;

  @ApiProperty({
    description: "命令超时时间（毫秒）",
    example: 5000,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  timeout?: number;
}

export class PushFileDto {
  @ApiProperty({
    description: "目标路径",
    example: "/sdcard/Download/file.txt",
  })
  @IsString()
  @IsNotEmpty()
  targetPath: string;
}

export class PullFileDto {
  @ApiProperty({
    description: "源文件路径",
    example: "/sdcard/Download/file.txt",
  })
  @IsString()
  @IsNotEmpty()
  sourcePath: string;
}

export class InstallApkDto {
  @ApiProperty({
    description: "APK 文件路径或 URL",
    example: "/tmp/app.apk",
  })
  @IsString()
  @IsNotEmpty()
  apkPath: string;

  @ApiProperty({
    description: "是否重新安装（覆盖）",
    example: false,
    required: false,
  })
  @IsOptional()
  reinstall?: boolean;
}

export class UninstallApkDto {
  @ApiProperty({
    description: "包名",
    example: "com.example.app",
  })
  @IsString()
  @IsNotEmpty()
  packageName: string;
}
