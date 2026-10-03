import { SetMetadata } from '@nestjs/common';

export const REQUIRE_WORKER_MODE_KEY = 'requireWorkerMode';

/** Exige que el usuario autenticado tenga activeMode = WORKER (evaluado por ModeGuard). */
export const RequireWorkerMode = () => SetMetadata(REQUIRE_WORKER_MODE_KEY, true);
