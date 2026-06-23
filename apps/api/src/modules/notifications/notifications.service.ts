import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPost } from '../users/entities/user-post.entity';
import { User } from '../users/entities/user.entity';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(UserPost)
    private readonly userPostsRepo: Repository<UserPost>,
  ) {}

  async send(
    userId: string,
    title: string,
    body: string | null,
    module: string,
  ): Promise<Notification> {
    return this.notificationsRepo.save(
      this.notificationsRepo.create({ userId, title, body, module }),
    );
  }

  async sendToRole(
    roleCode: string,
    title: string,
    body: string | null,
    module: string,
  ): Promise<void> {
    const users = await this.usersRepo.find({
      where: { isActive: true, role: { code: roleCode } },
      relations: { role: true },
      select: { id: true },
    });

    await Promise.all(
      users.map((user) => this.send(user.id, title, body, module)),
    );
  }

  async sendToPostAssignees(
    postId: string,
    title: string,
    body: string | null,
    module: string,
  ): Promise<void> {
    const assignments = await this.userPostsRepo.find({ where: { postId } });

    if (assignments.length === 0) {
      await this.sendToRole('GERENCIA', title, body, module);
      return;
    }

    await Promise.all(
      assignments.map((assignment) =>
        this.send(assignment.userId, title, body, module),
      ),
    );
  }

  listForUser(userId: string) {
    return this.notificationsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationsRepo.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notificacion no encontrada');
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      return this.notificationsRepo.save(notification);
    }

    return notification;
  }
}
