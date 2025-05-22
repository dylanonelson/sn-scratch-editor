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

function markWrappingRule(
  c: string,
  markType: MarkType,
  isValidInsideCodeMark: boolean,
) {
  return new InputRule(
    new RegExp(`${c}(\\S+(\\s+\\S+)*?)${c}$`),
    (state, match, start, end) => {
      const [_, text] = match;
      const { tr } = state;
      if (!text) {
        return;
      }

      const existingMarks = state.doc
        .resolve(start)
        .marksAcross(state.doc.resolve(end));

      // Bail out if the mark is inside a code mark and the rule is not valid inside a code mark
      if (
        !isValidInsideCodeMark &&
        existingMarks.some((m) => m.type.name === 'code')
      ) {
        return;
      }

      return (
        tr
          .replaceRangeWith(
            start,
            end,
            schema.text(text, [...existingMarks, markType.create()]),
          )
          // Add a space after the text so the inclusive mark rule doesn't affect the ensuing input
          .insert(tr.selection.from, schema.text(' ', [...existingMarks]))
          .setMeta('has-forced-space-from-input-rule', {
            endPos: tr.selection.from,
          })
      );
    },
  );
}

function listTypeRule(prefix: string, listType: NodeType): InputRule {
  return new InputRule(
    new RegExp(`^${prefix}$`),
    (state, match: RegExpMatchArray, start, end) => {
      const $end = state.doc.resolve(end);
      if ($end.depth > 1) {
        // Make sure we are not already in a list; all other positions should be
        // depth 1.
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
      tr.setSelection(Selection.near(tr.doc.resolve(start)));
      return tr;
    },
  );
}

export const inputRulesPlugin = inputRules({
  rules: [
    ...smartQuotes,
    ellipsis,
    textblockTypeInputRule(/^# /, schema.nodes.heading2),
    textblockTypeInputRule(/^```/, schema.nodes.code_block),
    markWrappingRule('`', schema.marks.code, false),
    markWrappingRule('\\*', schema.marks.strong, false),
    markWrappingRule('_', schema.marks.em, false),
    listTypeRule('1. ', schema.nodes.ordered_list),
    listTypeRule('- ', schema.nodes.unordered_list),
  ],
});

const RESET_HAS_FORCED_SPACE_META = 'reset-has-forced-space-meta';

// Create a plugin that swallows a space typed by the user when they've just
// invoked an input rule that inserted a space for them, to avoid unintentional
// double spaces.
export const inputRulesForcedSpacePlugin = new Plugin<
  { hasForcedSpace: false } | { hasForcedSpace: true; forcedSpacePos: number }
>({
  state: {
    init() {
      return {
        hasForcedSpace: false,
      };
    },
    apply(tr, previous) {
      if (tr.getMeta(RESET_HAS_FORCED_SPACE_META)) {
        return {
          hasForcedSpace: false,
        };
      }
      if (previous.hasForcedSpace) {
        // Depending on the scenario, this logic could be insufficient, but it
        // should work fine for all current use cases. We want to guarantee that
        // _only_ when the user types a space immediately after typing the
        // closing wrapping mark character do we suppress that space character.
        // So if they do anything else, like go somewhere else in the document
        // or type a different character, we should clear the plugin state. This
        // could fail in a collaborative scenario, where others could change the
        // document, or with plugins that modify the document without direct
        // input from the user.
        if (tr.selectionSet || tr.docChanged) {
          return {
            hasForcedSpace: false,
          };
        }
      }

      const pluginMeta = tr.getMeta('has-forced-space-from-input-rule');
      if (pluginMeta) {
        return {
          hasForcedSpace: true,
          forcedSpacePos: pluginMeta.endPos,
        };
      }

      return previous;
    },
  },
  props: {
    handleTextInput(view, _from, _to, text) {
      if (this.getState(view.state).hasForcedSpace && text === ' ') {
        view.dispatch(view.state.tr.setMeta(RESET_HAS_FORCED_SPACE_META, true));
        return true;
      }
    },
  },
});
