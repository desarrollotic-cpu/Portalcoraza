import { AssociateStatus } from '../../associates/entities/associate.entity';

/** Proyección mínima de asociado elegible para dotación (ACTIVO o VACACIONES). */
export interface DeliverableAssociateDto {
  id: string;
  documentNumber: string;
  firstName: string;
  secondName: string | null;
  firstLastName: string;
  secondLastName: string | null;
  status: AssociateStatus;
  jobPositionName: string | null;
}
