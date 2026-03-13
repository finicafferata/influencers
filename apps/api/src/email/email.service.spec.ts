import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

// Mock the resend module
const mockSend = jest.fn().mockResolvedValue({ data: {}, error: null });
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
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
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

  describe('production mode', () => {
    beforeEach(async () => {
      process.env.NODE_ENV = 'production';
      process.env.RESEND_API_KEY = 'test-api-key';

      mockSend.mockResolvedValue({ data: {}, error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [EmailService],
      }).compile();

      service = module.get<EmailService>(EmailService);
      await module.init();
    });

    it('sendMagicLink calls resend.emails.send with correct args', async () => {
      await service.sendMagicLink('user@example.com', 'https://example.com/magic');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          from: 'CreatorLink <noreply@creatorlink.app>',
          subject: expect.stringContaining('CreatorLink'),
        }),
      );
    });

    it('sendContactNotification calls resend.emails.send with correct args', async () => {
      await service.sendContactNotification(
        'owner@example.com',
        'Acme Corp',
        'Hola, quiero más info.',
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'owner@example.com',
          from: 'CreatorLink <noreply@creatorlink.app>',
          subject: expect.stringContaining('Acme Corp'),
        }),
      );
    });

    it('sendOrgInvite calls resend.emails.send with correct args', async () => {
      await service.sendOrgInvite(
        'invitee@example.com',
        'Acme Corp',
        'https://example.com/invite',
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'invitee@example.com',
          from: 'CreatorLink <noreply@creatorlink.app>',
          subject: expect.stringContaining('Acme Corp'),
        }),
      );
    });

    it('throws when resend.emails.send returns an error', async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { name: 'validation_error', message: 'bad email' },
      });

      await expect(
        service.sendMagicLink('bad@example.com', 'https://example.com/magic'),
      ).rejects.toThrow('bad email');
    });
  });
});
