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
      upsert: jest.fn().mockResolvedValue(makeFakeUser()),
      findUnique: jest.fn().mockResolvedValue(null),
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
      fakePrisma.user.upsert.mockResolvedValue(newUser);

      const profile = makeProfile();
      const result = await strategy.validate('access-token', 'refresh-token', profile);

      expect(fakePrisma.user.upsert).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        update: {},
        create: {
          email: 'test@example.com',
          name: 'Test User',
          avatar: 'https://example.com/avatar.jpg',
        },
      });
      expect(result).toEqual(newUser);
    });

    it('returns existing user without re-creating when user already exists', async () => {
      const existingUser = makeFakeUser({ id: 'existing-user-id', name: 'Existing Name' });
      fakePrisma.user.upsert.mockResolvedValue(existingUser);

      const profile = makeProfile({ displayName: 'Existing Name' });
      const result = await strategy.validate('access-token', 'refresh-token', profile);

      // upsert always runs, but update: {} means no overwrite of existing fields
      expect(fakePrisma.user.upsert).toHaveBeenCalledTimes(1);
      expect(fakePrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: {} }),
      );
      expect(result).toEqual(existingUser);
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
