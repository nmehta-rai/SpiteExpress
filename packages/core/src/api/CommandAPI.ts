export type GridCommand = 
  | { type: 'SORT'; field: string; direction: 'asc' | 'desc' }
  | { type: 'FILTER'; field: string; operator: string; value: any }
  | { type: 'PAGE'; index: number }
  | { type: 'EXPORT'; format: 'pdf' | 'excel' | 'csv' };

export class CommandAPI {
  static execute(command: GridCommand, store: any) {
    switch (command.type) {
      case 'SORT':
        store.setSorting([{ id: command.field, desc: command.direction === 'desc' }]);
        break;
      case 'FILTER':
        store.setFiltering([{ id: command.field, value: command.value }]);
        break;
      case 'PAGE':
        // Pagination logic here
        break;
      case 'EXPORT':
        // Trigger export engine
        break;
    }
  }

  static parseAndExecute(input: string, store: any) {
    // In a real implementation, this would involve a lightweight LLM
    // or regex parser to map natural language to GridCommands.
    console.log('Parsing and executing command:', input);
  }
}