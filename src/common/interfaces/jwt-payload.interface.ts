import { Role } from '@prisma/client';

/**
 * Shape of the JWT payload stored in the token and
 * attached to request.user by the JWT strategy.
 *
 * This is a class (not an interface) so it can be used as a type
 * in decorated parameters with emitDecoratorMetadata + isolatedModules.
 */
export class JwtPayload {
  userId: string;
  collegeId: string | null;
  role: Role;
  isTutor: boolean;
  departmentId: string | null;
}
