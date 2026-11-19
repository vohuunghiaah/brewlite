import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { QueryFailedError, Repository } from 'typeorm';
import { User, USER_EMAIL_UNIQUE } from '../users/entities/user.entity';
import { CredentialsDto } from './dto/credentials.dto';

const BCRYPT_ROUNDS = 10;
// Compare at the same cost even when the account does not exist.
const DUMMY_HASH =
  '$2b$10$D7thz/NCDNNcAeVk5bUY7.lU4.16iFgDj5ADVnyzbtAcgZo3kL4Mm';

function publicUser({ id, email, createdAt }: User) {
  return { id, email, createdAt };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async register({ email, password }: CredentialsDto) {
    const passwordHash = await hash(password, BCRYPT_ROUNDS);

    try {
      const user = await this.users.save(
        this.users.create({ email, passwordHash }),
      );
      return publicUser(user);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        'code' in error.driverError &&
        error.driverError.code === '23505' &&
        'constraint' in error.driverError &&
        error.driverError.constraint === USER_EMAIL_UNIQUE
      ) {
        throw new ConflictException('Email này đã được sử dụng trên hệ thống.');
      }

      if (error instanceof QueryFailedError) {
        // QueryFailedError may contain the attempted password hash as a parameter.
        throw new InternalServerErrorException();
      }
      throw error;
    }
  }

  async login({ email, password }: CredentialsDto) {
    const user = await this.users.findOne({
      where: { email },
      select: { id: true, email: true, createdAt: true, passwordHash: true },
    });

    const matches = await compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !matches) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    return {
      accessToken: await this.jwt.signAsync({ sub: String(user.id) }),
      tokenType: 'Bearer' as const,
      user: publicUser(user),
    };
  }

  async findAccount(id: number) {
    const user = await this.users.findOneBy({ id });
    if (!user) {
      throw new UnauthorizedException();
    }
    return publicUser(user);
  }
}

export type AuthenticatedUser = Awaited<ReturnType<AuthService['findAccount']>>;
