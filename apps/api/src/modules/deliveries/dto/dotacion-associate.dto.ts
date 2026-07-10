import { AssociateStatus } from '../../associates/entities/associate.entity';

export interface DotacionAssociateRowDto {
  id: string;
  documentNumber: string;
  firstName: string;
  secondName: string | null;
  firstLastName: string;
  secondLastName: string | null;
  fullName: string;
  status: AssociateStatus;
  jobPositionName: string | null;
  workCenterCode: string | null;
  workCenterZone: string | null;
  workCenterClient: string | null;
  hireDate: string | null;
}

export interface PaginatedDotacionAssociatesDto {
  items: DotacionAssociateRowDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
