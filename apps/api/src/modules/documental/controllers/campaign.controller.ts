import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { DocumentalCampaignService } from '../services/documental-campaign.service';

class CampaignBodyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  body!: string;
}

class CampaignPreviewDto extends CampaignBodyDto {
  @IsEmail()
  to!: string;
}

@Controller('documental/campaign')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('documental.manage')
export class DocumentalCampaignController {
  constructor(private readonly campaign: DocumentalCampaignService) {}

  @Get('audience')
  audience() {
    return this.campaign.audience();
  }

  @Get('status')
  status() {
    return this.campaign.status();
  }

  @Post('preview')
  preview(@Body() dto: CampaignPreviewDto) {
    return this.campaign.sendPreview(dto.to, dto.subject, dto.body);
  }

  @Post('send')
  send(@Body() dto: CampaignBodyDto) {
    return this.campaign.start(dto.subject, dto.body);
  }
}
