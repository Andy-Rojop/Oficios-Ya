import type { NextConfig } from 'next';

/** Hosts desde los que next/image puede cargar fotos (bucket público de Supabase Storage). */
function supabaseImageHosts(): { protocol: 'https'; hostname: string; pathname: string }[] {
  const hostnames = new Set<string>(['*.supabase.co']);
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (configured) {
    try {
      hostnames.add(new URL(configured).hostname);
    } catch {
      // URL inválida: se ignora y se usa el comodín *.supabase.co
    }
  }
  return [...hostnames].map((hostname) => ({
    protocol: 'https' as const,
    hostname,
    pathname: '/storage/v1/object/public/**',
  }));
}

const nextConfig: NextConfig = {
  transpilePackages: ['@oficiosya/shared'],
  images: {
    remotePatterns: supabaseImageHosts(),
  },
};

export default nextConfig;
