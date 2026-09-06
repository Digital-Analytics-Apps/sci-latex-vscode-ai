import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../auth.service';
import { IUsersRepository, CreateUserData } from '../../../repositories/users.repository';
import {
  ISessionsRepository,
  CreateSessionData,
  SessionWithUser,
} from '../../../repositories/sessions.repository';
import { User, Session, Role } from '@prisma/client';

// Mock InMemoryUsersRepository para testes unitários isolados (sem banco de dados)
class InMemoryUsersRepository implements IUsersRepository {
  public users: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) || null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }

  async create(data: CreateUserData): Promise<User> {
    const user: User = {
      id: `user-${this.users.length + 1}`,
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role || Role.AUTHOR,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    this.users.push(user);
    return user;
  }
}

// Mock InMemorySessionsRepository
class InMemorySessionsRepository implements ISessionsRepository {
  public sessions: SessionWithUser[] = [];
  public usersRepository: InMemoryUsersRepository;

  constructor(usersRepository: InMemoryUsersRepository) {
    this.usersRepository = usersRepository;
  }

  async create(data: CreateSessionData): Promise<Session> {
    const user = this.usersRepository.users.find((u) => u.id === data.userId);
    const session: SessionWithUser = {
      id: `session-${this.sessions.length + 1}`,
      userId: data.userId,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
      user: user!,
    };
    this.sessions.push(session);
    return session;
  }

  async findByRefreshToken(refreshToken: string): Promise<SessionWithUser | null> {
    return this.sessions.find((s) => s.refreshToken === refreshToken) || null;
  }

  async deleteById(id: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.id !== id);
  }

  async deleteByRefreshToken(refreshToken: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.refreshToken !== refreshToken);
  }
}

describe('AuthService (Unit Tests with Mock Repositories)', () => {
  let usersRepository: InMemoryUsersRepository;
  let sessionsRepository: InMemorySessionsRepository;
  let authService: AuthService;

  beforeEach(() => {
    usersRepository = new InMemoryUsersRepository();
    sessionsRepository = new InMemorySessionsRepository(usersRepository);
    authService = new AuthService(usersRepository, sessionsRepository);
  });

  it('should successfully register a new user', async () => {
    const user = await authService.register({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('john@example.com');
    expect(user.role).toBe(Role.AUTHOR);
    expect((user as any).passwordHash).toBeUndefined();
  });

  it('should fail to register user with duplicate email', async () => {
    await authService.register({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    await expect(
      authService.register({
        name: 'Jane Doe',
        email: 'john@example.com',
        password: 'password456',
      })
    ).rejects.toThrow('USER_ALREADY_EXISTS');
  });

  it('should authenticate user with valid credentials', async () => {
    await authService.register({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    const result = await authService.login({
      email: 'john@example.com',
      password: 'password123',
    });

    expect(result.user.email).toBe('john@example.com');
    expect(result.refreshToken).toBeDefined();
    expect(sessionsRepository.sessions.length).toBe(1);
  });

  it('should fail login with invalid password', async () => {
    await authService.register({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    await expect(
      authService.login({
        email: 'john@example.com',
        password: 'wrongpassword',
      })
    ).rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('should refresh token for valid active session', async () => {
    await authService.register({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });

    const { refreshToken } = await authService.login({
      email: 'john@example.com',
      password: 'password123',
    });

    const user = await authService.refresh(refreshToken);
    expect(user.email).toBe('john@example.com');
  });
});
