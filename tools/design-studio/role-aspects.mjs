import { copy } from "./model.mjs";
import { actionKeyOf, actionDefinitions, ensureSharedActions, isPublicAction, separatePublicActions, isCaptainAction, isCaptainPrivilege, ensureCaptainPrivilege } from "./shared-actions.mjs";

const information = {
  insider: [
    "Three identities, without the role mapping.",
    "Privately starts with the unordered identities of Undercover, Alien and Cracker. The assignment of those roles is unknown.",
    "Use the ambiguous trio to compare claims and negotiate trust. Revealing the trio can expose the source of the clue.",
  ],
  cracker: [
    "Read public danger; keep your Rescue decisions private.",
    "No extra starting identities or Code knowledge. Knows own Rescue resources and accepted registrations; public injury and location establish the visible problem.",
    "Rescue promises, triage and observed recoveries create social evidence. They do not automatically prove anyone’s faction.",
  ],
  "blue-disabler": [
    "Remember the room. Read what a hidden attack changes.",
    "No extra starting identities or Code knowledge. Blackout supplies frozen neutral room slots, not hidden roles. Generic room block feedback does not disclose the defensive cause.",
    "Compare claims and remembered positions before committing. A miss or blocked attack is not a faction scan.",
  ],
  supplier: [
    "Choose whom to trust with a future weapon.",
    "No extra starting identities or Code knowledge. Successful weapon grants are known to Supplier and the individual recipient; there is no public weapon marker.",
    "Use claims and earlier behavior to choose recipients. Receiving a weapon does not certify alignment.",
  ],
  undercover: [
    "A hidden shield ledger and a permitted false claim.",
    "Knows own Red role and that own identity is excluded from Code. Does not automatically learn Hacker’s identity. Protection grant, activation and consumption are Undercover-only.",
    "May declare a false side in Hack. Keep bluffing separate from verified information; the protected recipient does not gain the private shield ledger.",
  ],
  hacker: [
    "Know Undercover; turn a faction guess into Code evidence.",
    "Starts knowing Undercover’s identity and exclusion from Code. A correct Scan faction guess reveals only Code membership. A wrong guess spends that round’s Scan without Code information.",
    "Combine Scan evidence with claims and negotiation, especially with Alien. A Hack declaration is a claim, not an app-verified faction.",
  ],
  "red-disabler": [
    "A second hidden attack, without automatic teammate knowledge.",
    "No extra starting identities or Code knowledge; no automatic knowledge of the other Disabler. Frozen neutral slots and generic room block feedback reveal no hidden role or defensive cause.",
    "Coordinate through social deduction and claims. The second attack in eight- and nine-player games can complicate attribution.",
  ],
  alien: [
    "The full four-identity Code is your bargaining resource.",
    "Privately knows the complete unordered Code from setup. May declare a false side in Hack. Own Clone state is private; activation and expiry have no public role cue.",
    "Decide what to trade, conceal or bluff while pursuing Alien’s survival conditions. Knowing Code does not force a particular alliance.",
  ],
  officer: [
    "An early accusation must be built from social evidence.",
    "No extra starting identities or Code knowledge. Own ordinary-shot resource is known privately; public health and room changes do not reveal an exact role.",
    "Judge claims and behavior before using the early shot. Injury is a mechanical consequence, not proof that the accusation was correct.",
  ],
};

export const aspectOf = (node) =>
  node?.content.fields.find((f) => f.id === "studio-aspect")?.value || null;
export const parentRoleOf = (node) =>
  node?.content.fields.find((f) => f.id === "studio-parent-role")?.value ||
  null;
const readingOrder = ["cracker", "undercover", "alien", "supplier", "blue-disabler", "red-disabler", "hacker", "officer", "insider"];
const roleOrder = (node) => {
  const index = readingOrder.indexOf(node.id);
  return index < 0 ? readingOrder.length : index;
};
export const roleRoots = (board) =>
  board.nodes.filter((n) => n.tab === "roles" && !aspectOf(n) && !isCaptainPrivilege(n)).sort((a, b) =>
    Number(a.archived) - Number(b.archived) ||
    (board.publicActionsVersion ? roleOrder(a) - roleOrder(b) : 0) ||
    ["Blue", "Red", "Alien", "Neutral"].indexOf(a.content.faction) -
      ["Blue", "Red", "Alien", "Neutral"].indexOf(b.content.faction) ||
    a.content.title.localeCompare(b.content.title, "en"),
  );

export const roleColumns = [
  { key: "information", label: "Information", x: 0 },
  { key: "role", label: "Roles", x: 400 },
  { key: "action", label: "Role actions", x: 800 },
];

function arrangeActionGroups(board) {
  const roles = roleRoots(board).filter((n) => !n.archived);
  const actions = board.nodes.filter((n) => !n.archived && aspectOf(n) === "action" && !isPublicAction(n) && !isCaptainAction(n));
  const edges = board.edges.filter((e) => !e.archived);
  const visited = new Set(), placedActions = new Set();
  let row = 0;
  const place = (nodes, x, rows) => nodes.forEach((node, index) => {
    const slot = nodes.length === 1 ? (rows - 1) / 2 : index * (rows - 1) / (nodes.length - 1);
    node.position = { x, y: (row + slot) * 260 };
  });
  for (const first of roles) {
    if (visited.has(first.id)) continue;
    const groupRoleIds = new Set([first.id]), groupActionIds = new Set(), pending = [first];
    while (pending.length) {
      const role = pending.pop();
      visited.add(role.id);
      for (const action of actions.filter((n) => edges.some((e) => e.source === role.id && e.target === n.id))) {
        if (groupActionIds.has(action.id)) continue;
        groupActionIds.add(action.id);
        for (const related of roles.filter((n) => edges.some((e) => e.source === n.id && e.target === action.id))) {
          if (!groupRoleIds.has(related.id)) { groupRoleIds.add(related.id); pending.push(related); }
        }
      }
    }
    const groupRoles = roles.filter((n) => groupRoleIds.has(n.id));
    const groupActions = actions.filter((n) => groupActionIds.has(n.id)).sort((a, b) =>
      actionDefinitions.findIndex((d) => d.key === actionKeyOf(a)) - actionDefinitions.findIndex((d) => d.key === actionKeyOf(b)));
    const rows = Math.max(groupRoles.length, groupActions.length);
    place(groupRoles, 400, rows);
    place(groupActions, 800, rows);
    groupActions.forEach((n) => placedActions.add(n.id));
    for (const role of groupRoles) {
      for (const info of board.nodes.filter((n) => parentRoleOf(n) === role.id && aspectOf(n) === "information"))
        info.position = { x: 0, y: role.position.y };
    }
    row += rows;
  }
  for (const action of actions.filter((n) => !placedActions.has(n.id))) action.position = { x: 800, y: row++ * 260 };
  const captain = board.nodes.find((n) => !n.archived && isCaptainPrivilege(n));
  const captainActions = board.nodes.filter((n) => !n.archived && isCaptainAction(n));
  const privilegeRows = Math.max(captain ? 1 : 0, captainActions.length);
  if (captain) place([captain], 400, privilegeRows);
  place(captainActions, 800, privilegeRows);
  row += privilegeRows;
  // Everyday choices, then combat. Captain duties belong to the privilege above.
  const publicOrder = ["movement", "vote", "hack", "ordinary-shot", "showdown"];
  const publicActions = board.nodes.filter((n) => !n.archived && isPublicAction(n)).sort((a, b) => publicOrder.indexOf(actionKeyOf(a)) - publicOrder.indexOf(actionKeyOf(b)));
  const publicStart = row * 260 + 100;
  publicActions.forEach((node, index) => { node.position = { x: (index % 3) * 400, y: publicStart + Math.floor(index / 3) * 260 }; });
  const archiveStart = publicStart + Math.ceil(publicActions.length / 3) * 260 + 100;
  board.nodes.filter((n) => n.tab === "roles" && n.archived).forEach((node, index) => {
    node.position = { x: aspectOf(node) === "information" ? 0 : aspectOf(node) === "action" ? 800 : 400, y: archiveStart + index * 260 };
  });
}

export function arrangeRoleColumns(input, { onlyIfNeeded = false } = {}) {
  const board = copy(input);
  const version = board.captainPrivilegeVersion ? 5 : board.publicActionsVersion ? 4 : board.sharedActionsVersion ? 2 : 1;
  if (onlyIfNeeded && board.roleLayoutVersion === version) return board;
  if (board.publicActionsVersion) {
    arrangeActionGroups(board);
    board.roleLayoutVersion = version;
    delete board.viewports.roles;
    return board;
  }
  roleRoots(board).forEach((role, index) => {
    role.position = { x: 400, y: index * 260 };
    for (const aspect of board.nodes.filter((n) => parentRoleOf(n) === role.id))
      aspect.position = {
        x: aspectOf(aspect) === "information" ? 0 : 800,
        y: role.position.y,
      };
  });
  if (board.sharedActionsVersion) {
    const actions = board.nodes.filter((n) => aspectOf(n) === "action" && !n.archived && (!board.publicActionsVersion || !isPublicAction(n)));
    actions.sort((a, b) => {
      const order = (n) => actionDefinitions.findIndex((d) => d.key === actionKeyOf(n));
      return (order(a) < 0 ? 100 : order(a)) - (order(b) < 0 ? 100 : order(b));
    });
    actions.forEach((n, i) => { n.position = { x: 800, y: i * 260 }; });
    const publicActions = board.publicActionsVersion ? board.nodes.filter((n) => !n.archived && isPublicAction(n)) : [];
    const publicStart = Math.max(roleRoots(board).length, actions.length) * 260 + 100;
    publicActions.forEach((n, i) => {
      n.position = { x: (i % 3) * 400, y: publicStart + Math.floor(i / 3) * 260 };
    });
    const archiveStart = publicActions.length ? publicStart + Math.ceil(publicActions.length / 3) * 260 + 100 : actions.length * 260;
    board.nodes.filter((n) => aspectOf(n) === "action" && n.archived).forEach((n, i) => {
      n.position = { x: 800, y: archiveStart + i * 260 };
    });
  }
  board.roleLayoutVersion = version;
  delete board.viewports.roles;
  return board;
}

const marker = (id, label, value) => ({
  id,
  label,
  value,
  kind: "interpretation",
  sources: [],
});
const unknownStatus = {
  era: "proposal",
  approval: "unreviewed",
  implementation: "not-implemented",
  evidence: "not-tested",
};

export function ensureRoleAspects(input, { arrange = false } = {}) {
  const board = copy(input);
  roleRoots(board).forEach((role) => {
    const original = role.source;
    const inherited = original || role.content;
    const refs = [
      ...new Set([
        ...inherited.sources,
        ...board.sources
          .filter((s) =>
            [
              "packages/engine/src/full-game/roster.ts",
              "rules/overlays/public-hack-owner-decision-2026-10-14.json",
            ].includes(s.path),
          )
          .map((s) => s.id),
      ]),
    ];
    const known = information[role.id];
    for (const kind of ["information", "action"]) {
      const existing = board.nodes.find(
        (n) => parentRoleOf(n) === role.id && aspectOf(n) === kind,
      );
      const id = existing?.id || role.id + ":" + kind;
      if (!existing) {
        const fact = (fieldId, label, value) => ({
          id: fieldId,
          label,
          value,
          kind: original ? "fact" : "question",
          sources: original ? refs : [],
        });
        const fields = [
          marker("studio-aspect", "Design aspect", kind),
          marker("studio-parent-role", "Connected role", role.id),
        ];
        let summary;
        if (kind === "information") {
          summary =
            known?.[0] || "What does this role know, learn, reveal or conceal?";
          fields.push(
            fact(
              "knowledge",
              "Private knowledge & evidence",
              known?.[1] ||
                "Describe starting knowledge, earned clues and what remains unknown.",
            ),
          );
          fields.push({
            id: "social-play",
            label: "Social deduction & deception",
            value:
              known?.[2] ||
              "How can this role read, persuade, bluff or negotiate?",
            kind: "interpretation",
            sources: refs,
          });
          fields.push(
            fact(
              "shared-information",
              "Shared information channels",
              "Table conversation, public health/location, permitted faction reveals and legal Hack participation. Hack content remains private for the rest of its round; Round 5 content stays private through match end.",
            ),
          );
        } else {
          summary =
            role.id === "insider"
              ? "Shared choices turn a starting clue into influence."
              : inherited.fields.find((f) => f.id === "abilities")?.value ||
                "What can this role do, when, at what cost?";
          for (const key of [
            "abilities",
            "timing",
            "uses",
            "targets",
            "counterplay",
          ]) {
            const field = inherited.fields.find((f) => f.id === key);
            if (field) fields.push(copy(field));
          }
          if (fields.length === 2)
            fields.push(
              fact(
                "abilities",
                "Action, timing & cost",
                "Describe the action, target, resource, timing and mechanical consequence.",
              ),
            );
          fields.push(
            fact(
              "shared-actions",
              "Shared board-game choices",
              "Legal movement, discussion, votes and Hack remain available subject to their own rules. Ordinary shooting requires a usable weapon and legal timing." +
                (role.id === "insider"
                  ? " Insider has no additional active role Main Action."
                  : ""),
            ),
          );
        }
        const content = {
          title: `${role.content.title} · ${kind === "information" ? "Information" : "Action"}`,
          summary,
          faction: inherited.faction,
          modes: copy(inherited.modes),
          fields,
          status: original
            ? { ...inherited.status, implementation: "presentation-only" }
            : unknownStatus,
          sources: refs,
        };
        board.nodes.push({
          id,
          tab: "roles",
          position: {
            x: role.position.x + (kind === "information" ? -400 : 400),
            y: role.position.y,
          },
          content,
          source: original ? copy(content) : null,
          notes: "",
          proposal: "",
          archived: role.archived,
        });
      }
      const edgeId = `aspect:${role.id}:${kind}`;
      if (!board.edges.some((e) => e.id === edgeId))
        board.edges.push({
          id: edgeId,
          source: role.id,
          target: id,
          relation: "depends-on",
          label: kind === "information" ? "Information" : "Action",
          notes:
            "The two designer-requested aspects of this role. This connection does not grant an additional game ability.",
          sources: refs,
          proposed: !original,
          archived: false,
        });
    }
  });
  const shared = ensureCaptainPrivilege(separatePublicActions(ensureSharedActions(board)));
  return arrange ? arrangeRoleColumns(shared) : shared;
}

export function duplicateRoleFamily(input, nodeId, newId) {
  const board = copy(input),
    selected = board.nodes.find((n) => n.id === nodeId);
  if (!selected) throw Error("Card not found");
  const family =
    selected.tab === "roles" && !aspectOf(selected) && !isCaptainPrivilege(selected)
      ? [selected, ...board.nodes.filter((n) => parentRoleOf(n) === nodeId)]
      : [selected];
  const ids = new Map(
    family.map((n) => [
      n.id,
      n.id === nodeId ? newId : `${newId}:${aspectOf(n)}`,
    ]),
  );
  for (const old of family) {
    const n = copy(old);
    n.id = ids.get(old.id);
    n.source = null;
    n.content.status = copy(unknownStatus);
    n.position.x += 90;
    n.position.y += 90;
    n.content.title =
      old.id === nodeId
        ? `${old.content.title} · copy`
        : `${selected.content.title} · copy · ${aspectOf(old) === "information" ? "Information" : "Action"}`;
    const parent = n.content.fields.find((f) => f.id === "studio-parent-role");
    if (parent && ids.has(parent.value)) parent.value = ids.get(parent.value);
    if (family.length === 1)
      n.content.fields = n.content.fields.filter(
        (f) => !f.id.startsWith("studio-") || f.id === "studio-aspect",
      );
    board.nodes.push(n);
  }
  for (const old of input.edges.filter(
    (e) => ids.has(e.source) && (ids.has(e.target) ||
      actionKeyOf(input.nodes.find((n) => n.id === e.target)) || isCaptainPrivilege(input.nodes.find((n) => n.id === e.target))),
  ))
    board.edges.push({
      ...copy(old),
      id: `${newId}:edge:${old.target}`,
      source: ids.get(old.source),
      target: ids.get(old.target) || old.target,
      proposed: true,
    });
  return board;
}
