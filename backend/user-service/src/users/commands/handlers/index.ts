import { CreateUserHandler } from './create-user.handler';
import { UpdateUserHandler } from './update-user.handler';
import { ChangePasswordHandler } from './change-password.handler';
import { DeleteUserHandler } from './delete-user.handler';
import { UpdateLoginInfoHandler } from './update-login-info.handler';

export const CommandHandlers = [
  CreateUserHandler,
  UpdateUserHandler,
  ChangePasswordHandler,
  DeleteUserHandler,
  UpdateLoginInfoHandler,
];

export * from './create-user.handler';
export * from './update-user.handler';
export * from './change-password.handler';
export * from './delete-user.handler';
export * from './update-login-info.handler';
