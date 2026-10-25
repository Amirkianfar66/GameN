import { z } from "zod";

export const tabs = ["roles", "powers", "rounds", "locations", "events", "winning"];
export const tabNames = {
  roles: "Roles",
  powers: "Original power cards",
  rounds: "Rounds",
  locations: "Locations",
  events: "Development Ideas",
  winning: "Winning Conditions",
  all: "All connections",
};
export const relations = [
  "targets",
  "counters",
  "grants",
  "excludes",
  "usable-in",
  "resolves-before",
  "communicates-with",
  "depends-on",
  "open-conflict",
];
const id = z.string().regex(/^[a-zA-Z0-9_.:-]{1,160}$/);
const text = z.string().max(30000);
const position = z
  .object({
    x: z.number().finite().min(-100000).max(100000),
    y: z.number().finite().min(-100000).max(100000),
  })
  .strict();
const status = z
  .object({
    era: z.enum(["current", "historical", "proposal"]),
    approval: z.enum(["confirmed", "historical-only", "unreviewed"]),
    implementation: z.enum([
      "implemented",
      "disabled",
      "presentation-only",
      "not-implemented",
    ]),
    evidence: z.enum(["source-reviewed", "reported-only", "not-tested"]),
  })
  .strict();
const field = z
  .object({
    id,
    label: z.string().min(1).max(120),
    value: text,
    kind: z.enum(["fact", "interpretation", "question"]),
    sources: z.array(id).max(50),
  })
  .strict();
const content = z
  .object({
    title: z.string().min(1).max(160),
    summary: text,
    faction: z.enum(["Blue", "Red", "Alien", "Neutral"]),
    modes: z.array(z.union([z.literal(7), z.literal(8), z.literal(9)])).max(3),
    fields: z.array(field).max(100),
    status,
    sources: z.array(id).max(100),
  })
  .strict();
const source = z
  .object({
    id,
    path: z.string().min(1).max(500),
    commit: z.string().regex(/^[a-f0-9]{40}$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    version: z.string().max(200),
    reviewedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    kind: z.enum([
      "owner-decision",
      "implementation",
      "historical",
      "release",
      "design",
      "balance",
    ]),
    selector: z.string().max(500),
    privateRecord: z.boolean().optional(),
  })
  .strict();
export const BoardSchema = z
  .object({
    schemaVersion: z.literal(1),
    ownerUpdates: z.array(z.object({
      id,
      nodeIds: z.array(id).max(1500),
      retiredNodeIds: z.array(id).max(1500),
    }).strict()).max(100).optional(),
    appliedOwnerUpdates: z.array(id).max(100).optional(),
    roleLayoutVersion: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
    captainPrivilegeVersion: z.literal(1).optional(),
    sharedActionsVersion: z.literal(1).optional(),
    publicActionsVersion: z.literal(1).optional(),
    id,
    title: z.string().min(1).max(160),
    baseline: z
      .object({
        commit: z.string().regex(/^[a-f0-9]{40}$/),
        ruleset: text,
        engine: text,
        art: text,
        reviewedOn: text,
      })
      .strict(),
    sources: z.array(source).max(1500),
    nodes: z
      .array(
        z
          .object({
            id,
            tab: z.enum(tabs),
            position,
            content,
            source: content.nullable(),
            notes: text,
            proposal: text,
            archived: z.boolean(),
          })
          .strict(),
      )
      .max(1500),
    edges: z
      .array(
        z
          .object({
            id,
            source: id,
            target: id,
            relation: z.enum(relations),
            label: z.string().min(1).max(200),
            notes: text,
            sources: z.array(id).max(50),
            proposed: z.boolean(),
            archived: z.boolean(),
          })
          .strict(),
      )
      .max(6000),
    viewports: z.record(
      z.enum([...tabs, "all"]),
      z
        .object({
          x: z.number().finite(),
          y: z.number().finite(),
          zoom: z.number().min(0.08).max(2),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((board, ctx) => {
    const unique = (values, label) => {
      if (new Set(values).size !== values.length)
        ctx.addIssue({ code: "custom", message: `Duplicate ${label} IDs` });
    };
    unique(
      board.nodes.map((n) => n.id),
      "node",
    );
    unique(
      board.edges.map((e) => e.id),
      "edge",
    );
    unique(
      board.sources.map((s) => s.id),
      "source",
    );
    const ids = new Set(board.nodes.map((n) => n.id)),
      sources = new Set(board.sources.map((s) => s.id));
    const check = (refs) =>
      refs.forEach((s) => {
        if (!sources.has(s))
          ctx.addIssue({ code: "custom", message: `Missing provenance ${s}` });
      });
    for (const n of board.nodes)
      for (const c of [n.content, n.source].filter(Boolean)) {
        unique(
          c.fields.map((f) => f.id),
          `field in ${n.id}`,
        );
        check(c.sources);
        c.fields.forEach((f) => check(f.sources));
        if (
          c.status.era !== "proposal" &&
          (!c.sources.length ||
            c.fields.some((f) => f.kind === "fact" && !f.sources.length))
        )
          ctx.addIssue({
            code: "custom",
            message: `Sourced card ${n.id} needs fact provenance`,
          });
      }
    for (const e of board.edges) {
      if (!ids.has(e.source) || !ids.has(e.target))
        ctx.addIssue({
          code: "custom",
          message: `Dangling connection ${e.id}`,
        });
      check(e.sources);
    }
  });

export function parseBoard(input) {
  return BoardSchema.parse(input);
}
export const copy = (value) => structuredClone(value);
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const edited = (node) =>
  !node.source || !same(node.content, node.source);
export const effectiveStatus = (node) =>
  edited(node)
    ? {
        era: "proposal",
        approval: "unreviewed",
        implementation: "not-implemented",
        evidence: "not-tested",
      }
    : node.content.status;

export function refreshPlan(board, incoming) {
  parseBoard(incoming);
  const changes = [];
  for (const next of incoming.nodes.filter((n) => n.source)) {
    const current = board.nodes.find((n) => n.id === next.id);
    if (!current)
      changes.push({
        id: next.id,
        kind: "new",
        before: null,
        after: next.source,
      });
    else if (!same(current.source, next.source))
      changes.push({
        id: next.id,
        kind: "changed",
        before: current.source,
        after: next.source,
      });
  }
  for (const n of board.nodes.filter((n) => n.source))
    if (!incoming.nodes.some((x) => x.id === n.id))
      changes.push({
        id: n.id,
        kind: "missing",
        before: n.source,
        after: null,
      });
  return changes;
}

// Three-way source merge: only untouched imported fields advance. Owner text,
// positions, archived state, proposals and existing relationships stay intact.
export function applyRefresh(board, incoming) {
  const result = copy(board);
  for (const s of incoming.sources) {
    const old = result.sources.find((x) => x.id === s.id);
    if (old && !same(old, s))
      throw Error("Provenance ID collision. Source records must be immutable.");
    if (!old) result.sources.push(copy(s));
  }
  for (const next of incoming.nodes.filter((n) => n.source)) {
    const current = result.nodes.find((n) => n.id === next.id);
    if (!current) {
      result.nodes.push(copy(next));
      continue;
    }
    if (!current.source) continue;
    const old = current.source,
      fresh = next.source,
      local = current.content;
    for (const key of [
      "title",
      "summary",
      "faction",
      "modes",
      "status",
      "sources",
    ])
      if (same(local[key], old[key])) local[key] = copy(fresh[key]);
    const localFields = new Map(local.fields.map((f) => [f.id, f]));
    for (const f of fresh.fields) {
      const oldField = old.fields.find((o) => o.id === f.id),
        localField = localFields.get(f.id);
      if (!localField) local.fields.push(copy(f));
      else if (same(localField, oldField)) Object.assign(localField, copy(f));
    }
    current.source = copy(fresh);
  }
  for (const e of incoming.edges)
    if (!result.edges.some((x) => x.id === e.id)) result.edges.push(copy(e));
  result.baseline = copy(incoming.baseline);
  return parseBoard(result);
}


// Adopt explicit owner corrections from the authenticated source bundle once.
// Existing immutable revisions stay untouched. The normal save creates a new
// revision; local text, notes, proposals and positions use the three-way merge.
export function applyOwnerUpdates(board, incoming) {
  if (!incoming) return board;
  const applied = new Set(board.appliedOwnerUpdates || []);
  const updates = (incoming.ownerUpdates || []).filter(update => !applied.has(update.id));
  if (!updates.length) return board;
  const ids = new Set(updates.flatMap(update => update.nodeIds));
  const retired = new Set(updates.flatMap(update => update.retiredNodeIds));
  const result = applyRefresh(board, {
    ...incoming,
    nodes: incoming.nodes.filter(node => ids.has(node.id)),
    edges: [],
  });
  for (const node of result.nodes) if (retired.has(node.id)) node.archived = true;
  for (const edge of result.edges) {
    if (retired.has(edge.source) || retired.has(edge.target)) edge.archived = true;
  }
  result.appliedOwnerUpdates = [...applied, ...updates.map(update => update.id)];
  return parseBoard(result);
}
