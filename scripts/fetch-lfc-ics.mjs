// scripts/fetch-lfc-ics.mjs
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = "data";
const INDEX_OUT = path.join(DATA_DIR, "lfc-fixtures-index.json");

const ICS_URL = process.env.LFC_ICS_URL;
if (!ICS_URL) {
  console.error("Missing LFC_ICS_URL env var (set it as a GitHub Actions secret).");
  process.exit(1);
}

const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

function unwrapIcsText(raw) {
  // Unfold folded lines (RFC5545)
  return raw.replace(/\r?\n[ \t]/g, "");
}

function getLine(block, key) {
  const re = new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, "m");
  const m = block.match(re);
  return m ? (m[1] || "").trim() : "";
}

function parseDTSTART(v) {
  // Examples:
  // 20260131T200000Z
  // 20260131T200000
  // 20260131
  const m = String(v || "").match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
  if (!m) return null;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  const hh = m[4] || "00";
  const mm = m[5] || "00";
  const time = `${hh}:${mm}`;
  return { date, time, hh, mm };
}

function parseTeamsAndScore(summary) {
  const s = (summary || "").trim();

  // "Team A v Team B"
  const vs = s.match(/^(.+?)\s+v(?:s)?\.?\s+(.+?)$/i);
  if (vs) return { home: vs[1].trim(), away: vs[2].trim(), homeGoals: null, awayGoals: null };

  // "Team A 2-0 Team B"
  const sc = s.match(/^(.+?)\s+(\d+)\s*[-—]\s*(\d+)\s+(.+?)$/);
  if (sc) {
    return {
      home: sc[1].trim(),
      away: sc[4].trim(),
      homeGoals: Number(sc[2]),
      awayGoals: Number(sc[3]),
    };
  }
