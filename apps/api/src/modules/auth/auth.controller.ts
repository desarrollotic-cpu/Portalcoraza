import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RecoverAdminDto } from './dto/recover-admin.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentUser() user: JwtPayload,
    @Body() body: { refreshToken?: string },
  ) {
    return this.authService.logout(user.sub, body?.refreshToken);
  }

  /** Cualquier usuario autenticado cambia su propia contraseña. */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  /**
   * Recuperación de emergencia del admin (GERENCIA).
   * Requiere ADMIN_RECOVERY_SECRET en el servidor. Sin sesión.
   */
  @Public()
  @Post('recover-admin')
  @UseGuards(AuthRateLimitGuard)
  recoverAdmin(@Body() dto: RecoverAdminDto) {
    return this.authService.recoverAdmin(dto.recoveryKey, dto.newPassword);
  }
}
