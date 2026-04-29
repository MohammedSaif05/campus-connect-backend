import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as public — skips JWT authentication.
 * Only POST /auth/login should use this.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
