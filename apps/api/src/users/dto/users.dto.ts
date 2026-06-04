import { type CreateUserInput, type Role, type UserStatus } from '@saas/shared';

export type CreateUserDto = CreateUserInput;
export type UpdateUserDto = Partial<Omit<CreateUserDto, 'password'>>;

export interface UserFiltersDto {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: Role;
  status?: UserStatus;
}
