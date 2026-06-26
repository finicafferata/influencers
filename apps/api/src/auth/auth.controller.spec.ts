import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SendMagicLinkDto } from './dto/send-magic-link.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { sendMagicLink: jest.Mock; verifyMagicLink: jest.Mock };

  beforeEach(async () => {
    authService = {
      sendMagicLink: jest
        .fn()
        .mockResolvedValue({ message: 'Magic link sent' }),
      verifyMagicLink: jest.fn().mockResolvedValue({ token: 'signed-jwt' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('signed-jwt') },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('calls authService.sendMagicLink with the email from the DTO', async () => {
    const dto: SendMagicLinkDto = { email: 'user@example.com' };
    const result = await controller.sendLink(dto);

    expect(authService.sendMagicLink).toHaveBeenCalledWith('user@example.com');
    expect(result).toEqual({ message: 'Magic link sent' });
  });

  // verify returns only the token; routing is decided client-side via me.bootstrap.
  it('calls authService.verifyMagicLink and returns just the token', async () => {
    const result = await controller.verify('test-token-abc');

    expect(authService.verifyMagicLink).toHaveBeenCalledWith('test-token-abc');
    expect(result).toEqual({ token: 'signed-jwt' });
  });

  // googleCallback no longer sets a cookie or queries the DB; it hands the JWT
  // to the web app via a first-party redirect (REVIEW-01 C1).
  it('googleCallback redirects to the web callback with the signed token', () => {
    const module = Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-jwt') },
        },
      ],
    });

    return module.compile().then((m) => {
      const ctrl = m.get<AuthController>(AuthController);
      const req = { user: { id: 'user-1', email: 'new@example.com' } } as never;
      const redirect = jest.fn();
      const res = { redirect } as never;

      ctrl.googleCallback(req, res);

      expect(redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/google/callback?token=mock-jwt'),
      );
    });
  });
});
