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
 * Translates SpiteExpress GridState into MongoDB/Mongoose query parameters.
 */
export function translateToMongo(state: GridState) {
  const { page, pageSize, filters, sorts } = state;

  const query: any = {};
  
  filters.forEach(filter => {
    const { field, operator, value } = filter;
    
    switch (operator) {
      case 'equals':
        query[field] = value;
        break;
      case 'contains':
        query[field] = { : value, : 'i' };
        break;
      case 'startsWith':
        query[field] = { : '^' + value, : 'i' };
        break;
      case 'endsWith':
        query[field] = { : value + '$', : 'i' };
        break;
      case 'gt':
        query[field] = { : value };
        break;
      case 'lt':
        query[field] = { : value };
        break;
      case 'gte':
        query[field] = { : value };
        break;
      case 'lte':
        query[field] = { : value };
        break;
      case 'in':
        query[field] = { : value };
        break;
    }
  });

  const sort: any = {};
  sorts.forEach(s => {
    sort[s.field] = s.desc ? -1 : 1;
  });

  return {
    query,
    sort,
    skip: (page - 1) * pageSize,
    limit: pageSize
  };
}

/**
 * A helper to execute a Mongoose query based on GridState and return paginated results.
 */
export async function fetchGridDataMongo(mongooseModel: any, state: GridState) {
  const params = translateToMongo(state);
  
  const [data, totalCount] = await Promise.all([
    mongooseModel.find(params.query).sort(params.sort).skip(params.skip).limit(params.limit),
    mongooseModel.countDocuments(params.query)
  ]);

  return {
    data,
    totalCount,
    page: state.page,
    pageSize: state.pageSize
  };
}
