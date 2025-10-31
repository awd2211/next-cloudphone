import { ChangePasswordDto } from '../../dto/change-password.dto';

export class ChangePasswordCommand {
  constructor(
    public readonly id: string,
    public readonly changePasswordDto: ChangePasswordDto
  ) {}
}
