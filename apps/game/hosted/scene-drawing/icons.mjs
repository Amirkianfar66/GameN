// Original neutral vector linework. Labels remain in semantic DOM.
const paths = {
  board: 'M3 3H10V10H3Z M14 3H21V10H14Z M3 14H10V21H3Z M14 14H21V21H14Z',
  actions: 'M14 2L5 14H11L9 22L20 10H13Z',
  pass: 'M4 5L12 12L4 19Z M13 5L21 12L13 19Z',
  card: 'M7 3L20 5L17 22L4 20Z M11 9a2 2 0 1 0 0.1 0Z',
  menu: 'M4 12H4.1 M12 12H12.1 M20 12H20.1',
  clock: 'M10 2H14 M12 2V5 M18 5L20 7 M12 8V13L15 11 M12 5a8 8 0 1 0 .1 0Z',
  captain: 'M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8Z',
  tie: 'M3 7H21 M3 17H21 M7 3L3 7L7 11 M17 13L21 17L17 21',
  none: 'M5 5L19 19 M19 5L5 19',
  jail: 'M4 3H20V21H4Z M8 3V21 M12 3V21 M16 3V21',
  release: 'M4 13L9 18L20 5 M3 3H11 M3 3V21H11',
  denied: 'M5 5L19 19 M19 5L5 19 M12 2a10 10 0 1 0 .1 0Z',
  claim: 'M4 3H20V17H12L7 22V17H4Z M8 8H16 M8 12H13',
};
export function iconSvg(name) {
  if (!paths[name]) throw new Error('Unknown kit icon');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]}" fill="none" stroke="currentColor" stroke-width="${name === 'menu' ? 4 : 1.9}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
export const ICON_NAMES = Object.keys(paths);
