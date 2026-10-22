// mothership:dev-only
//
// SYNTHETIC STUDIES. The scenes for the two disclosure studies, for studies.html and for
// nothing else. No approved fact exists for what they draw (RULE-003 / D09). No shell page,
// and no module a shell page imports, may import this file: check-assets.mjs refuses it.
//
// A study is drawn over the room as a whole and beside no token, because no fact says who.

import { buildScene, healthy, roomPanel } from './cue-stages.js';
import { h } from './kit.js';

const study = (kind, lettering) => ({
  width: 470,
  ground: '',
  build(options, copy) {
    const { root, zone } = roomPanel(options, [healthy(2), healthy(7), healthy(4)], { activeSeat: 0 });
    const overlay = h('div', { class: `study-overlay study-overlay--${kind}` }, h('span', null, copy.syntheticStudies[lettering]));
    zone.append(overlay);
    return { root, marks: [], overlays: [overlay] };
  },
});

export const STUDY_STAGES = {
  'study-resolved-shot': study('impact', 'impactLettering'),
  'study-blocked-outcome': study('shield', 'blockedLettering'),
};

export const buildStudyScene = (studyId, options) => buildScene(STUDY_STAGES, studyId, options);
