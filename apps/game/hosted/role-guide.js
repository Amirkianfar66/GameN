// Concise reminders of existing rules only. Sources: v2.1 roles, current
// player-modes-officer/direct-shot/consolidated overlays and V1 owner decisions.
// These public rule descriptions carry no match-specific knowledge or targets.
export const ROLE_GUIDE = Object.freeze({
  Insider: 'When play starts, your private panel shows three players: the Undercover, Alien and Cracker, without telling you which is which. Use that information to help Blue.',
  Cracker: 'You have two Rescues for the match. A Rescue heals an injured target at the end of the round. You can rescue yourself while injured, or rescue a player in Hospital from Room A or B; otherwise the target must share your location. Eliminated players cannot be revived.',
  'Blue Disabler': 'You have one Disabler attack for the match, against another player in your location. It injures a healthy target or eliminates an injured target, unless a defense blocks it. Help Blue.',
  Supplier: 'In Round 3, choose two distinct eligible players in your location. Each successful recipient gains a weapon usable in Round 4 or 5. The grants stay private; the Officer still has only one ordinary shot per match.',
  Officer: 'You have one ordinary shot for the entire match, available from Round 1 during your own turn. The target must share your location and be eligible. Receiving another weapon does not grant another shot. Help Blue.',
  Undercover: 'Grant secret Protection to an eligible player in your location. It activates at the next normal round and blocks the first applicable attack. You can grant to each player only once per match. You may lie during a standard Hack. Help Red.',
  Hacker: 'When play starts, you learn who the Undercover is. Scan once per round: correctly guess an eligible target’s faction to learn whether their number is in the Code; a wrong guess consumes the Scan. Submit your one Code attempt in Round 5 to help Red.',
  'Red Disabler': 'You have one Disabler attack for the match, against another player in your location. It injures a healthy target or eliminates an injured target, unless a defense blocks it. You do not start with an ordinary weapon. Help Red.',
  Alien: 'When play starts, your private panel shows the full Code. You may lie during a standard Hack. If you survive, you share a Blue victory, or win alone if both factions are eliminated at the same resolution checkpoint. A Red victory does not include you.',
});
