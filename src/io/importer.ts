/**
 * GRC Risk / Kontrol Excel'lerini ve metodoloji ayar dosyasını okur.
 * Kolonlar başlık adına göre bulunur (sıra önemsiz); tanınmayan kolonlar kayıt alanı (ex) olarak korunur.
 */
import * as XLSX from "xlsx";
import type { Control, Dataset, ExValue, Methodology, Param, Risk } from "../domain/types";
import { BUS, CL, DIMS, ENUMS, FREQ, ITD, MP, P0, RL, setP } from "../domain/constants";
import { ascii, clone, hnorm, inactive, isNum, looksDoc, newId, norm, shortTxt, tnorm } from "../domain/text";
import { optOf } from "../domain/engine";

export type SheetKind = "r" | "c" | "m" | "p";
export interface SheetTable {
  name: string;
  kind: SheetKind;
  head: string[];
  hn: string[];
  rows: unknown[][];
  /** İlk veri satırının Excel satır numarası */
  off: number;
}

export function num(v: unknown): number | "N/A" | null | undefined {
  if (isNum(v)) return v;
  const s = String(v ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  if (norm(s) === "n/a") return "N/A";
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

export interface OptMatch { id: string; quiet: boolean; approx?: string }
/** Hücre metnini P parametresinin bir seçeneğiyle eşler: tam → takma ad → içerme → kelime benzerliği. */
export function matchOpt(P: Param, raw: unknown): OptMatch | null {
  const n = tnorm(raw);
  const T = (o: { txt: string }) => tnorm(o.txt);
  if (!n) {
    const z = P.opts.filter((o) => o.pts === 0);
    return z.length === 1 ? { id: z[0].id, quiet: true } : null;
  }
  let o = P.opts.find((x) => T(x) === n || (x.alias ?? []).some((a) => tnorm(a) === n));
  if (o) return { id: o.id, quiet: true };
  const byLen = [...P.opts].sort((a, b) => T(b).length - T(a).length);
  o = byLen.find((x) => T(x).length >= 4 && n.includes(T(x)));
  if (o) return { id: o.id, quiet: true };
  o = byLen.find((x) => n.length >= 4 && T(x).includes(n));
  if (o) return { id: o.id, quiet: true };
  const tk = (s: string) => new Set(s.split(/[^a-z0-9]+/).filter((w) => w.length > 2));
  const A = tk(n);
  let best: (typeof P.opts)[number] | null = null;
  let bs = 0;
  for (const x of P.opts) {
    const B = tk(T(x));
    let i = 0;
    A.forEach((w) => { if (B.has(w)) i++; });
    const sc = i / Math.max(1, Math.min(A.size, B.size));
    if (sc > bs) { bs = sc; best = x; }
  }
  if (best && bs >= 0.6) return { id: best.id, quiet: false, approx: best.txt };
  return null;
}

/** Excel hücresini saklanabilir değere çevirir; tarihler "d:YYYY-MM-DD" olur. */
export function cellVal(v: unknown): ExValue {
  if (v instanceof Date) {
    const d = new Date(v.getTime() + 43200000);
    return `d:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (m) return `d:${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return v;
  }
  if (typeof v === "number" || typeof v === "boolean") return v;
  return String(v ?? "");
}

export function sheetTables(wb: XLSX.WorkBook, fileName = ""): SheetTable[] {
  const out: SheetTable[] = [];
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: "", raw: true, blankrows: false });
    const hi = rows.slice(0, 15).findIndex((r) =>
      r.some((c) => ["risk id", "kontrol id", "parametre"].includes(hnorm(c))) ||
      (r.some((c) => ascii(c) === "secenek") && r.some((c) => ascii(c) === "puan")));
    if (hi < 0) continue;
    const head = rows[hi].map((c) => String(c ?? "").trim());
    const hn = head.map(hnorm);
    const hna = head.map(ascii);
    const kind: SheetKind = hna.includes("secenek") && hna.includes("puan") ? "p" : hn.includes("parametre") ? "m" : hn.includes("kontrol id") ? "c" : "r";
    // Açıklama sayfası gibi dar tabloları veri tablosu sanma
    if ((kind === "r" || kind === "c") && hn.filter(Boolean).length < 5) continue;
    out.push({ name: fileName ? `${fileName} › ${name}` : name, kind, head, hn, rows: rows.slice(hi + 1), off: hi + 2 });
  }
  return out;
}

export async function readWorkbookFile(file: Blob): Promise<XLSX.WorkBook> {
  const buf = await file.arrayBuffer();
  return XLSX.read(new Uint8Array(buf), { type: "array", cellDates: true });
}

const fi = (T: SheetTable, label: string) => T.hn.indexOf(hnorm(label));
const str = (v: unknown) => String(v ?? "").trim();

export interface SkippedRisk { id: string; status: string; ln: number; desc: string }
export interface RiskParse {
  err: string[];
  warn: string[];
  risks: Risk[];
  cancelled: Set<string>;
  cancelledList: SkippedRisk[];
  cancelledAll: SkippedRisk[];
  dup: number;
}

export function parseRisks(T: SheetTable, incl = false): RiskParse {
  const warn: string[] = [];
  const used = new Set<number>();
  const ix = (k: string) => { const i = fi(T, k); if (i >= 0) used.add(i); return i; };
  const I = {
    id: ix("Risk ID"), st: ix("Risk Statü"), proc: ix("Süreç"), sub: ix("Alt Süreç"), desc: ix("Risk Tanımı"), it: ix("Flag for IT"), o: ix("Olasılık"),
    imp: ix("Etki"), dp: ix("Doğal Risk Puanı"), ds: ix("Doğal Risk Skoru"), dl: ix("Doğal Risk Seviyesi"),
    integ: ix("Bütünleşik Kontrol Puanı"), is: ix("Bütünleşik Kontrol Skoru"), il: ix("Bütünleşik Kontrol Seviyesi"),
    rp: ix("Kalıntı Risk Puanı"), rs: ix("Kalıntı Risk Skoru"), rl: ix("Kalıntı Risk Seviyesi")
  };
  const D = Object.fromEntries(DIMS.map(([k, , h]) => [k, ix(h)])) as Record<string, number>;
  const empty = { warn, risks: [], cancelled: new Set<string>(), cancelledList: [], cancelledAll: [], dup: 0 };
  const err: string[] = [];
  if (I.id < 0) err.push(`“${T.name}” sayfasında “Risk ID” kolonu yok.`);
  if (I.o < 0) err.push(`“${T.name}” sayfasında “Olasılık” kolonu yok.`);
  if (DIMS.every(([k]) => D[k] < 0)) err.push(`“${T.name}” sayfasında etki kolonlarından (Finansal, İtibar, Regülasyon, Müşteri, Gizlilik, Bütünlük, Erişilebilirlik) hiçbiri yok.`);
  if (err.length) return { err, ...empty };

  const risks: Risk[] = [];
  const seen = new Set<string>();
  const cancelled = new Set<string>();
  const cancelledList: SkippedRisk[] = [];
  const cancelledAll: SkippedRisk[] = [];
  let dup = 0;
  T.rows.forEach((row, i) => {
    const ln = i + T.off;
    const id = str(row[I.id]);
    if (!id) return;
    const status = I.st >= 0 ? str(row[I.st]) || "Onaylı" : "Onaylı";
    const desc = I.desc >= 0 ? str(row[I.desc]) : "";
    if (inactive(status)) {
      cancelledAll.push({ id, status, ln, desc });
      if (!incl) { cancelled.add(id); cancelledList.push({ id, status, ln, desc }); return; }
    }
    if (seen.has(id)) { dup++; warn.push(`Risk satır ${ln}: ${id} tekrar ediyor, ilk kayıt kullanıldı.`); return; }
    const itv = I.it >= 0 ? norm(row[I.it]) : "";
    const r: Risk = {
      id, status, proc: I.proc >= 0 ? str(row[I.proc]) || "Tanımsız süreç" : "Tanımsız süreç", sub: I.sub >= 0 ? str(row[I.sub]) : "", desc,
      it: ["1", "evet", "true", "x", "yes", "dogru", "doğru"].includes(itv),
      fin: null, iti: null, reg: null, mus: null, g: null, b: null, e: null, o: 3, ex: {}, rec: {}
    };
    for (const [k, lab] of DIMS) {
      if (D[k] < 0) continue;
      const v = num(row[D[k]]);
      if (v === undefined || (isNum(v) && (v < 1 || v > 5))) {
        warn.push(`Risk satır ${ln} (${id}): ${lab} etkisi “${String(row[D[k]])}” geçersiz, boş sayıldı.`);
        r[k] = null;
      } else r[k] = isNum(v) ? Math.round(v) : v;
    }
    if (I.it < 0 && ITD.some((k) => isNum(r[k])) && !BUS.some((k) => isNum(r[k]))) r.it = true;
    if (BUS.every((k) => !isNum(r[k])) && ITD.every((k) => !isNum(r[k]))) warn.push(`Risk satır ${ln} (${id}): etki boyutlarının hepsi boş, etki 1 hesaplanır.`);
    const o = num(row[I.o]);
    if (!isNum(o) || o < 1 || o > 5) warn.push(`Risk satır ${ln} (${id}): olasılık “${String(row[I.o])}” geçersiz, 3 varsayıldı.`);
    else r.o = Math.round(o);
    for (const k of ["imp", "integ", "is", "rs"] as const) {
      if (I[k] < 0) continue;
      const v = num(row[I[k]]);
      if (isNum(v)) r.rec[k] = v;
    }
    if (!isNum(r.rec.is) && I.il >= 0) { const x = CL.map(norm).indexOf(norm(row[I.il])); if (x >= 0) r.rec.is = x; }
    if (!isNum(r.rec.rs) && I.rl >= 0) { const x = RL.map(norm).indexOf(norm(row[I.rl])); if (x > 0) r.rec.rs = x; }
    T.head.forEach((h, j) => { if (!used.has(j) && h && row[j] !== "" && row[j] != null) r.ex[h] = cellVal(row[j]); });
    seen.add(id);
    risks.push(r);
  });
  return { err: risks.length ? [] : ["İçe alınacak aktif risk yok."], warn, risks, cancelled, cancelledList, cancelledAll, dup };
}

export interface ControlParse {
  err: string[];
  warn: string[];
  controls: Control[];
  recInteg: Record<string, number>;
  stats: { controls: number; active: number; orphan: number; dropped: number };
}

export function parseControls(T: SheetTable, riskIds: Set<string>, cancelledRisks: Set<string>, params: Param[]): ControlParse {
  const warn: string[] = [];
  const used = new Set<number>();
  const ix = (k: string) => { const i = fi(T, k); if (i >= 0) used.add(i); return i; };
  const I = {
    id: ix("Kontrol ID"), st: ix("Kontrol Statü"), risk: ix("Risk ID"), desc: ix("Kontrol Tanımı"), freq: ix("1. Seviye Kontrol Sıklığı"),
    integ: ix("Bütünleşik Kontrol Puanı"), link: fi(T, "Outward issue link (Risk-Kontrol)")
  };
  ["Kontrol Puanı", "Kontrol Skoru", "Bütünleşik Kontrol Skoru", "Bütünleşik Kontrol Seviyesi", "Risk Tanımı", "Süreç", "Alt Süreç", "İlgili GMY", "Risk Sahibi"]
    .forEach((h) => { const i = fi(T, h); if (i >= 0) used.add(i); });
  const PI = params.map((P) => ({ P, i: ix(P.col) }));
  const empty = { warn, controls: [], recInteg: {}, stats: { controls: 0, active: 0, orphan: 0, dropped: 0 } };
  const err: string[] = [];
  if (I.id < 0) err.push(`“${T.name}” sayfasında “Kontrol ID” kolonu yok.`);
  if (I.risk < 0 && I.link < 0) err.push(`“${T.name}” sayfasında “Risk ID” kolonu yok.`);
  if (params.length && PI.every((x) => x.i < 0)) err.push(`“${T.name}” sayfasında P parametresi kolonlarından (${params.map((P) => P.col).join(", ")}) hiçbiri yok.`);
  if (err.length) return { err, ...empty };
  PI.filter((x) => x.i < 0).forEach(({ P }) => warn.push(`“${P.col}” kolonu dosyada yok; bu parametre tüm kontrollerde seçilmedi (0 puan) sayıldı.`));

  const controls: Control[] = [];
  const ck = new Set<string>();
  const recInteg: Record<string, number> = {};
  let orphan = 0;
  let dropped = 0;
  const split = (v: unknown) => str(v).split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  T.rows.forEach((row, i) => {
    const ln = i + T.off;
    const id = str(row[I.id]);
    if (!id) return;
    let rids = I.risk >= 0 ? split(row[I.risk]) : [];
    if (!rids.length && I.link >= 0) rids = split(row[I.link]);
    if (!rids.length) { orphan++; warn.push(`Kontrol satır ${ln} (${id}): Risk ID boş, kontrol alınmadı.`); return; }
    const ex: Control["ex"] = {};
    T.head.forEach((h, j) => { if (!used.has(j) && h && row[j] !== "" && row[j] != null) ex[h] = cellVal(row[j]); });
    const base: Omit<Control, "risk"> = { id, status: I.st >= 0 ? str(row[I.st]) || "Onaylı" : "Onaylı", desc: I.desc >= 0 ? str(row[I.desc]) : "", freq: "Gerektiğinde", ex, pv: {}, doc: false };
    for (const { P, i: ci } of PI) {
      if (ci < 0) continue;
      const raw = row[ci];
      const mt = matchOpt(P, raw);
      if (mt) {
        base.pv[P.id] = mt.id;
        if (!mt.quiet) warn.push(`Kontrol satır ${ln} (${id}): ${P.col} “${shortTxt(String(raw), 60)}” en yakın seçenek “${shortTxt(mt.approx ?? "", 60)}” olarak eşlendi.`);
      } else warn.push(`Kontrol satır ${ln} (${id}): ${P.col} “${shortTxt(String(raw), 60)}” tanınmadı, seçilmedi (0 puan).`);
    }
    if (I.freq >= 0) {
      const raw = str(row[I.freq]);
      base.freq = FREQ.find((x) => norm(x) === norm(raw)) ?? (raw || "Gerektiğinde");
    }
    base.doc = looksDoc(base.desc);
    for (const rid of rids) {
      if (cancelledRisks.has(rid)) { dropped++; continue; }
      if (!riskIds.has(rid)) { orphan++; warn.push(`Kontrol satır ${ln} (${id}): Risk ID “${rid}” risk listesinde yok, alınmadı.`); continue; }
      if (ck.has(id + "|" + rid)) { warn.push(`Kontrol satır ${ln}: ${id} → ${rid} ikinci kez geçiyor, atlandı.`); continue; }
      ck.add(id + "|" + rid);
      controls.push({ ...clone(base), risk: rid });
      if (!inactive(base.status) && I.integ >= 0) { const v = num(row[I.integ]); if (isNum(v)) recInteg[rid] = v; }
    }
  });
  return { err: [], warn, controls, recInteg, stats: { controls: controls.length, active: controls.filter((c) => !inactive(c.status)).length, orphan, dropped } };
}

export function parseMethod(T: SheetTable | undefined, m0: Methodology): { m: Methodology; n: number; warn: string[] } {
  const m = clone(m0);
  const warn: string[] = [];
  let n = 0;
  if (!T) return { m, n, warn };
  for (const row of T.rows) {
    const def = MP.find((x) => norm(x[0]) === norm(row[0]));
    if (!def) continue;
    const v = row[1];
    if (def[2] === "n") {
      const x = num(v);
      if (!isNum(x)) { warn.push(`Metodoloji: “${String(row[0])}” değeri “${String(v)}” sayı değil, mevcut değer korundu.`); continue; }
      setP(m, def[1], x);
    } else {
      const e = ENUMS[def[2]].find(([k, t]) => norm(t) === norm(v) || String(k) === String(v));
      if (!e) { warn.push(`Metodoloji: “${String(row[0])}” değeri “${String(v)}” tanınmadı.`); continue; }
      setP(m, def[1], e[0]);
    }
    n++;
  }
  return { m, n, warn };
}

export function parseParams(T: SheetTable): { params: Param[] | null; warn: string[] } {
  const warn: string[] = [];
  const iP = fi(T, "P"), iC = fi(T, "Excel kolon adı"), iO = fi(T, "Seçenek"), iV = fi(T, "Puan");
  if (iC < 0 || iO < 0 || iV < 0) {
    warn.push("P Parametreleri sayfasında “Excel kolon adı”, “Seçenek” ve “Puan” kolonları olmalı; P parametreleri değiştirilmedi.");
    return { params: null, warn };
  }
  const out: { key: string; P: Param }[] = [];
  let cur: { key: string; P: Param } | null = null;
  T.rows.forEach((row, i) => {
    const key = iP >= 0 ? str(row[iP]) : "";
    const col = str(row[iC]);
    const txt = str(row[iO]);
    const pts = num(row[iV]);
    if (!txt && !col) return;
    if (!cur || (key && key !== cur.key) || (col && hnorm(col) !== hnorm(cur.P.col))) {
      cur = { key, P: { id: newId(), col: col || `Parametre ${out.length + 1}`, opts: [] } };
      out.push(cur);
    }
    if (!txt) return;
    if (!isNum(pts)) warn.push(`P Parametreleri satır ${i + T.off}: “${txt}” puanı “${String(row[iV])}” sayı değil, 0 sayıldı.`);
    cur.P.opts.push({ id: newId(), txt, pts: isNum(pts) ? pts : 0 });
  });
  const ps = out.map((x) => x.P).filter((P) => P.opts.length);
  // Varsayılan tablodaki takma adları (ör. P3 "Bulunmamaktadır.") koru
  for (const P of ps) {
    const old = P0.find((o) => hnorm(o.col) === hnorm(P.col));
    if (!old) continue;
    for (const o of P.opts) {
      const oo = old.opts.find((x) => tnorm(x.txt) === tnorm(o.txt));
      if (oo?.alias) o.alias = [...oo.alias];
    }
  }
  return { params: ps.length ? ps : null, warn };
}

/** P parametreleri değiştiğinde kontrollerin seçimlerini kolon adı + seçenek metnine göre yeni parametrelere taşır. */
export function remapPV(oldP: Param[], newP: Param[], controls: Control[]): void {
  for (const c of controls) {
    const pv: Record<string, string> = {};
    for (const NP of newP) {
      const OP = oldP.find((x) => x.id === NP.id) ?? oldP.find((x) => hnorm(x.col) === hnorm(NP.col));
      if (!OP) continue;
      const oo = optOf(OP, c.pv?.[OP.id]);
      if (!oo) continue;
      const no = NP.opts.find((o) => o.id === oo.id && tnorm(o.txt) === tnorm(oo.txt)) ?? NP.opts.find((o) => tnorm(o.txt) === tnorm(oo.txt));
      if (no) pv[NP.id] = no.id;
    }
    c.pv = pv;
  }
}

/* ---------- Yükleme alanları (Risk / Kontrol / Metodoloji) ---------- */
export type SlotKey = "r" | "c" | "m";
export interface SlotState {
  name: string;
  loading?: boolean;
  fatal?: string;
  T?: SheetTable;
  TP?: SheetTable;
}
export interface StageState { r: SlotState | null; c: SlotState | null; m: SlotState | null; incl: boolean }
export const SLOT_NAMES: Record<SlotKey, string> = { r: "Risk Excel'i", c: "Kontrol Excel'i", m: "Metodoloji ayarları" };

export async function readSlot(slot: SlotKey, file: File): Promise<SlotState> {
  let tables: SheetTable[];
  try {
    tables = sheetTables(await readWorkbookFile(file), file.name);
  } catch {
    return { name: file.name, fatal: "Dosya okunamadı. .xlsx biçiminde kaydedildiğinden emin olun." };
  }
  if (slot === "m") {
    const T = tables.find((t) => t.kind === "m");
    const TP = tables.find((t) => t.kind === "p");
    if (!T && !TP) return { name: file.name, fatal: "Dosyada “Parametre” veya “Seçenek / Puan” başlıklı bir tablo bulunamadı." };
    return { name: file.name, T, TP };
  }
  const T = tables.find((t) => t.kind === slot);
  if (!T) {
    const o = tables.find((t) => t.kind === "r" || t.kind === "c");
    return { name: file.name, fatal: o ? `Bu dosya ${SLOT_NAMES[o.kind as SlotKey]} gibi görünüyor; onu kendi alanına yükleyin.` : `Dosyada “${slot === "r" ? "Risk ID" : "Kontrol ID"}” başlıklı bir tablo bulunamadı.` };
  }
  return { name: file.name, T };
}

export interface StageEval {
  r: RiskParse | null;
  c: ControlParse | null;
  m: { m: Methodology; n: number; params: Param[] | null; warn: string[]; err: string[] } | null;
  ok: boolean;
}

export function evalStage(stage: StageState, current: { risks: Risk[]; m: Methodology }): StageEval {
  const E: StageEval = { r: null, c: null, m: null, ok: false };
  let params = current.m.params;
  if (stage.m && !stage.m.fatal && !stage.m.loading) {
    const M = parseMethod(stage.m.T, current.m);
    const PP = stage.m.TP ? parseParams(stage.m.TP) : { params: null, warn: [] };
    if (PP.params) M.m.params = PP.params;
    E.m = { m: M.m, n: M.n, params: PP.params, warn: [...M.warn, ...PP.warn], err: [] };
    params = M.m.params;
  }
  let riskIds = new Set(current.risks.map((r) => r.id));
  let cancelled = new Set<string>();
  if (stage.r?.T) {
    E.r = parseRisks(stage.r.T, stage.incl);
    if (E.r.risks.length) { riskIds = new Set(E.r.risks.map((r) => r.id)); cancelled = E.r.cancelled; }
  }
  if (stage.c?.T) E.c = parseControls(stage.c.T, riskIds, cancelled, params);
  const keys = (["r", "c", "m"] as SlotKey[]).filter((k) => stage[k]);
  E.ok = keys.length > 0 && keys.every((k) => { const s = stage[k]!; const e = E[k]; return !s.loading && !s.fatal && !!e && !e.err.length; });
  return E;
}

/** Değerlendirilmiş yüklemeyi mevcut duruma uygular; yeni veri kümesi ve metodolojiyi döner. */
export function buildFromStage(E: StageEval, stage: StageState, current: { risks: Risk[]; controls: Control[]; m: Methodology; srcName: string }):
  { data: Dataset | null; m: Methodology; controlsRemap?: boolean } {
  const newM = E.m ? E.m.m : current.m;
  if (E.r || E.c) {
    const risks = E.r ? E.r.risks : clone(current.risks);
    const ids = new Set(risks.map((r) => r.id));
    let controls: Control[];
    if (E.c) controls = E.c.controls;
    else {
      controls = clone(current.controls).filter((c) => ids.has(c.risk));
      if (E.m) remapPV(current.m.params, newM.params, controls);
    }
    if (E.c) {
      for (const r of risks) {
        if (!isNum(r.rec.integ) && isNum(E.c.recInteg[r.id])) r.rec.integ = E.c.recInteg[r.id];
      }
    }
    const name = E.r && E.c ? `${stage.r!.name} + ${stage.c!.name}` : E.r ? `${stage.r!.name} + kontroller (${current.srcName})` : `${stage.c!.name} + riskler (${current.srcName})`;
    return { data: { risks, controls, src: { name, date: new Date().toISOString() } }, m: newM };
  }
  return { data: null, m: newM, controlsRemap: true };
}
