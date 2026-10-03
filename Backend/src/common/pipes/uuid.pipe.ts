import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

/** Valida parámetros de ruta UUID con un mensaje en español. */
export const UUID_PIPE = new ParseUUIDPipe({
  exceptionFactory: () => new BadRequestException('El identificador no es válido'),
});
