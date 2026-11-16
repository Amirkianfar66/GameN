// mothership:dev-only
//
// Today's boarding film beside the pilot, for the review videos (design/tools/boarding-film-render.mjs). Each is held
// at the moment the renderer gives it: the same moment for both ("as drawn"), or for each the last picture it had
// reached at that moment when it was played in real time ("as played": the renderer measures when each film's
// pictures came and gives each side its own).

import { createPregameScene } from '../../../../../apps/game/hosted/planet/pregame-scene.mjs';
import { createBoardingScene } from '../boarding-film.mjs';

const query = new URLSearchParams(location.search);
const roster = Array.from({ length: 8 }, (_, i) => ({ seat: i + 1, character: `c${i + 1}` }));
const size = { width: 390, height: 844 };
const row = document.createElement('div');
row.className = 'cp-row';
const column = (title, note) => {
  const film = document.createElement('div'), heading = document.createElement('h2'), small = document.createElement('small'), phone = document.createElement('div');
  film.className = 'cp-film'; phone.className = 'pv-phone';
  heading.textContent = title; small.textContent = note; heading.append(small);
  film.append(heading, phone); row.append(film);
  return { phone, small };
};
const left = column('Today · pregame-boarding-1.0.0', query.get('left') ?? ''), right = column('Pilot · pregame-boarding-2.0.0', query.get('right') ?? '');
document.body.append(row);
const today = createPregameScene(left.phone, { kind: 'boarding', options: { roster } });
const pilot = createBoardingScene(right.phone, { options: { roster }, live: false });

async function seek(tToday, tPilot = tToday) {
  today.paint(tToday, { ...size, variant: 'full' });
  pilot.paint(tPilot, { ...size, variant: 'full' });
  await pilot.ready();
  pilot.paint(tPilot, { ...size, variant: 'full' });
  return true;
}
window.__compare = { ready: seek(0), seek };
