/** Etiquetas en español para la bitácora de administración. */

const ACTION_LABELS: Record<string, string> = {
  CATEGORY_CREATE: 'Categoría creada',
  CATEGORY_UPDATE: 'Categoría actualizada',
  CATEGORY_DEACTIVATE: 'Categoría desactivada',
  ZONE_CREATE: 'Zona creada',
  ZONE_UPDATE: 'Zona actualizada',
  ZONE_DEACTIVATE: 'Zona desactivada',
  USER_BAN_TEMPORARY: 'Usuario baneado (temporal)',
  USER_BAN_PERMANENT: 'Usuario baneado (permanente)',
  USER_ACTIVATE: 'Usuario reactivado',
  IDENTITY_APPROVE: 'Identidad aprobada',
  IDENTITY_REJECT: 'Identidad rechazada',
  AVATAR_APPROVE: 'Foto de perfil aprobada',
  AVATAR_REJECT: 'Foto de perfil rechazada',
  CATEGORY_REQUEST_APPROVE: 'Solicitud de oficio aprobada',
  CATEGORY_REQUEST_REJECT: 'Solicitud de oficio rechazada',
  REPORT_RESOLVE: 'Reporte resuelto',
  REPORT_DISMISS: 'Reporte descartado',
  REPORT_CONVERSATION_ACCESS: 'Acceso a conversación de reporte',
  REPORT_CONVERSATION_ACCESS_DENIED: 'Acceso a conversación denegado',
};

const RESOURCE_LABELS: Record<string, string> = {
  Category: 'Categoría',
  Zone: 'Zona',
  User: 'Usuario',
  WorkerProfile: 'Perfil de trabajador',
  Report: 'Reporte',
  CategoryRequest: 'Solicitud de oficio',
  Conversation: 'Conversación',
};

const METADATA_KEY_LABELS: Record<string, string> = {
  name: 'Nombre',
  slug: 'Slug',
  note: 'Nota',
  reason: 'Motivo',
  userId: 'Usuario',
  status: 'Estado',
  banDays: 'Días de ban',
  bannedUntil: 'Ban hasta',
  previousStatus: 'Estado anterior',
  previousBannedUntil: 'Ban anterior hasta',
  avatarPath: 'Ruta de foto',
  decision: 'Decisión',
};

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replaceAll('_', ' ').toLowerCase();
}

export function auditResourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource;
}

/** Resumen legible del metadata JSON (sin códigos crudos). */
export function auditMetadataLabel(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object') return '—';
  const entries = Object.entries(metadata as Record<string, unknown>).filter(
    ([, value]) => value !== null && value !== undefined && value !== '',
  );
  if (!entries.length) return '—';

  return entries
    .map(([key, value]) => {
      const label = METADATA_KEY_LABELS[key] ?? key;
      if (typeof value === 'object') return `${label}: ${JSON.stringify(value)}`;
      return `${label}: ${String(value)}`;
    })
    .join(' · ');
}
