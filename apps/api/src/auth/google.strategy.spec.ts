import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { GoogleStrategy } from './google.strategy';
import type { Profile } from 'passport-google-oauth20';

// Suppress PassportStrategy super() calls from making real network calls
jest.mock('passport-google-oauth20', () => {
  const original = jest.requireActual<typeof import('passport-google-oauth20')>('passport-google-oauth20');
  return {
    ...original,
    Strategy: class {
      constructor() {}
    },
  };
});

// ---- helpers ----

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  const base: Profile = {
    id: 'google-profile-id',
    displayName: 'Test User',
    emails: [{ value: 'test@example.com', verified: true }],
    photos: [{ value: 'https://example.com/avatar.jpg' }],
    provider: 'google',
    profileUrl: '',
    _raw: '',
    _json: {} as Profile['_json'],
  };
  return { ...base, ...overrides };
}

function makeFakeUser(overrides: Partial<{
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    isAdmin: false,
    suspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildFakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(makeFakeUser()),
      update: jest.fn().mockResolvedValue(makeFakeUser()),
    },
    ...overrides,
  };
}

// ---- tests ----

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let fakePrisma: ReturnType<typeof buildFakePrisma>;

  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: 'fake-client-id',
      GOOGLE_CLIENT_SECRET: 'fake-client-secret',
    };

    fakePrisma = buildFakePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: DatabaseService,
          useValue: { db: fakePrisma },
        },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validate', () => {
    it('creates a new user with name and avatar on first login', async () => {
      const newUser = makeFakeUser();
      // findUnique returns null → new user path
      fakePrisma.user.findUnique.mockResolvedValue(null);
      fakePrisma.user.create.mockResolvedValue(newUser);

      const profile = makeProfile();
      const result = await strategy.validate('access-token', 'refresh-token', profile);

      expect(fakePrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(fakePrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
        },
      });
      expect(result).toEqual({ id: newUser.id, email: newUser.email });
    });

    it('returns existing user without overwriting name when user already has a name', async () => {
      const existingUser = makeFakeUser({ id: 'existing-user-id', name: 'Existing Name' });
      // findUnique returns an existing user with a name → no update
      fakePrisma.user.findUnique.mockResolvedValue(existingUser);

      const profile = makeProfile({ displayName: 'Google Name' });
      const result = await strategy.validate('access-token', 'refresh-token', profile);

      expect(fakePrisma.user.findUnique).toHaveBeenCalledTimes(1);
      expect(fakePrisma.user.create).not.toHaveBeenCalled();
      expect(fakePrisma.user.update).not.toHaveBeenCalled();
      expect(result).toEqual({ id: existingUser.id, email: existingUser.email });
    });

    it('pre-fills name and avatar for magic-link-first users who have no name', async () => {
      const existingUserNoName = makeFakeUser({ id: 'ml-user-id', name: null, avatar: null });
      const updatedUser = makeFakeUser({ id: 'ml-user-id', name: 'Test User', avatar: 'https://example.com/avatar.jpg' });
      fakePrisma.user.findUnique.mockResolvedValue(existingUserNoName);
      fakePrisma.user.update.mockResolvedValue(updatedUser);

      const profile = makeProfile();
      const result = await strategy.validate('access-token', 'refresh-token', profile);

      expect(fakePrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'ml-user-id' },
        data: {
          name: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
        },
      });
      expect(result).toEqual({ id: updatedUser.id, email: updatedUser.email });
    });

    it('throws an error when the profile has no email', async () => {
      const profile = makeProfile({ emails: [] });

      await expect(
        strategy.validate('access-token', 'refresh-token', profile),
      ).rejects.toThrow('No email returned from Google OAuth profile');
    });
  });

  describe('constructor', () => {
    it('throws if GOOGLE_CLIENT_ID is missing', async () => {
      delete process.env.GOOGLE_CLIENT_ID;

      await expect(
        Test.createTestingModule({
          providers: [
            GoogleStrategy,
            {
              provide: DatabaseService,
              useValue: { db: buildFakePrisma() },
            },
          ],
        }).compile(),
      ).rejects.toThrow('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
    });

    it('throws if GOOGLE_CLIENT_SECRET is missing', async () => {
      delete process.env.GOOGLE_CLIENT_SECRET;

      await expect(
        Test.createTestingModule({
          providers: [
            GoogleStrategy,
            {
              provide: DatabaseService,
              useValue: { db: buildFakePrisma() },
            },
          ],
        }).compile(),
      ).rejects.toThrow('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
    });
  });
});
