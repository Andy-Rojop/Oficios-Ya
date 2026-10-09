import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { ConversationAccessService } from '../src/chat/conversation-access.service';
import { AccountStatus } from '../src/generated/prisma/enums';
import type { NotificationsService } from '../src/notifications/notifications.service';
import type { PrismaService } from '../src/prisma/prisma.service';
import { RequestsService } from '../src/requests/requests.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const PROFILE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

/** Controlador mínimo (sin Throttle/JWT/ValidationPipe) para ejercitar el servicio con Supertest. */
@Controller('requests')
class SelfRequestProbeController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  create(
    @Body()
    dto: {
      workerProfileId?: string;
      workerUserId?: string;
      description: string;
    },
  ) {
    return this.requests.create(USER_ID, dto as never);
  }
}

describe('POST /requests (self-request)', () => {
  it(
    'un usuario no puede crearse una solicitud a sí mismo (400)',
    async () => {
      const prisma = {
        workerProfile: {
          findFirst: async () => ({
            id: PROFILE_ID,
            userId: USER_ID,
            user: { status: AccountStatus.ACTIVE },
          }),
        },
      };

      const service = new RequestsService(
        prisma as unknown as PrismaService,
        { isBlockedEitherWay: async () => false } as unknown as ConversationAccessService,
        { notify: async () => undefined } as unknown as NotificationsService,
      );

      const moduleRef = await Test.createTestingModule({
        controllers: [SelfRequestProbeController],
        providers: [{ provide: RequestsService, useValue: service }],
      }).compile();

      const app = moduleRef.createNestApplication({ bodyParser: true });
      await app.init();
      const server = app.getHttpServer();

      try {
        const response = await request(server)
          .post('/requests')
          .type('json')
          .send({
            workerProfileId: PROFILE_ID,
            description: 'Quiero contratarme a mi mismo para probar el sistema',
          });

        expect(response.status).toBe(400);
        expect(String(response.body.message ?? '')).toMatch(/sí mismo|si mismo/i);

        await expect(
          service.create(USER_ID, {
            workerProfileId: PROFILE_ID,
            description: 'Quiero contratarme a mi mismo para probar el sistema',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      } finally {
        await app.close();
      }
    },
    20_000,
  );
});
