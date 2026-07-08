import { UserRole } from '@/generated/prisma/enums';

const ROLE_SCOPE: Partial<Record<UserRole, UserRole[] | 'ALL'>> = {
  [UserRole.ADMIN]: 'ALL',
  [UserRole.MANAGER]: [UserRole.CUSTOMER],
};

export function resolveRoleFilter(actingRole: UserRole, requestedRole?: UserRole): UserRole | undefined {
  const scope = ROLE_SCOPE[actingRole];

  if (scope === 'ALL') return requestedRole;
  if (!scope) return undefined;

  return requestedRole && scope.includes(requestedRole) ? requestedRole : scope[0];
}
