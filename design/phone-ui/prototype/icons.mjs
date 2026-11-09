// mothership:dev-only
//
// The phone interface's icon family (phone UI pack, 9 November 2026). One drawing language for every
// icon: a 24 × 24 grid, 1.8 px round-capped strokes in the current colour, 2 px of clear margin, and
// an optional filled form for a selected state (the parts marked `fill` are filled, as iOS fills a
// selected tab's symbol). Every icon has an accessible name; an icon never carries meaning alone:
// the interface always puts its words beside it or in its accessible name.
//
// The icons are original drawings for Game N. They draw no role, team or faction, and no hidden fact.

/** A part: a path (`d`), a circle (`c: [x, y, r]`), `fill` to fill it in the filled form, `dot` to always fill it. */
const p = (d, extra = {}) => Object.freeze({ d, ...extra });
const dot = (x, y, r = 1.25) => Object.freeze({ c: [x, y, r], dot: true });
const ring = (x, y, r, extra = {}) => Object.freeze({ c: [x, y, r], ...extra });

export const ICON_FAMILY_VERSION = 'phone-ui-icons-1.0.0';

/** name → { label: the accessible name, group, parts } */
export const ICONS = Object.freeze({
  // Navigation
  board: { label: 'Board', group: 'navigation', parts: [p('M4.5 6a1.5 1.5 0 0 1 1.5-1.5h12A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18z', { fill: true }), p('M12 4.5v15', { knock: true }), p('M4.5 11h7.5', { knock: true }), p('M12 14h7.5', { knock: true })] },
  room: { label: 'Room', group: 'navigation', parts: [p('M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z'), ring(12, 10.2, 2.4, { fill: true }), p('M7.6 19.5c.6-2.7 2.2-4.2 4.4-4.2s3.8 1.5 4.4 4.2', { fill: true })] },
  actions: { label: 'Actions', group: 'navigation', parts: [p('M13.4 2.8 5.6 13.2h5.6l-1 8 7.8-10.4h-5.6z', { fill: true })] },
  pass: { label: 'Pass', group: 'navigation', parts: [p('M6 6.2v11.6l8.6-5.8z', { fill: true }), p('M18 6.2v11.6')] },
  vote: { label: 'Vote', group: 'navigation', parts: [p('M8 12V4.6a.6.6 0 0 1 .6-.6h6.8a.6.6 0 0 1 .6.6V12'), p('M10.1 8.1 11.6 9.6 14 7.2'), p('M3.8 12h16.4v7.4a1.6 1.6 0 0 1-1.6 1.6H5.4a1.6 1.6 0 0 1-1.6-1.6z', { fill: true }), p('M9 15.6h6', { knock: true })] },
  card: { label: 'Card', group: 'navigation', parts: [p('M6.5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5z', { fill: true }), ring(12, 9.6, 2.3, { knock: true }), p('M8.4 16.6c.6-1.8 2-2.8 3.6-2.8s3 1 3.6 2.8', { knock: true })] },
  more: { label: 'More', group: 'navigation', parts: [dot(5.5, 12, 1.7), dot(12, 12, 1.7), dot(18.5, 12, 1.7)] },

  // Game actions
  shoot: { label: 'Shoot', group: 'action', parts: [ring(12, 12, 6.8), p('M12 2.6v4.2M12 17.2v4.2M2.6 12h4.2M17.2 12h4.2'), dot(12, 12, 1.5)] },
  protect: { label: 'Grant Protection', group: 'action', parts: [p('M12 3 5 5.8v5.6c0 4.3 2.9 7.9 7 9.6 4.1-1.7 7-5.3 7-9.6V5.8z', { fill: true }), p('M9.2 12.2 11.2 14.2 15 10.4', { knock: true })] },
  rescue: { label: 'Rescue', group: 'action', parts: [p('M14.6 3.6 20.4 9.4M17.5 6.5 15.4 8.6'), p('M15.6 8.4 8.8 15.2 8.8 15.2 6.6 13 13.4 6.2z', { fill: true }), p('M11.6 8.6 12.9 9.9M9.9 10.3 11.2 11.6', { knock: true }), p('M7.7 14.1 5.6 16.2M5.6 16.2 3.4 18.4')] },
  supply: { label: 'Supply', group: 'action', parts: [p('M12 3.2 4.2 7v9.8L12 20.8l7.8-4V7z', { fill: true }), p('M4.2 7 12 11l7.8-4M12 11v9.8', { knock: true })] },
  scan: { label: 'Scan', group: 'action', parts: [ring(12, 12, 8.6, { fill: true }), p('M12 7.4a4.6 4.6 0 1 1-4.6 4.6', { knock: true }), p('M12 12 17.6 6.4', { knock: true }), Object.freeze({ c: [12, 12, 1.4], dot: true, knock: true })] },
  code: { label: 'Submit final Code', group: 'action', parts: [p('M5.5 3.5h13a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z', { fill: true }), ...[7.8, 12, 16.2].flatMap(y => [7.8, 12, 16.2].map(x => Object.freeze({ c: [x, y, 1.15], dot: true, knock: true })))] },
  shipHack: { label: 'Hack Spaceship', group: 'action', parts: [p('M12 2.6c3 2.2 4.4 5.3 4.4 9.1v4.2H7.6v-4.2c0-3.8 1.4-6.9 4.4-9.1z', { fill: true }), ring(12, 9.4, 1.7, { knock: true }), p('M7.6 12.6 5 15.2v3.2l2.6-1.2M16.4 12.6 19 15.2v3.2l-2.6-1.2'), p('M10.4 18.4v2.4M13.6 18.4v2.4')] },
  suppress: { label: 'Suppress navigation', group: 'action', parts: [p('M14.8 6.2a4.1 4.1 0 0 0-5.5 5.1l-5.5 5.5a1.9 1.9 0 0 0 2.7 2.7l5.5-5.5a4.1 4.1 0 0 0 5.1-5.5l-2.6 2.6-2.2-.5-.5-2.2z', { fill: true })] },
  blackhole: { label: 'Activate Blackhole', group: 'action', parts: [p('M12 12a1 1 0 0 1 2 0 2.5 2.5 0 0 1-5 0 4 4 0 0 1 8 0 5.5 5.5 0 0 1-11 0 7 7 0 0 1 14 0')] },
  clone: { label: 'Activate Clone', group: 'action', parts: [ring(9, 8, 2.6, { fill: true }), p('M3.6 19.4c.6-3.3 2.6-5.2 5.4-5.2s4.8 1.9 5.4 5.2', { fill: true }), ring(16, 8, 2.6, { dash: true }), p('M15 14.3c2.7.2 4.6 2.1 5.2 5.1', { dash: true })] },
  blackout: { label: 'Request Blackout', group: 'action', parts: [p('M9.2 17.6h5.6M10.2 20.6h3.6'), p('M8.8 14.6C7.2 13.4 6.2 11.6 6.2 9.6a5.8 5.8 0 0 1 11.6 0c0 2-1 3.8-2.6 5'), p('M3.6 3.6 20.4 20.4')] },
  position: { label: 'Choose a position', group: 'action', parts: [p('M4 8.4V4h4.4M15.6 4H20v4.4M20 15.6V20h-4.4M8.4 20H4v-4.4'), ring(12, 12, 3, { fill: true })] },
  release: { label: 'Release', group: 'action', parts: [p('M7.4 11V7.9a4.6 4.6 0 0 1 8.9-1.6'), p('M6.5 11h11a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-6.5A1.5 1.5 0 0 1 6.5 11z', { fill: true }), p('M12 14.4v2.6', { knock: true })] },
  eject: { label: 'Eject', group: 'action', parts: [p('M12 4.4 4.6 13.2h14.8z', { fill: true }), p('M4.6 17.8h14.8', { width: 2.6 })] },
  appoint: { label: 'Appoint Officer', group: 'action', parts: [ring(12, 12, 8.6), p('M12 6.8l1.6 3.3 3.6.5-2.6 2.5.6 3.6L12 15l-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z', { fill: true })] },
  block: { label: 'Block movement', group: 'action', parts: [ring(12, 12, 8.4), p('M6.1 6.1 17.9 17.9')] },
  direction: { label: 'Choose tie direction', group: 'action', parts: [p('M12 20.6v-6.4M12 14.2 6.6 8.8M12 14.2l5.4-5.4'), p('M6.2 12.8V8.4h4.4M13.4 8.4h4.4v4.4')] },
  acknowledge: { label: 'Acknowledge direction', group: 'action', parts: [ring(12, 12, 8.6), p('M15.6 8.4 13.6 13.6 8.4 15.6 10.4 10.4z', { fill: true })] },
  talk: { label: 'Private talk', group: 'action', parts: [p('M4 5.6A1.6 1.6 0 0 1 5.6 4h8.8A1.6 1.6 0 0 1 16 5.6v5.8a1.6 1.6 0 0 1-1.6 1.6H9.2L5.8 16v-3H5.6A1.6 1.6 0 0 1 4 11.4z', { fill: true }), p('M18.4 8.2h.1a1.5 1.5 0 0 1 1.5 1.5v5.9a1.5 1.5 0 0 1-1.5 1.5h-.3v3l-3.4-3h-3.6a1.5 1.5 0 0 1-1.5-1.5v-.6')] },
  declare: { label: 'Declare side', group: 'action', parts: [p('M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4.4 4v-4H6a2 2 0 0 1-2-2z', { fill: true }), p('M12 7.4v3.6', { knock: true }), Object.freeze({ c: [12, 13.4, 1.1], dot: true, knock: true })] },
  panel: { label: 'Hospital panel', group: 'action', parts: [p('M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 14V6A1.5 1.5 0 0 1 5 4.5z', { fill: true }), p('M9 20h6M12 15.5V20'), p('M12 7.4v5.2M9.4 10h5.2', { knock: true })] },
  promise: { label: 'Promises', group: 'action', parts: [ring(12, 9.4, 5.4, { fill: true }), p('M9.2 14.2 7.6 21l4.4-2.1 4.4 2.1-1.6-6.8'), p('M9.8 9.4 11.4 11 14.3 8.1', { knock: true })] },
  window: { label: 'Windows', group: 'action', parts: [p('M5.5 3.8h13a1 1 0 0 1 1 1v14.4h-15V4.8a1 1 0 0 1 1-1z', { fill: true }), p('M12 3.8v15.4M4.5 11.5h15', { knock: true }), p('M3 19.6h18')] },
  draw: { label: 'Draw', group: 'action', parts: [p('M15.4 4.4l4.2 4.2L9 19.2l-5 .8.8-5z', { fill: true }), p('M13.2 6.6l4.2 4.2', { knock: true })] },
  show: { label: 'Show', group: 'action', parts: [p('M2.6 12s3.4-6.4 9.4-6.4S21.4 12 21.4 12s-3.4 6.4-9.4 6.4S2.6 12 2.6 12z'), ring(12, 12, 2.9, { fill: true })] },
  hide: { label: 'Hide', group: 'utility', parts: [p('M2.6 12s3.4-6.4 9.4-6.4c1.6 0 3 .5 4.3 1.1M21.4 12s-1.3 2.5-3.9 4.4M12 18.4c-6 0-9.4-6.4-9.4-6.4s.9-1.7 2.7-3.3'), p('M9.9 14.1a2.9 2.9 0 0 1 4.1-4.1'), p('M3.8 3.8 20.2 20.2')] },
  move: { label: 'Move', group: 'action', parts: [p('M13.4 4h5.4a.8.8 0 0 1 .8.8v14.4a.8.8 0 0 1-.8.8h-5.4'), p('M3.2 12h11M10.2 8l4 4-4 4')] },
  skip: { label: 'Skip', group: 'utility', parts: [p('M5.2 6.2v11.6l8.2-5.8z', { fill: true }), p('M17.8 6.2v11.6')] },

  // Offices, places and public status
  captain: { label: 'Captain', group: 'status', parts: [p('M4.6 18.4h14.8'), p('M5 15.4 4 7.4l4.6 3.4L12 5.2l3.4 5.6L20 7.4l-1 8z', { fill: true })] },
  officer: { label: 'Officer', group: 'status', parts: [p('M12 3.4l2.3 4.8 5.2.7-3.8 3.6.9 5.2L12 15.2l-4.6 2.5.9-5.2-3.8-3.6 5.2-.7z', { fill: true }), p('M8.2 20.6h7.6')] },
  jail: { label: 'Jail', group: 'status', parts: [p('M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z'), p('M8.2 4v16M12 4v16M15.8 4v16')] },
  hospital: { label: 'Hospital', group: 'status', parts: [p('M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', { fill: true }), p('M12 7.6v8.8M7.6 12h8.8', { knock: true, width: 2.4 })] },
  injured: { label: 'Injured', group: 'status', parts: [p('M7.3 16.7 16.7 7.3a2.6 2.6 0 0 1 3.7 3.7l-9.4 9.4a2.6 2.6 0 0 1-3.7-3.7z', { fill: true }), p('M3.6 13.3 13.3 3.6'), dot(12.6, 12.6, 0.9), dot(14.6, 10.6, 0.9), dot(10.6, 14.6, 0.9)] },
  eliminated: { label: 'Eliminated', group: 'status', parts: [ring(12, 8, 3), p('M5.6 20c.7-3.6 3.2-5.6 6.4-5.6s5.7 2 6.4 5.6'), p('M4 4 20 20')] },
  self: { label: 'You', group: 'status', parts: [ring(12, 12, 8.6), ring(12, 12, 3.4, { fill: true })] },
  turn: { label: 'Turn', group: 'status', parts: [p('M12 3.6 19.4 18H4.6z', { fill: true })] },

  // Phases
  timer: { label: 'Time remaining', group: 'phase', parts: [ring(12, 13.4, 7.4), p('M12 13.4V9.6M10 2.6h4M12 2.6V6M18.2 6.6l1.4-1.4')] },
  hourglass: { label: 'Waiting', group: 'phase', parts: [p('M6.8 3.4h10.4M6.8 20.6h10.4'), p('M8 3.4c0 4.4 4 5.4 4 8.6s-4 4.2-4 8.6h8c0-4.4-4-5.4-4-8.6s4-4.2 4-8.6z', { fill: true })] },
  lit: { label: 'Lights on', group: 'phase', parts: [ring(12, 12, 4, { fill: true }), p('M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M5.4 18.6l1.5-1.5M17.1 6.9l1.5-1.5')] },
  dark: { label: 'Dark', group: 'phase', parts: [p('M19.6 14.6A7.8 7.8 0 1 1 9.4 4.4a6.2 6.2 0 0 0 10.2 10.2z', { fill: true })] },
  course: { label: 'Setting course', group: 'phase', parts: [p('M12 20.6v-6.4M12 14.2 6.6 8.8M12 14.2l5.4-5.4'), ring(6.2, 7.6, 2.2, { fill: true }), ring(17.8, 7.6, 2.2, { fill: true })] },
  planet: { label: 'Planet', group: 'phase', parts: [ring(12, 12, 5.6, { fill: true }), p('M3.1 15.2c-.8-1.6 3.3-4.8 9.1-7.2s10.8-2.8 11.6-1.2c.5 1.1-1.3 3-4.6 5')] },
  flag: { label: 'Arrival', group: 'phase', parts: [p('M5.4 21V3.6'), p('M5.4 4.2h11.4l-2.2 4.2 2.2 4.2H5.4', { fill: true })] },

  // Entry, setup and system
  host: { label: 'Host', group: 'entry', parts: [p('M6 3.8h12A2.2 2.2 0 0 1 20.2 6v12a2.2 2.2 0 0 1-2.2 2.2H6A2.2 2.2 0 0 1 3.8 18V6A2.2 2.2 0 0 1 6 3.8z', { fill: true }), p('M12 7.6v8.8M7.6 12h8.8', { knock: true })] },
  join: { label: 'Join', group: 'entry', parts: [ring(10, 8, 3.4, { fill: true }), p('M3.6 20.2c.7-3.6 3.2-5.6 6.4-5.6s5.7 2 6.4 5.6', { fill: true }), p('M19.2 6.6v6M16.2 9.6h6')] },
  key: { label: 'Recover', group: 'entry', parts: [ring(7.6, 12, 3.8, { fill: true }), p('M11.4 12h9.4M17.6 12v3M20.6 12v2.4')] },
  copy: { label: 'Copy', group: 'utility', parts: [p('M10 8.8h8.4a1.6 1.6 0 0 1 1.6 1.6v8.4a1.6 1.6 0 0 1-1.6 1.6H10a1.6 1.6 0 0 1-1.6-1.6v-8.4A1.6 1.6 0 0 1 10 8.8z', { fill: true }), p('M15.2 8.8V5.6A1.6 1.6 0 0 0 13.6 4H5.6A1.6 1.6 0 0 0 4 5.6v8a1.6 1.6 0 0 0 1.6 1.6h2.8')] },
  check: { label: 'Done', group: 'utility', parts: [p('M5 12.6 9.6 17.2 19 7.4', { width: 2.2 })] },
  close: { label: 'Close', group: 'utility', parts: [p('M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6', { width: 2 })] },
  chevronRight: { label: 'Open', group: 'utility', parts: [p('M9.4 5.4 16 12l-6.6 6.6', { width: 2 })] },
  chevronLeft: { label: 'Back', group: 'utility', parts: [p('M14.6 5.4 8 12l6.6 6.6', { width: 2 })] },
  chevronDown: { label: 'Show more', group: 'utility', parts: [p('M5.4 9.4 12 16l6.6-6.6', { width: 2 })] },
  lock: { label: 'Locked', group: 'utility', parts: [p('M8 11V8a4 4 0 0 1 8 0v3'), p('M6.5 11h11a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-6.5A1.5 1.5 0 0 1 6.5 11z', { fill: true })] },
  settings: { label: 'Settings', group: 'utility', parts: [p('M4 7h8.6M17.4 7H20M4 17h2.6M11.4 17H20'), ring(15, 7, 2.4, { fill: true }), ring(9, 17, 2.4, { fill: true })] },
  players: { label: 'Players', group: 'utility', parts: [ring(9, 8.2, 3, { fill: true }), p('M3.4 19.6c.6-3.4 2.8-5.3 5.6-5.3s5 1.9 5.6 5.3', { fill: true }), p('M15.6 5.4a3 3 0 0 1 0 5.6M17.4 14.4c1.8.6 2.9 2.4 3.2 5.2')] },
  rules: { label: 'Rules', group: 'utility', parts: [p('M4 5.6c2.6-1.4 5.4-1.4 8 0v13.8c-2.6-1.4-5.4-1.4-8 0z', { fill: true }), p('M12 5.6c2.6-1.4 5.4-1.4 8 0v13.8c-2.6-1.4-5.4-1.4-8 0z', { fill: true })] },
  retry: { label: 'Try again', group: 'utility', parts: [p('M19.4 12a7.4 7.4 0 1 1-2.2-5.3'), p('M19.6 4.4v4.8h-4.8')] },
  warning: { label: 'Warning', group: 'utility', parts: [p('M10.6 4.4a1.6 1.6 0 0 1 2.8 0l7.6 13.4a1.6 1.6 0 0 1-1.4 2.4H4.4A1.6 1.6 0 0 1 3 17.8z', { fill: true }), p('M12 9.4v4.4', { knock: true }), Object.freeze({ c: [12, 16.8, 1.1], dot: true, knock: true })] },
  info: { label: 'Information', group: 'utility', parts: [ring(12, 12, 8.6, { fill: true }), p('M12 11v5.6', { knock: true }), Object.freeze({ c: [12, 7.8, 1.1], dot: true, knock: true })] },
  offline: { label: 'Offline', group: 'utility', parts: [p('M4.6 10.2a10.6 10.6 0 0 1 14.8 0M7.8 13.4a6 6 0 0 1 8.4 0'), dot(12, 17, 1.4), p('M4 4 20 20')] },
  bot: { label: 'Bot', group: 'utility', parts: [p('M6.4 8.4h11.2a1.6 1.6 0 0 1 1.6 1.6v8a1.6 1.6 0 0 1-1.6 1.6H6.4A1.6 1.6 0 0 1 4.8 18v-8a1.6 1.6 0 0 1 1.6-1.6z', { fill: true }), p('M12 8.4V5'), dot(12, 4.2, 1.2), Object.freeze({ c: [9.4, 13, 1.2], dot: true, knock: true }), Object.freeze({ c: [14.6, 13, 1.2], dot: true, knock: true }), p('M10 16.2h4', { knock: true })] },
  display: { label: 'Shared display', group: 'utility', parts: [p('M4.6 4.8h14.8a1.4 1.4 0 0 1 1.4 1.4v8.6a1.4 1.4 0 0 1-1.4 1.4H4.6a1.4 1.4 0 0 1-1.4-1.4V6.2a1.4 1.4 0 0 1 1.4-1.4z', { fill: true }), p('M8.4 20h7.2M12 16.2V20')] },
  phone: { label: 'Player phone', group: 'utility', parts: [p('M8.2 2.8h7.6a1.6 1.6 0 0 1 1.6 1.6v15.2a1.6 1.6 0 0 1-1.6 1.6H8.2a1.6 1.6 0 0 1-1.6-1.6V4.4a1.6 1.6 0 0 1 1.6-1.6z', { fill: true }), p('M10.8 18h2.4', { knock: true })] },
  motion: { label: 'Reduce motion', group: 'utility', parts: [p('M3 12c1.6-2.6 3.4-2.6 5 0s3.4 2.6 5 0 3.4-2.6 5 0 2.2 2 3 1.4')] },
  textSize: { label: 'Text size', group: 'utility', parts: [p('M3.6 18.4 8.2 5.6l4.6 12.8M5.2 14h6'), p('M14.2 18.4l3.2-8.4 3.2 8.4M15.2 15.8h4.4')] },
  sound: { label: 'Sound', group: 'utility', parts: [p('M4 9.4h3.6L12.4 5.4v13.2L7.6 14.6H4z', { fill: true }), p('M15.8 9.2a4 4 0 0 1 0 5.6M18.4 6.6a7.6 7.6 0 0 1 0 10.8')] },
  leave: { label: 'Leave', group: 'utility', parts: [p('M13.6 4H6a1.6 1.6 0 0 0-1.6 1.6v12.8A1.6 1.6 0 0 0 6 20h7.6'), p('M9.6 12h10.8M16.8 8.4l3.6 3.6-3.6 3.6')] },
  history: { label: 'History', group: 'utility', parts: [p('M4.6 12a7.4 7.4 0 1 0 2.2-5.3'), p('M4.4 4.4v4.8h4.8'), p('M12 8v4.4l3 1.8')] },
  inbox: { label: 'Offers', group: 'utility', parts: [p('M3.6 13.4 6.2 5.6A1.6 1.6 0 0 1 7.7 4.6h8.6a1.6 1.6 0 0 1 1.5 1l2.6 7.8v5a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6z', { fill: true }), p('M3.6 13.4h4.8l1.4 2.4h4.4l1.4-2.4h4.8', { knock: true })] },
  plus: { label: 'Add', group: 'utility', parts: [p('M12 5v14M5 12h14', { width: 2 })] },
  minus: { label: 'Remove', group: 'utility', parts: [p('M5 12h14', { width: 2 })] },
});

/** Every name, in the family's order. */
export const ICON_NAMES = Object.freeze(Object.keys(ICONS));

const num = n => Number(n.toFixed(2));

/**
 * One icon as an SVG string. `filled` gives the selected form. `size` is CSS pixels. The SVG is
 * decorative (`aria-hidden`) unless `title` is given; a control names itself with its own text.
 */
export function iconSvg(name, { filled = false, size = 24, title = null, className = 'ic' } = {}) {
  const icon = ICONS[name];
  if (!icon) throw new Error(`No icon ${JSON.stringify(name)}`);
  const knockColour = 'var(--ic-knock, #10141C)';
  const parts = icon.parts.map(part => {
    const solid = part.dot || (filled && part.fill);
    const knocked = filled && part.knock;
    const stroke = knocked ? knockColour : 'currentColor';
    const width = part.width ?? 1.8;
    const dash = part.dash ? ' stroke-dasharray="2.2 2.2"' : '';
    if (part.c) {
      const [x, y, r] = part.c;
      if (part.dot) return `<circle cx="${num(x)}" cy="${num(y)}" r="${num(r)}" fill="${knocked ? knockColour : 'currentColor'}"/>`;
      return `<circle cx="${num(x)}" cy="${num(y)}" r="${num(r)}" fill="${solid ? 'currentColor' : 'none'}" stroke="${stroke}" stroke-width="${width}"${dash}/>`;
    }
    return `<path d="${part.d}" fill="${solid ? 'currentColor' : 'none'}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${dash}/>`;
  }).join('');
  const label = title ? `role="img" aria-label="${title.replace(/"/g, '&quot;')}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="${className}" ${label} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">${parts}</svg>`;
}

/** The whole family as one SVG sprite (`<symbol id="ic-<name>">`), outline and filled forms. */
export function iconSprite() {
  const symbols = ICON_NAMES.flatMap(name => [false, true].map(filled => {
    const inner = iconSvg(name, { filled }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    return `<symbol id="ic-${name}${filled ? '-filled' : ''}" viewBox="0 0 24 24">${inner}</symbol>`;
  }));
  return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols.join('')}</svg>\n`;
}
