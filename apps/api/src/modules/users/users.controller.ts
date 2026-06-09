import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AssignUserPostDto } from './dto/assign-user-post.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.view')
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @RequirePermissions('users.create')
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.create(dto, user.sub);
  }

  @Get(':id/posts')
  @RequirePermissions('users.view')
  listAssignedPosts(@Param('id') id: string) {
    return this.usersService.listAssignedPosts(id);
  }

  @Post(':id/posts')
  @RequirePermissions('users.edit')
  assignPost(
    @Param('id') id: string,
    @Body() dto: AssignUserPostDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.assignPost(id, dto.postId, user.sub);
  }

  @Delete(':id/posts/:postId')
  @RequirePermissions('users.edit')
  removeAssignedPost(
    @Param('id') id: string,
    @Param('postId') postId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.removeAssignedPost(id, postId, user.sub);
  }
}
