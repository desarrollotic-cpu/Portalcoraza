import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Post } from '../posts/entities/post.entity';
import { PostEquipmentAssignment } from './entities/post-equipment-assignment.entity';
import { PostEquipmentCatalog } from './entities/post-equipment-catalog.entity';
import { PostEquipmentUnit } from './entities/post-equipment-unit.entity';
import { PostEquipmentController } from './post-equipment.controller';
import { PostEquipmentService } from './post-equipment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PostEquipmentAssignment,
      PostEquipmentCatalog,
      PostEquipmentUnit,
      Post,
    ]),
    AuditModule,
  ],
  controllers: [PostEquipmentController],
  providers: [PostEquipmentService],
  exports: [PostEquipmentService],
})
export class PostEquipmentModule {}
