import { PartialType } from '@nestjs/mapped-types';
import { CreateRetirementDto } from './create-retirement.dto';

export class UpdateRetirementDto extends PartialType(CreateRetirementDto) {}
