import type { RegionSplit } from './node.js';

// How a host that draws by replacing markup gets from one drawing to the next while
// touching as little as it can. Pure, so the order of work is tested without a browser.

export interface RedrawStep {
  readonly id: string;
  readonly html: string;
  /** slot: fill the placeholder a region drawn just before left for it. region: replace the region that is there. */
  readonly into: 'slot' | 'region';
}

export interface RedrawPlan {
  /** New markup for everything inside the shell root, or null when what is there can stay. */
  readonly frame: string | null;
  /** To be carried out in order: a region is always drawn before the regions inside it. */
  readonly steps: readonly RedrawStep[];
}

// A slot exactly as splitRegions serializes one. Text and attribute values are escaped, so
// this shape cannot occur anywhere else in the markup.
const SLOT = /<[a-z0-9]+ data-region-slot="([a-z][a-z0-9-]*)"><\/[a-z0-9]+>/g;

function slotsIn(html: string): string[] {
  return [...html.matchAll(SLOT)].map(match => match[1]).filter((id): id is string => id !== undefined);
}

/**
 * Plans the smallest redraw from the previous drawing to the next one. A region is redrawn
 * if its own markup changed or if the region around it was redrawn, which leaves a slot
 * where it goes. Anything else is left exactly as it is, focus and reading position included.
 */
export function planRedraw(previous: RegionSplit | null, next: RegionSplit): RedrawPlan {
  const steps: RedrawStep[] = [];
  const awaited = new Set<string>();
  const rebuild = previous === null || previous.frameHtml !== next.frameHtml;
  if (rebuild) for (const id of slotsIn(next.frameHtml)) awaited.add(id);
  for (const [id, html] of next.regions) {
    const into = awaited.has(id) ? 'slot' : previous?.regions.get(id) === html ? null : 'region';
    if (into === null) continue;
    steps.push({ id, html, into });
    for (const inner of slotsIn(html)) awaited.add(inner);
  }
  return { frame: rebuild ? next.frameHtml : null, steps };
}
