export interface GridFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte' | 'in';
  value: any;
}

export interface GridSort {
  field: string;
  desc: boolean;
}

export interface GridState {
  page: number;
  pageSize: number;
  filters: GridFilter[];
  sorts: GridSort[];
}

/**
 * Translates SpiteExpress GridState into Prisma 'where', 'orderBy', 'skip', and 'take' parameters.
 */
export function translateToPrisma(state: GridState) {
  const { page, pageSize, filters, sorts } = state;

  const where: any = {};
  
  filters.forEach(filter => {
    const { field, operator, value } = filter;
    
    switch (operator) {
      case 'equals':
        where[field] = value;
        break;
      case 'contains':
        where[field] = { contains: value };
        break;
      case 'startsWith':
        where[field] = { startsWith: value };
        break;
      case 'endsWith':
        where[field] = { endsWith: value };
        break;
      case 'gt':
        where[field] = { gt: value };
        break;
      case 'lt':
        where[field] = { lt: value };
        break;
      case 'gte':
        where[field] = { gte: value };
        break;
      case 'lte':
        where[field] = { lte: value };
        break;
      case 'in':
        where[field] = { in: value };
        break;
    }
  });

  const orderBy = sorts.map(sort => ({
    [sort.field]: sort.desc ? 'desc' : 'asc'
  }));

  return {
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize
  };
}

/**
 * A helper to execute a Prisma query based on GridState and return paginated results.
 */
export async function fetchGridData(prismaModel: any, state: GridState) {
  const params = translateToPrisma(state);
  
  const [data, totalCount] = await Promise.all([
    prismaModel.findMany(params),
    prismaModel.count({ where: params.where })
  ]);

  return {
    data,
    totalCount,
    page: state.page,
    pageSize: state.pageSize
  };
}
