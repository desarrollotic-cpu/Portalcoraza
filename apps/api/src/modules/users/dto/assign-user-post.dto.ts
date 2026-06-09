import { IsUUID } from 'class-validator';

export class AssignUserPostDto {
  @IsUUID()
  postId!: string;
}
