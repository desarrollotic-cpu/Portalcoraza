import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreatePostDto } from './dto/create-post.dto';
import {
  CreatePostWorkFrontDto,
  UpdatePostWorkFrontDto,
} from './dto/post-work-front.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @RequirePermissions('posts.view')
  findAll() {
    return this.postsService.findAll();
  }

  @Get('stats/summary')
  @RequirePermissions('posts.view')
  statsSummary() {
    return this.postsService.countSummary();
  }

  @Get(':id/work-fronts')
  @RequirePermissions('posts.view')
  listWorkFronts(@Param('id') id: string) {
    return this.postsService.listWorkFronts(id);
  }

  @Post(':id/work-fronts')
  @RequirePermissions('posts.edit')
  createWorkFront(
    @Param('id') id: string,
    @Body() dto: CreatePostWorkFrontDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.postsService.createWorkFront(id, dto, user.sub);
  }

  @Patch(':id/work-fronts/:frontId')
  @RequirePermissions('posts.edit')
  updateWorkFront(
    @Param('id') id: string,
    @Param('frontId') frontId: string,
    @Body() dto: UpdatePostWorkFrontDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.postsService.updateWorkFront(id, frontId, dto, user.sub);
  }

  @Delete(':id/work-fronts/:frontId')
  @RequirePermissions('posts.edit')
  deactivateWorkFront(
    @Param('id') id: string,
    @Param('frontId') frontId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.postsService.deactivateWorkFront(id, frontId, user.sub);
  }

  @Get(':id')
  @RequirePermissions('posts.view')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Post()
  @RequirePermissions('posts.create')
  create(@Body() dto: CreatePostDto, @CurrentUser() user: JwtPayload) {
    return this.postsService.create(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('posts.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.postsService.update(id, dto, user.sub);
  }
}
