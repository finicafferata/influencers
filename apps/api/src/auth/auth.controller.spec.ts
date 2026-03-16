import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { SendMagicLinkDto } from './dto/send-magic-link.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { sendMagicLink: jest.Mock; verifyMagicLink: jest.Mock };

  beforeEach(async () => {
    authService = {
      sendMagicLink: jest.fn().mockResolvedValue({ message: 'Magic link sent' }),
      verifyMagicLink: jest.fn().mockResolvedValue({ token: 'signed-jwt', isNewUser: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed-jwt') },
        },
        {
          provide: DatabaseService,
          useValue: {
            db: {
              creatorProfile: { findUnique: jest.fn().mockResolvedValue(null) },
              organizationMember: { findFirst: jest.fn().mockResolvedValue(null) },
            },
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  // 1. POST /auth/magic-link — delegates to authService.sendMagicLink
  it('calls authService.sendMagicLink with the email from the DTO', async () => {
    const dto: SendMagicLinkDto = { email: 'user@example.com' };
    const result = await controller.sendLink(dto);

    expect(authService.sendMagicLink).toHaveBeenCalledWith('user@example.com');
    expect(result).toEqual({ message: 'Magic link sent' });
  });

  // 2. GET /auth/verify — delegates to authService.verifyMagicLink
  it('calls authService.verifyMagicLink with the token query param', async () => {
    const result = await controller.verify('test-token-abc');

    expect(authService.verifyMagicLink).toHaveBeenCalledWith('test-token-abc');
    expect(result).toEqual({ token: 'signed-jwt', isNewUser: false });
  });

  // 3. GET /auth/google/callback — new user (no creatorProfile, no orgMember)
  it('googleCallback: new user sets httpOnly cookie and redirects to /onboarding/role', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-jwt') },
        },
        {
          provide: DatabaseService,
          useValue: {
            db: {
              creatorProfile: { findUnique: jest.fn().mockResolvedValue(null) },
              organizationMember: { findFirst: jest.fn().mockResolvedValue(null) },
            },
          },
        },
      ],
    }).compile();

    const ctrl = module.get<AuthController>(AuthController);

    const req = { user: { id: 'user-1', email: 'new@example.com' } } as any;
    const res = { cookie: jest.fn(), redirect: jest.fn() } as any;

    await ctrl.googleCallback(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'session',
      'mock-jwt',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/onboarding/role'),
    );
  });

  // 4. GET /auth/google/callback — returning user (has creatorProfile)
  it('googleCallback: returning user sets httpOnly cookie and redirects to /dashboard', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-jwt') },
        },
        {
          provide: DatabaseService,
          useValue: {
            db: {
              creatorProfile: {
                findUnique: jest.fn().mockResolvedValue({ id: 'cp-1', userId: 'user-2' }),
              },
              organizationMember: { findFirst: jest.fn().mockResolvedValue(null) },
            },
          },
        },
      ],
    }).compile();

    const ctrl = module.get<AuthController>(AuthController);

    const req = { user: { id: 'user-2', email: 'returning@example.com' } } as any;
    const res = { cookie: jest.fn(), redirect: jest.fn() } as any;

    await ctrl.googleCallback(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'session',
      'mock-jwt',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard'),
    );
  });
});
