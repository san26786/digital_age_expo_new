"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios, { isAxiosError } from "axios";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  AlertTriangle,
  CornerDownRight,
  Copy,
  Search,
} from "lucide-react";

import { ModalPortal } from "@/components/ui/ModalPortal";
import {
  PANEL,
  PANEL_FLUSH,
  PANEL_TOOLBAR,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_ICON,
  BTN_ICON_DANGER,
  INPUT_FIELD,
  INPUT_SEARCH,
  INPUT_SEARCH_ICON,
  FORM_LABEL,
  FORM_HINT,
  BADGE_SUCCESS,
  BADGE_NEUTRAL,
  MODAL_OVERLAY,
  MODAL_PANEL,
  MODAL_PANEL_WIDE,
  MODAL_HEADER,
  MODAL_HEADER_ICON,
  MODAL_TITLE,
  MODAL_SUBTITLE,
  MODAL_CLOSE,
  MODAL_FOOTER,
  ALERT_ERROR,
  ALERT_SUCCESS,
  TABLE,
  TABLE_HEAD_ROW,
  TABLE_TH,
  TABLE_BODY,
  TABLE_ROW,
  TABLE_CELL,
  TABLE_EMPTY,
} from "@/components/ui/membersTheme";

interface MenuRow {
  id: number;
  title: string;
  seq: number;
  parentId: number | null;
  parentTitle: string | null;
  actionType: string | null;
  actionLabel: string;
  targetLabel: string | null;
  active: boolean;
  postAssetId: number | null;
  layoutId: number | null;
  networkingRoomId: number | null;
  exhibitorId: number | null;
  chatUserId: number | null;
}

interface Option {
  id: number;
  label: string;
}

interface Options {
  parents: Option[];
  layouts: Option[];
  rooms: Option[];
  assets: Option[];
  exhibitors: Option[];
}

interface ActionType {
  value: string;
  label: string;
}

/** An event whose menu can be cloned into this one — read live, never a fixed list. */
interface SourceEvent {
  eventId: number;
  title: string;
  itemCount: number;
}

const EMPTY_OPTIONS: Options = { parents: [], layouts: [], rooms: [], assets: [], exhibitors: [] };

/** Which extra select each action type needs — mirrors ACTION_TARGET_FIELD on the server. */
const TARGET_FOR: Record<string, keyof Options | null> = {
  layout: "layouts",
  networking_room: "rooms",
  asset: "assets",
  exhibitor_list: "exhibitors",
};

const TARGET_LABEL: Record<string, string> = {
  layout: "Layout / Zone",
  networking_room: "Networking Room",
  asset: "Asset",
  exhibitor_list: "Exhibitor",
};

const TARGET_FIELD: Record<string, string> = {
  layout: "layout_id",
  networking_room: "networking_room_id",
  asset: "post_asset_id",
  exhibitor_list: "exhibitor_id",
};

interface FormState {
  id?: number;
  title: string;
  seq: string;
  parent_id: string;
  post_action_type: string;
  layout_id: string;
  networking_room_id: string;
  post_asset_id: string;
  exhibitor_id: string;
  active: boolean;
}

const BLANK_FORM: FormState = {
  title: "",
  seq: "0",
  parent_id: "",
  post_action_type: "",
  layout_id: "",
  networking_room_id: "",
  post_asset_id: "",
  exhibitor_id: "",
  active: true,
};

/**
 * ---------------------------------------------------------------------------
 * Event menu manager — what the lobby footer shows.
 * ---------------------------------------------------------------------------
 *
 * Every row here is a `find_event_lobby_menu` record, the exact table the public lobby's
 * getLobbyFooterMenu() reads. Add an item and it appears along the bottom of
 * /virtual-event/[slug]; hide one and it disappears for every visitor. There is no second copy of
 * the menu to keep in step.
 *
 * A row with a parent renders as a child inside that parent's dropdown, which is how the live
 * footer produces "Auditorium (6)" and "Exhibitors (40)" — the number is simply the child count.
 */
export function EventMenuManager({ eventId }: { eventId: number }) {
  const [items, setItems] = useState<MenuRow[]>([]);
  const [options, setOptions] = useState<Options>(EMPTY_OPTIONS);
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [sourceEvents, setSourceEvents] = useState<SourceEvent[]>([]);
  const [copyFrom, setCopyFrom] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(
    async (options?: { background?: boolean }) => {
      if (!options?.background) setLoading(true);
      try {
        const res = await axios.get(`/api/members/event-menu?event_id=${eventId}`);
        setItems(res.data.items ?? []);
        setOptions(res.data.options ?? EMPTY_OPTIONS);
        setActionTypes(res.data.actionTypes ?? []);
        setSourceEvents(res.data.sourceEvents ?? []);
        setError(null);
      } catch (err) {
        setError(
          isAxiosError(err) && err.response?.data?.error
            ? String(err.response.data.error)
            : "Could not load the event menu."
        );
      } finally {
        setLoading(false);
      }
    },
    [eventId]
  );

  useEffect(() => {
    load();
  }, [load]);

  // topLevel stays the FULL list: it is what reorderLobbyMenu writes, so it must not depend on
  // what the search happens to be showing.
  const topLevel = items.filter((i) => !i.parentId);
  const childrenOf = (id: number) => items.filter((i) => i.parentId === id);

  const searching = query.trim().length > 0;

  /**
   * Search across a two-level tree.
   *
   * A flat "does this row match" filter breaks the hierarchy: typing "micro business" matches 24
   * children whose parent ("Exhibition Halls") does not match, so they would render as orphans
   * with no heading. So a parent is kept when it matches OR any of its children do, and a child
   * is kept when it matches OR its parent does — which is what makes searching a parent's name
   * show the whole group, and searching a child's name show it in context.
   *
   * Matching is on the visible columns only (title, action, destination) — the things actually
   * on screen to search for.
   */
  const visible = useMemo(() => {
    if (!searching) return topLevel.map((row) => ({ row, kids: childrenOf(row.id) }));

    const needle = query.trim().toLowerCase();
    const hit = (i: MenuRow) =>
      [i.title, i.actionLabel, i.targetLabel].some((v) => (v ?? "").toLowerCase().includes(needle));

    return topLevel
      .map((row) => {
        const kids = childrenOf(row.id);
        return hit(row) ? { row, kids } : { row, kids: kids.filter(hit) };
      })
      .filter((group) => hit(group.row) || group.kids.length > 0);
    // items covers both halves of the tree, so it is the only real dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, searching]);

  const shownCount = visible.reduce((n, g) => n + 1 + g.kids.length, 0);

  function openAdd() {
    setForm({ ...BLANK_FORM, seq: String(topLevel.length + 1) });
  }

  function openEdit(row: MenuRow) {
    setForm({
      id: row.id,
      title: row.title,
      seq: String(row.seq),
      parent_id: row.parentId ? String(row.parentId) : "",
      post_action_type: row.actionType ?? "",
      layout_id: row.layoutId ? String(row.layoutId) : "",
      networking_room_id: row.networkingRoomId ? String(row.networkingRoomId) : "",
      post_asset_id: row.postAssetId ? String(row.postAssetId) : "",
      exhibitor_id: row.exhibitorId ? String(row.exhibitorId) : "",
      active: row.active,
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await axios.post("/api/members/event-menu", { ...form, event_id: eventId });
      setNotice(form.id ? "Menu item updated." : "Menu item added.");
      setForm(null);
      load({ background: true });
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Could not save this menu item."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: MenuRow) {
    setError(null);
    // Optimistic: hiding an item is a one-field change and the row is already on screen.
    setItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, active: !i.active } : i)));
    try {
      await axios.post("/api/members/event-menu", { action: "toggle", id: row.id, active: !row.active });
    } catch {
      setItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, active: row.active } : i)));
      setError("Could not change visibility.");
    }
  }

  async function remove(row: MenuRow) {
    const kids = childrenOf(row.id).length;
    const warning = kids
      ? `Delete "${row.title}"? Its ${kids} sub-item${kids === 1 ? "" : "s"} will be kept and moved to the top level.`
      : `Delete "${row.title}"?`;
    if (!window.confirm(warning)) return;

    setError(null);
    try {
      await axios.delete(`/api/members/event-menu?id=${row.id}`);
      setNotice("Menu item deleted.");
      load({ background: true });
    } catch {
      setError("Could not delete this menu item.");
    }
  }

  /** Move a top-level item up or down and persist the whole new order. */
  async function move(row: MenuRow, direction: -1 | 1) {
    const order = topLevel.map((i) => i.id);
    const from = order.indexOf(row.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= order.length) return;

    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];

    // Reflect the move immediately; seq is only used for ordering, so a stale value between the
    // optimistic update and the refetch cannot mis-render anything.
    setItems((prev) => {
      const bySeq = new Map(next.map((id, i) => [id, i + 1]));
      return prev.map((i) => (bySeq.has(i.id) ? { ...i, seq: bySeq.get(i.id)! } : i));
    });

    try {
      await axios.post("/api/members/event-menu", { action: "reorder", ids: next });
      load({ background: true });
    } catch {
      setError("Could not save the new order.");
      load({ background: true });
    }
  }

  async function runCopy() {
    if (!copyFrom) return;
    setCopying(true);
    setError(null);
    try {
      const res = await axios.post("/api/members/event-menu", {
        action: "copy",
        source_event_id: Number(copyFrom),
        event_id: eventId,
      });
      const { copied = 0, skipped = 0 } = res.data ?? {};
      setNotice(
        copied === 0
          ? "Nothing to copy — this event already has every item from that menu."
          : `Copied ${copied} item${copied === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} already here` : ""}. ` +
            "Zone and room destinations were left blank — set them per item.",
      );
      setCopyFrom(null);
      load({ background: true });
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Could not copy that menu.",
      );
    } finally {
      setCopying(false);
    }
  }

  const targetKey = form ? TARGET_FOR[form.post_action_type] : null;
  const targetField = form ? TARGET_FIELD[form.post_action_type] : null;

  if (loading) {
    return (
      <div className={`${PANEL} flex flex-col items-center justify-center py-16 text-zinc-400`}>
        <div className="mb-4 h-9 w-9 animate-spin rounded-full border-4 border-brand-pink border-t-transparent" />
        <p className="text-xs font-bold uppercase tracking-wider">Loading event menu…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className={`${ALERT_ERROR} flex items-center gap-2`}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {notice && (
        <div className={`${ALERT_SUCCESS} flex items-center gap-2`}>
          <Check className="h-4 w-4 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={PANEL_TOOLBAR}>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className={INPUT_SEARCH_ICON} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu items…"
              aria-label="Search menu items"
              className={INPUT_SEARCH}
            />
            {searching && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs font-medium text-zinc-400">
            {searching ? (
              <>
                Showing {shownCount} of {items.length} item{items.length === 1 ? "" : "s"}.
              </>
            ) : (
              <>
                These items are the lobby&apos;s footer navigation. {topLevel.length} top-level item
                {topLevel.length === 1 ? "" : "s"}, {items.length - topLevel.length} sub-item
                {items.length - topLevel.length === 1 ? "" : "s"}.
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sourceEvents.length > 0 && (
            <button type="button" onClick={() => setCopyFrom("")} className={BTN_SECONDARY}>
              <Copy className="h-4 w-4" /> Copy From Event
            </button>
          )}
          <button type="button" onClick={openAdd} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" /> Add Menu Item
          </button>
        </div>
      </div>

      <div className={`${PANEL_FLUSH} overflow-x-auto`}>
        <table className={TABLE}>
          <thead>
            <tr className={TABLE_HEAD_ROW}>
              <th className={TABLE_TH}>Order</th>
              <th className={TABLE_TH}>Title</th>
              <th className={TABLE_TH}>Action</th>
              <th className={TABLE_TH}>Destination</th>
              <th className={TABLE_TH}>Visibility</th>
              <th className={`${TABLE_TH} text-right`}>Manage</th>
            </tr>
          </thead>
          <tbody className={TABLE_BODY}>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className={TABLE_EMPTY}>
                  {searching ? (
                    <>Nothing matches “{query.trim()}”.</>
                  ) : (
                    <>
                      No menu items yet — the lobby footer will be empty until you add one.
                      {sourceEvents.length > 0 && " Copy From Event brings another event's menu across in one go."}
                    </>
                  )}
                </td>
              </tr>
            ) : (
              visible.flatMap(({ row, kids }) => {
                // The row's position in the FULL top-level list, not in the filtered view —
                // move() reorders every item, so a filtered index would write the wrong order.
                const index = topLevel.findIndex((t) => t.id === row.id);
                const render = (item: MenuRow, isChild: boolean) => (
                  <tr key={item.id} className={TABLE_ROW}>
                    <td className={TABLE_CELL}>
                      {isChild ? (
                        <span className="text-zinc-600">—</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => move(item, -1)}
                            disabled={index === 0 || searching}
                            className={`${BTN_ICON} h-7 w-7 disabled:opacity-30`}
                            title={searching ? "Clear the search to reorder" : "Move up"}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(item, 1)}
                            disabled={index === topLevel.length - 1 || searching}
                            className={`${BTN_ICON} h-7 w-7 disabled:opacity-30`}
                            title={searching ? "Clear the search to reorder" : "Move down"}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className={`${TABLE_CELL} font-bold text-white`}>
                      <span className={isChild ? "flex items-center gap-2 pl-6 font-semibold text-zinc-300" : ""}>
                        {isChild && <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-zinc-600" />}
                        {item.title || <span className="italic text-zinc-500">Untitled</span>}
                      </span>
                    </td>
                    <td className={`${TABLE_CELL} text-zinc-300`}>{item.actionLabel}</td>
                    <td className={`${TABLE_CELL} text-zinc-400`}>{item.targetLabel ?? "—"}</td>
                    <td className={TABLE_CELL}>
                      <span className={item.active ? BADGE_SUCCESS : BADGE_NEUTRAL}>
                        {item.active ? "Visible" : "Hidden"}
                      </span>
                    </td>
                    <td className={TABLE_CELL}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggle(item)}
                          className={BTN_ICON}
                          title={item.active ? "Hide from the footer" : "Show in the footer"}
                        >
                          {item.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button type="button" onClick={() => openEdit(item)} className={BTN_ICON} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          className={BTN_ICON_DANGER}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                return [render(row, false), ...kids.map((k) => render(k, true))];
              })
            )}
          </tbody>
        </table>
      </div>

      {copyFrom !== null && (
        <ModalPortal>
          <div className={MODAL_OVERLAY}>
            <div className={MODAL_PANEL}>
              <div className={MODAL_HEADER}>
                <div className="flex items-center gap-3">
                  <div className={MODAL_HEADER_ICON}>
                    <Copy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className={MODAL_TITLE}>Copy Menu From Event</h3>
                    <p className={MODAL_SUBTITLE}>Clones the structure into this event.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setCopyFrom(null)} className={MODAL_CLOSE} aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className={FORM_LABEL}>Copy from</label>
                  <select
                    value={copyFrom}
                    onChange={(e) => setCopyFrom(e.target.value)}
                    className={INPUT_FIELD}
                  >
                    <option value="">— Select an event —</option>
                    {sourceEvents.map((s) => (
                      <option key={s.eventId} value={s.eventId}>
                        {s.title} — {s.itemCount} item{s.itemCount === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </div>

                <p className={FORM_HINT}>
                  Titles, order and the parent/child structure come across. Destinations do not:
                  zones, rooms, assets and exhibitors belong to the other event, so each copied
                  item arrives with no destination for you to set here. Items already in this
                  menu are skipped, so this is safe to run more than once.
                </p>

                <div className={MODAL_FOOTER}>
                  <button type="button" onClick={() => setCopyFrom(null)} className={BTN_SECONDARY}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={runCopy}
                    disabled={!copyFrom || copying}
                    className={`${BTN_PRIMARY} disabled:opacity-50`}
                  >
                    <Copy className="h-4 w-4" /> {copying ? "Copying…" : "Copy Menu"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {form && (
        <ModalPortal>
          <div className={MODAL_OVERLAY}>
            <div className={`${MODAL_PANEL_WIDE} max-h-[90vh] overflow-y-auto`}>
              <div className={MODAL_HEADER}>
                <div className="flex items-center gap-3">
                  <div className={MODAL_HEADER_ICON}>
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className={MODAL_TITLE}>{form.id ? "Edit Menu Item" : "Add Menu Item"}</h3>
                    <p className={MODAL_SUBTITLE}>Appears in the lobby footer navigation.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setForm(null)} className={MODAL_CLOSE} aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={save} className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className={FORM_LABEL}>Title *</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                      maxLength={100}
                      placeholder="Exhibition Hall"
                      className={INPUT_FIELD}
                    />
                  </div>
                  <div>
                    <label className={FORM_LABEL}>Sequence</label>
                    <input
                      type="number"
                      value={form.seq}
                      onChange={(e) => setForm({ ...form, seq: e.target.value })}
                      className={INPUT_FIELD}
                    />
                    <p className={FORM_HINT}>Lower numbers appear first.</p>
                  </div>

                  <div>
                    <label className={FORM_LABEL}>Parent Menu</label>
                    <select
                      value={form.parent_id}
                      onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                      className={INPUT_FIELD}
                    >
                      <option value="">— None (top level) —</option>
                      {options.parents
                        .filter((p) => p.id !== form.id)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                    </select>
                    <p className={FORM_HINT}>Choosing a parent turns this into a dropdown entry.</p>
                  </div>

                  <div>
                    <label className={FORM_LABEL}>Action Type</label>
                    <select
                      value={form.post_action_type}
                      onChange={(e) => setForm({ ...form, post_action_type: e.target.value })}
                      className={INPUT_FIELD}
                    >
                      <option value="">— Select an action —</option>
                      {actionTypes.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {targetKey && targetField && (
                    <div className="sm:col-span-2">
                      <label className={FORM_LABEL}>{TARGET_LABEL[form.post_action_type]}</label>
                      <select
                        value={(form as unknown as Record<string, string>)[targetField] ?? ""}
                        onChange={(e) => setForm({ ...form, [targetField]: e.target.value } as FormState)}
                        className={INPUT_FIELD}
                      >
                        <option value="">— Select an option —</option>
                        {options[targetKey].map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {options[targetKey].length === 0 && (
                        <p className={FORM_HINT}>Nothing of this kind is set up for this event yet.</p>
                      )}
                    </div>
                  )}
                </div>

                <label className="flex cursor-pointer items-center gap-3 text-xs font-semibold text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="h-4 w-4 rounded border-white/10 bg-white/5 text-brand-pink focus:ring-brand-pink"
                  />
                  Visible in the lobby footer
                </label>

                <div className={MODAL_FOOTER}>
                  <button type="button" onClick={() => setForm(null)} className={BTN_SECONDARY}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className={`${BTN_PRIMARY} disabled:opacity-50`}>
                    <Check className="h-4 w-4" /> {saving ? "Saving…" : "Save Menu Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
