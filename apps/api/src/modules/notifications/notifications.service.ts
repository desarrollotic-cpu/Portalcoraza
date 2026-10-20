import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPost } from '../users/entities/user-post.entity';
import { User } from '../users/entities/user.entity';
import { Notification } from './entities/notification.entity';

/**
 * Días que se conservan las notificaciones ya leídas.
 *
 * El listado no se purgaba nunca y crecía sin tope. Mismo criterio que la
 * auditoría (`AUDIT_RETENTION_DAYS`): un cron diario borra lo viejo.
 */
export const NOTIFICATIONS_RETENTION_DAYS = 8;

/**
 * Días que se conservan las notificaciones SIN leer.
 *
 * Se les da más margen a propósito: alguien de vacaciones o incapacitado
 * volvería sin haber visto nunca lo que le llegó. Para que caduquen igual que
 * las leídas, baja este número a 8.
 */
export const NOTIFICATIONS_UNREAD_RETENTION_DAYS = 30;

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

  /**
   * Borra notificaciones viejas. Devuelve cuántas quitó de cada tipo.
   *
   * Las leídas caducan antes que las no leídas: una notificación que el
   * programador ya vio no aporta nada, pero una sin leer todavía puede.
   */
  async purgeOld(
    readDays = NOTIFICATIONS_RETENTION_DAYS,
    unreadDays = NOTIFICATIONS_UNREAD_RETENTION_DAYS,
  ): Promise<{ leidas: number; sinLeer: number }> {
    const leidas = await this.notificationsRepo
      .createQueryBuilder()
      .delete()
      .where('read_at IS NOT NULL')
      .andWhere(`read_at < NOW() - (:readDays * INTERVAL '1 day')`, { readDays })
      .execute();

    const sinLeer = await this.notificationsRepo
      .createQueryBuilder()
      .delete()
      .where('read_at IS NULL')
      .andWhere(`created_at < NOW() - (:unreadDays * INTERVAL '1 day')`, { unreadDays })
      .execute();

    return { leidas: leidas.affected ?? 0, sinLeer: sinLeer.affected ?? 0 };
  }
}
