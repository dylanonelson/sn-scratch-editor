import {
  inputRules,
  smartQuotes,
  ellipsis,
  textblockTypeInputRule,
  InputRule,
} from 'prosemirror-inputrules';
import { Selection } from 'prosemirror-state';
import { MarkType, NodeType } from 'prosemirror-model';
import { schema } from './schema';

function markWrappingRule(c: string, markType: MarkType) {
  return new InputRule(
    new RegExp(`${c}(.*?)${c}$`),
    (state, match, start, end) => {
      const [_, text] = match;
      const { tr } = state;
      if (!text) {
        return;
      }

      const existingMarks = state.doc
        .resolve(start)
        .marksAcross(state.doc.resolve(end));
      return tr.replaceRangeWith(
        start,
        end,
        schema.text(text, [...existingMarks, markType.create()]),
      );
    },
  );
}

function listTypeRule(prefix: string, listType: NodeType): InputRule {
  return new InputRule(
    new RegExp(`^${prefix}`),
    (state, match: RegExpMatchArray, start, end) => {
      const $end = state.doc.resolve(end);
      if ($end.depth > 1) {
        // Make sure we are not already in a list; all other positions should be
        // depth 1.
        return;
      }
      if (match.input !== prefix) {
        // If the input and prefix do not match that means that we are matching
        // against a pattern that is not flush with the user's most recent input.
        // This could happen if for example you paste `- ` at the beginning of a
        // paragraph and then hit space. The input rule will then fire with the
        // start and end of the site of that last space character. Since the
        // intention of input rules is to serve as macros for the user, we should
        // ignore these cases.
        return;
      }
      // Subtract 2 here, for the start and end of the node.
      const rangeAfterPrefix: [number, number] = [
        end,
        start + $end.parent.nodeSize - 2,
      ];
      const sliceAfterPrefix = state.doc.slice(...rangeAfterPrefix);
      const { tr } = state;
      tr.deleteRange(...rangeAfterPrefix);
      tr.replaceRangeWith(start, end, listType.createAndFill());
      tr.setSelection(Selection.near(tr.doc.resolve(start)));
      tr.insert(tr.selection.from, sliceAfterPrefix.content);
      return tr;
    },
  );
}

export const inputRulesPlugin = inputRules({
  rules: [
    ...smartQuotes,
    ellipsis,
    textblockTypeInputRule(/^# /, schema.nodes.heading2),
    textblockTypeInputRule(/^## /, schema.nodes.heading3),
    textblockTypeInputRule(/^```/, schema.nodes.code_block),
    markWrappingRule('`', schema.marks.code),
    markWrappingRule('\\*', schema.marks.strong),
    markWrappingRule('_', schema.marks.em),
    listTypeRule('1. ', schema.nodes.ordered_list),
    listTypeRule('- ', schema.nodes.unordered_list),
  ],
});
