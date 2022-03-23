import { EditorState, Plugin, Selection } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { schema } from './schema';

export class InlineLinkPlugin extends Plugin {
  constructor() {
    super({
      appendTransaction(transactions, oldState, newState) {
        const { tr } = newState;
        let decorationSet = new DecorationSet();

        tr.doc.descendants((node, pos, parent) => {
          if (!node.isTextblock) {
            return false;
          }

          const URL_REGEX = /(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})\/?(([\/\w\-\._~!$&'()*+,;=:@]|(%[0-F][0-F]))*)*\/?(\?([\w;/?:@&=+$,]|(%[0-F][0-F]))+)?/gi;
          let urlMatch = URL_REGEX.exec(node.textContent);

          while (urlMatch) {
            const [str] = urlMatch;

            const start  = pos + 1 + urlMatch.index;
            const end = pos + 1 + str.length;

            if (tr.doc.rangeHasMark(start, end, schema.marks.link)) {
              return;
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
      },
    });
  }
}
