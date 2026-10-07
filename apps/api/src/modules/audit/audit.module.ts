import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { Post } from '../posts/entities/post.entity';
import { User } from '../users/entities/user.entity';
import { AuditController } from './audit.controller';
import { AuditRetentionCron } from './audit-retention.cron';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, User, Associate, Post])],
  controllers: [AuditController],
  providers: [AuditService, AuditRetentionCron],
  exports: [AuditService],
})
export class AuditModule {}
