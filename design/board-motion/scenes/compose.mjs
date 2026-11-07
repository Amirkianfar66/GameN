// mothership:dev-only
//
// Composes a room scene: the approved groups it keeps, lifted unchanged from the room's
// editable source, around the scene's new deck and props, all printed in the room's colors by
// the recolor map of the room's reviewed export recipe. Node only (it reads the sources).

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { groupInner, groupOuter, recolor, topLevel } from '../../tools/lib/svg-lift.mjs';
import { SCENE_DEFS } from './kit.mjs';

export async function composeScene(scene, root) {
  const recipes = JSON.parse(await readFile(resolve(root, 'design/source/export-recipes.json'), 'utf8'));
  const recipe = recipes.assets.find(asset => asset.id === `board-${scene.room}`);
  if (!recipe) throw new Error(`No export recipe for board-${scene.room}`);
  const sourcePath = `design/source/${scene.source}`;
  const source = await readFile(resolve(root, sourcePath), 'utf8');
  const defs = source.match(/<defs>([\s\S]*?)<\/defs>/)?.[1] ?? '';
  const lift = ids => ids.map(id => groupOuter(source, id)).join('\n  ');
  const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768" width="1024" height="768">
  <defs>${defs}${SCENE_DEFS}${scene.defs ?? ''}</defs>
  ${body}
</svg>
`;
  const back = recolor(svg([
    lift(scene.under),
    `<g id="${scene.room}-scene-floor">${scene.floor()}</g>`,
    lift(scene.over),
    `<g id="${scene.room}-scene-props">${scene.props()}</g>`,
  ].join('\n  ')), recipe.common.recolor);
  // A run of an approved group's elements, from the one starting with first to the one starting with last.
  const run = ({ group, first, last }) => {
    const inner = groupInner(source, group);
    const elements = topLevel(inner).map(([a, b]) => inner.slice(a, b));
    const from = elements.findIndex(element => element.startsWith(first));
    const to = elements.findIndex(element => element.startsWith(last));
    if (from < 0 || to < from) throw new Error(`${scene.room}: a lifted run no longer matches its source`);
    return elements.slice(from, to + 1).join('\n    ');
  };
  const layers = Object.fromEntries(Object.entries(scene.layers ?? {}).map(([id, layer]) => [id, {
    depth: layer.depth,
    svg: recolor(svg(`<g id="${scene.room}-scene-${id}">${layer.lift ? run(layer.lift) : ''}${layer.draw ? layer.draw() : ''}</g>`), recipe.common.recolor),
  }]));
  return { back, layers, sourcePath, source, recipe: `design/source/export-recipes.json#board-${scene.room}` };
}
