import type { Metadata } from 'next';
import { LegalDocument, LegalSection } from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Términos y condiciones de uso de la plataforma OficiosYa.',
};

export default function TerminosPage() {
  return (
    <LegalDocument title="Términos y condiciones de uso" updatedAt="1 de noviembre de 2026">
      <LegalSection title="1. Aceptación">
        <p>
          Al registrarse o usar OficiosYa, usted acepta estos términos. Si no está de acuerdo, no
          debe usar la plataforma.
        </p>
      </LegalSection>

      <LegalSection title="2. Qué es OficiosYa">
        <p>
          OficiosYa es una plataforma digital que conecta a personas que buscan servicios (clientes)
          con trabajadores de oficios en El Asintal, Retalhuleu y zonas cercanas. OficiosYa no presta
          los oficios ni es empleador de los trabajadores.
        </p>
      </LegalSection>

      <LegalSection title="3. Registro y cuenta">
        <p>
          Debe proporcionar datos veraces (nombre, teléfono, zona). Es responsable de cuidar su
          contraseña y de la actividad en su cuenta. Debe ser mayor de edad según la ley guatemalteca.
        </p>
      </LegalSection>

      <LegalSection title="4. Roles">
        <p>
          Puede usar la app como cliente y/o como trabajador. El modo trabajador implica mostrar un
          perfil público (oficios, zonas, disponibilidad, portafolio, etc.) sujeto a revisión cuando
          aplique (por ejemplo, foto de perfil).
        </p>
      </LegalSection>

      <LegalSection title="5. Solicitudes, chat y cotizaciones">
        <p>
          El cliente puede solicitar un servicio; el trabajador puede aceptar, rechazar, cotizar y
          comunicarse por el chat de la app. Los acuerdos de precio, fechas y forma de pago son entre
          las partes, salvo que OficiosYa indique otra cosa en el futuro.
        </p>
      </LegalSection>

      <LegalSection title="6. Conducta">
        <p>
          Está prohibido: fraude, acoso, amenazas, contenido ilegal u ofensivo, spam, suplantar
          identidad, publicar datos falsos o usar la plataforma para fines ajenos a oficios o
          servicios lícitos.
        </p>
      </LegalSection>

      <LegalSection title="7. Moderación">
        <p>
          OficiosYa puede revisar perfiles, fotos, reportes y mensajes cuando sea necesario para
          seguridad, y puede suspender o eliminar cuentas que incumplan estos términos.
        </p>
      </LegalSection>

      <LegalSection title="8. Contenido del usuario">
        <p>
          Usted conserva derechos sobre lo que publica (fotos, descripciones), pero otorga a
          OficiosYa permiso para mostrarlo en la plataforma con el fin de operar el servicio.
        </p>
      </LegalSection>

      <LegalSection title="9. Limitación de responsabilidad">
        <p>
          OficiosYa no garantiza la calidad, puntualidad ni resultado del trabajo entre cliente y
          trabajador, ni daños derivados de acuerdos hechos fuera de la app. El uso es bajo su propio
          riesgo, en la medida que permita la ley.
        </p>
      </LegalSection>

      <LegalSection title="10. Disponibilidad">
        <p>
          Puede haber interrupciones por mantenimiento o fallas técnicas. Se busca un servicio
          estable, sin garantizar disponibilidad continua.
        </p>
      </LegalSection>

      <LegalSection title="11. Cambios">
        <p>
          Podemos actualizar estos términos. Si el cambio es importante, se avisará en la app o al
          iniciar sesión. El uso posterior implica aceptación de la versión vigente.
        </p>
      </LegalSection>

      <LegalSection title="12. Contacto">
        <p>
          Para dudas sobre estos términos, use el canal de ayuda de la aplicación o el correo de
          soporte publicado por OficiosYa.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
