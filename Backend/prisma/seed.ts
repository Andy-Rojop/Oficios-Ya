import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { LIMITS } from '../src/shared';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  ActiveMode,
  Availability,
  PriceMode,
  PriceUnit,
  Role,
} from '../src/generated/prisma/enums';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL es requerida para el seed');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/** Contraseña compartida de las cuentas demo (solo desarrollo). */
const DEMO_PASSWORD = 'Demo1234!';

const INITIAL_CATEGORIES = [
  { name: 'Carpintería', slug: 'carpinteria' },
  { name: 'Electricidad', slug: 'electricidad' },
  { name: 'Jardinería', slug: 'jardineria' },
  { name: 'Albañilería', slug: 'albanileria' },
  { name: 'Plomería', slug: 'plomeria' },
  { name: 'Pintura', slug: 'pintura' },
  { name: 'Herrería', slug: 'herreria' },
  { name: 'Mecánica', slug: 'mecanica' },
] as const;

/**
 * Zonas de ejemplo para desarrollo local.
 * TODO: reemplazar por el listado oficial de la Municipalidad (SRS sección 20)
 * No inventar nombres de aldeas reales sin confirmación oficial.
 */
const EXAMPLE_ZONES = [
  { name: 'Zona ejemplo centro', type: 'sector', latitude: 14.533, longitude: -91.7 },
  { name: 'Zona ejemplo norte', type: 'sector', latitude: 14.55, longitude: -91.69 },
  { name: 'Zona ejemplo sur', type: 'sector', latitude: 14.52, longitude: -91.71 },
] as const;

async function main() {
  for (const category of INITIAL_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, active: true },
      create: { name: category.name, slug: category.slug, active: true },
    });
  }

  for (const zone of EXAMPLE_ZONES) {
    await prisma.zone.upsert({
      where: { name: zone.name },
      update: {
        type: zone.type,
        active: true,
        latitude: zone.latitude,
        longitude: zone.longitude,
      },
      create: {
        name: zone.name,
        type: zone.type,
        active: true,
        latitude: zone.latitude,
        longitude: zone.longitude,
      },
    });
  }

  const zoneCentro = await prisma.zone.findUniqueOrThrow({
    where: { name: 'Zona ejemplo centro' },
  });
  const plomeria = await prisma.category.findUniqueOrThrow({ where: { slug: 'plomeria' } });
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, LIMITS.BCRYPT_COST);
  const now = new Date();

  // Cliente demo — login: +50255550001 / Demo1234!
  await prisma.user.upsert({
    where: { phone: '+50255550001' },
    update: {
      name: 'Cliente Demo',
      passwordHash,
      phoneVerifiedAt: now,
      status: 'ACTIVE',
      role: Role.USER,
      activeMode: ActiveMode.CLIENT,
      zoneId: zoneCentro.id,
      termsAcceptedAt: now,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      name: 'Cliente Demo',
      phone: '+50255550001',
      phoneVerifiedAt: now,
      passwordHash,
      role: Role.USER,
      activeMode: ActiveMode.CLIENT,
      zoneId: zoneCentro.id,
      termsAcceptedAt: now,
    },
  });

  // Trabajador demo — login: +50255550002 / Demo1234!
  const workerUser = await prisma.user.upsert({
    where: { phone: '+50255550002' },
    update: {
      name: 'María Plomera',
      passwordHash,
      phoneVerifiedAt: now,
      status: 'ACTIVE',
      role: Role.USER,
      activeMode: ActiveMode.WORKER,
      zoneId: zoneCentro.id,
      termsAcceptedAt: now,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      name: 'María Plomera',
      phone: '+50255550002',
      phoneVerifiedAt: now,
      passwordHash,
      role: Role.USER,
      activeMode: ActiveMode.WORKER,
      zoneId: zoneCentro.id,
      termsAcceptedAt: now,
    },
  });

  const workerProfile = await prisma.workerProfile.upsert({
    where: { userId: workerUser.id },
    update: {
      headline: 'Plomería a domicilio',
      description:
        'Reparación de fugas, instalación de lavamanos y destape de drenajes. Atención en El Asintal.',
      experienceYears: 8,
      availability: Availability.AVAILABLE,
      mainCategoryId: plomeria.id,
      visibleChannels: { phone: true, whatsapp: true, email: false },
      schedule: {
        mon: { closed: false, from: '08:00', to: '17:00' },
        tue: { closed: false, from: '08:00', to: '17:00' },
        wed: { closed: false, from: '08:00', to: '17:00' },
        thu: { closed: false, from: '08:00', to: '17:00' },
        fri: { closed: false, from: '08:00', to: '17:00' },
        sat: { closed: false, from: '08:00', to: '12:00' },
        sun: { closed: true },
      },
    },
    create: {
      userId: workerUser.id,
      headline: 'Plomería a domicilio',
      description:
        'Reparación de fugas, instalación de lavamanos y destape de drenajes. Atención en El Asintal.',
      experienceYears: 8,
      availability: Availability.AVAILABLE,
      mainCategoryId: plomeria.id,
      visibleChannels: { phone: true, whatsapp: true, email: false },
      schedule: {
        mon: { closed: false, from: '08:00', to: '17:00' },
        tue: { closed: false, from: '08:00', to: '17:00' },
        wed: { closed: false, from: '08:00', to: '17:00' },
        thu: { closed: false, from: '08:00', to: '17:00' },
        fri: { closed: false, from: '08:00', to: '17:00' },
        sat: { closed: false, from: '08:00', to: '12:00' },
        sun: { closed: true },
      },
    },
  });

  await prisma.workerZone.upsert({
    where: {
      workerProfileId_zoneId: {
        workerProfileId: workerProfile.id,
        zoneId: zoneCentro.id,
      },
    },
    update: {},
    create: {
      workerProfileId: workerProfile.id,
      zoneId: zoneCentro.id,
    },
  });

  const existingService = await prisma.service.findFirst({
    where: { workerProfileId: workerProfile.id, name: 'Destape de drenaje' },
  });
  if (!existingService) {
    await prisma.service.create({
      data: {
        workerProfileId: workerProfile.id,
        categoryId: plomeria.id,
        name: 'Destape de drenaje',
        description: 'Destape de lavamanos, pila o drenaje de patio. Precio de referencia.',
        priceMode: PriceMode.FROM,
        priceAmount: 150,
        priceUnit: PriceUnit.VISIT,
        active: true,
      },
    });
  }

  const electricidad = await prisma.category.findUniqueOrThrow({
    where: { slug: 'electricidad' },
  });
  const carpinteria = await prisma.category.findUniqueOrThrow({
    where: { slug: 'carpinteria' },
  });
  const zoneNorte = await prisma.zone.findUniqueOrThrow({
    where: { name: 'Zona ejemplo norte' },
  });

  // Más trabajadores demo para la vista de cliente
  const extraWorkers = [
    {
      phone: '+50255550003',
      name: 'Carlos Electricista',
      headline: 'Instalaciones eléctricas',
      description: 'Cableado, tomas, breakers y revisión de fallas. Trabajo limpio y con garantía.',
      categoryId: electricidad.id,
      zoneId: zoneNorte.id,
      serviceName: 'Revisión eléctrica',
      priceAmount: 200,
      priceMode: PriceMode.FIXED,
      years: 10,
    },
    {
      phone: '+50255550004',
      name: 'José Carpintero',
      headline: 'Muebles y reparaciones',
      description: 'Puertas, closets y muebles a medida. Cotización sin compromiso.',
      categoryId: carpinteria.id,
      zoneId: zoneCentro.id,
      serviceName: 'Reparación de puerta',
      priceAmount: 250,
      priceMode: PriceMode.FROM,
      years: 12,
    },
  ] as const;

  for (const demo of extraWorkers) {
    const user = await prisma.user.upsert({
      where: { phone: demo.phone },
      update: {
        name: demo.name,
        passwordHash,
        phoneVerifiedAt: now,
        status: 'ACTIVE',
        role: Role.USER,
        activeMode: ActiveMode.WORKER,
        zoneId: demo.zoneId,
        termsAcceptedAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      create: {
        name: demo.name,
        phone: demo.phone,
        phoneVerifiedAt: now,
        passwordHash,
        role: Role.USER,
        activeMode: ActiveMode.WORKER,
        zoneId: demo.zoneId,
        termsAcceptedAt: now,
      },
    });

    const profile = await prisma.workerProfile.upsert({
      where: { userId: user.id },
      update: {
        headline: demo.headline,
        description: demo.description,
        experienceYears: demo.years,
        availability: Availability.AVAILABLE,
        mainCategoryId: demo.categoryId,
        visibleChannels: { phone: true, whatsapp: true, email: false },
      },
      create: {
        userId: user.id,
        headline: demo.headline,
        description: demo.description,
        experienceYears: demo.years,
        availability: Availability.AVAILABLE,
        mainCategoryId: demo.categoryId,
        visibleChannels: { phone: true, whatsapp: true, email: false },
      },
    });

    await prisma.workerZone.upsert({
      where: {
        workerProfileId_zoneId: {
          workerProfileId: profile.id,
          zoneId: demo.zoneId,
        },
      },
      update: {},
      create: { workerProfileId: profile.id, zoneId: demo.zoneId },
    });

    const service = await prisma.service.findFirst({
      where: { workerProfileId: profile.id, name: demo.serviceName },
    });
    if (!service) {
      await prisma.service.create({
        data: {
          workerProfileId: profile.id,
          categoryId: demo.categoryId,
          name: demo.serviceName,
          description: demo.description,
          priceMode: demo.priceMode,
          priceAmount: demo.priceAmount,
          priceUnit: PriceUnit.JOB,
          active: true,
        },
      });
    }
  }

  // Admin demo — login: +50255550099 / Demo1234!
  await prisma.user.upsert({
    where: { phone: '+50255550099' },
    update: {
      name: 'Admin Demo',
      passwordHash,
      phoneVerifiedAt: now,
      status: 'ACTIVE',
      role: Role.ADMIN,
      activeMode: ActiveMode.CLIENT,
      termsAcceptedAt: now,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      name: 'Admin Demo',
      phone: '+50255550099',
      phoneVerifiedAt: now,
      passwordHash,
      role: Role.ADMIN,
      activeMode: ActiveMode.CLIENT,
      termsAcceptedAt: now,
    },
  });

  console.log(
    [
      `Seed OK: ${INITIAL_CATEGORIES.length} categorías, ${EXAMPLE_ZONES.length} zonas.`,
      'Cuentas demo (contraseña: Demo1234!):',
      '  Cliente       +50255550001',
      '  Trabajador    +50255550002  (plomería)',
      '  Electricista  +50255550003',
      '  Carpintero    +50255550004',
      '  Admin         +50255550099',
      `  Perfil público: /trabajador/${workerProfile.id}`,
    ].join('\n'),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
