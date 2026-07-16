import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { WorkCenter } from '../hr-work-centers/entities/work-center.entity';
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
      WorkCenter,
    ]),
    AuditModule,
  ],
  controllers: [PostEquipmentController],
  providers: [PostEquipmentService],
  exports: [PostEquipmentService],
})
export class PostEquipmentModule {}
