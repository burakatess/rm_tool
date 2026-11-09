import type { Control, DimKey, Methodology, Param, Risk, TableKind } from "../../domain/types";
import { CTRL_HEAD, CTRL_REC, DIMS, FREQ, RISK_HEAD, RISK_REC } from "../../domain/constants";
import { exRaw, exSet, hnorm, isD, isDateField } from "../../domain/text";

export type EdSpec =
  | { t: "sel"; f: "status" | "it" | "o" | "freq"; opts: [string, string][] }
  | { t: "sel"; f: "dim"; k: DimKey; opts: [string, string][] }
  | { t: "sel"; f: "p"; P: Param; opts: [string, string][] }
  | { t: "text"; f: "proc" | "sub" | "desc" }
  | { t: "text" | "date"; f: "rec" };

const STAT: [string, string][] = [["Onaylı", "Onaylı"], ["İptal", "İptal"]];

/** Kolonun tabloda düzenlenip düzenlenemeyeceği ve nasıl düzenleneceği; null = salt okunur. */
export function edSpec(kind: TableKind, h: string, m: Methodology): EdSpec | null {
  const H = hnorm(h);
  const is = (x: string) => hnorm(x) === H;
  const date = isDateField(h);
  if (kind === "r") {
    if (is("Risk Statü")) return { t: "sel", f: "status", opts: STAT };
    if (is("Süreç")) return { t: "text", f: "proc" };
    if (is("Alt Süreç")) return { t: "text", f: "sub" };
    if (is("Risk Tanımı")) return { t: "text", f: "desc" };
    if (is("Flag for IT")) return { t: "sel", f: "it", opts: [["1", "1"], ["0", "0"]] };
    const d = DIMS.find((x) => hnorm(x[2]) === H);
    if (d) return { t: "sel", f: "dim", k: d[0], opts: [["", "—"], ["N/A", "N/A"], ...[1, 2, 3, 4, 5].map((x): [string, string] => [String(x), String(x)])] };
    if (is("Olasılık")) return { t: "sel", f: "o", opts: [1, 2, 3, 4, 5].map((x): [string, string] => [String(x), String(x)]) };
    if (RISK_HEAD.some(is) && !RISK_REC.some(is)) return null;
    return { t: date ? "date" : "text", f: "rec" };
  }
  if (is("Kontrol Statü")) return { t: "sel", f: "status", opts: STAT };
  if (is("Kontrol Tanımı")) return { t: "text", f: "desc" };
  const P = m.params.find((x) => hnorm(x.col) === H);
  if (P) return { t: "sel", f: "p", P, opts: [["", "— seçilmedi"], ...P.opts.map((o): [string, string] => [o.id, o.txt])] };
  if (is("1. Seviye Kontrol Sıklığı")) return { t: "sel", f: "freq", opts: FREQ.map((x): [string, string] => [x, x]) };
  if (CTRL_HEAD.some(is) && !CTRL_REC.some(is)) return null;
  return { t: date ? "date" : "text", f: "rec" };
}

type Row = Partial<Risk & Control> & { ex: Risk["ex"] };

export function edValue(obj: Row, h: string, sp: EdSpec): string {
  switch (sp.f) {
    case "status": return obj.status ?? "";
    case "proc": return obj.proc ?? "";
    case "sub": return obj.sub ?? "";
    case "desc": return obj.desc ?? "";
    case "it": return obj.it ? "1" : "0";
    case "dim": { const v = obj[sp.k]; return v == null ? "" : String(v); }
    case "o": return String(obj.o ?? "");
    case "p": return obj.pv?.[sp.P.id] ?? "";
    case "freq": return obj.freq ?? "";
    default: { const v = exRaw(obj.ex, h); return isD(v) ? v.slice(2) : String(v); }
  }
}

export function setCell(obj: Row, h: string, sp: EdSpec, val: string): void {
  switch (sp.f) {
    case "status": obj.status = val; break;
    case "proc": obj.proc = val.trim() || "Tanımsız süreç"; break;
    case "sub": obj.sub = val.trim(); break;
    case "desc": obj.desc = val; break;
    case "it": obj.it = val === "1"; break;
    case "dim": obj[sp.k] = val === "" ? null : val === "N/A" ? "N/A" : +val; break;
    case "o": obj.o = +val; break;
    case "p": obj.pv = obj.pv ?? {}; if (val) obj.pv[sp.P.id] = val; else delete obj.pv[sp.P.id]; break;
    case "freq": obj.freq = val; break;
    default: exSet(obj.ex, h, sp.t === "date" && val ? `d:${val}` : val.trim());
  }
}
