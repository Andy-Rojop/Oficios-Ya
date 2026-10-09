import { expect, test } from '@playwright/test';
import { DEMO, loginAs, uniqueSuffix } from './helpers';

/**
 * Flujos críticos (CA demo): login, búsqueda, chat, solicitud y reseña.
 * Usa cuentas del seed; no depende de OTP Firebase.
 */
test.describe.serial('Flujos críticos cliente ↔ trabajador', () => {
  const marker = uniqueSuffix();
  const chatText = `Hola, ¿tiene disponibilidad? (${marker})`;
  const requestDesc = `Necesito revisión de tubería en la cocina (${marker}).`;
  const reviewComment = `Buen trabajo, puntual y limpio (${marker}).`;

  let workerProfilePath = '';
  let requestPath = '';

  test('login demo cliente', async ({ page }) => {
    await loginAs(page, DEMO.clientPhone);
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
    // Accesible name = aria-label ("Notificaciones"); el texto visible es "Avisos".
    await expect(page.getByRole('button', { name: /Notificaciones|Avisos/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('búsqueda abre perfil de trabajador', async ({ page }) => {
    await loginAs(page, DEMO.clientPhone);
    await page.goto('/buscar');
    await page.locator('#filter-q').fill('plomer');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page).toHaveURL(/q=/);

    const first = page.locator('article a[href^="/trabajador/"]').first();
    await expect(first).toBeVisible({ timeout: 20_000 });
    workerProfilePath = (await first.getAttribute('href')) ?? '';
    expect(workerProfilePath).toMatch(/^\/trabajador\//);
    await first.click();
    await expect(page).toHaveURL(/\/trabajador\//);
    await expect(page.getByRole('button', { name: 'Contactar' })).toBeVisible();
  });

  test('chat: contactar y enviar mensaje', async ({ page }) => {
    test.skip(!workerProfilePath, 'Sin perfil de búsqueda previa');
    await loginAs(page, DEMO.clientPhone);
    await page.goto(workerProfilePath);
    await page.getByRole('button', { name: 'Contactar' }).click();
    await expect(page).toHaveURL(/\/mensajes\//, { timeout: 20_000 });

    await page.getByLabel('Escriba un mensaje').fill(chatText);
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(page.getByText(chatText)).toBeVisible({ timeout: 20_000 });
  });

  test('solicitud de servicio', async ({ page }) => {
    test.skip(!workerProfilePath, 'Sin perfil de búsqueda previa');
    await loginAs(page, DEMO.clientPhone);
    await page.goto(workerProfilePath);
    await page.getByRole('button', { name: 'Solicitar servicio' }).click();
    await expect(page.getByRole('heading', { name: /Solicitar servicio/i })).toBeVisible();
    await page.locator('#request-description').fill(requestDesc);
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect(page).toHaveURL(/\/solicitudes\//, { timeout: 20_000 });
    requestPath = new URL(page.url()).pathname;
    await expect(page.getByText(requestDesc)).toBeVisible();
  });

  test('ciclo solicitud + reseña', async ({ page, browser }) => {
    test.skip(!requestPath, 'Sin solicitud previa');

    const workerCtx = await browser.newContext();
    const workerPage = await workerCtx.newPage();
    await loginAs(workerPage, DEMO.workerPhone);
    await workerPage.goto(requestPath);
    await expect(workerPage.getByText(requestDesc)).toBeVisible({ timeout: 20_000 });

    await workerPage.getByRole('button', { name: 'Aceptar solicitud' }).click();
    await expect(workerPage.getByRole('button', { name: 'Iniciar trabajo' })).toBeVisible({
      timeout: 15_000,
    });
    await workerPage.getByRole('button', { name: 'Iniciar trabajo' }).click();
    await expect(workerPage.getByRole('button', { name: 'Marcar como finalizado' })).toBeVisible({
      timeout: 15_000,
    });
    await workerPage.getByRole('button', { name: 'Marcar como finalizado' }).click();
    await expect(workerPage.getByText(/Finalizada|finalizado/i)).toBeVisible({ timeout: 15_000 });
    await workerCtx.close();

    await loginAs(page, DEMO.clientPhone);
    await page.goto(requestPath);
    await page.getByRole('button', { name: 'Confirmar trabajo terminado' }).click();
    await expect(page.getByText('¿Cómo fue el trabajo?')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('radio', { name: '5 estrellas' }).click();
    await page.locator('#review-comment').fill(reviewComment);
    await page.getByRole('button', { name: 'Publicar reseña' }).click();
    await expect(page.getByText(reviewComment)).toBeVisible({ timeout: 20_000 });
  });
});
