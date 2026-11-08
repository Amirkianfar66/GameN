// mothership:dev-only
//
// The pre-game films' review renders (design/tools/pregame-films-render.mjs draws them; the tests
// check them against their records): each film on each surface, at 60 frames a second.

/** Every render: the film, its stage query, the surface (CSS px and device pixels) and its sheet's moments. */
export const RENDERS = Object.freeze([
  { name: 'brand-phone', film: 'brand', query: 'film=brand', width: 390, height: 844, scale: 2, ms: 2000, sheet: [100, 230, 330, 420, 520, 640, 940, 1050, 1180, 1300, 1600, 1850] },
  { name: 'brand-display', film: 'brand', query: 'film=brand', width: 1920, height: 1080, scale: 1, ms: 2000, sheet: [100, 230, 330, 420, 520, 640, 940, 1050, 1180, 1300, 1600, 1850] },
  { name: 'brand-phone-reduced', film: 'brand', query: 'film=brand&variant=reduced', width: 390, height: 844, scale: 2, ms: 2000 },
  { name: 'doctor-phone', film: 'role', query: 'film=role&role=doctor&character=c3&seat=4', width: 390, height: 844, scale: 2, ms: 10000, sheet: [200, 900, 1350, 2000, 2400, 2900, 3600, 5000, 6700, 7600, 8400, 9500] },
  { name: 'doctor-phone-c7', film: 'role', query: 'film=role&role=doctor&character=c7&seat=2', width: 390, height: 844, scale: 2, ms: 10000, sheet: [200, 900, 1350, 2000, 2400, 2900, 3600, 5000, 6700, 7600, 8400, 9500] },
  { name: 'doctor-phone-reduced', film: 'role', query: 'film=role&role=doctor&character=c3&seat=4&variant=reduced', width: 390, height: 844, scale: 2, ms: 10000 },
  { name: 'boarding-phone-8', film: 'boarding', query: 'film=boarding&roster=8', width: 390, height: 844, scale: 2, ms: 10000, sheet: [300, 1500, 2600, 3400, 4300, 5300, 6300, 6800, 7300, 8000, 8800, 9400] },
  { name: 'boarding-display-9', film: 'boarding', query: 'film=boarding&roster=9', width: 1920, height: 1080, scale: 1, ms: 10000, sheet: [300, 1500, 2600, 3400, 4300, 5300, 6300, 6800, 7300, 8000, 8800, 9400] },
  { name: 'boarding-phone-7-reduced', film: 'boarding', query: 'film=boarding&roster=7&variant=reduced', width: 390, height: 844, scale: 2, ms: 10000 },
]);
