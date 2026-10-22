// mothership:dev-only
//
// The five rooms of the comic-board exploration: where each drawing is, its caption, and the
// color families the page can print it in.
//
// Every drawing is a source under design/source/, made in the neutral steel palette (design
// tokens 0.4.0, where the families below are now color.room). A family swaps
// the five steel values for five values of one hue; ink, the dark of space and the paper
// tones stay as they are, so the planet, the pool of light and the tokens look the same in
// every room. `picture` is the approved set and is color.room in the tokens. `apart` is not a
// token: it is kept here for open decision DSN-D13.

/** The five steel values a drawing is made in, dark to light. */
export const STEEL = ['#222B3A', '#34415A', '#55657E', '#8696AE', '#B9C4D3'];

/**
 * Two sets to compare.
 *   picture  the hues of the owner's reference picture.
 *   apart    hues kept away from blue, red and violet, which are the three team accents.
 */
export const FAMILIES = {
  picture: {
    'Room A': ['#14243F', '#1D3D6B', '#2D609E', '#5C92CC', '#A9CAEB'],
    'Room B': ['#2A1446', '#4B2079', '#7A3CAD', '#AE6CD3', '#DCB6EE'],
    'Command Room': ['#40300A', '#7A5A0C', '#C4950F', '#EFC62F', '#F9E48C'],
    Hospital: ['#0E3A3A', '#155B58', '#1F8A80', '#57BBA8', '#A6DFD0'],
    Jail: ['#45100F', '#7E1B19', '#BE2D26', '#E85C44', '#F6A78F'],
  },
  apart: {
    'Room A': ['#3E1E0D', '#733714', '#B3591F', '#DE8A4A', '#F3C59D'],
    'Room B': ['#262E10', '#47561A', '#71862A', '#A3B954', '#D4E0A2'],
    'Command Room': ['#40300A', '#7A5A0C', '#C4950F', '#EFC62F', '#F9E48C'],
    Hospital: ['#0E3A3A', '#155B58', '#1F8A80', '#57BBA8', '#A6DFD0'],
    Jail: ['#1B1F27', '#2F3541', '#565E6C', '#8B93A1', '#C0C6D0'],
  },
  steel: Object.fromEntries(['Room A', 'Room B', 'Command Room', 'Hospital', 'Jail'].map(name => [name, STEEL])),
};

/**
 * Names are the game's own (LocationSchema). `key` is for element ids and hooks only.
 * `stars` and `lamps` name the parts of a drawing the page may move while nothing happens.
 */
export const ROOMS = [
  { name: 'Room A', key: 'room-a', art: '/source/board/board-room-a.svg', icon: 'crate', size: 'large' },
  { name: 'Room B', key: 'room-b', art: '/source/board/board-room-b.svg', icon: 'flask', size: 'large' },
  { name: 'Command Room', key: 'command', art: '/source/board/board-command-room.svg', icon: 'planet', size: 'small' },
  { name: 'Hospital', key: 'hospital', art: '/source/board/board-hospital.svg', icon: 'cross', size: 'small' },
  { name: 'Jail', key: 'jail', art: '/source/board/board-jail.svg', icon: 'lock', size: 'small' },
];

/**
 * The nine crew characters a player may choose from: public playing pieces, nothing to do
 * with a role. `sign` is a PROPOSED call sign, used only to tell the nine apart while choosing.
 */
export const CREW = [
  { id: 1, sign: 'Vega' }, { id: 2, sign: 'Rigel' }, { id: 3, sign: 'Lyra' },
  { id: 4, sign: 'Atlas' }, { id: 5, sign: 'Orion' }, { id: 6, sign: 'Nova' },
  { id: 7, sign: 'Juno' }, { id: 8, sign: 'Mira' }, { id: 9, sign: 'Echo' },
].map(each => ({ ...each, art: `/source/crew/crew-${each.id}.svg` }));

/**
 * The nine roles of the nine-player mode (RoleSchema), the team each belongs to (a fact of the
 * role, from the rule sources), and the device that shows it. PRIVATE: a device is drawn only
 * on the player's own screen, inside the private card, on that player's own character.
 */
export const ROLES = [
  { role: 'Officer', key: 'officer', team: 'Blue' },
  { role: 'Insider', key: 'insider', team: 'Blue' },
  { role: 'Cracker', key: 'cracker', team: 'Blue' },
  { role: 'Blue Disabler', key: 'blue-disabler', team: 'Blue' },
  { role: 'Supplier', key: 'supplier', team: 'Blue' },
  { role: 'Undercover', key: 'undercover', team: 'Red' },
  { role: 'Hacker', key: 'hacker', team: 'Red' },
  { role: 'Red Disabler', key: 'red-disabler', team: 'Red' },
  { role: 'Alien', key: 'alien', team: 'Alien' },
].map(each => ({ ...each, art: `/source/devices/device-${each.key}.svg` }));

/** The same drawing with the steel values swapped for a family. Ids get a prefix so five drawings can share one page. */
export function printIn(svgText, family, prefix) {
  let text = svgText.replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '');
  // Two passes, through placeholders, so that a family value equal to a steel value is not swapped twice.
  STEEL.forEach((steel, index) => { text = text.replaceAll(steel, `@@${index}@@`); });
  family.forEach((color, index) => { text = text.replaceAll(`@@${index}@@`, color); });
  // Pattern and clip ids must be unique in the page.
  return text.replace(/\bid="([\w-]+)"/g, `id="${prefix}$1"`).replace(/url\(#([\w-]+)\)/g, `url(#${prefix}$1)`);
}

const cache = new Map();
export async function drawing(room) {
  if (!cache.has(room.art)) cache.set(room.art, fetch(room.art).then(response => {
    if (!response.ok) throw new Error(`Could not load ${room.art}`);
    return response.text();
  }));
  return cache.get(room.art);
}
