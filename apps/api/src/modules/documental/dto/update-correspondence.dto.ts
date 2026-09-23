import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateCorrespondenceDto } from './create-correspondence.dto';

export class UpdateCorrespondenceDto extends PartialType(
  OmitType(CreateCorrespondenceDto, [
    'documentCode',
    'depCode',
    'serieCode',
    'subserieCode',
  ] as const),
) {}
