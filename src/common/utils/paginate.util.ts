export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

type AnyDelegate = {
  findMany: (args?: any) => Promise<any[]>;
  count: (args?: any) => Promise<number>;
};

type FindManyArgs<D extends AnyDelegate> = NonNullable<Parameters<D['findMany']>[0]>;

export async function paginate<D extends AnyDelegate, K extends string = 'items'>(
  delegate: D,
  args: Omit<FindManyArgs<D>, 'skip' | 'take'> & { page: number; limit: number },
  options?: { key?: K },
) {
  const { page, limit, ...findArgs } = args;
  const skip = (page - 1) * limit;
  const key = options?.key ?? 'items';

  const [items, total] = await Promise.all([
    delegate.findMany({ ...findArgs, skip, take: limit }),
    delegate.count({ where: (findArgs as { where?: unknown }).where }),
  ]);

  return {
    [key]: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
