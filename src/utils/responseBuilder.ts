class ResponseBuilder {
  private response: Record<string, any>;

  constructor() {
    this.response = {
      status: 'success',
    };
  }

  withStatus(status: string): this {
    this.response.status = status;
    return this;
  }

  withMessage(message: string | null | undefined): this {
    this.response.message = message;
    return this;
  }

  withData(data: any): this {
    this.response.data = data;
    return this;
  }

  withPagination({
    totalItems,
    totalPages,
    currentPage,
    limit,
  }: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  }): this {
    this.response.pagination = { totalItems, totalPages, currentPage, limit };
    return this;
  }

  withDetails(details: any): this {
    this.response.details = details;
    return this;
  }

  withExtra(key: string, value: any): this {
    this.response[key] = value;
    return this;
  }

  build(): Record<string, any> {
    const cleanResponse: Record<string, any> = {};
    for (const [key, value] of Object.entries(this.response)) {
      if (value !== null && value !== undefined) {
        cleanResponse[key] = value;
      }
    }
    return cleanResponse;
  }
}

export default ResponseBuilder;
