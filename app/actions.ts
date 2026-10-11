"use server";

import { refresh } from "next/cache";
import { getConfig, saveConfig, setEntry, setNote } from "@/lib/db";
import { isDay } from "@/lib/dates";
import type { Config, InputKind, Metric, Role } from "@/lib/metrics";

const NOTE_MAX = 2000;

export async function saveNote(day: string, note: string) {
  if (!isDay(day) || typeof note !== "string") throw new Error("Invalid note");
  await setNote(day, note.trim().slice(0, NOTE_MAX));
}

export async function saveEntry(day: string, metric: string, value: number | null) {
  if (!isDay(day)) throw new Error("Invalid day");
  if (value !== null && (!Number.isFinite(value) || value < 0)) throw new Error("Invalid value");
  if (!(await setEntry(day, metric, value, "manual"))) throw new Error("Unknown metric");
  refresh();
}

const ID = /^[a-z0-9_-]{1,40}$/;
const ROLES: Role[] = ["core", "bonus", "penalty", "track"];
const INPUTS: InputKind[] = ["number", "bool", "rating"];

const isName = (s: unknown): s is string => typeof s === "string" && s.trim().length > 0 && s.length <= 60;
const isAmount = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

export async function saveSettings(input: Config) {
  const existing = new Map((await getConfig()).metrics.map((m) => [m.id, m]));

  const sections = input.sections.map((s) => {
    if (!ID.test(s.id) || !isName(s.name)) throw new Error("Invalid section");
    return { id: s.id, name: s.name.trim(), archived: !!s.archived };
  });
  const sectionIds = new Set(sections.map((s) => s.id));
  if (sectionIds.size !== sections.length) throw new Error("Duplicate section");

  const seen = new Set<string>();
  const metrics = input.metrics.map((m): Metric => {
    const kind = existing.get(m.id)?.input ?? m.input;
    if (!ID.test(m.id) || seen.has(m.id) || !isName(m.name) || !sectionIds.has(m.sectionId)) throw new Error("Invalid metric");
    if (!ROLES.includes(m.role) || !INPUTS.includes(kind)) throw new Error("Invalid metric type");
    if (![m.target, m.free, m.points, m.step].every(isAmount)) throw new Error("Invalid metric numbers");
    if (typeof m.unit !== "string" || m.unit.length > 20) throw new Error("Invalid unit");
    seen.add(m.id);
    // Trend scoring only makes sense for numbers that are not penalties; a target of 0 means "no goal yet".
    const scoring = m.scoring === "trend" && kind === "number" && m.role !== "penalty" ? "trend" : "daily";
    const target = kind === "bool" ? 1 : kind === "rating" ? Math.min(5, Math.max(1, m.target)) : m.target;
    if (target <= 0 && scoring !== "trend") throw new Error("Target must be positive");
    return {
      id: m.id,
      sectionId: m.sectionId,
      name: m.name.trim(),
      role: m.role,
      input: kind,
      scoring,
      unit: kind === "number" ? m.unit.trim() : kind === "rating" ? "/5" : "",
      target,
      free: kind === "number" && m.role === "penalty" ? Math.min(m.free, target) : 0,
      points: m.role === "track" ? 0 : m.points,
      step: kind === "number" && m.step > 0 ? m.step : 1,
      archived: !!m.archived,
    };
  });

  await saveConfig({ sections, metrics });
  refresh();
}
