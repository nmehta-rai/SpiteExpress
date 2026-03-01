import * as Y from 'yjs';
import { useSpiteStore, Row, CellValue } from './useSpiteGrid';

export type CollaborativeOptions = {
  roomName: string;
  doc?: Y.Doc;
};

export const useCollaborativeGrid = (options: CollaborativeOptions) => {
  const store = useSpiteStore();
  const doc = options.doc || new Y.Doc();
  const yArray = doc.getArray<Row>(`grid-data-${options.roomName}`);

  const initSync = () => {
    store.syncWithYjs(yArray);
  };

  const updateCellCollaboratively = (rowIndex: number, columnId: string, value: CellValue) => {
    doc.transact(() => {
      const row = yArray.get(rowIndex);
      if (row) {
        const newRow = { ...row, [columnId]: value };
        yArray.delete(rowIndex, 1);
        yArray.insert(rowIndex, [newRow]);
      }
    });
  };

  return {
    ...store,
    initSync,
    updateCellCollaboratively,
    yDoc: doc,
    yArray,
  };
};
