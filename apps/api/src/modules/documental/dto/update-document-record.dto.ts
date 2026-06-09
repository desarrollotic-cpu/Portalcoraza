import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentRecordDto } from './create-document-record.dto';

export class UpdateDocumentRecordDto extends PartialType(CreateDocumentRecordDto) {}
