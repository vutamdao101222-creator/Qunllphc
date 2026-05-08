import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  q: z.string().trim().min(1).optional(),
  sort: z.string().trim().min(1).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export function buildPageResult(items, total, page, pageSize) {
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
