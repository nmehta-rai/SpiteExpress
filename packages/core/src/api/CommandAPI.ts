export type SpiteCommand = {
  action: 'sort' | 'filter' | 'page' | 'group';
  payload: any;
};

export class CommandAPI {
  static parse(naturalLanguage: string): SpiteCommand[] {
    // In a real implementation, this would call an LLM to parse intent.
    // Mocking a response for the demo.
    console.log(`Parsing command: ${naturalLanguage}`);
    return [
      { action: 'sort', payload: { field: 'price', direction: 'desc' } }
    ];
  }

  static execute(commands: SpiteCommand[], store: any) {
    commands.forEach(cmd => {
      if (cmd.action === 'sort') store.setSorting([cmd.payload]);
      // ... handle others
    });
  }
}