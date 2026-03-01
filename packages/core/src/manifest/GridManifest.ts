export type ColumnManifest = {
  id: string;
  label: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  sortable: boolean;
  filterable: boolean;
  groupable: boolean;
};

export type GridManifest = {
  version: string;
  gridId: string;
  columns: ColumnManifest[];
  capabilities: {
    pagination: boolean;
    multiSort: boolean;
    export: boolean;
  };
};

export const generateManifest = (id: string, columns: ColumnManifest[]): GridManifest => ({
  version: '1.0.0',
  gridId: id,
  columns,
  capabilities: {
    pagination: true,
    multiSort: true,
    export: true,
  },
});