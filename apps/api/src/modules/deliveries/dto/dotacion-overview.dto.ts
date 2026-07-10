export interface DotacionOverviewDto {
  lowStockCount: number;
  pendingDeliveries: number;
  deliveredToday: number;
  deliveredThisWeek: number;
  totalActiveAssociates: number;
  withoutDotacionCount: number;
  inventoryItemCount: number;
  inventoryVariantCount: number;
  topDeliveredItems: {
    itemName: string;
    sku: string;
    totalQuantity: number;
  }[];
  lowStockItems: {
    sku: string;
    itemName: string;
    stockCurrent: number;
    threshold: number;
  }[];
  recentDeliveries: {
    id: string;
    associateName: string | null;
    status: string;
    itemCount: number;
    date: string;
  }[];
}

export interface WithoutDotacionRowDto {
  id: string;
  documentNumber: string;
  fullName: string;
  status: string;
  jobPositionName: string | null;
  workCenterCode: string | null;
  lastDeliveryDate: string | null;
  monthsSinceDelivery: number | null;
}
