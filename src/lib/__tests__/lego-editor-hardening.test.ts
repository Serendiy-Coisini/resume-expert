import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculatePrintSlices } from '@/components/legoDesigner/utils/printLego';
import { applyMeasuredTextHeights } from '@/lib/lego-text-layout';
import { appendBlankPage, canAppendBlankPage, moveWidgetsToCanvasPage } from '@/lib/lego-pages';
import { approveExternalLegoImageSource, safeLegoImageSource, validateLocalLegoImage } from '@/lib/lego-image';
import { validateAndNormalizeLegoJson } from '@/lib/schema-normalizer';
import { sanitizePrintHTML } from '@/lib/safe-html';
import { DEFAULT_LEGO_SCHEMA, useLegoDesignerStore } from '@/store/lego-designer-store';
import type { IHJSchema, IWidget } from '@/types/lego';

function widget(id: string, left: number, top: number, height: number, componentName = 'hj-text-1'): IWidget {
  return {
    id,
    componentName,
    title: id,
    css: { left, top, width: 200, height, zIndex: 1 },
    dataSource: { text: id },
  };
}

function canvas(children: IWidget[], pages = 1): IHJSchema {
  return {
    ...structuredClone(DEFAULT_LEGO_SCHEMA),
    componentsTree: Array.from({ length: pages }, (_, index) => ({
      id: `page-${index + 1}`,
      componentName: 'page' as const,
      commentType: 'page' as const,
      children: index === 0 ? children : [],
    })),
  };
}

test('oversized imported canvas and print job fail before page allocation', () => {
  const tooWide = validateAndNormalizeLegoJson({
    ...canvas([widget('text', 40, 40, 20)]), css: { width: 2001, height: 1160 },
  });
  assert.equal(tooWide.success, false);
  assert.match(tooWide.error || '', /宽度/);
  const tooLong = validateAndNormalizeLegoJson({
    ...canvas([widget('text', 40, 40, 20)]), css: { width: 820, height: 1160 * 81 },
  });
  assert.equal(tooLong.success, false);
  assert.match(tooLong.error || '', /页数/);
  assert.throws(() => calculatePrintSlices(820, 1160 * 81), /页数/);
});

test('measured text expansion moves only following content in its column and grows its background', () => {
  const background = widget('background', 0, 0, 1160, 'hj-rectangle');
  background.css.width = 260;
  const initial = canvas([
    background,
    widget('first', 20, 100, 20),
    widget('second', 20, 130, 20),
    widget('other-column', 400, 130, 20),
  ]);
  const updated = applyMeasuredTextHeights(initial, { first: 80 });
  const byId = new Map(updated.componentsTree[0].children.map((item) => [item.id, item]));
  assert.equal(byId.get('first')?.css.height, 80);
  assert.equal(byId.get('second')?.css.top, 190);
  assert.equal(byId.get('other-column')?.css.top, 130);
  assert.ok((byId.get('background')?.css.height || 0) >= 188);
  assert.equal(updated.css.height, 1160);
  assert.strictEqual(applyMeasuredTextHeights(updated, { first: 80 }), updated);
  const shortened = applyMeasuredTextHeights(updated, { first: 30 });
  assert.equal(shortened.componentsTree[0].children.find((item) => item.id === 'first')?.css.height, 30);
  assert.equal(shortened.componentsTree[0].children.find((item) => item.id === 'second')?.css.top, 140);
  assert.equal(initial.componentsTree[0].children[1].css.height, 20);
  assert.throws(() => applyMeasuredTextHeights(initial, { first: 20_001 }), /文本块过长/);
});

test('measured text that would cross the print boundary starts on the next page', () => {
  const initial = canvas([
    widget('near-break', 20, 1100, 20),
    widget('following', 20, 1140, 20),
    widget('parallel-column', 420, 1140, 20),
  ]);
  const updated = applyMeasuredTextHeights(initial, { 'near-break': 100 });
  const byId = new Map(updated.componentsTree[0].children.map((item) => [item.id, item]));
  assert.ok((byId.get('near-break')?.css.top || 0) >= 1160);
  assert.ok((byId.get('near-break')?.css.top || 0) + 100 < 2320);
  assert.ok((byId.get('following')?.css.top || 0) > (byId.get('near-break')?.css.top || 0) + 100);
  assert.equal(byId.get('parallel-column')?.css.top, 1140);
  assert.equal(updated.css.height, 2320);
  const restored = applyMeasuredTextHeights(updated, { 'near-break': 20 });
  assert.equal(restored.componentsTree[0].children.find((item) => item.id === 'near-break')?.css.top, 1100);
  assert.equal(restored.componentsTree[0].children.find((item) => item.id === 'following')?.css.top, 1140);
  assert.equal(restored.css.height, 1160);
});

test('measured text expands and then releases an independently sized page', () => {
  const initial = canvas([widget('text', 20, 1100, 20)]);
  initial.componentsTree[0].height = 1160;
  const expanded = applyMeasuredTextHeights(initial, { text: 100 });
  assert.equal(expanded.componentsTree[0].height, 2320);
  assert.equal(expanded.css.height, 1160);
  const shortened = applyMeasuredTextHeights(expanded, { text: 20 });
  assert.equal(shortened.componentsTree[0].height, 1160);
});

test('automatic canvas measurement keeps the selected widget and active page', () => {
  const snapshot = useLegoDesignerStore.getState();
  try {
    const initial = canvas([widget('selected-text', 20, 20, 20)], 2);
    snapshot.setSchema(initial, true);
    snapshot.setPageActiveIndex(1);
    snapshot.setSelectedWidgetId('selected-text');
    const grown = structuredClone(useLegoDesignerStore.getState().schema);
    grown.componentsTree[0].children[0].css.height = 80;
    snapshot.setSchema(grown, false);
    const current = useLegoDesignerStore.getState();
    assert.equal(current.selectedWidgetId, 'selected-text');
    assert.deepEqual(current.selectedWidgetIds, ['selected-text']);
    assert.equal(current.pageActiveIndex, 1);
  } finally {
    useLegoDesignerStore.setState(snapshot, true);
  }
});

test('an untrusted external image waits for user consent and upload types are bounded', () => {
  const url = 'https://example.invalid/lego-private-image-test.png';
  assert.equal(safeLegoImageSource(url), '');
  assert.doesNotMatch(sanitizePrintHTML(`<img src="${url}">`), /example\.invalid/);
  assert.equal(approveExternalLegoImageSource('http://example.invalid/photo.png'), false);
  assert.equal(approveExternalLegoImageSource(url), true);
  assert.equal(safeLegoImageSource(url), url);
  assert.match(sanitizePrintHTML(`<img src="${url}">`), /example\.invalid/);
  assert.match(validateLocalLegoImage({ type: 'image/svg+xml', size: 100 }) || '', /PNG/);
  assert.match(validateLocalLegoImage({ type: 'image/png', size: 9 * 1024 * 1024 }) || '', /8MB/);
});

test('corrupted saved template never replaces the current canvas', () => {
  const snapshot = useLegoDesignerStore.getState();
  try {
    useLegoDesignerStore.setState({ savedTemplates: [{
      id: 'broken', name: 'Broken', category: '', description: '', cover: '', createTime: '',
      schema: { css: { width: 820 } } as IHJSchema,
    }] });
    const original = useLegoDesignerStore.getState().schema;
    assert.throws(() => snapshot.loadSavedTemplate('broken'), /模板数据不完整/);
    assert.strictEqual(useLegoDesignerStore.getState().schema, original);
  } finally {
    useLegoDesignerStore.setState(snapshot, true);
  }
});

test('blank pages print independently and page creation obeys the shared limit', () => {
  const initial = canvas([widget('source', 20, 40, 40)]);
  const next = appendBlankPage(initial);
  assert.equal(initial.componentsTree.length, 1);
  assert.equal(next.componentsTree.length, 2);
  assert.deepEqual(next.componentsTree[1].children, []);
  assert.notEqual(next.componentsTree[0].id, next.componentsTree[1].id);
  assert.equal(next.componentsTree[1].retainWhenEmpty, true);
  const longCanvas = canvas([widget('long', 20, 1800, 40)]);
  longCanvas.css.height = 2320;
  const withOneA4Page = appendBlankPage(longCanvas);
  assert.equal(withOneA4Page.componentsTree[1].height, 1160);
  assert.equal(canAppendBlankPage(withOneA4Page), true);
  const normalized = validateAndNormalizeLegoJson(withOneA4Page);
  assert.equal(normalized.success, true);
  assert.equal(normalized.data?.componentsTree[1].height, 1160);
  assert.equal(normalized.data?.componentsTree[1].retainWhenEmpty, true);
  const duplicatedIds = structuredClone(withOneA4Page);
  duplicatedIds.componentsTree[1].id = duplicatedIds.componentsTree[0].id;
  assert.notEqual(normalizePageIds(duplicatedIds)[0], normalizePageIds(duplicatedIds)[1]);
  const oversized = canvas([], 20);
  assert.equal(canAppendBlankPage(oversized), false);
  assert.throws(() => appendBlankPage(oversized), /限制/);
});

function normalizePageIds(schema: IHJSchema): string[] {
  const normalized = validateAndNormalizeLegoJson(schema);
  assert.equal(normalized.success, true);
  return normalized.data!.componentsTree.map((page) => page.id);
}

test('moving widgets to another page is one undoable operation', () => {
  const snapshot = useLegoDesignerStore.getState();
  try {
    const initial = canvas([widget('move-me', 20, 40, 40)]);
    snapshot.setSchema(initial, false);
    const baseline = useLegoDesignerStore.getState().schema;
    const moved = snapshot.moveWidgetsToPage(['move-me'], 1, 'move-me', { left: 40, top: 50 },
      { 'move-me': { left: 20, top: 40 } }, baseline);
    assert.equal(moved, true);
    assert.equal(useLegoDesignerStore.getState().schema.componentsTree.length, 2);
    assert.equal(useLegoDesignerStore.getState().pageActiveIndex, 1);
    snapshot.undo();
    assert.equal(useLegoDesignerStore.getState().schema.componentsTree.length, 1);
    assert.equal(useLegoDesignerStore.getState().pageActiveIndex, 0);
    assert.equal(useLegoDesignerStore.getState().schema.componentsTree[0].children[0].id, 'move-me');
  } finally {
    useLegoDesignerStore.setState(snapshot, true);
  }
});

test('cross-page drag moves the selected group and automatically creates the last page', () => {
  const first = widget('first', 20, 40, 40);
  const second = widget('second', 20, 100, 40);
  const initial = canvas([first, second]);
  const moved = moveWidgetsToCanvasPage(initial, ['first', 'second'], 1, 'first',
    { left: 100, top: 80 }, { first: { left: 20, top: 40 }, second: { left: 20, top: 100 } });
  assert.equal(moved.componentsTree.length, 2);
  assert.deepEqual(moved.componentsTree[0].children, []);
  assert.deepEqual(moved.componentsTree[1].children.map((item) => [item.id, item.css.left, item.css.top]),
    [['first', 100, 80], ['second', 100, 140]]);
  assert.deepEqual(initial.componentsTree[0].children.map((item) => item.id), ['first', 'second']);
});

test('drag-created empty page is removed when its last widget returns, including legacy drafts', () => {
  const initial = canvas([widget('round-trip', 20, 40, 40)]);
  const forward = moveWidgetsToCanvasPage(initial, ['round-trip'], 1, 'round-trip',
    { left: 70, top: 80 }, { 'round-trip': { left: 20, top: 40 } });
  assert.equal(forward.componentsTree[1].retainWhenEmpty, false);
  const back = moveWidgetsToCanvasPage(forward, ['round-trip'], 0, 'round-trip',
    { left: 20, top: 40 }, { 'round-trip': { left: 70, top: 80 } });
  assert.equal(back.componentsTree.length, 1);
  assert.deepEqual(back.componentsTree[0].children.map((item) => item.id), ['round-trip']);
  assert.equal(forward.componentsTree.length, 2);

  const legacy = structuredClone(forward);
  delete legacy.componentsTree[1].retainWhenEmpty;
  const legacyBack = moveWidgetsToCanvasPage(legacy, ['round-trip'], 0, 'round-trip',
    { left: 20, top: 40 }, { 'round-trip': { left: 70, top: 80 } });
  assert.equal(legacyBack.componentsTree.length, 1);
});

test('manually added blank pages remain after their last widget moves away', () => {
  const initial = canvas([widget('manual-page-widget', 20, 40, 40)]);
  const manual = appendBlankPage(initial);
  const occupied = moveWidgetsToCanvasPage(manual, ['manual-page-widget'], 1, 'manual-page-widget',
    { left: 70, top: 80 }, { 'manual-page-widget': { left: 20, top: 40 } });
  const back = moveWidgetsToCanvasPage(occupied, ['manual-page-widget'], 0, 'manual-page-widget',
    { left: 20, top: 40 }, { 'manual-page-widget': { left: 70, top: 80 } });
  assert.equal(back.componentsTree.length, 2);
  assert.deepEqual(back.componentsTree[1].children, []);
  assert.equal(back.componentsTree[1].retainWhenEmpty, true);
});

test('removing an empty middle page keeps the destination index and undo history correct', () => {
  const snapshot = useLegoDesignerStore.getState();
  try {
    const initial = canvas([widget('middle-page-widget', 20, 40, 40)]);
    const autoPage = moveWidgetsToCanvasPage(initial, ['middle-page-widget'], 1, 'middle-page-widget',
      { left: 70, top: 80 }, { 'middle-page-widget': { left: 20, top: 40 } });
    const withManualLastPage = appendBlankPage(autoPage);
    snapshot.setSchema(withManualLastPage, false);
    const beforeMove = useLegoDesignerStore.getState().schema;
    assert.equal(snapshot.moveWidgetsToPage(['middle-page-widget'], 2, 'middle-page-widget',
      { left: 30, top: 50 }, { 'middle-page-widget': { left: 70, top: 80 } }, beforeMove), true);
    const afterMove = useLegoDesignerStore.getState();
    assert.equal(afterMove.schema.componentsTree.length, 2);
    assert.equal(afterMove.pageActiveIndex, 1);
    assert.equal(afterMove.schema.componentsTree[1].children[0].id, 'middle-page-widget');
    afterMove.undo();
    assert.equal(useLegoDesignerStore.getState().schema.componentsTree.length, 3);
    afterMove.redo();
    assert.equal(useLegoDesignerStore.getState().schema.componentsTree.length, 2);
  } finally {
    useLegoDesignerStore.setState(snapshot, true);
  }
});

test('moving expanded text clears its old page shift and grows the destination to fit', () => {
  const longText = widget('long', 20, 1100, 1600);
  longText.customProps = { __legoTextLayout: { baseHeight: 40, pageShift: 80 } };
  const initial = canvas([longText]);
  initial.css.height = 3480;
  const moved = moveWidgetsToCanvasPage(initial, ['long'], 1, 'long',
    { left: 30, top: 80 }, { long: { left: 20, top: 1100 } });
  const destination = moved.componentsTree[1];
  assert.equal(destination.height, 2320);
  assert.equal(destination.children[0].css.top, 0);
  assert.deepEqual(destination.children[0].customProps?.__legoTextLayout, { baseHeight: 40, pageShift: 0 });
  assert.equal(initial.componentsTree[0].children[0].customProps?.__legoTextLayout &&
    (initial.componentsTree[0].children[0].customProps?.__legoTextLayout as { pageShift: number }).pageShift, 80);
});
