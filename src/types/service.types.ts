/**
 * Standard service response structure for all service layer methods
 */
export interface ServiceResponse<T = any> {
  data: T | null;
  message?: string | null;
  details?: any | null;
}

export interface ServiceResponseWithPagination<T = any> {
  data: T;
  message?: string | null;
  details: PaginationDetails;
}

export interface PaginationDetails {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}
