import type { IWidget } from '@/types/lego';

const SPACER_SELECTOR = '[data-lego-page-spacer="true"]';

function textNodes(root: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}

function pointAt(nodes: Text[], offset: number): { node: Text; offset: number } | null {
  let remaining = offset;
  for (const node of nodes) {
    if (remaining <= node.length) return { node, offset: remaining };
    remaining -= node.length;
  }
  const last = nodes.at(-1);
  return last ? { node: last, offset: last.length } : null;
}

function firstCharacterAfter(root: HTMLElement, cutoff: number): number | null {
  const nodes = textNodes(root);
  const total = nodes.reduce((sum, node) => sum + node.length, 0);
  if (total === 0) return null;
  const range = document.createRange();
  range.setStart(root, 0);
  const bottomAt = (offset: number) => {
    const point = pointAt(nodes, offset);
    if (!point) return -Infinity;
    range.setEnd(point.node, point.offset);
    return range.getBoundingClientRect().bottom;
  };
  if (bottomAt(total) <= cutoff) return null;
  let low = 1;
  let high = total;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (bottomAt(middle) > cutoff) high = middle;
    else low = middle + 1;
  }
  const text = nodes.map((node) => node.data).join('');
  let before = low - 1;
  const priorWhitespace = Math.max(text.lastIndexOf(' ', before - 1), text.lastIndexOf('\n', before - 1));
  if (priorWhitespace >= Math.max(0, before - 32)) before = priorWhitespace + 1;
  if (before > 0 && /[\uDC00-\uDFFF]/.test(text.charAt(before)) && /[\uD800-\uDBFF]/.test(text.charAt(before - 1))) before--;
  return before;
}

/** Insert visual gaps only in the rendered DOM. Schema text and rich formatting stay intact. */
export function ensureLongTextPageSpacers(
  element: HTMLElement,
  pageElement: HTMLElement,
  widget: IWidget,
  pageHeight: number,
  topInset: number,
  bottomInset: number,
  intrinsicHeight: number,
): number {
  const content = element.querySelector<HTMLElement>('[data-lego-text-content="true"]');
  if (!content) return 0;
  const existing = Array.from(content.querySelectorAll<HTMLElement>(SPACER_SELECTOR));
  if (existing.length > 0 && Math.abs(element.offsetHeight - widget.css.height) <= 1) return existing.length;
  existing.forEach((spacer) => spacer.remove());
  content.normalize();
  const freshHeight = Math.max(content.offsetHeight, content.scrollHeight) || intrinsicHeight;
  if (freshHeight <= pageHeight - topInset - bottomInset) return 0;

  const pageRect = pageElement.getBoundingClientRect();
  const renderedWidth = parseFloat(pageElement.style.width) || pageElement.offsetWidth || 820;
  const scale = pageRect.width / renderedWidth;
  let boundary = (Math.floor(widget.css.top / pageHeight) + 1) * pageHeight;
  let previousOffset = -1;
  let inserted = 0;
  const maxBreaks = 79;

  while (inserted < maxBreaks) {
    const cutoff = pageRect.top + (boundary - bottomInset) * scale;
    const offset = firstCharacterAfter(content, cutoff);
    if (offset === null || offset <= previousOffset) break;
    const point = pointAt(textNodes(content), offset);
    if (!point) break;

    const marker = document.createElement('span');
    marker.dataset.legoPageSpacer = 'true';
    marker.style.display = 'block';
    marker.style.width = '100%';
    marker.style.height = '0px';
    const range = document.createRange();
    range.setStart(point.node, point.offset);
    range.collapse(true);
    range.insertNode(marker);

    const targetTop = pageRect.top + (boundary + topInset) * scale;
    const gap = Math.max(0, Math.ceil((targetTop - marker.getBoundingClientRect().top) / scale));
    marker.style.height = `${gap}px`;
    if (gap < 1) { marker.remove(); break; }
    inserted++;
    previousOffset = offset;
    boundary += pageHeight;
  }
  return inserted;
}
