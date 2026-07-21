import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { PostsModule } from '../posts/posts.module';
import { WorkCenter } from './entities/work-center.entity';
import { HrWorkCentersController } from './hr-work-centers.controller';
import { HrWorkCentersService } from './hr-work-centers.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkCenter]), AuditModule, PostsModule],
  controllers: [HrWorkCentersController],
  providers: [HrWorkCentersService],
  exports: [HrWorkCentersService],
})
export class HrWorkCentersModule {}
