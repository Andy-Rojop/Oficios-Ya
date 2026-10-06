import type { Metadata } from 'next';
import { RegisterForm } from '@/components/forms/register-form';

export const metadata: Metadata = { title: 'Crear cuenta' };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseMode(raw: string | string[] | undefined): 'CLIENT' | 'WORKER' | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'CLIENT' || value === 'WORKER') return value;
  return null;
}

export default async function RegistroPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialMode = parseMode(params.mode);

  return <RegisterForm initialMode={initialMode} />;
}
