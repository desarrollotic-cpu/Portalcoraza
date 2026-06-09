import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly permissionsService: PermissionsService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithRole(dto.email);
    if (!user?.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.usersService.updateLastLogin(user.id);

    const permissions =
      await this.permissionsService.getPermissionCodesForUser(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleCode: user.role.code,
      permissions,
    };

    const accessToken = await this.signAccess(payload);
    const refreshToken = await this.issueRefreshToken(user.id);

    await this.auditService.log({
      userId: user.id,
      module: 'auth',
      action: 'login',
      entityType: 'user',
      entityId: user.id,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: { code: user.role.code, name: user.role.name },
        permissions,
      },
    };
  }

  async refresh(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    const stored = await this.refreshRepo.findOne({
      where: { tokenHash: hash },
      relations: { user: { role: true } },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      !stored.user.isActive
    ) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const permissions =
      await this.permissionsService.getPermissionCodesForUser(stored.user.id);

    const payload: JwtPayload = {
      sub: stored.user.id,
      email: stored.user.email,
      roleCode: stored.user.role.code,
      permissions,
    };

    const accessToken = await this.signAccess(payload);
    return { accessToken };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const hash = this.hashToken(refreshToken);
      await this.refreshRepo.update(
        { tokenHash: hash, userId },
        { revokedAt: new Date() },
      );
    }

    await this.auditService.log({
      userId,
      module: 'auth',
      action: 'logout',
      entityType: 'user',
      entityId: userId,
    });
  }

  private async signAccess(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '2h'),
    });
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(48).toString('hex');
    const hash = this.hashToken(raw);
    const days = Number(this.config.get('JWT_REFRESH_EXPIRES_DAYS', 7));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId,
        tokenHash: hash,
        expiresAt,
      }),
    );

    return raw;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
