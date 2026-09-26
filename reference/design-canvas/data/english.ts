import type { Board, DesignNode } from "./seed";

// Current playtest copy. The original source decisions stay intact for history.
export const nodeEnglish: Record<string, [string, string]> = {
  vision:["Core Experience","Face-to-face discussion, cards and a physical board; the companion handles secrets and rule adjudication."],
  setup:["Players & Factions","Three balance-test setups: 7 = 4 Blue / 2 Red / 1 Alien; 8 = 4 / 3 / 1; 9 = 5 / 3 / 1."],
  round:["Round Structure","Five rounds. Each ordinary turn lasts one minute; request Hack during the turn, then take a separate one-minute private conversation."],
  status:["Health & Jail","Healthy → Injured → Eliminated. Jail is separate; an action valid when registered still resolves after the actor's status changes."],
  locations:["Locations","One voluntary move per round before voting from Room A, Room B or Command; no voluntary movement from Hospital or Jail."],
  captain:["Captain","Elected at the end of Round 1. Only Captain may enter Command; leaving it does not remove the title."],
  vote:["Jail Vote","Resolve the Jail vote before registered actions and attacks. A successful vote sends the target to Jail."],
  hack:["Standard Hack","Content remains private until the next round; Round 5 Hack content stays private through the end of the match."],
  code:["Ship Code","Four unordered player numbers. Alien is included, Undercover excluded. Hacker has one submission attempt any time in Round 5."],
  shot:["Ordinary Shot","Directly target a player in the same location, with no faction guess. Ordinary weapons work in Rounds 4–5; Officer can fire from Round 1."],
  protection:["Protection","Undercover may protect self. A player can receive Protection only once per match; it blocks the first valid applicable attack."],
  powers:["Original Powers","Optional set of six powers. The base game plays without them."],
  victory:["Victory","Check Blue, Red and Alien victory. If Round 5 ends without a winner, run the final showdown; otherwise a draw may result."],
  legacy_rules:["Archived Rules","Removed rules include Round 6, ordered Code, ordinary private chat, the former health model and third-player faction identification for shots."],
  insider:["Insider","Blue · Knows the unordered numbers of Undercover, Alien and Cracker, without knowing which is which."],
  cracker:["Cracker","Blue · Two rescues per match; Hospital access and an exception for rescuing self while Injured."],
  blue_disabler:["Blue Disabler","Blue · One hidden damage action per match."],
  supplier:["Supplier","Blue · In Round 3, grants ordinary weapons to two distinct recipients."],
  undercover:["Undercover","Red · May lie in Hack; can grant Protection to self or another eligible player and has an ordinary weapon."],
  hacker:["Hacker","Red · One Scan per round; one Code submission attempt any time in Round 5."],
  red_disabler:["Red Disabler","Red · One hidden damage action; no ordinary weapon."],
  alien:["Alien","Independent · Knows the full Code from the start; direct shooting applies if armed."],
  officer:["Officer","Blue, 9 players only · Starts with one shot, usable from Round 1; direct targeting is now the rule for all shooters."],
  q1:["Movement Timing","Resolved: move once at any time during the round before voting, from Room A, Room B or Command."],
  q2:["Movement Limit","Resolved: one voluntary move per player per round. Captain must wait until a later round to return to Command after leaving."],
  q3:["Turn Timer","Resolved: one minute for the ordinary turn and Hack request, followed by a separate one-minute private conversation."],
  q4:["End-of-Round Order","Resolved: Jail vote → registered actions and attacks → rescue → Round 3 Supplier weapons → elimination/reveal → victory → Captain flag."],
  q5:["Action After Status Change","Resolved: an action valid when registered still resolves even if its actor later becomes Injured, Jailed or Eliminated."],
  q6:["Protection Limit","Resolved: Undercover may protect self; each player can receive Protection once in the whole match."],
  q7:["Code Submission Timing","Resolved: Hacker has one Code attempt at any time during Round 5."],
  q8:["No-Winner Outcome","Resolved: run the chosen final showdown after Round 5; if no victory follows the special shots, the match is a draw."],
  q9:["No Captain Candidate","Deferred for this playtest. There is no adopted fallback; record the case if it occurs."],
  q10:["Round 5 Hack Disclosure","Resolved: Hack content from Round 5 stays confidential until the match ends."],
  q11:["Return from Hospital / Jail","After healing or release, where does the player go, and does the transfer use the voluntary move? Playtest defaults are on the game sheet."],
  q12:["Captain Route to Command","Can Captain enter Command directly from both Room A and Room B? The playtest uses this as a provisional default."],
  room_a:["Room A","One voluntary move per round before voting; direct movement to Room B."],
  room_b:["Room B","One voluntary move per round before voting; direct movement to Room A."],
  hospital:["Hospital","Injured players move here; no voluntary movement from this location."],
  jail_zone:["Jail","Jailed players may speak and vote, but cannot use Main Actions, shoot or move voluntarily."],
  command_room:["Command Room","Captain alone may enter. Captain keeps the title after leaving and may return with a later eligible move."],
  location_rule:["Same-Location Rule","Direct actions targeting another player normally require both players to share a location."],
  power_pack:["Original Power Pack","Optional. Each player receives a power card when enabled; duplicate powers are permitted."],
  power_heavy_shot:["Heavy Shot","Turns the first valid ordinary shot into two damage. The old incorrect-guess branch no longer applies."],
  power_reinforced_systems:["Reinforced Systems","Once, prevents elimination from damage; the player remains Injured."],
  power_final_collision:["Final Collision","From the turn after becoming Injured, eliminate self and one target in the same location."],
  power_silencer:["Silencer","After the first valid shot, the attacker cannot speak or vote next round. The old incorrect-guess branch is obsolete."],
  power_private_link:["Private Link","After receiving the first Hack, gain a 30-second private link in the next round."],
  power_emergency_override:["Emergency Override","Allows one otherwise valid role Main Action while Injured."],
  public_talk:["Public Talk","Within the ordinary one-minute turn, divide time between public speaking and eligible action or shot."],
  standard_hack_action:["Standard Hack","Request within the ordinary turn; the separate private conversation lasts one minute afterwards."],
  move_action:["Movement","Each eligible player may move once per round before voting begins."],
  jail_vote_action:["Jail Vote","First step of end-of-round resolution; a successful vote jails the target without damage."],
  ordinary_shot_action:["Weapon Shot","Choose a same-location target directly. No faction guess or third player is required; ordinary shots in Rounds 4–5, Officer from Round 1."],
  role_main_action:["Role Main Action","Each role has its own action. A validly registered action resolves even if its actor later changes status."],
  round_1:["Round 1","Elect the first Captain at the end of the round. In the 9-player setup, Officer may use the one starting shot now."],
  round_2:["Round 2","Randomize the turn order at the start of the round."],
  round_3:["Round 3","Supplier selects two distinct recipients for ordinary weapons."],
  round_4:["Round 4","Ordinary weapons can be fired from this round."],
  round_5:["Round 5 · Final","Hacker has one Code submission attempt at any time. If no winner follows normal resolution, run the final showdown."],
  turn_sequence:["Turn Sequence","One minute for talk and eligible action or shot; request Hack within that minute, then hold its separate private minute."],
  timing_open:["Timing · Resolved","The turn, Hack, movement, Code window and end-of-round resolution timing have been decided."],
  movement_decision:["Movement Decision","Once per round before voting; Command access belongs to Captain, while Hospital and Jail have no voluntary exit."],
  final_location:["Final Zone","If Round 5 has no winner, all non-eliminated players gather here for the chosen special-shot showdown."],
  showdown_option_1:["Final Showdown · Current","Every non-eliminated player registers one special one-damage shot, including Injured and Jailed players. Resolve in Round 5 turn order; Protection applies."],
  showdown_option_2:["Final Showdown · Alternative","Archived alternative: only ordinary eligible armed players shoot after gathering in one location."],
  turn_timer:["Turn & Hack Timers","Ordinary turn: one minute for talk and actions. Request Hack during that minute; the private conversation takes another minute."],
  end_round_resolution:["End-of-Round Resolution","Jail vote → actions and attacks → rescue → Supplier weapons in Round 3 → elimination/reveal → victory → Captain election flag."],
  terminal_result:["Final Showdown Result","Register targets secretly, resolve shots in Round 5 turn order and check victory again. If nobody wins, draw."],
  player_modes:["7 / 8 / 9 Player Setups","All three setups include Alien and need balance testing. The same direct-shot rule applies; Officer appears only with nine players."],
  officer_shot:["Officer Shot","Nine-player game only: one shot total, usable from Round 1. Direct targeting is the general rule for everyone."],
  archived_identification_rule:["Previous Shot Rule · Archive","Removed for simplicity: identify a third player's faction before shooting someone else. Kept for comparison."],
  direct_shot_rule:["Direct Shot · Current Rule","An armed shooter directly picks a target in the same location; third-player identification and the three-person condition are removed."],
  physical_board_layout:["Physical Board · Prototype","A3 layout with Room A/B, Command, Hospital, Jail and Final Zone. Confirmed and proposed routes are distinguished."]
};

export const edgeEnglish:Record<string,string>={
 "کنار گذاشته‌شده":"Deferred","پاسخ داده شد":"Resolved","حرکت":"Move","سلامت مستقل از زندان":"Health separate from Jail",
 "درخواست آزادی":"Release request","در بستهٔ اختیاری":"Optional pack","پس از صحبت":"After talk","فرصت مستقل":"Separate opportunity",
 "محدودیت زندان":"Jail restriction","محدودیت مکان":"Location restriction","تعیین شد":"Resolved","جایگزین شده":"Superseded",
 "حرکت آزادانه ندارد":"No voluntary move","پاسخ":"Answer","اگر برنده‌ای نبود":"If no winner","گزینهٔ جایگزین":"Alternative",
 "تصمیم فعلی":"Current decision","جایگزین":"Alternative","بازبینی برد":"Victory check","زمان نوبت":"Turn timing",
 "درخواست و گفت‌وگو":"Request and conversation","ابتدا":"First","پس از رأی":"After vote","بررسی برد":"Victory check",
 "حل شلیک‌ها":"Resolve shots","بررسی دوباره":"Check again","محرمانگی راند ۵":"Round 5 confidentiality",
 "ترکیب‌های آزمون":"Playtest setups","فقط ۹ نفر":"Nine players only","توانایی":"Ability","از شروع بازی":"From start",
 "استثنای زمان و سلاح":"Timing and weapon exception","هم‌مکانی":"Same location","قانون فعلی":"Current rule",
 "هدف‌گیری یکسان":"Same targeting","بدون تشخیص نفر سوم":"No third-player guess","هر سه ترکیب":"All three setups",
 "جایگزین شد":"Replaced","آرشیو":"Archive","مهره‌ها":"Tokens","جایگاه Captain":"Captain position",
 "وضعیت عمومی":"Public status","انتقال مشروط":"Conditional transfer","نیازمند تصمیم":"Open decision"
};

export function translateSeedBoard(board:Board):Board {
 return {...board,nodes:board.nodes.map(n=>nodeEnglish[n.id]?{...n,data:{...n.data,title:nodeEnglish[n.id][0],summary:nodeEnglish[n.id][1]}}:n),
  edges:board.edges.map(e=>({...e,label:e.label?edgeEnglish[e.label]??e.label:undefined}))};
}

export function translateSavedBoard(board:Board, original:Board, translated:Board):Board {
 const oldNodes=new Map(original.nodes.map(n=>[n.id,n] as const));
 const newNodes=new Map(translated.nodes.map(n=>[n.id,n] as const));
 const oldEdges=new Map(original.edges.map(e=>[e.id,e] as const));
 const newEdges=new Map(translated.edges.map(e=>[e.id,e] as const));
 return {...board,seedVersion:9,nodes:board.nodes.map(n=>{
  const old=oldNodes.get(n.id),current=newNodes.get(n.id);
  if(!old||!current)return n;
  const data={...n.data};
  if(data.title===old.data.title)data.title=current.data.title;
  if(data.summary===old.data.summary)data.summary=current.data.summary;
  return {...n,data};
 }),edges:board.edges.map(e=>{
  const old=oldEdges.get(e.id),current=newEdges.get(e.id);
  return old&&current&&e.label===old.label?{...e,label:current.label}:e;
 })};
}
