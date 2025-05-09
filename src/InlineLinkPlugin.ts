import { EditorState, Plugin, Selection, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { schema } from './schema';

export const findAndInsertInlineLinks = (state): Transaction => {
  const { tr } = state;
  let decorationSet = new DecorationSet();

  tr.doc.descendants((node, pos, parent) => {
    if (!node.isTextblock) {
      return;
    }

    const URL_REGEX = /(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})\/?(([\/\w\-\._~!$&'()*+,;=:@]|(%[0-F][0-F]))*)*\/?(\?([\w;/?:@&=+$,]|(%[0-F][0-F]))+)?/gi;
    let urlMatch = URL_REGEX.exec(node.textContent);

    while (urlMatch) {
      debugger
      const [str] = urlMatch;

      const start = pos + 1 + urlMatch.index;
      const end = start + str.length;
      
      if (tr.doc.rangeHasMark(start, end, schema.marks.link)) {
        urlMatch = URL_REGEX.exec(node.textContent);
        continue;
      }

      tr.addMark(
        start,
        end,
        schema.marks.inline_link.create({ href: str }),
      );

      urlMatch = URL_REGEX.exec(node.textContent);
    }
  });

  return tr;
};

export class InlineLinkPlugin extends Plugin {
  constructor() {
    super({
      appendTransaction(transactions, oldState, newState) {
        return findAndInsertInlineLinks(newState);
      },
    });
  }
}
