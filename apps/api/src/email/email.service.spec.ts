import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

// Mock the resend module
const mockSend = jest.fn().mockResolvedValue({ id: 'test-id' });
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: mockSend,
      },
    })),
  };
});

describe('EmailService', () => {
  let service: EmailService;
  let loggerLogSpy: jest.SpyInstance;

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  describe('development mode', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.RESEND_API_KEY;

      const module: TestingModule = await Test.createTestingModule({
        providers: [EmailService],
      }).compile();

      service = module.get<EmailService>(EmailService);
      // Trigger OnModuleInit
      await module.init();

      loggerLogSpy = jest
        .spyOn((service as any).logger, 'log')
        .mockImplementation(() => undefined);
    });

    it('sendMagicLink logs to console and does NOT call resend.emails.send', async () => {
      await service.sendMagicLink('user@example.com', 'https://example.com/magic');
      expect(loggerLogSpy).toHaveBeenCalledTimes(1);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('sendContactNotification logs to console and does NOT call resend.emails.send', async () => {
      await service.sendContactNotification(
        'user@example.com',
        'Acme Corp',
        'Hola, quiero más info.',
      );
      expect(loggerLogSpy).toHaveBeenCalledTimes(1);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('sendOrgInvite logs to console and does NOT call resend.emails.send', async () => {
      await service.sendOrgInvite(
        'user@example.com',
        'Acme Corp',
        'https://example.com/invite',
      );
      expect(loggerLogSpy).toHaveBeenCalledTimes(1);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('production mode without RESEND_API_KEY', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      delete process.env.RESEND_API_KEY;
    });

    it('throws during module init when RESEND_API_KEY is missing', async () => {
      await expect(
        Test.createTestingModule({
          providers: [EmailService],
        })
          .compile()
          .then((module) => module.init()),
      ).rejects.toThrow('RESEND_API_KEY is not set');
    });
  });
});
