import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
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
});
