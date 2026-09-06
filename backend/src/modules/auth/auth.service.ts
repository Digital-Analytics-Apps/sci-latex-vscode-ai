import { Role, User } from '@prisma/client';
import { IUsersRepository } from '../../repositories/users.repository';
import { ISessionsRepository } from '../../repositories/sessions.repository';
import { hashPassword, verifyPassword } from '../../utils/hash';
import { randomBytes } from 'crypto';

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  refreshToken: string;
  expiresAt: Date;
}

export class AuthService {
  constructor(
    private usersRepository: IUsersRepository,
    private sessionsRepository: ISessionsRepository
  ) {}

  // Cadastro de novo usuário
  async register(data: RegisterDTO) {
    const existingUser = await this.usersRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('USER_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(data.password);
    const user = await this.usersRepository.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Autenticação e geração de Refresh Token
  async login(data: LoginDTO): Promise<AuthResult> {
    const user = await this.usersRepository.findByEmail(data.email);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const isPasswordValid = await verifyPassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const refreshToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.sessionsRepository.create({
      userId: user.id,
      refreshToken,
      expiresAt,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      refreshToken,
      expiresAt,
    };
  }

  // Renovação de sessão via Refresh Token
  async refresh(refreshToken: string) {
    const session = await this.sessionsRepository.findByRefreshToken(refreshToken);
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.sessionsRepository.deleteById(session.id);
      }
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const { passwordHash: _, ...userWithoutPassword } = session.user;
    return userWithoutPassword;
  }

  // Logout e revogação de sessão
  async logout(refreshToken: string) {
    await this.sessionsRepository.deleteByRefreshToken(refreshToken);
  }

  // Busca perfil do usuário logado
  async getProfile(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
