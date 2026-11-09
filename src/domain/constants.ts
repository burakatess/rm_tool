import type { DimKey, Methodology, Param } from "./types";

/* ---------- GRC şablonları (kolon sırası birebir) ---------- */
export const RISK_HEAD = ["Risk ID", "Kayıt ID", "Risk Statü", "İlgili GMY", "Risk Sahibi", "Süreç", "Alt Süreç", "Risk Tanımı", "Flag for IT", "Finansal Etki (%30)", "İtibar Etkisi (%30)", "Regülasyon Etkisi (%20)", "Müşteri Etkisi (%20)", "Gizlilik Etkisi (%35)", "Bütünlük Etkisi (%30)", "Erişilebilirlik Etkisi (%35)", "Etki", "Olasılık", "Doğal Risk Puanı", "Doğal Risk Skoru", "Doğal Risk Seviyesi", "Bütünleşik Kontrol Puanı", "Bütünleşik Kontrol Skoru", "Bütünleşik Kontrol Seviyesi", "Kalıntı Risk Puanı", "Kalıntı Risk Skoru", "Kalıntı Risk Seviyesi", "Risk İşleme", "Mutabakat Tarihi", "Oluşturma Tarihi", "Güncelleme", "Risk Sorumlusu", "Özet"];
/** 10–14. kolonlar P parametrelerinin yeridir; gerçek başlıklar metodolojiden gelir (ctrlHead). */
export const CTRL_HEAD = ["Kontrol ID", "Kayıt ID", "Kontrol Statü", "Risk ID", "İlgili GMY", "Risk Sahibi", "Süreç", "Alt Süreç", "Risk Tanımı", "Kontrol Tanımı", "Kontrol Türü", "Kontrol İşlevi", "Kontrolün İşletilme Şekli", "Kontrol İşletimin Denetimi", "Kontrol İşletiminin Raporlanması", "1. Seviye Kontrol Sıklığı", "Kontrol Puanı", "Kontrol Skoru", "Bütünleşik Kontrol Puanı", "Bütünleşik Kontrol Skoru", "Bütünleşik Kontrol Seviyesi", "Mutabakat Tarihi", "Oluşturma Tarihi", "Güncelleme", "Risk Sorumlusu", "Özet", "Custom field (Last Comment(SR))", "Outward issue link (Risk-Kontrol)"];
export const RISK_REC = ["Kayıt ID", "İlgili GMY", "Risk Sahibi", "Risk İşleme", "Mutabakat Tarihi", "Oluşturma Tarihi", "Güncelleme", "Risk Sorumlusu", "Özet"];
export const CTRL_REC = ["Kayıt ID", "Mutabakat Tarihi", "Oluşturma Tarihi", "Güncelleme", "Risk Sorumlusu", "Özet", "Custom field (Last Comment(SR))", "Outward issue link (Risk-Kontrol)"];
export const DATE_F = ["Mutabakat Tarihi", "Oluşturma Tarihi", "Güncelleme"];
export const CALC_COLS = new Set(["Etki", "Doğal Risk Puanı", "Doğal Risk Skoru", "Doğal Risk Seviyesi", "Bütünleşik Kontrol Puanı", "Bütünleşik Kontrol Skoru", "Bütünleşik Kontrol Seviyesi", "Kalıntı Risk Puanı", "Kalıntı Risk Skoru", "Kalıntı Risk Seviyesi", "Kontrol Puanı", "Kontrol Skoru"]);
export const INP_COLS = new Set(["Risk ID", "Risk Statü", "Süreç", "Alt Süreç", "Risk Tanımı", "Flag for IT", "Finansal Etki (%30)", "İtibar Etkisi (%30)", "Regülasyon Etkisi (%20)", "Müşteri Etkisi (%20)", "Gizlilik Etkisi (%35)", "Bütünlük Etkisi (%30)", "Erişilebilirlik Etkisi (%35)", "Olasılık", "Kontrol ID", "Kontrol Statü", "Kontrol Tanımı", "1. Seviye Kontrol Sıklığı"]);

export const DIMS: [DimKey, string, string][] = [["fin", "Finansal", "Finansal Etki"], ["iti", "İtibar", "İtibar Etkisi"], ["reg", "Regülasyon", "Regülasyon Etkisi"], ["mus", "Müşteri", "Müşteri Etkisi"], ["g", "Gizlilik", "Gizlilik Etkisi"], ["b", "Bütünlük", "Bütünlük Etkisi"], ["e", "Erişilebilirlik", "Erişilebilirlik Etkisi"]];
export const BUS: DimKey[] = ["fin", "iti", "reg", "mus"];
export const ITD: DimKey[] = ["g", "b", "e"];

/* ---------- Seviye adları ve sabit listeler ---------- */
export const RL = ["", "Çok Düşük", "Düşük", "Orta", "Yüksek", "Çok Yüksek"];
export const CL = ["Zayıf", "Makul", "Güçlü", "Çok Güçlü"];
export const FREQ = ["İşlem Anında", "Günlük", "Haftalık", "Aylık", "3 Aylık", "6 Aylık", "Yıllık", "Gerektiğinde"];
export const PAGE_SIZES = [20, 30, 50, 100];

/** GRC'deki uzun metinler (eski kodlardan dönüşüm ve sabit seçenek metinleri için). */
export const LONG = {
  t: { O: "Otomatik", B: "BT Manuel", M: "Manuel" } as Record<string, string>,
  f: { O: "Önleyici", D: "Düzeltici", T: "Tespit Edici" } as Record<string, string>,
  k: {
    S: "İşlem, sistem logları veya ıslak imza ile kayıt altına alınmaktadır.",
    E: "İşlemde kullanıcı adı / parola / ses kaydı / ortak alana dosya kaydı / e-mail kullanılmaktadır.",
    N: "Kontrolün iz kaydı yoktur."
  } as Record<string, string>,
  d: ["Bulunmamaktadır.", "İşlemler aynı ekipteki diğer çalışanlar tarafından kontrol edilmektedir.", "İşlemler farklı ekiplerdeki çalışanlar tarafından kontrol edilmektedir.", "Her ikisi de yapılmaktadır."],
  r: ["Bulunmamaktadır.", "İşlemler düzensiz aralıklarla üst amirlere raporlanmaktadır.", "Üst amirlere düzenli aralıklarla raporlama yapılmaktadır.", "İşlemler farklı birimlere (RKD/BGD vb.) raporlanmakta ve işlemlerin gözetimi yapılmaktadır."]
};

/** P parametreleri — 9 Kasım 2026'da paylaşılan güncel tablo. */
export const P0: Param[] = [
  { id: "p1", col: "Kontrol Türü", opts: [{ id: "a", txt: "Manuel", pts: 0.5 }, { id: "b", txt: "BT Manuel", pts: 1 }, { id: "c", txt: "Otomatik", pts: 1.5 }] },
  { id: "p2", col: "Kontrol İşlevi", opts: [{ id: "a", txt: "Tespit Edici", pts: 0.5 }, { id: "b", txt: "Düzeltici", pts: 1 }, { id: "c", txt: "Önleyici", pts: 1.5 }] },
  {
    id: "p3", col: "Kontrolün İşletilme Şekli", opts: [
      { id: "a", txt: "Kontrolün iz kaydı yoktur.", pts: 0, alias: ["Bulunmamaktadır."] },
      { id: "b", txt: LONG.k.E, pts: 0.5 },
      { id: "c", txt: LONG.k.S, pts: 1 },
      { id: "d", txt: "İşlem elektronik imza ile gerçekleştirilmektedir.", pts: 1.5 }
    ]
  },
  { id: "p4", col: "Kontrol İşletimin Denetimi", opts: LONG.d.map((t, i) => ({ id: "abcd"[i], txt: t, pts: i * 0.5 })) },
  { id: "p5", col: "Kontrol İşletiminin Raporlanması", opts: LONG.r.map((t, i) => ({ id: "abcd"[i], txt: t, pts: i * 0.5 })) }
];

/** Eski tek harfli kodlar (t/f/k/d/r) → P parametresi seçenekleri. */
const LEGACY: Record<string, [string, Record<string, string> | string[]]> = {
  t: ["p1", { M: "a", B: "b", O: "c" }], f: ["p2", { T: "a", D: "b", O: "c" }], k: ["p3", { N: "a", E: "b", S: "c" }],
  d: ["p4", ["a", "b", "c", "d"]], r: ["p5", ["a", "b", "c", "d"]]
};
export const LEGACY_COL: Record<string, string> = { t: "Kontrol Türü", f: "Kontrol İşlevi", k: "Kontrolün İşletilme Şekli" };
export function legacyPV(c: Record<string, string | number | undefined>): Record<string, string> {
  const pv: Record<string, string> = {};
  for (const [k, [pid, map]] of Object.entries(LEGACY)) {
    const v = c[k];
    if (v == null) continue;
    const o = Array.isArray(map) ? map[Number(v)] : map[String(v)];
    if (o != null) pv[pid] = o;
  }
  return pv;
}

export const M0: Methodology = {
  w: { fin: 30, iti: 30, reg: 20, mus: 20, g: 35, b: 30, e: 35 },
  rnd: "ceil",
  th: [2, 6, 10, 16],
  params: P0,
  kth: [2.5, 5, 7.5],
  f: 0.3, cap: 0, exDoc: false,
  cth: [2.5, 5, 7.5],
  rmode: "skor",
  rth: [2, 6, 10, 16]
};

export type MpKind = "n" | "rnd" | "rmode" | "yn";
/** Metodoloji alanları: [etiket, yol, tür] — ekran ve Excel ayar dosyası ortak kullanır. */
export const MP: [string, string, MpKind][] = [
  ["Finansal etki ağırlığı (%)", "w.fin", "n"], ["İtibar etkisi ağırlığı (%)", "w.iti", "n"], ["Regülasyon etkisi ağırlığı (%)", "w.reg", "n"], ["Müşteri etkisi ağırlığı (%)", "w.mus", "n"],
  ["Gizlilik etkisi ağırlığı (%)", "w.g", "n"], ["Bütünlük etkisi ağırlığı (%)", "w.b", "n"], ["Erişilebilirlik etkisi ağırlığı (%)", "w.e", "n"],
  ["Etki yuvarlama", "rnd", "rnd"],
  ["Doğal risk · Çok Düşük üst sınırı", "th.0", "n"], ["Doğal risk · Düşük üst sınırı", "th.1", "n"], ["Doğal risk · Orta üst sınırı", "th.2", "n"], ["Doğal risk · Yüksek üst sınırı", "th.3", "n"],
  ["Kontrol skoru · Makul alt sınırı", "kth.0", "n"], ["Kontrol skoru · Güçlü alt sınırı", "kth.1", "n"], ["Kontrol skoru · Çok Güçlü alt sınırı", "kth.2", "n"],
  ["İkincil kontrol katsayısı", "f", "n"], ["İkincil kontrol tavanı (0 = sınırsız)", "cap", "n"], ["Doküman kontrollerini hariç tut", "exDoc", "yn"],
  ["Bütünleşik kontrol · Makul alt sınırı", "cth.0", "n"], ["Bütünleşik kontrol · Güçlü alt sınırı", "cth.1", "n"], ["Bütünleşik kontrol · Çok Güçlü alt sınırı", "cth.2", "n"],
  ["Kalıntı risk yöntemi", "rmode", "rmode"],
  ["Kalıntı risk · Çok Düşük üst sınırı", "rth.0", "n"], ["Kalıntı risk · Düşük üst sınırı", "rth.1", "n"], ["Kalıntı risk · Orta üst sınırı", "rth.2", "n"], ["Kalıntı risk · Yüksek üst sınırı", "rth.3", "n"]
];
export const ENUMS: Record<Exclude<MpKind, "n">, [string | boolean, string][]> = {
  rnd: [["ceil", "Yukarı"], ["round", "En yakın"], ["floor", "Aşağı"]],
  rmode: [["skor", "Skor farkı"], ["puan", "Kalıntı puanı eşikleri"]],
  yn: [[true, "Evet"], [false, "Hayır"]]
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getP(o: any, p: string): any {
  return p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setP(o: any, p: string, v: unknown): void {
  const ks = p.split(".");
  let a = o;
  ks.slice(0, -1).forEach((k) => (a = a[k]));
  a[ks[ks.length - 1]] = v;
}
