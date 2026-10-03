/**
 * Stub de @nestjs/config solo para pruebas unitarias.
 * El paquete real es CommonJS y hace require() de @nestjs/common (ESM en Nest 12),
 * algo que Jest no soporta en Node < 24.9. Los tests unitarios no necesitan ConfigService real.
 */
export class ConfigService {
  get(): unknown {
    return undefined;
  }
}

export class ConfigModule {}
