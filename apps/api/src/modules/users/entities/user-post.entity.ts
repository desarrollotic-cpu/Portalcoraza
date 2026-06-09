import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Post } from '../../posts/entities/post.entity';
import { User } from './user.entity';

@Entity('user_posts')
export class UserPost {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: Post;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt!: Date;
}
