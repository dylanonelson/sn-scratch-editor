import LinkifyIt from 'linkify-it';
import { Plugin, Transaction } from 'prosemirror-state';
import { AUTO_LINK_ATTR, schema } from './schema';

const linkify = new LinkifyIt();

export const findAndInsertInlineLinks = (state): Transaction => {
  const { tr } = state;

  tr.doc.descendants((node, pos, parent) => {
    if (!node.isTextblock) {
      return;
    }

    // First, find and validate all existing autolinks. If an autolink contains text that is not a valid URL, remove the link.
    const startingPositionInsideNode = pos + 1;
    const autoLinkMaps: { startPos: number; endPos: number }[] = [];
    node.forEach((child, offset, index) => {
      if (!child.isText) {
        return;
      }
      let childLinkMark = child.marks.find(
        (mark) => mark.type === schema.marks.link,
      );
      if (childLinkMark && childLinkMark.attrs[AUTO_LINK_ATTR] === true) {
        if (autoLinkMaps.length) {
          const lastMap = autoLinkMaps[autoLinkMaps.length - 1];
          if (lastMap.endPos === startingPositionInsideNode + offset) {
            lastMap.endPos = pos + offset + child.nodeSize;
          }
        } else {
          autoLinkMaps.push({
            startPos: startingPositionInsideNode + offset,
            endPos: startingPositionInsideNode + offset + child.nodeSize,
          });
        }
      }
    });

    for (const autoLinkMap of autoLinkMaps) {
      const linkText = tr.doc.textBetween(
        autoLinkMap.startPos,
        autoLinkMap.endPos,
      );
      if (!linkify.test(linkText)) {
        tr.removeMark(
          autoLinkMap.startPos,
          autoLinkMap.endPos,
          schema.marks.link,
        );
      } else {
        // This else statement ensures that existing autolinks will continue to update even if they are
        // adjacent to other text; the regex URL test will stop finding them in this case.
        tr.addMark(
          autoLinkMap.startPos,
          autoLinkMap.endPos,
          schema.marks.link.create({ href: linkText, [AUTO_LINK_ATTR]: true }),
        );
      }
    }

    // Then, find and insert new autolinks based on the same test.
    const matches = linkify.match(node.textContent);
    if (!matches) {
      return;
    }

    for (const match of matches) {
      const start = pos + 1 + match.index;
      const end = start + match.text.length;

      if (tr.doc.rangeHasMark(start, end, schema.marks.code)) {
        continue;
      }

      if (tr.doc.rangeHasMark(start, end, schema.marks.link)) {
        let linkMarks = [];
        tr.doc.nodesBetween(start, end, (node) => {
          if (node.isText) {
            const linkMark = node.marks.find(
              (mark) => mark.type === schema.marks.link,
            );
            if (linkMark && linkMark.attrs[AUTO_LINK_ATTR] === false) {
              linkMarks.push(linkMark);
            }
          }
        });
        if (linkMarks.length) {
          continue;
        }
      }

      tr.addMark(
        start,
        end,
        schema.marks.link.create({ href: match.url, [AUTO_LINK_ATTR]: true }),
      );
    }
  });

  return tr;
};

export class InlineLinkPlugin extends Plugin {
  constructor() {
    super({
      appendTransaction(transactions, _oldState, newState) {
        for (let i = 0; i < transactions.length; i += 1) {
          const tr = transactions[i];
          if (tr.docChanged === false) {
            return findAndInsertInlineLinks(newState);
          }
        }
      },
    });
  }
}
