// Frontend lifecycle and exact-snapshot dispatch around the reviewed drawing copies.
// Drawing sources remain exact; all inputs here are public identity, pose and match pins.
import { PLANET_GAME_PINS } from '@mothership/contracts';
import { CREW as HISTORICAL_CREW } from './scene-drawing/crew.mjs';
import { dressedFigureSvg as historicalFigure, outfitFor } from './scene-drawing/wardrobe.mjs';
import { CREW } from './crew-drawing/crew.mjs';
import { dressedFigureSvg } from './crew-drawing/wardrobe.mjs';
import { applyCrewFrame, applyCrewPose, CANONICAL_PREFIX, crewArtDefs, crewFrame, crewPoseFrame, poseKey, withPrefix } from './crew-drawing/mount.mjs';
import { crewMotion, hairFollow, isStill } from './crew-drawing/motion.mjs';

export const CREW_ART_VERSION = 'design-0.7.0';
const crewDrawingReleases=new Set([CREW_ART_VERSION,'design-0.8.0']);
const requestsCrewDrawing=versions=>crewDrawingReleases.has(versions?.assetManifestVersion);
const managers = new WeakMap(), definitions = new WeakMap(), motionPreferences = new WeakMap();
let rendererSequence = 0, definitionSequence = 0, externalSequence = 0;
export const crewInstancePrefix = () => `crew-inline-${++externalSequence}`;
export function hasCrewDrawing(versions) {
  return requestsCrewDrawing(versions)
    && Object.entries(PLANET_GAME_PINS).every(([key, value]) => versions[key] === value);
}
export const crewForVersions = versions => hasCrewDrawing(versions) ? CREW : HISTORICAL_CREW;
export function crewPortraitVariable(characterId, versions) {
  if (!/^c[1-9]$/.test(characterId ?? '') || requestsCrewDrawing(versions) && !hasCrewDrawing(versions)) return 'none';
  return `var(${hasCrewDrawing(versions) ? '--ms-asset-crew-portrait-' : '--ms-asset-piece-crew-card-'}${characterId}, none)`;
}
export function setCrewPictureSurface(root, versions) {
  if (hasCrewDrawing(versions)) root.dataset.crewArt = 'crew-drawing-1.0.0';
  else delete root.dataset.crewArt;
}
export function crewFigureSvg(characterId, skeleton, { versions = null, ...options } = {}) {
  const crew = crewForVersions(versions), draw = hasCrewDrawing(versions) ? dressedFigureSvg : historicalFigure;
  if (requestsCrewDrawing(versions) && !hasCrewDrawing(versions)) return null;
  return crew[characterId] ? draw(crew[characterId], skeleton, options) : null;
}
export { outfitFor };

function acquireDefinitions(scope) {
  const document = scope.ownerDocument, tree = scope.getRootNode?.();
  const owner = tree?.host ? tree : document;
  let entry = definitions.get(owner);
  if (!entry) {
    const ref = `crew-shared-${++definitionSequence}`, node = document.createElement('span');
    node.className = 'crew-shared-art'; node.setAttribute('aria-hidden', 'true');
    node.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    node.innerHTML = crewArtDefs({ ref });
    (owner === document ? document.body : owner).prepend(node);
    entry = { ref, node, owners: 0 }; definitions.set(owner, entry);
  }
  entry.owners++;
  return { art: { ref: entry.ref }, release() {
    if (--entry.owners === 0) { entry.node.remove(); definitions.delete(owner); }
  } };
}

function createMounts(scope) {
  const document = scope.ownerDocument, win = document.defaultView, media = win.matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = `crew-renderer-${++rendererSequence}`, states = new Map(), templates = new Map();
  const stats = { mounts: 0, poseUpdates: 0, headUpdates: 0, templatesBuilt: 0 };
  let mountSequence = 0, raf = null, disposed = false, active = true, focused = true, shared = null, appReduced = motionPreferences.get(scope) === true;
  const now = () => win.performance.now();
  const reduced = () => appReduced || media.matches;
  const stop = () => { if (raf !== null) win.cancelAnimationFrame(raf); raf = null; };
  const visible = () => active && focused && document.visibilityState !== 'hidden' && !scope.closest?.('[hidden]');
  const ensureShared = () => (shared ??= acquireDefinitions(scope));
  function motionFor(state, time) {
    const calm = reduced(), motion = crewMotion(time, state.characterId, { reduced: calm, still: state.still, seat: state.seat });
    if (calm || state.still) { state.follow.reset(); state.lastTime = time; return motion; }
    const point = state.point ?? state.skeleton.head;
    const dt = state.lastTime === null ? 0 : Math.min(50, Math.max(0, time - state.lastTime));
    state.lastTime = time;
    const follow = state.follow.step(dt, (state.mirror ? -1 : 1) * (point[0] + motion.drift.dx), point[1] + motion.drift.dy);
    return crewMotion(time, state.characterId, { follow, seat: state.seat });
  }
  function head(state, time, neutral = false) {
    if (!state.node.firstElementChild) return;
    const motion = neutral ? crewMotion(time, state.characterId, { reduced: true, still: true, seat: state.seat }) : motionFor(state, time);
    applyCrewFrame(state.node.firstElementChild, crewFrame(CREW[state.characterId], state.skeleton, motion));
    stats.headUpdates++;
  }
  function tick(time) {
    raf = null;
    if (disposed || !visible()) return;
    if (scope.isConnected === false) { clear(); return; }
    for (const [node, state] of states) {
      if (!scope.contains(node)) { states.delete(node); continue; }
      if (!node.closest?.('[hidden]') && node.style.visibility !== 'hidden') head(state, time);
    }
    if (states.size) raf = win.requestAnimationFrame(tick);
    else { templates.clear(); shared?.release(); shared = null; }
  }
  function start() { if (!disposed && visible() && states.size && raf === null) raf = win.requestAnimationFrame(tick); }
  function reset() { for (const state of states.values()) { state.follow.reset(); state.lastTime = null; } }
  function mount(state, motion, cache = state.cacheTemplate) {
    state.prefix = `${renderer}-mount-${++mountSequence}-${state.layer}`;
    const options = { outfit: state.outfit, layer: state.layer, art: state.art, live: true };
    let markup;
    if(cache){
      const key = `${state.variant}|${poseKey(CREW[state.characterId], state.skeleton, options)}`;
      let template = templates.get(key);
      if (!template) {
        template = dressedFigureSvg(CREW[state.characterId], state.skeleton, { ...options, prefix: CANONICAL_PREFIX });
        templates.set(key, template); stats.templatesBuilt++;
        if (templates.size > 64) templates.delete(templates.keys().next().value);
      }
      markup = withPrefix(template, state.prefix);
    }else markup = dressedFigureSvg(CREW[state.characterId], state.skeleton, { ...options, prefix: state.prefix });
    if (state.transformMarkup) markup = state.transformMarkup(markup, state.prefix);
    state.node.innerHTML = markup;
    state.node.dataset.crewInstance = state.prefix;
    applyCrewFrame(state.node.firstElementChild, crewFrame(CREW[state.characterId], state.skeleton, motion));
    stats.mounts++;
  }
  function paint(node, characterId, skeleton, { outfit = 'crew', layer = 'body', gesture = '', still = false, seat = 0, point = null, mirror = false, variant = '', transformMarkup = null, transformAttribute = null, inlineArt = false, cacheTemplate = false } = {}) {
    if (disposed || !CREW[characterId]) return false;
    const identity = `${characterId}|${outfit}|${layer}|${variant}`, skeletonKey = JSON.stringify(skeleton);
    let state = states.get(node);
    if (!state || state.identity !== identity || !node.firstElementChild) {
      state = { node, identity, characterId, outfit, layer, skeleton, skeletonKey, variant, transformMarkup, transformAttribute, cacheTemplate,
        art: inlineArt ? null : ensureShared().art, follow: hairFollow(characterId), lastTime: null, seat, point, mirror, still: still || isStill(gesture) };
      states.set(node, state); mount(state, motionFor(state, now()));
    } else {
      state.skeleton = skeleton; state.seat = seat; state.point = point; state.mirror = mirror; state.still = still || isStill(gesture);
      const motion = motionFor(state, now());
      if (state.skeletonKey !== skeletonKey) {
        let pose = crewPoseFrame(CREW[characterId], skeleton, { outfit, layer, prefix: state.prefix, art: state.art, motion });
        if (state.transformAttribute) pose = { ...pose, elements: pose.elements.map(([tag, attrs]) => [tag, attrs.map(([name, value]) => [name, state.transformAttribute(value)])]) };
        if (applyCrewPose(node.firstElementChild, pose) < 0) mount(state, motion, false);
        else stats.poseUpdates++;
      } else head(state, now());
      state.skeletonKey = skeletonKey;
    }
    start(); return true;
  }
  function clear() {
    stop();
    for (const node of states.keys()) {
      node.replaceChildren(); delete node.dataset.crewInstance; delete node.dataset.figure; delete node._figureKey;
    }
    states.clear(); templates.clear(); shared?.release(); shared = null;
  }
  const visibility = () => { stop(); reset(); if (visible()) start(); };
  const blur = () => { focused = false; visibility(); };
  const focus = () => { focused = true; visibility(); };
  const preference = () => { stop(); reset(); for (const state of states.values()) head(state, now(), true); start(); };
  document.addEventListener('visibilitychange', visibility); win.addEventListener('blur', blur); win.addEventListener('focus', focus); media.addEventListener('change', preference);
  return { paint, setReduced(value) { const before = reduced(); appReduced = value; if (before !== reduced()) preference(); }, drop(node) { states.delete(node); if(node?.dataset?.crewInstance){node.replaceChildren();delete node.dataset.crewInstance;} }, setActive(value) { for(const node of states.keys())if(!scope.contains(node))states.delete(node); active = value; if (!states.size){templates.clear();shared?.release();shared=null;} if (!value) { stop(); reset(); } else start(); },
    stats: () => ({ ...stats, instances: states.size, templates: templates.size, running: raf !== null }),
    dispose() { if (disposed) return; disposed = true; clear(); document.removeEventListener('visibilitychange', visibility); win.removeEventListener('blur', blur); win.removeEventListener('focus', focus); media.removeEventListener('change', preference); }
  };
}

/** False leaves the historical caller's exact drawing path in control. */
export function paintCrewFigure(scope, node, versions, characterId, skeleton, options = {}) {
  if (!hasCrewDrawing(versions)) { disposeCrewMounts(scope); if (requestsCrewDrawing(versions)) { node.replaceChildren(); return true; } return false; }
  let manager = managers.get(scope);
  if (!manager) { manager = createMounts(scope); managers.set(scope, manager); }
  return manager.paint(node, characterId, skeleton, options);
}
export function setCrewMountActivity(scope, active) { managers.get(scope)?.setActive(active); }
/** Each consumer supplies its app preference; the manager also always honors the device. */
export function setCrewMountMotion(scope, reduced) { motionPreferences.set(scope, Boolean(reduced)); managers.get(scope)?.setReduced(Boolean(reduced)); }
export function crewMountStats(scope) { return managers.get(scope)?.stats() ?? { instances: 0, templates: 0, running: false }; }
export function disposeCrewMounts(scope) { managers.get(scope)?.dispose(); managers.delete(scope); motionPreferences.delete(scope); }

export function releaseCrewFigure(scope, node) { managers.get(scope)?.drop(node); }
