import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { AssociatesModule } from './modules/associates/associates.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PostsModule } from './modules/posts/posts.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV === 'development',
      ssl:
        process.env.DATABASE_URL?.includes('supabase')
          ? { rejectUnauthorized: false }
          : false,
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    AssociatesModule,
    PostsModule,
    AuditModule,
  ],
})
export class AppModule {}
