import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { AuthService } from './auth.service';

// ----- mock factories -----

function makeFakeUser(overrides: Partial<{ id: string; email: string; name: string | null }> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: null,
    ...overrides,
  };
}

function makeFakeToken(
  overrides: Partial<{
    id: string;
    token: string;
    used: boolean;
    expiresAt: Date;
    user: ReturnType<typeof makeFakeUser>;
  }> = {},
) {
  return {
    id: 'token-1',
    token: 'abc123',
    used: false,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min from now (not expired)
    user: makeFakeUser(),
    ...overrides,
  };
}

// ----- helpers -----

function buildFakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      upsert: jest.fn().mockResolvedValue(makeFakeUser()),
    },
    magicLinkToken: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(makeFakeToken()),
      update: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

// ----- tests -----

describe('AuthService', () => {
  let service: AuthService;
  let fakePrisma: ReturnType<typeof buildFakePrisma>;
  let emailService: { sendMagicLink: jest.Mock };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    fakePrisma = buildFakePrisma();
    emailService = { sendMagicLink: jest.fn().mockResolvedValue(undefined) };
    jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DatabaseService,
          useValue: { db: fakePrisma },
        },
        {
          provide: EmailService,
          useValue: emailService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // 1. sendMagicLink — happy path
  it('upserts user, creates token and sends magic link email', async () => {
    const result = await service.sendMagicLink('test@example.com');

    expect(fakePrisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'test@example.com' },
        create: { email: 'test@example.com' },
      }),
    );
    expect(fakePrisma.magicLinkToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      }),
    );
    expect(emailService.sendMagicLink).toHaveBeenCalledWith(
      'test@example.com',
      expect.stringMatching(/\/auth\/verify\?token=[a-f0-9]{64}/),
    );
    expect(result).toEqual({ message: 'Magic link sent' });
  });

  // 3. verifyMagicLink — returns isNewUser: true for new user (no name)
  it('returns { token, isNewUser: true } for a user with no name', async () => {
    fakePrisma.magicLinkToken.findUnique.mockResolvedValue(
      makeFakeToken({ user: makeFakeUser({ name: null }) }),
    );

    const result = await service.verifyMagicLink('abc123');

    expect(result.isNewUser).toBe(true);
    expect(result.token).toBe('signed-jwt');
    expect(fakePrisma.magicLinkToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { used: true } }),
    );
  });

  // 4. verifyMagicLink — returns isNewUser: false for returning user (has name)
  it('returns { token, isNewUser: false } for a user with a name', async () => {
    fakePrisma.magicLinkToken.findUnique.mockResolvedValue(
      makeFakeToken({ user: makeFakeUser({ name: 'Alice' }) }),
    );

    const result = await service.verifyMagicLink('abc123');

    expect(result.isNewUser).toBe(false);
    expect(result.token).toBe('signed-jwt');
  });

  // 5. verifyMagicLink — throws UnauthorizedException for expired token
  it('throws UnauthorizedException with unified message for an expired token', async () => {
    fakePrisma.magicLinkToken.findUnique.mockResolvedValue(
      makeFakeToken({ expiresAt: new Date(Date.now() - 1000) }), // 1 second in the past
    );

    await expect(service.verifyMagicLink('abc123')).rejects.toThrow(
      new UnauthorizedException('Invalid or expired token'),
    );
  });

  // 6. verifyMagicLink — throws UnauthorizedException for already-used token
  it('throws UnauthorizedException with unified message for an already-used token', async () => {
    fakePrisma.magicLinkToken.findUnique.mockResolvedValue(
      makeFakeToken({ used: true }),
    );

    await expect(service.verifyMagicLink('abc123')).rejects.toThrow(
      new UnauthorizedException('Invalid or expired token'),
    );
  });

  // 7. verifyMagicLink — throws UnauthorizedException for nonexistent token
  it('throws UnauthorizedException with unified message for a nonexistent token', async () => {
    fakePrisma.magicLinkToken.findUnique.mockResolvedValue(null);

    await expect(service.verifyMagicLink('doesnotexist')).rejects.toThrow(
      new UnauthorizedException('Invalid or expired token'),
    );
  });
});
