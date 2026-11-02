import type { Metadata } from 'next';
import { LegalDocument, LegalSection } from '@/components/legal/legal-document';

export const metadata: Metadata = {
  title: 'Aviso de privacidad',
  description: 'Aviso de privacidad de OficiosYa: cómo tratamos sus datos personales.',
};

export default function PrivacidadPage() {
  return (
    <LegalDocument title="Aviso de privacidad" updatedAt="1 de noviembre de 2026">
      <LegalSection title="1. Responsable">
        <p>
          OficiosYa es responsable del tratamiento de los datos personales que usted proporciona al
          usar la plataforma, con el fin de operar el servicio de conexión entre clientes y
          trabajadores.
        </p>
      </LegalSection>

      <LegalSection title="2. Datos que recopilamos">
        <p>Según el uso de la app, podemos tratar:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Identificación: nombre, teléfono, correo (si lo indica), zona.</li>
          <li>Cuenta: contraseña (almacenada de forma segura), rol y modo activo.</li>
          <li>Perfil de trabajador: oficios, disponibilidad, portafolio, foto (sujeta a aprobación).</li>
          <li>Actividad: solicitudes, cotizaciones, mensajes del chat, reportes.</li>
          <li>Ubicación aproximada: solo si usted la comparte (por ejemplo, en búsqueda o chat).</li>
          <li>Datos técnicos de sesión: cookies necesarias para mantenerlo autenticado.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Para qué los usamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Crear y administrar su cuenta.</li>
          <li>Mostrar perfiles y resultados de búsqueda.</li>
          <li>Permitir solicitudes, chat y notificaciones.</li>
          <li>Moderar contenido, prevenir abuso y mejorar la seguridad.</li>
          <li>Cumplir obligaciones legales cuando corresponda.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Quién puede verlos">
        <p>
          Otros usuarios ven solo lo necesario para el servicio (por ejemplo, nombre y perfil público
          de un trabajador, o datos de una solicitud en la que participan). El personal de
          administración puede acceder a información para soporte y moderación. No vendemos sus
          datos personales.
        </p>
      </LegalSection>

      <LegalSection title="5. Conservación">
        <p>
          Conservamos los datos mientras su cuenta esté activa y el tiempo adicional que exijan
          seguridad, disputas o la ley. Si elimina su cuenta, dejaremos de usar sus datos para el
          servicio, salvo lo que debamos retener por obligación legal.
        </p>
      </LegalSection>

      <LegalSection title="6. Sus derechos">
        <p>
          Puede solicitar acceso, corrección o eliminación de sus datos, y cerrar sesión o cuenta
          desde la aplicación cuando esté disponible. Para ejercer estos derechos, contacte al
          soporte de OficiosYa.
        </p>
      </LegalSection>

      <LegalSection title="7. Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas razonables (por ejemplo, cookies de sesión
          seguras y control de acceso). Ningún sistema es 100 % invulnerable; le pedimos cuidar su
          dispositivo y contraseña.
        </p>
      </LegalSection>

      <LegalSection title="8. Cambios">
        <p>
          Podemos actualizar este aviso. La fecha de “última actualización” indica la versión
          vigente. El uso continuado de la plataforma implica conocimiento de dichos cambios.
        </p>
      </LegalSection>

      <LegalSection title="9. Contacto">
        <p>
          Para consultas de privacidad, use el canal de ayuda de la aplicación o el correo de
          soporte publicado por OficiosYa.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
