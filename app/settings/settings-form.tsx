"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "../actions";
import type { Key } from "@/lib/i18n";
import { useI18n } from "../locale-provider";
import {
  CORE_TOTAL,
  defaultStep,
  type Config,
  type InputKind,
  type Metric,
  type Role,
  type Scoring,
  type Section,
} from "@/lib/metrics";

// Numbers are kept as text while editing so half-typed values don't get rewritten.
type Draft = Omit<Metric, "target" | "free" | "points"> & { target: string; free: string; points: string };

const toDraft = (m: Metric): Draft => ({ ...m, target: String(m.target), free: String(m.free), points: String(m.points) });
const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

// Trend scoring is offered for numbers that are not penalties.
const canTrend = (m: Draft) => m.input === "number" && m.role !== "penalty";
const isTrend = (m: Draft) => m.scoring === "trend" && canTrend(m);

const ROLES: Role[] = ["core", "bonus", "penalty", "track"];
const INPUTS: InputKind[] = ["number", "bool", "rating"];

// Translation key of the first thing wrong with a metric, if any.
function problem(m: Draft): Key | null {
  if (!m.name.trim()) return "settings.err.name";
  if (m.role !== "track" && !(num(m.points) >= 0)) return "settings.err.points";
  if (m.input === "bool") return null;
  if (isTrend(m)) return num(m.target) >= 0 ? null : "settings.err.targetZero";
  if (!(num(m.target) > 0)) return "settings.err.target";
  if (m.input === "rating" && num(m.target) > 5) return "settings.err.rating";
  if (m.input === "number" && m.role === "penalty") {
    if (!(num(m.free) >= 0)) return "settings.err.free";
    if (num(m.free) >= num(m.target)) return "settings.err.freeMax";
  }
  return null;
}

function swap<T>(list: T[], i: number, j: number): T[] {
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const field = "h-9 w-full rounded-lg border border-border bg-transparent px-2 text-sm text-fg outline-none focus:border-fg";
const smallBtn = "rounded-lg bg-track px-2 py-1 text-xs text-muted hover:text-fg disabled:opacity-30";

export default function SettingsForm({ config }: { config: Config }) {
  const [sections, setSections] = useState<Section[]>(config.sections);
  const [metrics, setMetrics] = useState<Draft[]>(() => config.metrics.map(toDraft));
  const [created, setCreated] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "dirty" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();

  const liveSections = sections.filter((s) => !s.archived);
  const liveIds = new Set(liveSections.map((s) => s.id));
  const coreSum = metrics
    .filter((m) => m.role === "core" && !m.archived && liveIds.has(m.sectionId))
    .reduce((sum, m) => sum + (num(m.points) || 0), 0);
  const invalid = metrics.some((m) => problem(m)) || sections.some((s) => !s.name.trim());
  const archivedSections = sections.filter((s) => s.archived);
  const archivedMetrics = metrics.filter((m) => m.archived && liveIds.has(m.sectionId));

  const touch = () => setStatus("dirty");
  const patchMetric = (id: string, patch: Partial<Draft>) => {
    setMetrics((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    touch();
  };
  const patchSection = (id: string, patch: Partial<Section>) => {
    setSections((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    touch();
  };

  function moveSection(id: string, dir: 1 | -1) {
    const i = sections.findIndex((s) => s.id === id);
    let j = i + dir;
    while (sections[j]?.archived) j += dir;
    if (sections[j]) {
      setSections(swap(sections, i, j));
      touch();
    }
  }

  function moveMetric(id: string, dir: 1 | -1) {
    const i = metrics.findIndex((m) => m.id === id);
    let j = i + dir;
    while (metrics[j] && (metrics[j].sectionId !== metrics[i].sectionId || metrics[j].archived)) j += dir;
    if (metrics[j]) {
      setMetrics(swap(metrics, i, j));
      touch();
    }
  }

  function addSection() {
    const id = newId("s");
    setSections([...sections, { id, name: t("settings.newSection"), archived: false }]);
    setCreated(new Set(created).add(id));
    touch();
  }

  function addMetric(sectionId: string) {
    const id = newId("m");
    setMetrics([
      ...metrics,
      { id, sectionId, name: "", role: "bonus", input: "bool", scoring: "daily", unit: "", target: "1", free: "0", points: "3", step: 1, archived: false },
    ]);
    setCreated(new Set(created).add(id));
    setOpen(id);
    touch();
  }

  // Items that were never saved are simply dropped; saved ones are archived to keep their history.
  function removeSection(s: Section) {
    if (created.has(s.id)) {
      setSections(sections.filter((x) => x.id !== s.id));
      setMetrics(metrics.filter((m) => m.sectionId !== s.id));
      touch();
    } else patchSection(s.id, { archived: true });
  }

  function removeMetric(m: Draft) {
    if (created.has(m.id)) {
      setMetrics(metrics.filter((x) => x.id !== m.id));
      touch();
    } else patchMetric(m.id, { archived: true });
  }

  function changeInput(m: Draft, input: InputKind) {
    patchMetric(m.id, {
      input,
      target: input === "bool" ? "1" : input === "rating" ? "4" : "30",
      unit: input === "number" ? t("settings.defaultUnit") : input === "rating" ? "/5" : "",
      free: "0",
    });
  }

  function save() {
    const payload: Config = {
      sections,
      metrics: metrics.map((m) => {
        const target = m.input === "bool" ? 1 : num(m.target);
        return {
          ...m,
          target,
          free: num(m.free) || 0,
          points: m.role === "track" ? 0 : num(m.points),
          scoring: isTrend(m) ? "trend" : "daily",
          step: created.has(m.id) ? defaultStep(target) : m.step,
        };
      }),
    };
    startTransition(async () => {
      try {
        await saveSettings(payload);
        setCreated(new Set());
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      {liveSections.map((section, si) => {
        const rows = metrics.filter((m) => m.sectionId === section.id && !m.archived);
        return (
          <section key={section.id} className="rounded-2xl border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border p-3">
              <input
                aria-label={t("settings.sectionName")}
                className={`${field} font-medium ${section.name.trim() ? "" : "border-bad"}`}
                value={section.name}
                maxLength={60}
                onChange={(e) => patchSection(section.id, { name: e.target.value })}
              />
              <button type="button" aria-label={t("up")} className={smallBtn} disabled={si === 0} onClick={() => moveSection(section.id, -1)}>
                ↑
              </button>
              <button
                type="button"
                aria-label={t("down")}
                className={smallBtn}
                disabled={si === liveSections.length - 1}
                onClick={() => moveSection(section.id, 1)}
              >
                ↓
              </button>
              <button type="button" className={smallBtn} onClick={() => removeSection(section)}>
                {t(created.has(section.id) ? "delete" : "archive")}
              </button>
            </div>

            <ul className="divide-y divide-border">
              {rows.map((m, mi) => {
                const err = problem(m);
                const share = coreSum > 0 ? ((num(m.points) || 0) / coreSum) * CORE_TOTAL : 0;
                return (
                  <li key={m.id} className="p-3">
                    <button
                      type="button"
                      aria-expanded={open === m.id}
                      onClick={() => setOpen(open === m.id ? null : m.id)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="font-medium">{m.name.trim() || t("settings.newMetric")}</span>
                        <span className="block text-xs text-muted">
                          {t(`role.${m.role}`)} · {t(`input.${m.input}`)}
                          {isTrend(m) && ` · ${t("settings.trend")}`}
                          {m.role === "core"
                            ? ` · ${t("settings.share", { share: share.toFixed(1), total: CORE_TOTAL })}`
                            : m.role === "track"
                              ? ""
                              : ` · ${t("settings.points", { sign: m.role === "penalty" ? "−" : "+", points: m.points })}`}
                        </span>
                        {err && <span className="block text-xs text-bad">{t(err)}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{t(open === m.id ? "settings.close" : "settings.edit")}</span>
                    </button>

                    {open === m.id && (
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted">
                        <label className="col-span-2">
                          {t("settings.name")}
                          <input className={field} value={m.name} maxLength={60} onChange={(e) => patchMetric(m.id, { name: e.target.value })} />
                        </label>
                        <label>
                          {t("settings.section")}
                          <select className={field} value={m.sectionId} onChange={(e) => patchMetric(m.id, { sectionId: e.target.value })}>
                            {liveSections.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {t("settings.role")}
                          <select className={field} value={m.role} onChange={(e) => patchMetric(m.id, { role: e.target.value as Role })}>
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {t(`role.${r}`)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {t("settings.type")}
                          {created.has(m.id) ? (
                            <select className={field} value={m.input} onChange={(e) => changeInput(m, e.target.value as InputKind)}>
                              {INPUTS.map((k) => (
                                <option key={k} value={k}>
                                  {t(`input.${k}`)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="flex h-9 items-center text-sm text-fg">{t(`input.${m.input}`)}</span>
                          )}
                        </label>
                        {m.role !== "track" && (
                          <label>
                            {t(m.role === "core" ? "settings.weight" : "settings.pointsLabel")}
                            <input className={field} inputMode="decimal" value={m.points} onChange={(e) => patchMetric(m.id, { points: e.target.value })} />
                          </label>
                        )}
                        {canTrend(m) && (
                          <label>
                            {t("settings.scoring")}
                            <select className={field} value={m.scoring} onChange={(e) => patchMetric(m.id, { scoring: e.target.value as Scoring })}>
                              <option value="daily">{t("settings.scoringDaily")}</option>
                              <option value="trend">{t("settings.scoringTrend")}</option>
                            </select>
                          </label>
                        )}
                        {m.input === "number" && (
                          <label>
                            {t("settings.unit")}
                            <input className={field} value={m.unit} maxLength={20} onChange={(e) => patchMetric(m.id, { unit: e.target.value })} />
                          </label>
                        )}
                        {m.input !== "bool" && (
                          <label>
                            {t(m.role === "penalty" ? "settings.fullPenaltyAt" : isTrend(m) ? "settings.targetTrend" : "settings.target")}
                            <input className={field} inputMode="decimal" value={m.target} onChange={(e) => patchMetric(m.id, { target: e.target.value })} />
                          </label>
                        )}
                        {m.input === "number" && m.role === "penalty" && (
                          <label>
                            {t("settings.free")}
                            <input className={field} inputMode="decimal" value={m.free} onChange={(e) => patchMetric(m.id, { free: e.target.value })} />
                          </label>
                        )}
                        <div className="col-span-2 flex gap-2">
                          <button type="button" className={smallBtn} disabled={mi === 0} onClick={() => moveMetric(m.id, -1)}>
                            {t("moveUp")}
                          </button>
                          <button type="button" className={smallBtn} disabled={mi === rows.length - 1} onClick={() => moveMetric(m.id, 1)}>
                            {t("moveDown")}
                          </button>
                          <button type="button" className={`${smallBtn} ml-auto`} onClick={() => removeMetric(m)}>
                            {t(created.has(m.id) ? "delete" : "archive")}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-border p-3">
              <button type="button" className="text-sm text-muted hover:text-fg" onClick={() => addMetric(section.id)}>
                {t("settings.addMetric")}
              </button>
            </div>
          </section>
        );
      })}

      <button type="button" onClick={addSection} className="rounded-2xl border border-dashed border-border py-3 text-sm text-muted hover:text-fg">
        {t("settings.addSection")}
      </button>

      {(archivedSections.length > 0 || archivedMetrics.length > 0) && (
        <section>
          <h2 className="heading">{t("settings.archived")}</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface text-sm">
            {archivedSections.map((s) => (
              <li key={s.id} className="flex items-center justify-between p-3">
                <span>
                  {s.name} <span className="text-xs text-muted">· {t("settings.sectionTag")}</span>
                </span>
                <button type="button" className={smallBtn} onClick={() => patchSection(s.id, { archived: false })}>
                  {t("restore")}
                </button>
              </li>
            ))}
            {archivedMetrics.map((m) => (
              <li key={m.id} className="flex items-center justify-between p-3">
                <span>{m.name}</span>
                <button type="button" className={smallBtn} onClick={() => patchMetric(m.id, { archived: false })}>
                  {t("restore")}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">{t("settings.archivedHelp")}</p>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={save}
            disabled={pending || invalid || status === "idle" || status === "saved"}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-40"
          >
            {t(pending ? "saving" : "save")}
          </button>
          <span role="status" className="text-sm">
            {invalid && <span className="text-bad">{t("fixRed")}</span>}
            {!invalid && status === "dirty" && <span className="text-muted">{t("unsaved")}</span>}
            {!invalid && status === "saved" && <span className="text-good">{t("saved")}</span>}
            {!invalid && status === "error" && <span className="text-bad">{t("notSaved")}</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
