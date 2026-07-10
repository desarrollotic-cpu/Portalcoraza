import { Delivery } from '../entities/delivery.entity';

export interface PaginatedDeliveriesDto {
  items: Delivery[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
