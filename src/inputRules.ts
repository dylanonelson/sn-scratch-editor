import {
  inputRules,
  smartQuotes,
  ellipsis,
  textblockTypeInputRule,
  InputRule,
} from 'prosemirror-inputrules';
import { Plugin, Selection } from 'prosemirror-state';
import { MarkType, NodeType } from 'prosemirror-model';
import { schema } from './schema';

function markWrappingRule(c: string, markType: MarkType) {
  return new InputRule(new RegExp(`${c}(.*?)${c}$`), (state, match, start, end) => {
    const [_, text] = match;
    const { tr } = state;
    if (!text) {
      return;
    }

    const existingMarks = state.doc.resolve(start).marksAcross(state.doc.resolve(end));
    return tr.replaceRangeWith(start, end, schema.text(text, [
      ...existingMarks,
      markType.create(),
    ]));
  });
}

function listTypeRule(prefix: string, listType: NodeType): InputRule {
  return new InputRule(new RegExp(`^${prefix}`), (state, match, start, end) => {
    const { $from } = state.selection;
    if ($from.depth > 1) {
      return;
    }

    const { tr } = state;
    tr.replaceRangeWith(start, end, listType.createAndFill())
    tr.setSelection(Selection.near(tr.doc.resolve(start)));
    return tr;
  });
}

export const inputRulesPlugin = inputRules({
  rules: [
    ...smartQuotes,
    ellipsis,
    textblockTypeInputRule(/^# /, schema.nodes.heading2),
    textblockTypeInputRule(/^```/, schema.nodes.code_block),
    markWrappingRule('`', schema.marks.code),
    markWrappingRule('\\*', schema.marks.strong),
    markWrappingRule('_', schema.marks.em),
    listTypeRule('1. ', schema.nodes.ordered_list),
    listTypeRule('- ', schema.nodes.unordered_list),
  ],
});
