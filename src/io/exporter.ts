/**
 * Risk / Kontrol Excel'lerini GRC şablonunun kolon sırasıyla üretir.
 * Hesaplanan kolonlar yeniden hesaplanır; kayıt alanları (Kayıt ID, tarihler…) olduğu gibi yazılır.
 */
import * as XLSX from "xlsx";
import type { CalcResult, Control, Methodology, Risk } from "../domain/types";
import { CL, CTRL_HEAD, ENUMS, FREQ, MP, RISK_HEAD, RL, getP } from "../domain/constants";
import { cscore, kscore, optOf } from "../domain/engine";
import { dToDate, exRaw, hnorm, isD, r2 } from "../domain/text";

export interface TableItem<T> { o: T; v: unknown[] }
export interface Table<T> { head: string[]; items: TableItem<T>[] }

const outVal = (v: unknown): unknown => (isD(v) ? dToDate(v) : v);
const exGet = (ex: Risk["ex"], h: string): unknown => { const v = exRaw(ex, h); return v === "" ? "" : outVal(v); };

function extraHeads(list: { ex: Risk["ex"] }[], head: string[]): string[] {
  const hs = new Set(head.map(hnorm));
  const out: string[] = [];
  for (const x of list) for (const h of Object.keys(x.ex ?? {})) {
    if (!hs.has(hnorm(h))) { out.push(h); hs.add(hnorm(h)); }
  }
  return out;
}

export const ctrlHead = (m: Methodology): string[] => [...CTRL_HEAD.slice(0, 10), ...m.params.map((P) => P.col), ...CTRL_HEAD.slice(15)];

export function riskTable(risks: Risk[], results: Map<string, CalcResult>): Table<Risk> {
  const head = [...RISK_HEAD, ...extraHeads(risks, RISK_HEAD)];
  const items = risks.map((r) => {
    const c = results.get(r.id)!;
    const dim = (k: keyof Risk) => (r[k] == null ? "" : r[k]);
    const map: Record<string, unknown> = {
      "Risk ID": r.id, "Risk Statü": r.status, "Süreç": r.proc, "Alt Süreç": r.sub, "Risk Tanımı": r.desc, "Flag for IT": r.it ? 1 : 0,
      "Finansal Etki (%30)": dim("fin"), "İtibar Etkisi (%30)": dim("iti"), "Regülasyon Etkisi (%20)": dim("reg"), "Müşteri Etkisi (%20)": dim("mus"),
      "Gizlilik Etkisi (%35)": dim("g"), "Bütünlük Etkisi (%30)": dim("b"), "Erişilebilirlik Etkisi (%35)": dim("e"),
      "Etki": c.imp, "Olasılık": r.o, "Doğal Risk Puanı": c.dp, "Doğal Risk Skoru": c.ds, "Doğal Risk Seviyesi": RL[c.ds],
      "Bütünleşik Kontrol Puanı": r2(c.integ), "Bütünleşik Kontrol Skoru": c.is, "Bütünleşik Kontrol Seviyesi": CL[c.is],
      "Kalıntı Risk Puanı": r2(c.rp), "Kalıntı Risk Skoru": c.rs, "Kalıntı Risk Seviyesi": RL[c.rs]
    };
    return { o: r, v: head.map((h) => (h in map ? map[h] : exGet(r.ex, h))) };
  });
  return { head, items };
}

export function controlTable(risks: Risk[], controls: Control[], m: Methodology, results: Map<string, CalcResult>): Table<Control> {
  const base = ctrlHead(m);
  const head = [...base, ...extraHeads(controls, base)];
  const byId = new Map(risks.map((r) => [r.id, r]));
  const items: TableItem<Control>[] = [];
  for (const c of controls) {
    const r = byId.get(c.risk);
    const res = results.get(c.risk);
    if (!r || !res) continue;
    const p = cscore(c, m);
    const link = exGet(c.ex, "Outward issue link (Risk-Kontrol)");
    const map: Record<string, unknown> = {
      "Kontrol ID": c.id, "Kontrol Statü": c.status, "Risk ID": c.risk, "İlgili GMY": exGet(r.ex, "İlgili GMY"), "Risk Sahibi": exGet(r.ex, "Risk Sahibi"),
      "Süreç": r.proc, "Alt Süreç": r.sub, "Risk Tanımı": r.desc, "Kontrol Tanımı": c.desc, "1. Seviye Kontrol Sıklığı": c.freq,
      "Kontrol Puanı": r2(p), "Kontrol Skoru": kscore(p, m), "Bütünleşik Kontrol Puanı": r2(res.integ), "Bütünleşik Kontrol Skoru": res.is, "Bütünleşik Kontrol Seviyesi": CL[res.is],
      "Outward issue link (Risk-Kontrol)": link === "" ? c.risk : link
    };
    for (const P of m.params) map[P.col] = optOf(P, c.pv?.[P.id])?.txt ?? "";
    items.push({ o: c, v: head.map((h) => (h in map ? map[h] : exGet(c.ex, h))) });
  }
  return { head, items };
}

export const toRows = <T,>(t: Table<T>): unknown[][] => [t.head, ...t.items.map((i) => i.v)];

export function methodRows(m: Methodology): unknown[][] {
  return [["Parametre", "Değer"], ...MP.map(([lab, path, t]) => {
    const v = getP(m, path);
    return [lab, t === "n" ? v : ENUMS[t].find(([k]) => String(k) === String(v))?.[1] ?? v];
  })];
}
export function paramRows(m: Methodology): unknown[][] {
  const rows: unknown[][] = [["P", "Excel kolon adı", "Seçenek", "Puan"]];
  m.params.forEach((P, i) => P.opts.forEach((o) => rows.push([`P${i + 1}`, P.col, o.txt, o.pts])));
  return rows;
}

const WIDE = /Tanımı|Şekli|Denetimi|Raporlanması|Süreç|GMY|Sahibi|Comment/;
export const isWide = (h: string) => WIDE.test(h);
const colW = (h: string) => (WIDE.test(h) ? 40 : Math.max(10, Math.min(18, h.length + 2)));

function sheetOf(rows: unknown[][], width: (h: string, i: number) => number): XLSX.WorkSheet {
  const DF = "dd\\.mm\\.yyyy";
  const ws = XLSX.utils.aoa_to_sheet(rows, { cellDates: true, dateNF: DF });
  for (const k of Object.keys(ws)) {
    if (k[0] === "!") continue;
    const cell = ws[k] as XLSX.CellObject;
    if (cell.t === "d") cell.z = DF;
  }
  ws["!cols"] = (rows[0] as string[]).map((h, i) => ({ wch: width(String(h), i) }));
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, rows.length - 1), c: rows[0].length - 1 } }) };
  return ws;
}

export function riskWorkbook(t: Table<Risk>): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheetOf(toRows(t), colW), "Riskler");
  return wb;
}
export function controlWorkbook(t: Table<Control>): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheetOf(toRows(t), colW), "Kontroller");
  return wb;
}
export function methodWorkbook(m: Methodology): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheetOf(methodRows(m), (_h, i) => (i ? 28 : 46)), "Metodoloji");
  XLSX.utils.book_append_sheet(wb, sheetOf(paramRows(m), (_h, i) => [6, 30, 80, 8][i]), "P Parametreleri");
  return wb;
}

export function blankWorkbook(kind: "r" | "c", m: Methodology): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const head = kind === "r" ? RISK_HEAD : ctrlHead(m);
  XLSX.utils.book_append_sheet(wb, sheetOf([head], colW), kind === "r" ? "Riskler" : "Kontroller");
  const lists: [string, (string | number)[]][] = kind === "r"
    ? [["Risk Statü", ["Onaylı", "İptal"]], ["Flag for IT", [1, 0]], ["Etki kolonları", [1, 2, 3, 4, 5, "N/A"]], ["Olasılık", [1, 2, 3, 4, 5]]]
    : [["Kontrol Statü", ["Onaylı", "İptal"]], ...m.params.map((P): [string, string[]] => [P.col, P.opts.map((o) => o.txt)]), ["1. Seviye Kontrol Sıklığı", FREQ]];
  const n = Math.max(...lists.map((l) => l[1].length));
  const la: unknown[][] = [lists.map((l) => l[0])];
  for (let i = 0; i < n; i++) la.push(lists.map((l) => l[1][i] ?? ""));
  XLSX.utils.book_append_sheet(wb, sheetOf(la, (h) => (WIDE.test(h) ? 60 : 22)), "Geçerli değerler");
  if (kind === "c") XLSX.utils.book_append_sheet(wb, sheetOf(paramRows(m), (_h, i) => [6, 30, 80, 8][i]), "P puanları");
  const guide = kind === "r"
    ? [["Kolon", "Nasıl doldurulur"], ["Risk ID", "Zorunlu, tekil (ör. RE-17)."], ["Risk Statü", "Onaylı veya İptal. İptal riskler varsayılan olarak içe alınmaz."], ["Süreç / Alt Süreç / Risk Tanımı", "Serbest metin."], ["Flag for IT", "1 = BT riski (Gizlilik / Bütünlük / Erişilebilirlik ile ölçülür). Boş veya 0 = iş riski (Finansal / İtibar / Regülasyon / Müşteri)."], ["Etki kolonları", "1–5, N/A veya boş. Boş ve N/A hesaptan çıkar."], ["Olasılık", "Zorunlu, 1–5."], ["Etki, Doğal / Bütünleşik / Kalıntı kolonları", "Boş bırakılabilir; simülatör hesaplar. Doluysa kayıtla karşılaştırıp sapma gösterir."], ["Kayıt ID, İlgili GMY, Risk Sahibi, Risk İşleme, tarihler, Risk Sorumlusu, Özet", "GRC kayıt bilgisi; hesaba girmez, olduğu gibi korunur. Tarihleri gg.aa.yyyy biçiminde girin."]]
    : [["Kolon", "Nasıl doldurulur"], ["Kontrol ID", "Zorunlu (ör. KE-1300)."], ["Kontrol Statü", "Onaylı veya İptal. İptal kontroller hesaba girmez."], ["Risk ID", "Zorunlu; Risk Excel'indeki bir riske eşleşmeli. Birden fazla risk için satırı çoğaltın ya da ID'leri virgülle ayırın."], ["Kontrol Tanımı", "Serbest metin."], [m.params.map((P) => P.col).join(", "), "“Geçerli değerler” sayfasındaki metinlerden birini kullanın. Puanlar “P puanları” sayfasındadır."], ["1. Seviye Kontrol Sıklığı", "“Geçerli değerler” sayfasındaki değerlerden biri; puana girmez."], ["İlgili GMY, Risk Sahibi, Süreç, Alt Süreç, Risk Tanımı", "Boş bırakılabilir; indirilen dosyada Risk Excel'inden doldurulur."], ["Kontrol Puanı, Skoru, Bütünleşik kolonlar", "Boş bırakılabilir; simülatör hesaplar."], ["Kayıt ID, tarihler, Risk Sorumlusu, Özet, Last Comment, Outward issue link", "GRC kayıt bilgisi; hesaba girmez, olduğu gibi korunur. Tarihleri gg.aa.yyyy biçiminde girin."]];
  XLSX.utils.book_append_sheet(wb, sheetOf(guide, (_h, i) => (i ? 100 : 44)), "Açıklama");
  return wb;
}

export function workbookBlob(wb: XLSX.WorkBook): Blob {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", cellDates: true }) as ArrayBuffer;
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export const stamp = (): string => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
