export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt';

export type FilterCondition = {
  field: string;
  operator: FilterOperator;
  value: any;
};

export type FilterGroup = {
  logic: 'and' | 'or';
  filters: Array<FilterCondition | FilterGroup>;
};

export const buildFilterQuery = (filter: FilterGroup): any => {
  // Implementation for converting complex groups into backend-specific queries
  return filter;
};
