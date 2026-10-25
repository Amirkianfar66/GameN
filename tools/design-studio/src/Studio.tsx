import { api, base, storageKey } from "./session";
import DecisionReview from "./DecisionReview";
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  aspectOf,
  parentRoleOf,
  roleRoots,
  ensureRoleAspects,
  duplicateRoleFamily,
  arrangeRoleColumns,
  roleColumns,
} from "../role-aspects.mjs";
import { actionKeyOf, actionRoles, actionAppearance, isRoleAspectEdge, originalActionCards, isOriginalAction, isPublicAction, isCaptainAction, isCaptainPrivilege } from "../shared-actions.mjs";
import {
  ReactFlow,
  Background,
  BaseEdge,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
  useViewport,
  PanOnScrollMode,
  type NodeProps,
  type EdgeProps,
  type Node,
  type Connection,
} from "@xyflow/react";
import {
  parseBoard,
  copy,
  same,
  edited,
  effectiveStatus,
  refreshPlan,
  applyRefresh,
  applyOwnerUpdates,
  tabs,
  tabNames,
  relations,
} from "../model.mjs";

type Board = ReturnType<typeof parseBoard>;
type Card = Board["nodes"][number];
type Link = Board["edges"][number];
type View = "roles" | "powers" | "rounds" | "locations" | "events" | "winning" | "all";
const uid = (prefix = "idea") => prefix + "-" + crypto.randomUUID();
const offset = {
  roles: { x: 0, y: 0 },
  powers: { x: 3000, y: 0 },
  rounds: { x: 0, y: 2600 },
  locations: { x: 3000, y: 2600 },
  events: { x: 6000, y: 0 },
  winning: { x: 6000, y: 2600 },
};
const colors = {
  Blue: "#386a96",
  Red: "#a95248",
  Alien: "#7760a5",
  Neutral: "#958167",
};
const captainColor = "#f2cc4d";
const captainLinkColor = "#a78316";
const defaultStatus = {
  era: "proposal" as const,
  approval: "unreviewed" as const,
  implementation: "not-implemented" as const,
  evidence: "not-tested" as const,
};
const cleanLabel = (s: string) => s.replaceAll("-", " ");

function DesignCard({
  data,
  selected,
}: NodeProps<Node<{ card: Card; links: number; roleNames: string[] }>>) {
  const n = data.card,
    c = n.content,
    s = effectiveStatus(n),
    appearance = actionAppearance(n),
    captain = isCaptainPrivilege(n),
    role = n.tab === "roles" && !aspectOf(n) && !captain,
    insiderInformation = aspectOf(n) === "information" && parentRoleOf(n) === "insider" && !edited(n);
  return (
    <article
      className={`design-card ${captain ? "captain-card" : aspectOf(n) ? "aspect-card " + aspectOf(n) : n.tab === "roles" ? "role-card" : ""} ${appearance ? "typed-action" : ""} ${isPublicAction(n) ? "public-action" : ""} ${selected ? "selected" : ""} ${n.archived ? "archived" : ""}`}
      data-faction={c.faction}
      style={{ "--accent": captain ? captainLinkColor : colors[c.faction], "--action-color": appearance?.color } as React.CSSProperties}
    >
      <Handle
        id="in"
        type="target"
        position={aspectOf(n) === "information" ? Position.Right : Position.Left}
        isConnectable={!isPublicAction(n)}
        style={{ ...(role ? { top: "28%" } : {}), visibility: isPublicAction(n) ? "hidden" : undefined }}
        aria-label={`Connect to ${c.title}`}
      />
      {role && (<>
        <Handle
          id="out-left"
          type="source"
          position={Position.Left}
          aria-label={`Connect from ${c.title} to Information`}
        />
        <Handle id="captain-out" type="source" position={Position.Left}
          style={{ top: "76%", borderColor: captainLinkColor, background: captainColor }}
          aria-label={`Connect ${c.title} to Captain privilege`} />
      </>)}
      <div className="card-eyebrow">
        <span>
          {captain ? "Privilege · any role" : isCaptainAction(n) ? "Captain action · elected privilege" : isPublicAction(n) ? "Public action · all roles" : actionKeyOf(n) ? `${data.roleNames.length > 1 ? "Shared role action" : "Role action"} · ${data.roleNames.length} ${data.roleNames.length === 1 ? "role" : "roles"}` : c.faction === "Neutral"
            ? tabNames[n.tab]
            : c.faction + " · " + c.modes.join(" / ")}
        </span>
        <span className={"era " + s.era}>{s.era}</span>
      </div>
      <div className="card-title">
        {captain && <span className="captain-emblem" aria-hidden="true">♛</span>}
        {role && n.source && (
          <img
            src={`${base}art/${n.id}.svg`}
            alt=""
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        )}
        <h3>
          {insiderInformation ? "Three identities" : actionKeyOf(n) ? c.title : aspectOf(n)
            ? aspectOf(n) === "information"
              ? "Information"
              : "Action"
            : c.title}
        </h3>
      </div>
      {captain && <div className="aspect-caption">Elected office · original role retained</div>}
      {aspectOf(n) && (
        <div className="aspect-caption">
          {insiderInformation ? <>
            Insider · Private at setup<br />
            <strong>Undercover · Alien · Cracker</strong>
          </> : <>
          {appearance && <><strong>{appearance.label}</strong><br /></>}
          {isPublicAction(n) ? "Available to any role · eligibility applies" : actionKeyOf(n) ? (data.roleNames.length > 2 ? "Connected roles · select to trace" : data.roleNames.join(" · ")) : aspectOf(n) === "information"
            ? "Social deduction · Mafia"
            : "Board & mobile game"}
          {!actionKeyOf(n) && <><br />{c.title.split(" · ")[0]}</>}
          </>}
        </div>
      )}
      <p>{c.summary}</p>
      <footer>
        <span>
          {s.approval === "confirmed"
            ? "✓ Owner confirmed"
            : s.approval === "historical-only"
              ? "◷ Historical source"
              : "◇ Needs review"}
        </span>
        <span>{isPublicAction(n) ? "All roles" : `${data.links} links ↗`}</span>
      </footer>
      <Handle
        id="out"
        type="source"
        position={aspectOf(n) === "information" ? Position.Left : Position.Right}
        isConnectable={!isPublicAction(n)}
        style={{ visibility: isPublicAction(n) ? "hidden" : undefined }}
        aria-label={`Connect from ${c.title}`}
      />
    </article>
  );
}
const nodeTypes = { design: DesignCard };

function CaptainConnection({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, label, labelStyle, labelBgStyle, labelBgPadding, interactionWidth }: EdgeProps) {
  // Use the gap beside the Roles column instead of drawing through other roles.
  const lane = Math.min(sourceX, targetX) - 48;
  const path = `M ${sourceX} ${sourceY} H ${lane} V ${targetY} H ${targetX}`;
  return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd}
    label={label} labelX={sourceX + 146} labelY={sourceY + 75}
    labelStyle={labelStyle} labelBgStyle={labelBgStyle} labelBgPadding={labelBgPadding}
    interactionWidth={interactionWidth} />;
}
const edgeTypes = { captain: CaptainConnection };

function RoleColumnHeadings({ publicTop }: { publicTop: number | null }) {
  const { x, y, zoom } = useViewport();
  const publicY = publicTop === null ? null : y + publicTop * zoom;
  const publicVisible = publicY !== null && publicY <= 80;
  return (
    <>
    <div className="role-column-headings" aria-label="Role canvas columns">
      {publicVisible ? <div className="public-heading" style={{ left: x, width: 1092 * zoom }}>Public actions · all roles</div> : roleColumns.map((column) => (
        <div key={column.key} className={column.key}
          style={{ left: x + column.x * zoom, width: 292 * zoom }}>
          {column.label}
        </div>
      ))}
    </div>
    {publicY !== null && publicY > 80 && <div className="public-section-heading" style={{ left: x, top: publicY, width: 1092 * zoom }}>
      <strong>Public actions</strong><span>For all roles · no role connections needed</span>
    </div>}
    </>
  );
}

function Editor({
  label,
  value,
  onCommit,
  multiline = false,
  readOnly = false,
}: {
  label: string;
  value: string;
  onCommit?: (v: string) => void;
  multiline?: boolean;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (readOnly || draft === value) return;
    const timer = setTimeout(() => onCommit?.(draft), 400);
    return () => clearTimeout(timer);
  }, [draft, value, readOnly, onCommit]);
  const props = {
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onBlur: () => {
      if (draft !== value) onCommit?.(draft);
    },
    readOnly,
    "aria-label": label,
  };
  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          {...props}
          rows={Math.min(9, Math.max(3, Math.ceil(draft.length / 65)))}
        />
      ) : (
        <input {...props} />
      )}
    </label>
  );
}

export default function Studio({ hosted = false }: { hosted?: boolean }) {
  const savedLabel = hosted ? "Saved online" : "Saved to disk";
  const [roleFocus, setRoleFocus] = useState("all");
  const [revisions, setRevisions] = useState<
    Array<{ revision: number; createdAt: string }>
  >([]);
  const [board, setBoard] = useState<Board | null>(null),
    ref = useRef<Board | null>(null),
    [seed, setSeed] = useState<Board | null>(null);
  const [revision, setRevision] = useState(0),
    revisionRef = useRef(0),
    saved = useRef(""),
    saving = useRef(false),
    blocked = useRef(false);
  const [saveState, setSaveState] = useState("Loading"),
    [notice, setNotice] = useState(""),
    [boards, setBoards] = useState<any[]>([]),
    [dataPath, setDataPath] = useState("");
  const [view, setView] = useState<View>(([...tabs, "all"].includes(new URLSearchParams(location.search).get("view")) ? new URLSearchParams(location.search).get("view") : "roles") as View),
    [selected, setSelected] = useState<string | null>(null),
    [edgeId, setEdgeId] = useState<string | null>(null);
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set("view", view);
    history.replaceState(null, "", url);
  }, [view]);
  const [libraryOpen, setLibraryOpen] = useState(false),
    [detailsOpen, setDetailsOpen] = useState(false);
  const flowFrame = useRef<HTMLDivElement | null>(null);
  const fitRef = useRef<() => void>(() => {});
  const [nodeSizes, setNodeSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [query, setQuery] = useState(""),
    [mode, setMode] = useState("all"),
    [statusFilter, setStatusFilter] = useState("all"),
    [showArchived, setShowArchived] = useState(false);
  const [past, setPast] = useState<Board[]>([]),
    [future, setFuture] = useState<Board[]>([]),
    dragStart = useRef<Board | null>(null);
  const [modal, setModal] = useState<string | null>(null),
    [jsonText, setJsonText] = useState(""),
    [candidate, setCandidate] = useState<Board | null>(null),
    [recovery, setRecovery] = useState<any>(null);
  const [sourceId, setSourceId] = useState<string | null>(null),
    [linkFrom, setLinkFrom] = useState(""),
    [linkTo, setLinkTo] = useState(""),
    [relation, setRelation] = useState("depends-on");
  const [newTitle, setNewTitle] = useState(""),
    [newTab, setNewTab] = useState("roles"),
    [zoom, setZoom] = useState(100);
  const flow = useReactFlow();
  const sourceBundle = useRef<Board | null>(null);
  const update = (value: Board) => {
    const current = applyOwnerUpdates(value, sourceBundle.current);
    ref.current = current;
    setBoard(current);
  };
  const commit = (mutate: (next: Board) => void, before?: Board) => {
    const old = before || ref.current;
    if (!old) return;
    const next = copy(ref.current);
    mutate(next);
    if (same(old, next)) return;
    try {
      parseBoard(next);
    } catch (e) {
      setNotice(
        "Edit not saved: " +
          (e.issues?.map((x) => x.message).join("; ") || e.message),
      );
      return;
    }
    setPast((p) => [...p.slice(-79), copy(old)]);
    setFuture([]);
    update(next);
  };
  const listBoards = async () => {
    const data = await api("/api/boards");
    setBoards(data.boards);
    setDataPath(data.dataPath);
    return data;
  };
  const load = (payload: any) => {
    setRevisions([]);
    parseBoard(payload.board);
    saved.current = JSON.stringify(payload.board);
    revisionRef.current = payload.revision;
    setRevision(payload.revision);
    blocked.current = false;
    const organized = arrangeRoleColumns(ensureRoleAspects(payload.board), { onlyIfNeeded: true });
    update(organized);
    setRoleFocus("all");
    setDetailsOpen(false);
    setPast(same(organized, payload.board) ? [] : [
      copy(payload.board),
    ]);
    setFuture([]);
    setSelected(null);
    setEdgeId(null);
    setSaveState(savedLabel);
  };
  const openSaved = async (id: string) => {
    const payload = await api("/api/boards/" + id);
    const cached = localStorage.getItem(storageKey("draft:" + id));
    load(payload);
    setModal(null);
    if (cached) {
      try {
        const draft = JSON.parse(cached);
        parseBoard(draft.board);
        if (draft.dirty && !same(draft.board, payload.board)) {
          blocked.current = true;
          setRecovery(draft);
          setModal("recovery");
        }
      } catch {
        setNotice("Unreadable browser draft retained. Saved board loaded.");
      }
    }
  };
  useEffect(() => {
    (async () => {
      const [bundle, list] = await Promise.all([
        api("/api/seed"),
        listBoards(),
      ]);
      sourceBundle.current = parseBoard(bundle);
      setSeed(bundle);
      const last = localStorage.getItem(storageKey("last-board"));
      const id = list.boards.some((x: any) => x.id === last) ? last : bundle.id;
      const payload = await api("/api/boards/" + id);
      load(payload);
      const cached = localStorage.getItem(storageKey("draft:" + id));
      if (cached) {
        try {
          const r = JSON.parse(cached);
          parseBoard(r.board);
          if (r.dirty && !same(r.board, payload.board)) {
            blocked.current = true;
            setRecovery(r);
            setModal("recovery");
          }
        } catch {
          setNotice("Unreadable browser draft retained. Saved board loaded.");
        }
      }
    })().catch((e) => setNotice(e.message));
  }, []);
  async function saveNow() {
    if (!ref.current || saving.current || blocked.current) return false;
    const snapshot = copy(ref.current),
      sig = JSON.stringify(snapshot);
    if (sig === saved.current) return true;
    saving.current = true;
    setSaveState("Saving…");
    try {
      const payload = await api("/api/boards/" + snapshot.id, "PUT", {
        board: snapshot,
        revision: revisionRef.current,
      });
      if (ref.current?.id === snapshot.id) {
        saved.current = sig;
        revisionRef.current = payload.revision;
        setRevision(payload.revision);
        setSaveState(
          same(ref.current, snapshot) ? savedLabel : "Unsaved changes",
        );
      }
      return true;
    } catch (e) {
      setSaveState("Save needs attention");
      setNotice(e.message);
      if (e.message.includes("newer")) blocked.current = true;
      return false;
    } finally {
      saving.current = false;
    }
  }
  useEffect(() => {
    if (!board) return;
    const dirty = JSON.stringify(board) !== saved.current;
    if (!recovery) {
      try {
        localStorage.setItem(
          storageKey("draft:" + board.id),
          JSON.stringify({ board, baseRevision: revisionRef.current, dirty }),
        );
        localStorage.setItem(storageKey("last-board"), board.id);
      } catch {
        setNotice(
          "Browser draft storage is full. Saving and JSON export remain available.",
        );
      }
    }
    if (!dirty) return;
    if (!blocked.current) setSaveState("Unsaved changes");
    const timer = setTimeout(() => void saveNow(), 900);
    return () => clearTimeout(timer);
  }, [board, revision, recovery]);
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      (document.activeElement as HTMLElement)?.blur();
      if (ref.current && JSON.stringify(ref.current) !== saved.current) {
        try {
          localStorage.setItem(
            storageKey("draft:" + ref.current.id),
            JSON.stringify({
              board: ref.current,
              baseRevision: revisionRef.current,
              dirty: true,
            }),
          );
        } catch {}
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, []);
  function undo() {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setFuture((f) => [copy(ref.current), ...f]);
    setPast((p) => p.slice(0, -1));
    update(prev);
  }
  function redo() {
    if (!future.length) return;
    setPast((p) => [...p, copy(ref.current)]);
    update(future[0]);
    setFuture((f) => f.slice(1));
  }
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        (document.activeElement as HTMLElement)?.blur();
        setTimeout(() => void saveNow(), 0);
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "z" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (e.key === "Escape" && !recovery) setModal(null);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [past, future, recovery]);
  const filtered = useMemo(
    () =>
      board?.nodes.filter(
        (n) =>
          (view === "all" || n.tab === view) &&
          (view !== "roles" ||
            roleFocus === "all" ||
            isPublicAction(n) ||
            isCaptainPrivilege(n) || isCaptainAction(n) ||
            n.id === roleFocus ||
            parentRoleOf(n) === roleFocus ||
            (aspectOf(n) === "action" && board.edges.some((e) => !e.archived && e.source === roleFocus && e.target === n.id))) &&
          (showArchived || !n.archived) &&
          (mode === "all" ||
            n.content.modes.includes(Number(mode) as 7 | 8 | 9)) &&
          (statusFilter === "all" || effectiveStatus(n).era === statusFilter) &&
          (!query ||
            JSON.stringify([n.content, n.notes, n.proposal])
              .toLowerCase()
              .includes(query.toLowerCase())),
      ) || [],
    [board, view, showArchived, mode, statusFilter, query, roleFocus],
  );
  const lowerSectionY = Math.max(2600, ...(board?.nodes.filter((n) => n.tab === "roles").map((n) => n.position.y + 700) || []));
  const sectionOffset = { ...offset, rounds: { x: 0, y: lowerSectionY }, locations: { x: 3000, y: lowerSectionY } };
  const flowNodes = filtered.map((n) => ({
    id: n.id,
    type: "design",
    measured: nodeSizes[n.id],
    position: {
      x: n.position.x + (view === "all" ? sectionOffset[n.tab].x : 0),
      y: n.position.y + (view === "all" ? sectionOffset[n.tab].y : 0),
    },
    data: {
      card: n,
      roleNames: aspectOf(n) === "action" ? actionRoles(board, n.id).filter((r) => !r.archived).map((r) => r.content.title) : [],
      links: board.edges.filter(
        (e) => !e.archived && (e.source === n.id || e.target === n.id),
      ).length,
    },
    selected: n.id === selected,
    ariaLabel: `${n.content.title}, ${tabNames[n.tab]}`,
  }));
  const visibleIds = new Set(filtered.map((n) => n.id));
  const publicCards = filtered.filter(isPublicAction);
  const publicTop = publicCards.length ? Math.min(...publicCards.map((n) => n.position.y)) - 65 : null;
  const liveEdges = board?.edges.filter((e) => !e.archived) || [];
  const flowEdges = liveEdges
    .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
    .filter((e) => view !== "roles" || isRoleAspectEdge(board, e))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: isCaptainPrivilege(board.nodes.find((n) => n.id === e.target)) && roleRoots(board).some((n) => n.id === e.source) ? "captain-out" : parentRoleOf(board.nodes.find((n) => n.id === e.target)) === e.source &&
        aspectOf(board.nodes.find((n) => n.id === e.target)) === "information" ? "out-left" : "out",
      targetHandle: "in",
      label: view !== "roles" || roleFocus !== "all" || e.source === selected || e.target === selected || e.id === edgeId ? e.label : undefined,
      selected: e.id === edgeId,
      type: isCaptainPrivilege(board.nodes.find((n) => n.id === e.target)) ? "captain" : "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: isCaptainPrivilege(board.nodes.find((n) => n.id === e.target)) ? captainLinkColor : undefined },
      style: {
        stroke: isCaptainPrivilege(board.nodes.find((n) => n.id === e.target)) ? captainLinkColor : actionAppearance(board.nodes.find((n) => n.id === e.target))?.color || (view === "roles" && (e.source === selected || e.target === selected) ? colors[board.nodes.find((n) => n.id === e.source)?.content.faction || "Neutral"] : e.proposed ? "#aa774b" : "#96968c"),
        strokeWidth: e.id === edgeId || e.source === selected || e.target === selected ? 2.6 : 1.2,
        opacity: view === "roles" && (selected || edgeId) && e.source !== selected && e.target !== selected && e.id !== edgeId ? 0.12 : 0.75,
        strokeDasharray: e.proposed ? "6 4" : undefined,
      },
      labelStyle: { fontSize: 11, fill: "#53584e" },
      labelBgStyle: { fill: "#f6f3ed" },
      labelBgPadding: [5, 4] as [number, number],
    }));
  const card = board?.nodes.find((n) => n.id === selected),
    link = board?.edges.find((e) => e.id === edgeId);
  const connected = card
    ? liveEdges.filter((e) => e.source === card.id || e.target === card.id)
    : [];
  const overview = () =>
    void flow.fitView({
      padding: 0.17,
      duration: 180,
      maxZoom: 1,
      minZoom: 0.08,
    });
  const fit = () => {
    if (view !== "roles" || !filtered.length || !flowFrame.current) return overview();
    const left = Math.min(...filtered.map((n) => n.position.x));
    const top = Math.min(...filtered.map((n) => n.position.y));
    const width = Math.max(...filtered.map((n) => n.position.x + 292)) - left;
    const available = flowFrame.current.clientWidth;
    const scale = Math.max(0.08, Math.min(1, (available - 64) / width));
    void flow.setViewport({ x: (available - width * scale) / 2 - left * scale, y: 56 - top * scale, zoom: scale }, { duration: 180 });
  };
  const showPublicActions = () => {
    if (!publicCards.length || !flowFrame.current || publicTop === null) return;
    const left = Math.min(...publicCards.map((n) => n.position.x));
    const width = Math.max(...publicCards.map((n) => n.position.x + 292)) - left;
    const available = flowFrame.current.clientWidth;
    const scale = Math.max(0.08, Math.min(1, (available - 64) / width));
    setSelected(null);
    setEdgeId(null);
    setDetailsOpen(false);
    void flow.setViewport({ x: (available - width * scale) / 2 - left * scale, y: 56 - publicTop * scale, zoom: scale }, { duration: 180 });
  };
  fitRef.current = fit;
  useEffect(() => {
    if (!board) return;
    const timer = setTimeout(() => {
      if (view === "roles") {
        fit();
        return;
      }
      const viewport = board.viewports[view];
      viewport
        ? void flow.setViewport({
            x: viewport.x,
            y: viewport.y,
            zoom: viewport.zoom,
          })
        : fit();
    }, 100);
    return () => clearTimeout(timer);
  }, [view, board?.id, roleFocus, query, mode, statusFilter, showArchived]);
  useEffect(() => {
    if (view !== "roles" || !flowFrame.current) return;
    const observer = new ResizeObserver(() => fitRef.current());
    observer.observe(flowFrame.current);
    return () => observer.disconnect();
  }, [view, board?.id, roleFocus]);
  function focusNode(id: string) {
    const n = board.nodes.find((n) => n.id === id);
    if (!n) return;
    if (n.tab === "roles") setRoleFocus(actionKeyOf(n) || isCaptainPrivilege(n) ? "all" : parentRoleOf(n) || (aspectOf(n) ? "all" : n.id));
    setQuery("");
    setMode("all");
    setStatusFilter("all");
    if (n.archived) setShowArchived(true);
    setSelected(id);
    setEdgeId(null);
    setDetailsOpen(true);
    setLibraryOpen(false);
    setView(n.tab as View);
    setTimeout(
      () =>
        void flow.setCenter(n.position.x + 150, n.position.y + 110, {
          zoom: 0.9,
          duration: 200,
        }),
      180,
    );
  }
  function changeCard(fn: (n: Card) => void) {
    if (card) commit((next) => fn(next.nodes.find((n) => n.id === card.id)));
  }
  function changeEdge(fn: (e: Link) => void) {
    if (link) commit((next) => fn(next.edges.find((e) => e.id === link.id)));
  }
  function addLink(from: string, to: string, kind = relation) {
    if (!from || !to || from === to) {
      setNotice("Choose two different cards.");
      return;
    }
    const fromNode = board.nodes.find((n) => n.id === from);
    const toNode = board.nodes.find((n) => n.id === to);
    const role = (n: Card | undefined) => n?.tab === "roles" && !aspectOf(n);
    if ((isPublicAction(fromNode) && role(toNode)) || (role(fromNode) && isPublicAction(toNode))) {
      setNotice("Public actions already apply to all roles; no role connection is needed.");
      return;
    }
    const id = uid("relation");
    commit((next) =>
      next.edges.push({
        id,
        source: from,
        target: to,
        relation: kind as any,
        label: kind,
        notes: "",
        sources: [],
        proposed: true,
        archived: false,
      }),
    );
    setSelected(null);
    setEdgeId(id);
    setDetailsOpen(true);
    setModal(null);
  }
  function addCard() {
    if (!newTitle.trim()) return;
    const id = uid();
    const center = flow.screenToFlowPosition({
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.45,
    });
    const n: Card = {
      id,
      tab: newTab as any,
      position: { x: center.x, y: center.y },
      content: {
        title: newTitle.trim(),
        summary: "A new idea to explore.",
        faction: "Neutral",
        modes: [7, 8, 9],
        fields: [
          {
            id: "intent",
            label: "Intent & testable scenario",
            value: "",
            kind: "question",
            sources: [],
          },
        ],
        sources: [],
        status: defaultStatus,
      },
      source: null,
      notes: "",
      proposal: "",
      archived: false,
    };
    commit((next) => {
      next.nodes.push(n);
      Object.assign(next, ensureRoleAspects(next));
    });
    if (newTab === "roles") setRoleFocus(id);
    setModal(null);
    setQuery("");
    setStatusFilter("all");
    setSelected(id);
    setEdgeId(null);
    setDetailsOpen(true);
    setLibraryOpen(false);
    setView(newTab as View);
  }
  async function saveCopy(value = ref.current, title?: string) {
    try {
      const next = copy(value);
      if (title) next.title = title;
      const result = await api("/api/boards", "POST", { board: next });
      load(result);
      setRecovery(null);
      setModal(null);
      await listBoards();
      setNotice("Saved as a separate board. The earlier board is preserved.");
    } catch (e) {
      setNotice(e.message);
    }
  }
  function validateCandidate() {
    if (jsonText.length > 8_000_000) {
      setCandidate(null);
      setNotice("Import rejected: board exceeds 8 MB");
      return;
    }
    try {
      const data = parseBoard(JSON.parse(jsonText));
      setCandidate(data);
      setNotice(
        "Validated: " +
          data.nodes.length +
          " cards, " +
          data.edges.length +
          " connections.",
      );
    } catch (e) {
      setCandidate(null);
      setNotice(
        "Import rejected: " +
          (e.issues?.map((x) => x.message).join("; ") || e.message),
      );
    }
  }
  const sourceInfo = (id: string) => board.sources.find((s) => s.id === id);
  const provenance = (refs: string[]) =>
    refs.length ? (
      <div className="source-chips">
        {refs.map((id) => (
          <button
            key={id}
            onClick={() => {
              setSourceId(id);
              setModal("sources");
            }}
          >
            {sourceInfo(id)?.path.split("/").at(-1) || id}
          </button>
        ))}
      </div>
    ) : (
      <span className="muted">Studio question · no rule approval</span>
    );
  if (!board)
    return (
      <main className="loading">
        <span className="brand-mark">M</span>
        <h1>Opening the design studio</h1>
        <p>{notice || "Loading your local board…"}</p>
      </main>
    );
  const activeCount = board.nodes.filter((n) => !n.archived).length;
  return (
    <div
      className={`app ${view === "events" || view === "winning" ? "review-workspace" : ""} ${view === "roles" ? "roles-workspace" : ""} ${libraryOpen ? "library-open" : ""} ${detailsOpen ? "details-open" : ""}`}
    >
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <strong>GAMEN</strong>
            <small>DESIGN STUDIO</small>
          </div>
        </div>
        <div className="project-name">
          <strong>{board.title}</strong>
          <span>
            {hosted ? "Private online studio" : "Local project"} <i />{" "}
            {saveState} · r{revision}
          </span>
        </div>
        <div className="top-actions">
          <button
            onClick={() => {
              void listBoards();
              setModal("boards");
            }}
          >
            Boards
          </button>
          <button
            onClick={() => {
              setSourceId(null);
              setModal("sources");
            }}
          >
            Sources
          </button>
          <button
            onClick={() => {
              setJsonText("");
              setCandidate(null);
              setModal("import");
            }}
          >
            Import
          </button>
          <button
            onClick={() => {
              setJsonText(JSON.stringify(board, null, 2));
              setModal("export");
            }}
          >
            Export
          </button>
          <button className="primary" onClick={() => void saveNow()}>
            Save now
          </button>
        </div>
      </header>
      <nav className="tabs" aria-label="Primary canvas tabs">
        {tabs.map((t, i) => (
          <button
            key={t}
            className={view === t ? "active" : ""}
            onClick={() => {
              setView(t as View);
              setSelected(null);
              setEdgeId(null);
              setDetailsOpen(false);
              if (t === "roles") setRoleFocus("all");
            }}
          >
            <span>0{i + 1}</span>
            {tabNames[t]}
            <em>
              {board.nodes.filter((n) => n.tab === t && !n.archived).length}
            </em>
          </button>
        ))}
        <a className="development-ideas-tab" href={base + "ideas"}>
          Reference library
        </a>
        <button
          className={"all-tab " + (view === "all" ? "active" : "")}
          onClick={() => {
            setView("all");
            setSelected(null);
            setEdgeId(null);
          }}
        >
          ↗ All connections
        </button>
      </nav>
      <main className="workspace">
        <aside className="library">
          <button
            className="library-dismiss"
            onClick={() => setLibraryOpen(false)}
          >
            Close cards ×
          </button>
          <div className="eyebrow">YOUR DESIGN ATLAS</div>
          <h2>{view === "all" ? "The whole system" : tabNames[view]}</h2>
          <p className="muted">
            {view === "powers"
              ? "Original ideas, with their history intact."
              : view === "roles"
                ? "Every role has a reason to be here."
                : view === "rounds"
                  ? "Make each minute matter."
                  : view === "locations"
                    ? "Places shape choices and information."
                    : "One workspace for rules and decisions."}
          </p>
          <input
            className="search"
            aria-label="Search cards"
            placeholder="Search cards, notes…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) setRoleFocus("all");
            }}
          />
          <div className="filter-row">
            <select
              aria-label="Player count filter"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="all">7 / 8 / 9 players</option>
              {[7, 8, 9].map((n) => (
                <option key={n} value={n}>
                  {n} players
                </option>
              ))}
            </select>
            <select
              aria-label="Rule status filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="current">Current</option>
              <option value="historical">Historical</option>
              <option value="proposal">Proposals</option>
            </select>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />{" "}
            Show archived
          </label>
          <div className="library-heading">
            <span>{filtered.length} CARDS</span>
            <button aria-label="Fit filtered cards" onClick={fit}>
              Fit ↗
            </button>
          </div>
          <div className="card-list">
            {filtered.map((n) => (
              <button
                key={n.id}
                className={selected === n.id ? "chosen" : ""}
                onClick={() => focusNode(n.id)}
              >
                <span
                  className="dot"
                  style={{ background: colors[n.content.faction] }}
                />
                <span>
                  {n.content.title}
                  <small>
                    {effectiveStatus(n).era}
                    {n.archived ? " · archived" : ""}
                  </small>
                </span>
                <span>↗</span>
              </button>
            ))}
          </div>
          <button
            className="add-card"
            onClick={() => {
              setNewTitle("");
              setNewTab(view === "all" ? "roles" : view);
              setModal("new");
            }}
          >
            ＋ Add a card
          </button>
          <div className="library-foot">
            <span className="tiny-label">IMPORTED SOURCE BASELINE</span>
            <strong>
              {board.baseline.engine.replace("full-game-", "")} <span>·</span>{" "}
              {board.baseline.commit.slice(0, 7)}
            </strong>
            <small>
              {activeCount} active cards · {liveEdges.length} connections
            </small>
            <small>Optional powers off · proposals stay separate</small>
          </div>
        </aside>
        <section
          className="canvas-area"
          aria-label={`${tabNames[view]} canvas`}
        >
          <div className="canvas-toolbar">
            <div>
              <button
                className="library-toggle"
                onClick={() => setLibraryOpen((v) => !v)}
              >
                Cards
              </button>
              <button aria-label="Undo" disabled={!past.length} onClick={undo}>
                ↶
              </button>
              <button
                aria-label="Redo"
                disabled={!future.length}
                onClick={redo}
              >
                ↷
              </button>
              <span className="divider" />
              <button
                onClick={() => {
                  setLinkFrom(card?.id || board.nodes[0].id);
                  setLinkTo("");
                  setRelation("depends-on");
                  setModal("connect");
                }}
              >
                ↗ Connect cards
              </button>
            </div>
            <div>
              {view === "roles" && <button className="role-overview" onClick={overview}>Overview</button>}
              <button onClick={fit}>{view === "roles" ? "⌗ Fit columns" : "⌗ Fit canvas"}</button>
              <button
                className="details-toggle"
                onClick={() => setDetailsOpen((v) => !v)}
              >
                Details
              </button>
            </div>
          </div>
          {view === "roles" && (
            <div className="role-focusbar">
              <label>
                ROLE WORKSPACE
                <select
                  aria-label="Role workspace"
                  value={roleFocus}
                  onChange={(e) => {
                    setRoleFocus(e.target.value);
                    setQuery("");
                    setSelected(null);
                    setEdgeId(null);
                    setDetailsOpen(false);
                  }}
                >
                  <option value="all">All roles & aspects</option>
                  {roleRoots(board)
                    .filter((n) => showArchived || !n.archived)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.content.title}
                      </option>
                    ))}
                </select>
              </label>
              <span>Roles grouped by action · Public actions below</span>
              {board.nodes.some((n) => !n.archived && isCaptainPrivilege(n)) && <button className="captain-jump" onClick={() => focusNode(board.nodes.find((n) => !n.archived && isCaptainPrivilege(n)).id)}>Captain ↓</button>}
              <button className="public-actions-jump" onClick={showPublicActions} disabled={!publicCards.length}>Public actions ↓</button>
              <button
                onClick={() => {
                  commit((b) =>
                    Object.assign(b, ensureRoleAspects(b, { arrange: true })),
                  );
                  setRoleFocus("all");
                  setQuery("");
                  setMode("all");
                  setStatusFilter("all");
                  setSelected(null);
                  setEdgeId(null);
                  setDetailsOpen(false);
                  setTimeout(() => fitRef.current(), 100);
                }}
              >
                Arrange by action
              </button>
            </div>
          )}
          {view === "events" || view === "winning" ? <DecisionReview view={view} nodes={filtered} onEdit={id => { setSelected(id); setEdgeId(null); setDetailsOpen(true); }} /> : <div ref={flowFrame} className={view === "roles" ? "role-flow-frame" : "flow-frame"}>
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              minZoom={0.08}
              maxZoom={2}
              panOnScroll={view === "roles"}
              panOnScrollMode={PanOnScrollMode.Vertical}
              zoomOnScroll={view !== "roles"}
              zoomActivationKeyCode={["Control", "Meta"]}
              fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
              onNodeClick={(_, n) => {
                setSelected(n.id);
                setEdgeId(null);
                setDetailsOpen(true);
              }}
              onEdgeClick={(_, e) => {
                setEdgeId(e.id);
                setSelected(null);
                setDetailsOpen(true);
              }}
              onPaneClick={() => {
                setSelected(null);
                setEdgeId(null);
              }}
              onConnect={(c: Connection) =>
                addLink(c.source, c.target, "depends-on")
              }
              onNodeDragStart={() => {
                dragStart.current = copy(ref.current);
              }}
              onNodesChange={(changes) => {
                const dimensions = changes.filter(
                  (c) => c.type === "dimensions" && c.dimensions,
                );
                if (dimensions.length)
                  setNodeSizes((prev) => {
                    const next = { ...prev };
                    for (const d of dimensions)
                      if (d.type === "dimensions") next[d.id] = d.dimensions;
                    return next;
                  });
                const positions = changes.filter(
                  (c) => c.type === "position" && c.position,
                );
                if (!positions.length) return;
                const next = copy(ref.current);
                for (const c of positions) {
                  if (c.type !== "position") continue;
                  const n = next.nodes.find((n) => n.id === c.id);
                  if (n) {
                    n.position = {
                      x: c.position.x - (view === "all" ? sectionOffset[n.tab].x : 0),
                      y: c.position.y - (view === "all" ? sectionOffset[n.tab].y : 0),
                    };
                  }
                }
                if (dragStart.current) update(next);
                else
                  commit((n) => {
                    n.nodes = next.nodes;
                  });
              }}
              onNodeDragStop={() => {
                if (dragStart.current) {
                  const before = dragStart.current;
                  dragStart.current = null;
                  commit(() => {}, before);
                }
              }}
              onMoveEnd={(_, viewport) => {
                setZoom(Math.round(viewport.zoom * 100));
                const next = copy(ref.current);
                if (!next) return;
                next.viewports[view] = viewport;
                update(next);
              }}
              deleteKeyCode={null}
              nodesFocusable
              edgesFocusable
              defaultEdgeOptions={{ interactionWidth: 24 }}
            >
              <Background color="#c9c7bb" gap={22} size={1} />
              <Controls showInteractive={false} onFitView={fit} />
              {view !== "roles" && (
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={(n) =>
                    isCaptainPrivilege((n.data as any).card) ? captainColor : actionAppearance((n.data as any).card)?.color || colors[(n.data as any).card.content.faction]
                  }
                  maskColor="rgba(240,237,229,.7)"
                />
              )}
            </ReactFlow>
            {view === "roles" && <RoleColumnHeadings publicTop={publicTop} />}
          </div>}
          {!filtered.length && (
            <div className="empty-canvas">
              No cards match these filters.
              <button
                onClick={() => {
                  setQuery("");
                  setMode("all");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          <div className="canvas-caption">
            <span>
              {view === "all"
                ? "All tabs share these stable card IDs."
                : view === "roles" ? "Scroll through roles · drag to arrange · pinch or + / − to zoom" : "Drag cards · pan the background · scroll to zoom"}
            </span>
            <span>
              {flowEdges.length} visible links · {zoom}%
            </span>
          </div>
        </section>
        <aside className="inspector" aria-label="Selection inspector">
          {!card && (
            <button
              className="inspector-dismiss"
              onClick={() => setDetailsOpen(false)}
            >
              Close details ×
            </button>
          )}
          {card ? (
            <>
              <div className="inspector-heading">
                <span className="eyebrow">CARD INSPECTOR</span>
                <button
                  aria-label="Close inspector selection"
                  onClick={() => {
                    setSelected(null);
                    setDetailsOpen(false);
                  }}
                >
                  ×
                </button>
              </div>
              <div className="badges">
                {Object.entries(
                  effectiveStatus(card) as Record<string, string>,
                ).map(([key, value]) => (
                  <span
                    key={key}
                    title={key}
                    className={key === "era" ? value : ""}
                  >
                    {cleanLabel(value)}
                  </span>
                ))}
              </div>
              {edited(card) && card.source && (
                <p className="callout">
                  Edited content is a proposal. The imported source remains
                  below for comparison.
                </p>
              )}
              <Editor
                label="Card title"
                value={card.content.title}
                onCommit={(v) => {
                  if (v.trim()) changeCard((n) => (n.content.title = v));
                }}
              />
              <Editor
                label="Summary"
                multiline
                value={card.content.summary}
                onCommit={(v) => changeCard((n) => (n.content.summary = v))}
              />
              <div className="filter-row">
                <label className="field">
                  <span>Faction</span>
                  <select
                    aria-label="Card faction"
                    value={card.content.faction}
                    onChange={(e) =>
                      changeCard(
                        (n) => (n.content.faction = e.target.value as any),
                      )
                    }
                  >
                    {["Blue", "Red", "Alien", "Neutral"].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Canvas tab</span>
                  <select
                    aria-label="Card tab"
                    value={card.tab}
                    onChange={(e) =>
                      changeCard((n) => (n.tab = e.target.value as any))
                    }
                  >
                    {tabs.map((t) => (
                      <option key={t} value={t}>
                        {tabNames[t]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mode-options">
                {[7, 8, 9].map((m) => (
                  <label key={m}>
                    <input
                      type="checkbox"
                      aria-label={`Available in ${m}-player games`}
                      checked={card.content.modes.includes(m as any)}
                      onChange={(e) =>
                        changeCard(
                          (n) =>
                            (n.content.modes = e.target.checked
                              ? [...n.content.modes, m as any].sort()
                              : n.content.modes.filter((x) => x !== m)),
                        )
                      }
                    />
                    {m} players
                  </label>
                ))}
              </div>
              <div className="mini-actions">
                <button
                  disabled={isCaptainPrivilege(card)}
                  title={isCaptainPrivilege(card) ? "Captain is one shared office for all roles." : undefined}
                  onClick={() => {
                    const id = uid("copy");
                    commit((b) =>
                      Object.assign(
                        b,
                        duplicateRoleFamily(
                          b,
                          parentRoleOf(card) || card.id,
                          id,
                        ),
                      ),
                    );
                    if (card.tab === "roles") setRoleFocus(actionKeyOf(card) ? "all" : id);
                    setSelected(id);
                  }}
                >
                  {isCaptainPrivilege(card) ? "Shared privilege" : actionKeyOf(card) ? "Duplicate action" : card.tab === "roles"
                    ? "Duplicate role & aspects"
                    : "Duplicate"}
                </button>
                <button
                  onClick={() =>
                    commit((b) => {
                      for (const n of b.nodes.filter(
                        (n) => n.id === card.id || (parentRoleOf(n) === card.id && !isOriginalAction(b, n.id)),
                      ))
                        n.archived = !card.archived;
                    })
                  }
                >
                  {card.archived
                    ? "Restore card"
                    : card.tab === "roles" && !aspectOf(card) && !isCaptainPrivilege(card)
                      ? "Archive role & aspects"
                      : "Archive"}
                </button>
                <button
                  onClick={() => {
                    setView("all");
                    setQuery("");
                    setMode("all");
                    setStatusFilter("all");
                    setTimeout(
                      () =>
                        void flow.fitView({
                          nodes: [
                            { id: card.id },
                            ...connected.map((e) => ({
                              id: e.source === card.id ? e.target : e.source,
                            })),
                          ],
                          padding: 0.3,
                          maxZoom: 0.9,
                          duration: 180,
                        }),
                      120,
                    );
                  }}
                >
                  Explore links
                </button>
              </div>
              <details open>
                <summary>
                  Rules & design detail{" "}
                  <span>{card.content.fields.length}</span>
                </summary>
                {card.content.fields
                  .filter((f) => !f.id.startsWith("studio-"))
                  .map((f) => (
                    <div key={f.id} className="fact">
                      <div className="field-kind">
                        {f.kind === "interpretation"
                          ? "DESIGN INTERPRETATION"
                          : f.kind === "question"
                            ? "OPEN QUESTION"
                            : "SOURCED FACT"}
                      </div>
                      <Editor
                        label={isCaptainAction(card) && f.id === "eligibility" ? "Original role eligibility · Captain required" : isPublicAction(card) && f.id === "eligibility" ? "Role exceptions & eligibility" : f.label}
                        multiline
                        value={f.value}
                        onCommit={(v) =>
                          changeCard((n) => {
                            n.content.fields.find((x) => x.id === f.id).value =
                              v;
                          })
                        }
                      />
                      {provenance(f.sources)}
                    </div>
                  ))}
              </details>
              <details open>
                <summary>Owner notebook</summary>
                <Editor
                  label="Notes"
                  multiline
                  value={card.notes}
                  onCommit={(v) => changeCard((n) => (n.notes = v))}
                />
                <Editor
                  label="Proposal & test scenario"
                  multiline
                  value={card.proposal}
                  onCommit={(v) => changeCard((n) => (n.proposal = v))}
                />
                <p className="muted">
                  Notes and proposals survive source refresh. A proposal here
                  changes no game rule.
                </p>
              </details>
              {actionKeyOf(card) && originalActionCards(board, card).length > 0 && (
                <details>
                  <summary>Original role cards & notes</summary>
                  <p className="muted">The earlier per-role Action cards are retained with their original text, notes and proposals.</p>
                  {originalActionCards(board, card).map((original) => (
                    <button className="original-action-link" key={original.id} onClick={() => focusNode(original.id)}>
                      {original.content.title}{original.notes || original.proposal || edited(original) ? " · has design changes" : ""} ↗
                    </button>
                  ))}
                </details>
              )}
              <details open>
                <summary>
                  Connections <span>{connected.length}</span>
                </summary>
                {connected.map((e) => {
                  const other = board.nodes.find(
                    (n) =>
                      n.id === (e.source === card.id ? e.target : e.source),
                  );
                  return (
                    <div className="related" key={e.id}>
                      <button
                        onClick={() => {
                          setEdgeId(e.id);
                          setSelected(null);
                        }}
                      >
                        {e.source === card.id ? "→" : "←"} {e.label}
                      </button>
                      <button onClick={() => focusNode(other.id)}>
                        <strong>{other.content.title}</strong>
                        <small>{tabNames[other.tab]} ↗</small>
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={() => {
                    setLinkFrom(card.id);
                    setLinkTo("");
                    setModal("connect");
                  }}
                >
                  ＋ Connect to any tab
                </button>
              </details>
              <details>
                <summary>Original source & provenance</summary>
                <p className="muted">Stable ID: {card.id}</p>
                {card.source ? (
                  <>
                    <strong>{card.source.title}</strong>
                    <p>{card.source.summary}</p>
                    {card.source.fields.map((f) => (
                      <div className="original-field" key={f.id}>
                        <b>{f.label}</b>
                        <p>{f.value}</p>
                      </div>
                    ))}
                    {provenance(card.source.sources)}
                  </>
                ) : (
                  <p>New studio proposal; no imported original.</p>
                )}
              </details>
            </>
          ) : link ? (
            <>
              <span className="eyebrow">CONNECTION INSPECTOR</span>
              <h2>
                {board.nodes.find((n) => n.id === link.source)?.content.title}{" "}
                <span className="arrow">→</span>{" "}
                {board.nodes.find((n) => n.id === link.target)?.content.title}
              </h2>
              <p className="callout">
                {link.proposed
                  ? "Proposed relationship · needs review"
                  : "Sourced relationship"}
              </p>
              <label className="field">
                <span>Relationship</span>
                <select
                  aria-label="Relationship"
                  value={link.relation}
                  onChange={(e) =>
                    changeEdge((x) => {
                      x.relation = e.target.value as any;
                      x.proposed = true;
                    })
                  }
                >
                  {relations.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>From card</span>
                <select
                  aria-label="Edit connection source"
                  value={link.source}
                  onChange={(e) =>
                    changeEdge((x) => {
                      x.source = e.target.value;
                      x.proposed = true;
                    })
                  }
                >
                  {board.nodes
                    .filter((n) => n.id !== link.target)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {tabNames[n.tab]} · {n.content.title}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                <span>To card</span>
                <select
                  aria-label="Edit connection target"
                  value={link.target}
                  onChange={(e) =>
                    changeEdge((x) => {
                      x.target = e.target.value;
                      x.proposed = true;
                    })
                  }
                >
                  {board.nodes
                    .filter((n) => n.id !== link.source)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {tabNames[n.tab]} · {n.content.title}
                      </option>
                    ))}
                </select>
              </label>
              <Editor
                label="Connection label"
                value={link.label}
                onCommit={(v) => {
                  if (v.trim())
                    changeEdge((x) => {
                      x.label = v;
                      x.proposed = true;
                    });
                }}
              />
              <Editor
                label="Connection notes"
                multiline
                value={link.notes}
                onCommit={(v) => changeEdge((x) => (x.notes = v))}
              />
              <button
                onClick={() => {
                  changeEdge((x) => (x.archived = true));
                  setEdgeId(null);
                }}
              >
                Archive connection
              </button>
              <h4>Source evidence</h4>
              {provenance(link.sources)}
              <div className="mini-actions">
                <button onClick={() => focusNode(link.source)}>
                  Go to source ↗
                </button>
                <button onClick={() => focusNode(link.target)}>
                  Go to target ↗
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="eyebrow">CREATIVE WORKBENCH</div>
              <h2>
                Make room
                <br />
                for better play.
              </h2>
              <p className="intro">
                A living atlas of roles, choices and consequences. Select a card
                to see the rule, its evidence and the questions worth testing.
              </p>
              <div className="studio-note">
                <span>01 / INFORMATION</span>
                <h3>Can players tell a claim from a fact?</h3>
                <p>
                  Start with Hacker, Alien and the Hack sequence. Keep the
                  approved bluffing intact; test how well people understand what
                  was actually learned.
                </p>
                <button onClick={() => focusNode("hacker")}>
                  Explore Hacker ↗
                </button>
              </div>
              <div className="studio-note">
                <span>02 / AGENCY</span>
                <h3>Does Hospital create urgency or downtime?</h3>
                <p>
                  Keep the approved deadline. Test whether injured players can
                  name a useful choice and understand their remaining Rescue
                  opportunity.
                </p>
                <button onClick={() => focusNode("medical-deadline")}>
                  Explore the deadline ↗
                </button>
              </div>
              <div className="studio-note">
                <span>03 / ASYMMETRY</span>
                <h3>What changes when someone holds office?</h3>
                <p>
                  Captain appoints Officer. Both are public offices layered over
                  secret roles. Compare the public responsibilities with each
                  player’s private abilities.
                </p>
                <button onClick={() => { setView("events"); focusNode("event_spaceship_commander"); }}>
                  Explore Spaceship Commander ↗
                </button>
              </div>
              <p className="muted">
                These are design questions, not reopened owner decisions. No
                human balance result is claimed.
              </p>
            </>
          )}
        </aside>
      </main>
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && modal !== "recovery")
              setModal(null);
          }}
        >
          <section
            className={
              "modal " +
              (["sources", "refresh", "export", "import"].includes(modal)
                ? "wide"
                : "")
            }
            role="dialog"
            aria-modal="true"
            aria-label={modal === "new" ? "Add a card" : modal}
          >
            <header>
              <h2>
                {
                  {
                    new: "Add a card",
                    connect: "Connect across the atlas",
                    boards: "Your design boards",
                    sources: "Sources & release evidence",
                    refresh: "Review source changes",
                    export: "Export a complete backup",
                    import: "Import or compare a board",
                    recovery: "Unsaved browser draft found",
                  }[modal]
                }
              </h2>
              <button
                aria-label="Close dialog"
                disabled={modal === "recovery"}
                onClick={() => setModal(null)}
              >
                ×
              </button>
            </header>
            {modal === "new" && (
              <>
                <label className="field">
                  <span>Title</span>
                  <input
                    autoFocus
                    aria-label="New card title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Tab</span>
                  <select
                    aria-label="New card tab"
                    value={newTab}
                    onChange={(e) => setNewTab(e.target.value)}
                  >
                    {tabs.map((t) => (
                      <option key={t} value={t}>
                        {tabNames[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <p>New cards start as unreviewed proposals.</p>
                <button
                  className="primary"
                  disabled={!newTitle.trim()}
                  onClick={addCard}
                >
                  Create card
                </button>
              </>
            )}
            {modal === "connect" && (
              <>
                <label className="field">
                  <span>From</span>
                  <select
                    aria-label="Connection source"
                    value={linkFrom}
                    onChange={(e) => setLinkFrom(e.target.value)}
                  >
                    {board.nodes
                      .filter((n) => !n.archived)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {tabNames[n.tab]} · {n.content.title}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field">
                  <span>Relationship</span>
                  <select
                    aria-label="New relationship"
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                  >
                    {relations.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>To</span>
                  <select
                    aria-label="Connection target"
                    value={linkTo}
                    onChange={(e) => setLinkTo(e.target.value)}
                  >
                    <option value="">Choose a card from any tab</option>
                    {board.nodes
                      .filter((n) => !n.archived && n.id !== linkFrom)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {tabNames[n.tab]} · {n.content.title}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  className="primary"
                  disabled={!linkTo}
                  onClick={() => addLink(linkFrom, linkTo)}
                >
                  Create connection
                </button>
              </>
            )}
            {modal === "boards" && (
              <>
                <Editor
                  label="Board name"
                  value={board.title}
                  onCommit={(v) => {
                    if (v.trim()) commit((b) => (b.title = v));
                  }}
                />
                <div className="board-list">
                  {boards.map((b) => (
                    <button
                      key={b.id}
                      onClick={async () => {
                        if (await saveNow()) await openSaved(b.id);
                      }}
                    >
                      <strong>{b.title}</strong>
                      <span>
                        r{b.revision}
                        {b.id === board.id ? " · open" : " · Open"}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() =>
                    void saveCopy(ref.current, board.title + " · copy")
                  }
                >
                  Save current as a new board
                </button>
                <button
                  onClick={async () => {
                    load(await api("/api/boards/" + board.id));
                    setModal(null);
                  }}
                >
                  Reopen saved version
                </button>
                {hosted && (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          setRevisions(
                            (
                              await api(
                                "/api/boards/" + board.id + "/revisions",
                              )
                            ).revisions,
                          );
                        } catch (e) {
                          setNotice(e.message);
                        }
                      }}
                    >
                      View saved revisions
                    </button>
                    {revisions.length > 0 && (
                      <div className="board-list">
                        {revisions.map((r) => (
                          <button
                            key={r.revision}
                            onClick={async () => {
                              try {
                                const old = await api(
                                  "/api/boards/" +
                                    board.id +
                                    "?revision=" +
                                    r.revision,
                                );
                                await saveCopy(
                                  old.board,
                                  old.board.title +
                                    " · recovered r" +
                                    r.revision,
                                );
                              } catch (e) {
                                setNotice(e.message);
                              }
                            }}
                          >
                            <strong>
                              Recover revision {r.revision} as a copy
                            </strong>
                            <span>
                              {new Date(r.createdAt).toLocaleString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <p className="muted">
                  {hosted ? "Storage" : "Disk data"}: {dataPath}
                  <br />
                  {hosted
                    ? "Each save retains the previous online revision. Use"
                    : "Each save preserves the prior revision under backups/. Use"}
                  Export for a portable backup.
                </p>
              </>
            )}
            {modal === "sources" && (
              <>
                <div className="baseline">
                  <b>Playable baseline · {board.baseline.commit.slice(0, 7)}</b>
                  <span>
                    {board.baseline.engine} · {board.baseline.art}
                  </span>
                  <span>{board.baseline.ruleset}</span>
                  <small>
                    Reviewed {board.baseline.reviewedOn} · PR #154 draft /
                    unmerged at review
                  </small>
                </div>
                <p>
                  Authority, implementation and evidence are separate. The newer
                  Designer index is historical about staging adoption; the
                  release record establishes what this baseline includes.
                </p>
                <div className="mini-actions">
                  <button
                    className="primary"
                    onClick={async () => {
                      const fresh = parseBoard(await api("/api/seed"));
                      setCandidate(fresh);
                      setModal("refresh");
                    }}
                  >
                    Compare bundled sources
                  </button>
                  <button
                    onClick={() => {
                      setCandidate(null);
                      setJsonText("");
                      setModal("import");
                    }}
                  >
                    Compare an exported source board
                  </button>
                </div>
                <div className="sources-list">
                  {board.sources
                    .filter((s) => !sourceId || s.id === sourceId)
                    .map((s) => (
                      <article key={s.id}>
                        <span className="eyebrow">
                          {s.kind} · {s.reviewedOn}
                        </span>
                        <a
                          href={s.privateRecord ? undefined : `https://github.com/Amirkianfar66/GameN/blob/${s.commit}/${s.path}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {s.path} ↗
                        </a>
                        <p>{s.selector}</p>
                        <small>{s.version}</small>
                        <code>
                          commit {s.commit}
                          <br />
                          sha256 {s.sha256}
                        </code>
                      </article>
                    ))}
                </div>
                {sourceId && (
                  <button onClick={() => setSourceId(null)}>
                    Show all {board.sources.length} sources
                  </button>
                )}
              </>
            )}
            {modal === "export" && (
              <>
                <p>
                  Version 1 contains every card, original source, local edit,
                  note, archive, position and cross-tab connection. Reimport
                  creates a separate board.
                </p>
                <textarea
                  className="json"
                  aria-label="Export JSON"
                  readOnly
                  value={jsonText}
                />
                <button
                  className="primary"
                  onClick={() => {
                    const blob = new Blob([jsonText], {
                        type: "application/json",
                      }),
                      url = URL.createObjectURL(blob),
                      a = document.createElement("a");
                    a.href = url;
                    a.download = `gamen-studio-${board.id}-v1.json`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  Download JSON backup
                </button>
              </>
            )}
            {modal === "import" && (
              <>
                <p>
                  Choose a version 1 studio JSON or paste it below. Unknown
                  versions, duplicate IDs, missing provenance and broken
                  connections are rejected. Nothing is overwritten.
                </p>
                <input
                  aria-label="Choose board JSON"
                  type="file"
                  accept=".json,application/json"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 8e6) {
                      setNotice("Import exceeds 8 MB");
                      return;
                    }
                    setJsonText(await f.text());
                    setCandidate(null);
                  }}
                />
                <textarea
                  className="json"
                  aria-label="Import JSON"
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    setCandidate(null);
                  }}
                  placeholder="Paste a complete studio export…"
                />
                <div className="mini-actions">
                  <button onClick={validateCandidate}>Validate JSON</button>
                  <button
                    className="primary"
                    disabled={!candidate}
                    onClick={() =>
                      void saveCopy(candidate, candidate.title + " · imported")
                    }
                  >
                    Import as new board
                  </button>
                  <button
                    disabled={!candidate}
                    onClick={() => setModal("refresh")}
                  >
                    Compare source updates
                  </button>
                </div>
                {candidate && (
                  <p className="success">
                    Valid: {candidate.nodes.length} cards ·{" "}
                    {candidate.edges.length} connections
                  </p>
                )}
              </>
            )}
            {modal === "refresh" && candidate && (
              <>
                <p>
                  Three-way comparison with the imported originals. Owner notes,
                  positions, archived state and proposals are preserved. Edited
                  fields stay yours. Existing connections are retained; new
                  source connections are added.
                </p>
                <p className="callout">
                  {candidate.baseline.commit.slice(0, 7)} ·{" "}
                  {candidate.baseline.ruleset}
                </p>
                {refreshPlan(board, candidate).length === 0 ? (
                  <p className="success">
                    No card source changes. Your local edits remain separate.
                  </p>
                ) : (
                  refreshPlan(board, candidate).map((change) => (
                    <details key={change.id}>
                      <summary>
                        {change.kind.toUpperCase()} ·{" "}
                        {change.after?.title ||
                          change.before?.title ||
                          change.id}
                      </summary>
                      <div className="diff-columns">
                        <div>
                          <b>Previous original</b>
                          <pre>{JSON.stringify(change.before, null, 2)}</pre>
                        </div>
                        <div>
                          <b>Incoming original</b>
                          <pre>{JSON.stringify(change.after, null, 2)}</pre>
                        </div>
                      </div>
                    </details>
                  ))
                )}
                <details>
                  <summary>
                    Relationship comparison · existing links are preserved
                  </summary>
                  {candidate.edges
                    .filter((e) => {
                      const local = board.edges.find((x) => x.id === e.id);
                      return local && !same(local, e);
                    })
                    .map((e) => (
                      <div className="original-field" key={e.id}>
                        <b>
                          {e.source} → {e.target}
                        </b>
                        <p>
                          Saved: {board.edges.find((x) => x.id === e.id)?.label}
                          <br />
                          Incoming: {e.label}
                          <br />
                          Metadata differs; compare provenance in the exported
                          records before manually adopting.
                        </p>
                      </div>
                    ))}
                  <p>
                    {
                      candidate.edges.filter(
                        (e) => !board.edges.some((x) => x.id === e.id),
                      ).length
                    }{" "}
                    new source connections will be added.{" "}
                    {
                      board.edges.filter(
                        (e) => !candidate.edges.some((x) => x.id === e.id),
                      ).length
                    }{" "}
                    saved connections absent from this source will be retained.
                  </p>
                </details>
                <p className="muted">
                  Missing source cards are kept. Changed existing relationships
                  need manual review in the connection inspector; this refresh
                  never replaces them.
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    try {
                      const next = applyRefresh(board, candidate);
                      commit((b) => Object.assign(b, next));
                      setModal(null);
                      setNotice(
                        "Source refresh applied. Owner work preserved; Undo remains available.",
                      );
                    } catch (e) {
                      setNotice(e.message);
                    }
                  }}
                >
                  Apply source refresh
                </button>
              </>
            )}
            {modal === "recovery" && recovery && (
              <>
                <p>
                  A browser draft was not confirmed saved. Storage is revision{" "}
                  {revision}; draft started at revision {recovery.baseRevision}.
                  Keep both safely by saving the draft as a separate board.
                </p>
                <button
                  className="primary"
                  onClick={() =>
                    void saveCopy(
                      recovery.board,
                      recovery.board.title + " · recovered",
                    )
                  }
                >
                  Recover as separate board
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem(storageKey("draft:" + board.id));
                    blocked.current = false;
                    setRecovery(null);
                    setModal(null);
                  }}
                >
                  Use saved board
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
