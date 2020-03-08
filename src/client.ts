import { v4 as uuidv4 } from 'uuid';
import { DOMParser } from 'prosemirror-model';
import ComponentManager from 'sn-components-api';
import { schema } from './schema';
import aliceNode from './demo-doc.node';

const SN_ITEM_SAVE_KEY = 'com.dylanonelson.sn-editor';

function getNamespacedContent(item: Item) {
  const result = item
    && item.content
    && item.content[SN_ITEM_SAVE_KEY];
  return result || null;
}

function getUuid(item: Item) {
  if (item) {
    return item.uuid;
  }
  return null;
}

function getDoc(item: Item) {
  const content = getNamespacedContent(item);
  if (content && content.doc) {
    return content.doc;
  }
  return null;
}

function getLastSavedBy(item: Item) {
  const content = getNamespacedContent(item);
  if (content && content.lastSavedBy) {
    return content.lastSavedBy;
  }
  return null;
}

class Client {
  static SN_ITEM_SAVE_KEY = 'com.dylanonelson.sn-editor';

  private static itemSelectors = {
  }

  private _item: Item = null;

  private _ready: Promise<void>;

  private _id: string;

  private _listeners: (({}) => void)[];

  private componentManager: ComponentManager;

  constructor() {
    this._id = uuidv4();
    this._listeners = [];

    let resolveClientReady;
    this._ready = new Promise(resolve => { resolveClientReady = resolve; });

    this.componentManager = new ComponentManager(
      [{ name: 'stream-context-item' }],
      () => {
        this.componentManager.streamContextItem(item => {
          console.debug('streamContextItem update:', item);

          const callListeners = this.shouldCallListeners(item, this._item);
          console.log('callListeners', callListeners);

          this._item = item;

          if (callListeners) {
            this._listeners.forEach(listener => {
              listener(item);
            });
          }

          resolveClientReady();
        });
      }
    );
  }

  get latestDoc() {
    return getDoc(this._item);
  }

  onUpdate(callback: ({}) => void) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(listener => listener !== callback);
    }
  }

  ready() {
    return this._ready;
  }

  saveNote(jsonDoc) {
    const toSave = {
      ...this._item,
      content: {
        ...this._item.content,
        [SN_ITEM_SAVE_KEY]: {
          doc: jsonDoc,
          lastSavedBy: this._id,
        },
      },
    };
    this.componentManager.saveItemWithPresave(toSave);
  }

  shouldCallListeners = (nextItem, previousItem) => {
    if (nextItem.isMetadataUpdate) {
      return false;
    }
    return getUuid(nextItem) !== getUuid(previousItem)
      || getLastSavedBy(nextItem) !== this._id;
  }
}

class DemoClient {
  constructor() {}
  get latestDoc() {
    console.log('latestDoc');
    console.log(aliceNode);
    return DOMParser.fromSchema(schema)
      .parse(aliceNode).toJSON();
  }
  ready() {
    return Promise.resolve();
  }
  onUpdate() {}
  saveNote() {}
}

export const client = process.env.DEMO === 'true' ? new DemoClient() : new Client();
