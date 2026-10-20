import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPost } from '../users/entities/user-post.entity';
import { User } from '../users/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsRetentionCron } from './notifications-retention.cron';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, UserPost])],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRetentionCron],
  exports: [NotificationsService],
})
export class NotificationsModule {}
