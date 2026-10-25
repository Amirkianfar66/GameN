import { copy } from "./model.mjs";

const roleIds = ["insider", "cracker", "blue-disabler", "supplier", "undercover", "hacker", "red-disabler", "alien", "soldier-blue"];
const fieldValue = (node, id) => node?.content.fields.find((f) => f.id === id)?.value;
export const actionKeyOf = (node) => fieldValue(node, "studio-action-key") || null;
const publicActionKeys = new Set(["ordinary-shot", "movement", "vote", "hack", "showdown", "hospital-panel"]);
export const isPublicAction = (node) => publicActionKeys.has(actionKeyOf(node));
export const isCaptainAction = (node) => ["captain-release", "captain-eject"].includes(actionKeyOf(node));
export const isCaptainPrivilege = (node) => fieldValue(node, "studio-privilege") === "captain";
export const actionTypes = {
  protection: { label: "Protection & rescue", color: "#2f744c" },
  blackout: { label: "Blackout", color: "#202329" },
  attack: { label: "Attack", color: "#a83636" },
  disruption: { label: "Navigation", color: "#aa6128" },
  supply: { label: "Supply", color: "#795035" },
  information: { label: "Information", color: "#306997" },
  table: { label: "Table action", color: "#5c6672" },
};
const actionTypeKeys = {
  rescue: "protection", "hospital-panel": "protection", protection: "protection", clone: "protection", "captain-release": "protection",
  blackout: "blackout", "vote-disruption": "disruption", "navigation-disruption": "disruption", "hack-spaceship": "disruption",
  "ordinary-shot": "attack", showdown: "attack", "captain-eject": "attack",
  supply: "supply",
  scan: "information", "submit-code": "information", hack: "information",
  movement: "table", vote: "table",
};
export const actionAppearance = (node) => fieldValue(node, "studio-aspect") === "action"
  ? actionTypes[actionTypeKeys[actionKeyOf(node)] || "table"] : null;
const aspect = (node) => fieldValue(node, "studio-aspect");
export const actionRoles = (board, nodeId) => board.nodes.filter((n) =>
  n.tab === "roles" && !aspect(n) && board.edges.some((e) =>
    !e.archived && e.source === n.id && e.target === nodeId));
export const isRoleAspectEdge = (board, edge) => {
  const from = board.nodes.find((n) => n.id === edge.source);
  const to = board.nodes.find((n) => n.id === edge.target);
  return from?.tab === "roles" && !aspect(from) && to?.tab === "roles" &&
    (isCaptainPrivilege(to) || fieldValue(to, "studio-parent-role") === from.id || aspect(to) === "action");
};
export const originalActionCards = (board, node) => {
  let ids = [];
  try { ids = JSON.parse(fieldValue(node, "studio-action-origins") || "[]"); } catch { return []; }
  return Array.isArray(ids) ? board.nodes.filter((n) => ids.includes(n.id)) : [];
};
export const isOriginalAction = (board, id) => board.nodes.some((n) =>
  actionKeyOf(n) && originalActionCards(board, n).some((old) => old.id === id));

export function separatePublicActions(input) {
  if (input.publicActionsVersion === 1 || !input.sharedActionsVersion) return input;
  const board = copy(input);
  const publicIds = new Set(board.nodes.filter(isPublicAction).map((n) => n.id));
  const roles = new Set(board.nodes.filter((n) => n.tab === "roles" && !aspect(n)).map((n) => n.id));
  // Retain previous connection labels and notes in exported history.
  for (const edge of board.edges) {
    if ((roles.has(edge.source) && publicIds.has(edge.target)) ||
        (publicIds.has(edge.source) && roles.has(edge.target))) edge.archived = true;
  }
  board.publicActionsVersion = 1;
  delete board.roleLayoutVersion;
  return board;
}

// This is a sourced authoring index, not executable game rules. Connections
// indicate access subject to the card's limits, not unconditional permission.
export const actionDefinitions = [
  {
    key: "navigation-disruption", title: "Navigation Disruption", roles: ["soldier-blue"],
    summary: "Once per match, suppress the opposite room's current players' navigation weight for this round.",
    rules: "One Role Main Action on an eligible own turn in A or B. From A target B; from B target A. Fix the players present when used, regardless of faction. Their navigation weight is suppressed through that round even after moving; later arrivals are not added. Captain, Jail and all other ballots remain unaffected. No starting weapon or one-shot role ability remains. Notification details are open.",
    condition: () => "Once per match · opposite A/B room · navigation weight only",
    implementation: "not-implemented",
    sources: ["planet-navigation-code-owner-decisions-2026-10-25.json"],
  },
  {
    key: "blackout", title: "Blackout", roles: ["blue-disabler", "red-disabler"],
    summary: "One hidden attack mechanic, shared by both Disablers.",
    rules: "Request on a Healthy/free own turn. Admission freezes the actor's room slots. Privately select one slot during the 10-second dark interval; the lifetime use is spent on a valid lock or admitted timeout. Empty, self and body slots are consuming misses. Both legitimate same-slot attacks are retained.",
    condition: () => "Once per match",
    sources: ["blackout-owner-decision-2026-10-14.json"],
  },
  {
    key: "rescue", title: "Rescue", roles: ["cracker"],
    summary: "Heal an Injured player at the Rescue stage. Two uses per match.",
    rules: "Target self or a same-location living player; from A/B, Hospital targets are allowed remotely. Injured, unjailed Cracker may Rescue self only. Jail prevents Rescue. Cannot revive an Eliminated player; accepted no-effect Rescue still spends a use.",
    sources: ["v2.1-decisions.json", "in-person-v1-owner-decisions-2026-10-06.json"],
  },
  {
    key: "ordinary-shot", title: "Ordinary Shot", roles: roleIds,
    summary: "Shoot a legal same-location target with a usable weapon; the legacy R4–5 window needs successor review.",
    rules: "Choose another living same-location target directly. Healthy/free shooter, Command immunity and defenses apply. One damage; no faction-identification requirement. Undercover alone starts armed. Supplier may arm any secret role, including Soldier Blue, under the ordinary weapon rules. Soldier Blue has no special shooting allowance. Public offices grant no weapon or early-shot exception.",
    condition: (id) => id === "undercover" ? "R4–5 · starts armed" : "R4–5 · Supplier weapon required",
    sources: ["direct-shot-decision.json", "in-person-v1-owner-decisions-2026-10-06.json", "officer-public-office-owner-decision-2026-10-25.json", "soldier-blue-vote-disruption-owner-decision-2026-10-25.json"],
  },
  {
    key: "supply", title: "Supply Weapons", roles: ["supplier"],
    summary: "In Round 3, give two players one ordinary weapon each; review the old shooting window for the uncapped match.",
    rules: "One Main Action. Select two distinct same-location living recipients, possibly self, without a role-dependent rejection. Grants resolve at the Supply stage. Supplier and each individual recipient privately know that grant.",
    sources: ["v2.1-decisions.json", "in-person-v1-owner-decisions-2026-10-06.json"],
  },
  {
    key: "protection", title: "Grant Protection", roles: ["undercover"],
    summary: "Give a secret shield to a player, including self, for the next normal round.",
    rules: "One Main Action. Eligible Healthy or Injured same-location recipient; Command immunity applies. Each recipient can receive Protection only once per match. It blocks and consumes on the first applicable valid attack. Its grant, activation and consumption remain Undercover-only. Clone and Protection are separate defenses.",
    sources: ["v2.1-decisions.json", "consolidated-decisions-2026-09-26.json", "in-person-v1-owner-decisions-2026-10-06.json", "clone-owner-decision-2026-10-14.json"],
  },
  {
    key: "scan", title: "Scan", roles: ["hacker"],
    summary: "Discover Code membership. A wrong faction guess disables next-round Scan.",
    rules: "Once per round during discovery, consuming the existing Main Action. Self or same-location living target; Command immunity applies. A correct faction guess privately returns only Code membership. A wrong guess spends this Scan, gives no Code information and disables Scan for the entire next round; it returns the round after that. Correct final Code permanently replaces this button with Hack Spaceship. Earlier information is retained.",
    implementation: "not-implemented",
    sources: ["v2.1-decisions.json", "in-person-v1-owner-decisions-2026-10-06.json", "planet-navigation-code-owner-decisions-2026-10-25.json"],
  },
  {
    key: "submit-code", title: "Submit Code", roles: ["hacker"],
    summary: "One final attempt to unlock Hack Spaceship; submission does not move the ship.",
    rules: "From Round 2 onward before navigation, submit the unordered original player numbers of Undercover, Alien, Insider and Cracker. One final submission in the entire match. Wrong Code consumes the opportunity and does not unlock the hack. Correct Code permanently replaces Scan with Hack Spaceship, without activating it. Existing identity membership survives elimination. New activation cost and eligibility are separate open details.",
    implementation: "not-implemented",
    sources: ["planet-navigation-code-owner-decisions-2026-10-25.json"],
  },
  {
    key: "hack-spaceship", title: "Hack Spaceship", roles: ["hacker"],
    summary: "After correct Code, choose when to force one round's movement toward Red.",
    rules: "Available only after correct final Code replaces Scan. Once in the entire match, activate at a chosen eligible time before navigation, from Round 2 onward. Red direction overrides the automatic weights; apply exactly the normal single Y-route movement. B2 switches to R2; R2 reaches Red Planet. The button stays disabled after use. Unlocking never activates it automatically. Action cost, precise turn/health/location eligibility and same-round use after Scan remain open.",
    condition: () => "Correct Code required · one activation per match",
    implementation: "not-implemented",
    sources: ["planet-navigation-code-owner-decisions-2026-10-25.json"],
  },
  {
    key: "clone", title: "Activate Clone", roles: ["alien"],
    summary: "Activate a private self-defense that repeatedly blocks ordinary shots and Blackout.",
    rules: "Healthy/free own turn; one Main Action and one lifetime use. Active immediately; the historical min(activation round + 1, 5) expiry needs an explicit successor rule for the uncapped match. Blocks before Protection without consuming either on those blocks. Hospital aging and Captain EJECT bypass Clone. Final Showdown is removed from the current design. No public activation or expiry cue.",
    sources: ["clone-owner-decision-2026-10-14.json", "planet-navigation-code-owner-decisions-2026-10-25.json"],
  },
  {
    key: "movement", title: "Move", roles: roleIds,
    summary: "One voluntary move per round, within the legal movement window.",
    rules: "Legal movement is independent of role. Health, detention, origin, destination, capacity and timing checks apply. No voluntary exit from Hospital or Jail. Only Captain enters Command. Ordinary-turn windows include the final turn; intervening Hack stages permit movement only if a later non-Eliminated seat still has an ordinary turn.",
    condition: () => "Legal state, room and timing",
    sources: ["movement-decision.json", "public-hack-owner-decision-2026-10-14.json"],
  },
  {
    key: "vote", title: "Vote", roles: roleIds,
    summary: "Participate in the applicable Captain, Jail or release ballot.",
    rules: "Non-Eliminated players may vote, including Injured/Jailed. Soldier Blue affects navigation weight only and does not block these ballots or change voter counts. Candidate and target eligibility depend on the ballot. Self-voting is allowed; missing ballots abstain. Individual choices remain private and aggregate results are published at closure.",
    condition: () => "While non-Eliminated · ballot eligibility applies",
    sources: ["in-person-v1-owner-decisions-2026-10-06.json", "vote-result-owner-decision-2026-10-12.json", "planet-navigation-code-owner-decisions-2026-10-25.json"],
  },
  {
    key: "hack", title: "Standard Hack", roles: roleIds,
    summary: "Request a private exchange. Undercover and Alien may bluff their declared faction.",
    rules: "One initiation per player per match; at most two conversations per round. Request on own turn against another eligible same-location player. Declaration up to 15s, private result 5s, conversation 60s. The active pair is public; claims and conversation remain participant-private. Content is embargoed for the rest of that round. Standard Hack is separate from Hacker's Hack Spaceship ability. Other roles must declare their actual faction; declarations are never app-verified truth.",
    condition: (id) => ["undercover", "alien"].includes(id) ? "May declare a false faction" : "Must declare actual faction",
    sources: ["v2.1-decisions.json", "declared-hack-owner-decision-2026-10-12.json", "public-hack-owner-decision-2026-10-14.json"],
  },

  {
    key: "captain-release", title: "Captain · Release", roles: roleIds,
    summary: "The current Captain may release all living physical Jail prisoners.",
    rules: "Healthy/free Captain's own ordinary turn in Command. Requires a living physical Jail prisoner. One match-global use, preserved across office changes; no Main Action or movement cost. Return living prisoners to remembered A/B with capacity fallback. Medical detainees and Jail bodies are unaffected.",
    condition: () => "Only while eligible Captain",
    sources: ["captain-outcomes-owner-decision-2026-10-14.json"],
  },
  {
    key: "captain-eject", title: "Captain · Eject", roles: roleIds,
    summary: "The current Captain may eliminate and eject the physical Jail occupants.",
    rules: "Healthy/free Captain's own ordinary turn in Command. Requires a living physical Jail prisoner. Independent match-global once use; no Main Action or movement cost. Eliminate living prisoners and remove all physical Jail occupants, including bodies, offboard. Bypasses Protection and Clone. Factions reveal at the normal checkpoint.",
    condition: () => "Only while eligible Captain",
    sources: ["captain-outcomes-owner-decision-2026-10-14.json", "clone-owner-decision-2026-10-14.json"],
  },
];

const marker = (id, value) => ({ id, label: id.replace("studio-", ""), value, kind: "interpretation", sources: [] });
export function ensureCaptainPrivilege(input) {
  if (input.captainPrivilegeVersion === 1 || !input.sharedActionsVersion) return input;
  const board = copy(input);
  const roles = board.nodes.filter((n) => n.tab === "roles" && !aspect(n) && !isCaptainPrivilege(n));
  const id = "privilege:captain";
  if (board.nodes.some((n) => n.id === id)) throw Error(`Captain privilege ID already exists: ${id}`);
  const refs = board.sources.filter((s) => ["v2.1-decisions.json", "in-person-v1-owner-decisions-2026-10-06.json", "captain-outcomes-owner-decision-2026-10-14.json"].includes(s.path.split("/").at(-1))).map((s) => s.id);
  if (!refs.length) throw Error("Captain privilege sources are missing");
  const fact = (id, label, value) => ({ id, label, value, kind: "fact", sources: refs });
  const content = {
    title: "Captain",
    summary: "An elected privilege available to every role. Keep your original role and faction while holding the office.",
    faction: "Neutral", modes: [7, 8, 9],
    fields: [
      marker("studio-privilege", "captain"),
      fact("eligibility", "Who can become Captain", "Any role may become Captain through election while Healthy, free and non-Eliminated. Captain is a public office held alongside the player's original role."),
      fact("command", "Command access", "Election places Captain in Command without spending voluntary movement. Only the current Captain may enter Command. Leaving retains the title but removes room immunity. Injury, Jail or elimination removes the title."),
      fact("authority", "Captain actions", "Release and Eject require the Healthy/free Captain's own ordinary turn inside Command and at least one living physical Jail prisoner. Each has an independent match-global once resource that survives office changes. Neither spends Main Action or movement."),
    ],
    status: { era: "current", approval: "confirmed", implementation: "presentation-only", evidence: "source-reviewed" }, sources: refs,
  };
  board.nodes.push({ id, tab: "roles", position: { x: 400, y: 0 }, content, source: copy(content), notes: "", proposal: "", archived: false });
  for (const role of roles) board.edges.push({
    id: `privilege-link:${role.id}:captain`, source: role.id, target: id,
    relation: "usable-in", label: "May become Captain · election required",
    notes: "A shared elected privilege; the player keeps their original role. Candidate eligibility still applies.",
    sources: refs, proposed: !role.source, archived: role.archived,
  });
  for (const action of board.nodes.filter(isCaptainAction)) {
    // Keep the earlier per-role connections as history, including their notes.
    for (const edge of board.edges.filter((e) => e.target === action.id && roles.some((r) => r.id === e.source))) edge.archived = true;
    board.edges.push({
      id: `privilege-action:${actionKeyOf(action)}`, source: id, target: action.id,
      relation: "grants", label: "Captain privilege · eligibility applies", notes: "Only while the current Captain meets this action's conditions.",
      sources: action.content.sources, proposed: false, archived: false,
    });
  }
  board.captainPrivilegeVersion = 1;
  delete board.roleLayoutVersion;
  return board;
}

export function ensureSharedActions(input) {
  if (input.sharedActionsVersion === 1) return input;
  const board = copy(input);
  const roles = board.nodes.filter((n) => roleIds.includes(n.id) && n.tab === "roles" && !aspect(n) && n.source);
  if (!roles.length) return board;
  const originals = board.nodes.filter((n) => aspect(n) === "action" && roles.some((r) => r.id === fieldValue(n, "studio-parent-role")));
  for (const definition of actionDefinitions) {
    const parents = roles.filter((r) => definition.roles.includes(r.id));
    if (!parents.length) continue;
    const id = `action:${definition.key}`;
    // Never overwrite an imported/custom node that already owns this ID.
    if (board.nodes.some((n) => n.id === id)) throw Error(`Shared action ID already exists: ${id}`);
    const refs = board.sources.filter((s) => definition.sources.includes(s.path.split("/").at(-1))).map((s) => s.id);
    if (!refs.length) throw Error(`Shared action source is missing: ${definition.title}`);
    const originalIds = originals.filter((n) => parents.some((r) => r.id === fieldValue(n, "studio-parent-role"))).map((n) => n.id);
    const content = {
      title: definition.title, summary: definition.summary,
      faction: parents.length === 1 ? parents[0].source.faction : "Neutral",
      modes: [...new Set(parents.flatMap((r) => r.content.modes))].sort(),
      fields: [marker("studio-aspect", "action"), marker("studio-action-key", definition.key), marker("studio-action-origins", JSON.stringify(originalIds)),
        { id: "rules", label: "Action, timing & limits", value: definition.rules, kind: "fact", sources: refs },
        { id: "eligibility", label: "Connected roles & conditions", value: parents.map((r) => `${r.content.title}: ${definition.condition?.(r.id) || "Role ability; action rules apply"}`).join("\n"), kind: "fact", sources: refs }],
      status: { era: "current", approval: "confirmed", implementation: definition.implementation || "presentation-only", evidence: "source-reviewed" }, sources: refs,
    };
    board.nodes.push({ id, tab: "roles", position: { x: 800, y: actionDefinitions.indexOf(definition) * 260 }, content, source: copy(content), notes: "", proposal: "", archived: parents.every((r) => r.archived) });
    for (const role of parents) board.edges.push({
      id: `action-link:${role.id}:${definition.key}`, source: role.id, target: id,
      relation: "usable-in", label: definition.condition?.(role.id) || definition.title,
      notes: `Access to ${definition.title} is subject to the action's rules. This connection grants no additional power.`,
      sources: refs, proposed: false, archived: false,
    });
  }
  for (const old of originals) {
    old.archived = true;
    for (const edge of board.edges.filter((e) => e.source === fieldValue(old, "studio-parent-role") && e.target === old.id)) edge.archived = true;
  }
  board.sharedActionsVersion = 1;
  delete board.roleLayoutVersion;
  return board;
}
