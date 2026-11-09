import type { Control, ExValue, Extra } from "./types";
import { DATE_F } from "./constants";

export const isNum = (v: unknown): v is number => typeof v === "number" && isFinite(v);
export const norm = (s: unknown): string => String(s ?? "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/\s+/g, " ").trim();
export const ascii = (s: unknown): string => norm(s).replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o");
/** Başlık karşılaştırması: büyük/küçük harf ve "(%30)" gibi ağırlık eklerinden bağımsız. */
export const hnorm = (s: unknown): string => norm(String(s ?? "").replace(/\(%[^)]*\)/g, ""));
/** Seçenek metni karşılaştırması: Türkçe karakter ve sondaki noktadan bağımsız. */
export const tnorm = (s: unknown): string => ascii(s).replace(/[.\s]+$/, "");

export const fx = (n: unknown, d = 2): string => (isNum(n) ? n.toFixed(d).replace(".", ",") : "—");
export const fxs = (n: unknown): string => (isNum(n) ? (Number.isInteger(n) ? String(n) : fx(n)) : "—");
export const r2 = (n: number): number => Math.round(n * 100) / 100;
export const shortTxt = (t: string, n = 64): string => (t.length > n ? t.slice(0, n - 1) + "…" : t);
export const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
export const newId = (): string => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

export const inactive = (s: unknown): boolean => ["iptal", "pasif", "kapali", "silindi"].includes(ascii(s));
export const uid = (c: Pick<Control, "id" | "risk">): string => (c.id + "__" + c.risk).replace(/[^A-Za-z0-9_-]/g, "_");

/* ---------- Tarihler ("d:YYYY-MM-DD") ---------- */
export const isD = (v: unknown): v is string => typeof v === "string" && /^d:\d{4}-\d{2}-\d{2}$/.test(v);
export const dTxt = (v: string): string => {
  const [y, m, d] = v.slice(2).split("-");
  return `${d}.${m}.${y}`;
};
export const dToDate = (v: string): Date => {
  const [y, m, d] = v.slice(2).split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const isDateField = (h: string): boolean => DATE_F.some((x) => hnorm(x) === hnorm(h));

/* ---------- Kayıt alanları ---------- */
export const exKey = (ex: Extra, h: string): string | undefined => Object.keys(ex).find((x) => hnorm(x) === hnorm(h));
export const exRaw = (ex: Extra | undefined, h: string): ExValue | "" => {
  if (!ex) return "";
  const k = exKey(ex, h);
  return k == null ? "" : ex[k];
};
export function exSet(ex: Extra, h: string, v: ExValue | "" | null | undefined): void {
  const k = exKey(ex, h) ?? h;
  if (v === "" || v == null) delete ex[k];
  else ex[k] = v;
}
/** Şablondaki kayıt alanları + dosyadan gelen ek kolonlar. */
export function recKeys(list: string[], ex: Extra | undefined): string[] {
  const keys = [...list];
  Object.keys(ex ?? {}).forEach((k) => {
    if (!keys.some((x) => hnorm(x) === hnorm(k))) keys.push(k);
  });
  return keys;
}
export function cellTxt(v: unknown): string {
  if (v instanceof Date) return v.toLocaleDateString("tr-TR");
  if (isNum(v)) return Number.isInteger(v) ? String(v) : fx(v);
  if (isD(v)) return dTxt(v);
  return v == null ? "" : String(v);
}

/** Kontrolün yalnızca politika/prosedür varlığına dayandığını tahmin eder (kullanıcı düzeltebilir). */
const DOCRX = /(prosedür|politika|talimatname)[^.]{0,120}?(bulunmaktadır|tanımlanmıştır|yazılmıştır|belirtilmiştir|yayınlanmıştır|oluşturulmuştur)/i;
export const looksDoc = (t: string): boolean => DOCRX.test(t) && !/üzerinde|uygulan/i.test(t);
