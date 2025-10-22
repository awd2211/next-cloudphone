import { UserCreatedEventHandler } from './user-created.handler';
import { UserUpdatedEventHandler } from './user-updated.handler';
import { PasswordChangedEventHandler } from './password-changed.handler';
import { UserDeletedEventHandler } from './user-deleted.handler';
import { AccountLockedEventHandler } from './account-locked.handler';
import { LoginInfoUpdatedEventHandler } from './login-info-updated.handler';
import { AccountUnlockedEventHandler } from './account-unlocked.handler';
import { RolesAssignedEventHandler } from './roles-assigned.handler';

export const EventHandlers = [
  UserCreatedEventHandler,
  UserUpdatedEventHandler,
  PasswordChangedEventHandler,
  UserDeletedEventHandler,
  AccountLockedEventHandler,
  LoginInfoUpdatedEventHandler,
  AccountUnlockedEventHandler,
  RolesAssignedEventHandler,
];

export * from './user-created.handler';
export * from './user-updated.handler';
export * from './password-changed.handler';
export * from './user-deleted.handler';
export * from './account-locked.handler';
export * from './login-info-updated.handler';
export * from './account-unlocked.handler';
export * from './roles-assigned.handler';
