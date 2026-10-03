/**
 * Stub de @nestjs/swagger solo para pruebas unitarias (paquete CJS que hace require() de
 * @nestjs/common ESM; Jest no lo soporta en Node < 24.9). Los decoradores son no-ops.
 */
const noopDecorator = () => () => undefined;

export const ApiProperty = noopDecorator;
export const ApiPropertyOptional = noopDecorator;
export const ApiTags = noopDecorator;
export const ApiOperation = noopDecorator;
export const ApiCookieAuth = noopDecorator;
export const ApiOkResponse = noopDecorator;
