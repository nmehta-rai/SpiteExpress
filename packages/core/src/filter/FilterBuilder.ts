export type FilterOperator = 'contains' | 'notContains' | 'startsWith' | 'endsWith' | 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'between';

export type FilterValue = string | number | boolean | Date | Array<any>;

export type FilterCondition = {
  field: string;
  operator: FilterOperator;
  value: FilterValue;
};

export type FilterGroup = {
  type: 'and' | 'or';
  conditions: Array<FilterCondition | FilterGroup>;
};

export class FilterBuilder {
  private root: FilterGroup = { type: 'and', conditions: [] };

  constructor(type: 'and' | 'or' = 'and') {
    this.root.type = type;
  }

  addCondition(field: string, operator: FilterOperator, value: FilterValue): this {
    this.root.conditions.push({ field, operator, value });
    return this;
  }

  addGroup(group: FilterGroup): this {
    this.root.conditions.push(group);
    return this;
  }

  build(): FilterGroup {
    return this.root;
  }
}