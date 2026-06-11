/**
 * Pagination Utility
 * Handles pagination logic for API responses
 */

class Pagination {
  constructor(page = 1, limit = 200, total = 0) {
    this.page = parseInt(page) || 1;
    this.limit = parseInt(limit) || 200;
    this.total = parseInt(total) || 0;
    this.totalPages = Math.ceil(this.total / this.limit);
    this.hasNext = this.page < this.totalPages;
    this.hasPrev = this.page > 1;
  }

  getOffset() {
    return (this.page - 1) * this.limit;
  }

  getMeta() {
    return {
      page: this.page,
      limit: this.limit,
      total: this.total,
      totalPages: this.totalPages,
      hasNext: this.hasNext,
      hasPrev: this.hasPrev
    };
  }

  static getPaginationParams(query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 200;
    return { page, limit };
  }
}

module.exports = Pagination;