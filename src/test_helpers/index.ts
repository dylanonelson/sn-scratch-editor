import { assert } from 'es-toolkit';
import { Node } from 'prosemirror-model';
import { markdownSerializer } from '../markdown';

export function expectResultToMatch(result: Node, expected: Node) {
  assert(
    result.eq(expected),
    `Expected\n\n${markdownSerializer.serialize(expected)}\n\nbut got\n\n${markdownSerializer.serialize(result, { tightLists: true })}`,
  );
}
