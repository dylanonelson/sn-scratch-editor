// In environments where the Standard Notes client has no effect,
// this module will be swapped in for client.ts.

import demoMarkdown from './demoDocs.md';

class DemoClient {
  constructor() {}
  get latestText() {
    return demoMarkdown;
  }
  ready() {
    return Promise.resolve();
  }
  onUpdate() {}
  saveNote(jsonDoc: {}, mdDoc: string, textPreview: string) {
    (window as any).saveNoteArgs = { jsonDoc, mdDoc, textPreview };
  }
}

export const client = new DemoClient();
