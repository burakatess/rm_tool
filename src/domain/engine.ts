/**
 * Hesap motoru — paylaşılan BGD matrisinden geri hesaplanan metodoloji.
 *
 * Etki            = ağırlıklı ortalama (boş/N/A boyutlar hariç), yuvarlama ayarına göre 1–5
 * Doğal puan      = Etki × Olasılık; skor = doğal risk üst sınırlarına göre 1–5
 * Kontrol puanı   = Σ P parametresi puanları; skor = kontrol skoru alt sınırlarına göre 0–3
 * Bütünleşik puan = en yüksek kontrol puanı + katsayı × diğer aktif kontrollerin toplamı
 * Kalıntı puan    = Doğal puan − Bütünleşik puan (bilgi amaçlı)
 * Kalıntı skor    = max(1, Doğal skor − Bütünleşik skor)  [varsayılan "skor" yöntemi]
 */
import type { CalcResult, Control, DimKey, Methodology, Param, ParamOption, Risk } from "./types";
import { BUS, ITD, LEGACY_COL, LONG } from "./constants";
import { ascii, hnorm, inactive, isNum } from "./text";

export const optOf = (P: Param, id: string | undefined | null): ParamOption | null =>
  id == null ? null : P.opts.find((o) => o.id === id) ?? null;

export function cscore(c: Control, m: Methodology): number {
  let s = 0;
  for (const P of m.params) {
    const o = optOf(P, c.pv?.[P.id]);
    if (o && isNum(o.pts)) s += o.pts;
  }
  return s;
}

export const maxScore = (m: Methodology): number =>
  m.params.reduce((a, P) => a + Math.max(0, ...P.opts.map((o) => (isNum(o.pts) ? o.pts : 0))), 0);

export function rnd(x: number, mode: Methodology["rnd"]): number {
  const e = 1e-9;
  return mode === "ceil" ? Math.ceil(x - e) : mode === "floor" ? Math.floor(x + e) : Math.round(x);
}
/** Üst sınırlarla seviye (1..5): değer ≤ sınır ise o seviye. */
export function upLevel(v: number, th: readonly number[]): number {
  for (let i = 0; i < 4; i++) if (v <= th[i] + 1e-9) return i + 1;
  return 5;
}
/** Alt sınırlarla seviye (0..3): değer ≥ sınır ise bir üst seviye. */
export function lowLevel(v: number, th: readonly number[]): number {
  if (v < th[0] - 1e-9) return 0;
  if (v < th[1] - 1e-9) return 1;
  if (v < th[2] - 1e-9) return 2;
  return 3;
}
export const kscore = (p: number, m: Methodology): number => lowLevel(p, m.kth);

export function calc(r: Risk, m: Methodology, controls: Control[]): CalcResult {
  const pick = (keys: DimKey[]): [DimKey, number][] => keys.filter((k) => isNum(r[k])).map((k) => [k, m.w[k]]);
  let set: "IT" | "İş" = r.it ? "IT" : "İş";
  let dims = pick(r.it ? ITD : BUS);
  if (!dims.length) {
    const alt = pick(r.it ? BUS : ITD);
    if (alt.length) {
      dims = alt;
      set = r.it ? "İş" : "IT";
    }
  }
  const sw = dims.reduce((a, [, w]) => a + w, 0);
  const raw = sw ? dims.reduce((a, [k, w]) => a + w * (r[k] as number), 0) / sw : 0;
  const imp = sw ? Math.min(5, Math.max(1, rnd(raw, m.rnd))) : 1;
  const dp = imp * r.o;
  const ds = upLevel(dp, m.th);
  const act = controls
    .filter((c) => c.risk === r.id && !inactive(c.status) && !(m.exDoc && c.doc))
    .map((c) => ({ c, p: cscore(c, m) }))
    .sort((a, b) => b.p - a.p);
  const rest = m.cap > 0 ? act.slice(1, 1 + m.cap) : act.slice(1);
  const integ = act.length ? act[0].p + m.f * rest.reduce((a, x) => a + x.p, 0) : 0;
  const is = act.length ? lowLevel(integ, m.cth) : 0;
  const rp = dp - integ;
  const rs = m.rmode === "puan" ? (rp <= 0 ? 1 : upLevel(rp, m.rth)) : Math.max(1, ds - is);
  return { raw, dims, sw, set, imp, dp, ds, act, rest, integ, is, rp, rs, top: act[0]?.c ?? null };
}

export function groupControls(controls: Control[]): Map<string, Control[]> {
  const g = new Map<string, Control[]>();
  for (const c of controls) {
    const l = g.get(c.risk);
    if (l) l.push(c);
    else g.set(c.risk, [c]);
  }
  return g;
}

export function computeAll(risks: Risk[], controls: Control[], m: Methodology): Map<string, CalcResult> {
  const g = groupControls(controls);
  const out = new Map<string, CalcResult>();
  for (const r of risks) out.set(r.id, calc(r, m, g.get(r.id) ?? []));
  return out;
}

/** Excel'de kayıtlı sonuçtan farklı olan alanlar. */
export function devs(r: Risk, c: CalcResult): string[] {
  const R = r.rec ?? {};
  const d: string[] = [];
  if (isNum(R.imp) && c.imp !== R.imp) d.push("Etki");
  if (isNum(R.integ) && Math.abs(c.integ - R.integ) > 0.005) d.push("Kontrol puanı");
  if (isNum(R.is) && c.is !== R.is) d.push("Kontrol skoru");
  if (isNum(R.rs) && c.rs !== R.rs) d.push("Kalıntı");
  return d;
}

/** Gözden geçirme raporundaki nitelik düzeltmelerini uygular; güncellenen kontrol sayısını döner. */
export function applyFixes(controls: Control[], params: Param[], fixes: Record<string, Partial<Record<"t" | "f" | "k", string>>>): number {
  let n = 0;
  for (const c of controls) {
    const f = fixes[c.id];
    if (!f) continue;
    let hit = false;
    for (const [k, code] of Object.entries(f)) {
      const col = LEGACY_COL[k];
      const txt = (LONG as unknown as Record<string, Record<string, string>>)[k][code as string];
      const P = params.find((x) => hnorm(x.col) === hnorm(col));
      const o = P?.opts.find((x) => ascii(x.txt) === ascii(txt));
      if (!P || !o) continue;
      c.pv = c.pv ?? {};
      c.pv[P.id] = o.id;
      hit = true;
    }
    if (hit) n++;
  }
  return n;
}
