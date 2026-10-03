import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const DEMO = {
  clientPhone: '55550001',
  workerPhone: '55550002',
  password: 'Demo1234!',
} as const;

export const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:4000/api/v1';

/** Login por UI (teléfono nacional 8 dígitos + contraseña). */
export async function loginAs(page: Page, phoneNational: string, password = DEMO.password) {
  await page.goto('/ingresar');
  await page.getByLabel('Teléfono').fill(phoneNational);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).not.toHaveURL(/\/ingresar/, { timeout: 20_000 });
}

/** Login API y cookies en el contexto del browser (mismo origen localhost). */
export async function apiLogin(
  request: APIRequestContext,
  phoneE164: string,
  password = DEMO.password,
) {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { phone: phoneE164, password },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

export function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
