/** Etki boyutu değeri: 1–5, "N/A" ya da boş (null). */
export type DimValue = number | "N/A" | null;
export type DimKey = "fin" | "iti" | "reg" | "mus" | "g" | "b" | "e";

/** GRC kayıt alanları (Kayıt ID, tarihler, sorumlu…). Tarihler "d:YYYY-MM-DD" biçiminde saklanır. */
export type ExValue = string | number | boolean;
export type Extra = Record<string, ExValue>;

/** Excel'de kayıtlı hesap sonuçları; simülasyonla karşılaştırma (sapma) için. */
export interface RecordedResult {
  imp?: number;
  integ?: number;
  is?: number;
  rs?: number;
}

export interface Risk {
  id: string;
  status: string;
  proc: string;
  sub: string;
  desc: string;
  /** Flag for IT: true ise G/B/E, false ise Finansal/İtibar/Regülasyon/Müşteri ağırlıkları kullanılır. */
  it: boolean;
  fin: DimValue;
  iti: DimValue;
  reg: DimValue;
  mus: DimValue;
  g: DimValue;
  b: DimValue;
  e: DimValue;
  o: number;
  ex: Extra;
  rec: RecordedResult;
}

export interface Control {
  id: string;
  risk: string;
  status: string;
  desc: string;
  /** P parametresi id'si → seçilen seçenek id'si */
  pv: Record<string, string>;
  freq: string;
  /** Yalnızca politika/prosedür varlığına dayanan kontrol */
  doc: boolean;
  ex: Extra;
  /** Simülatörde eklenmiş (Excel'de olmayan) kontrol */
  user?: boolean;
}

export interface ParamOption {
  id: string;
  txt: string;
  pts: number;
  alias?: string[];
}

export interface Param {
  id: string;
  /** Kontrol Excel'indeki kolon başlığı */
  col: string;
  opts: ParamOption[];
}

export type RoundMode = "ceil" | "round" | "floor";
export type ResidualMode = "skor" | "puan";

export interface Methodology {
  w: Record<DimKey, number>;
  rnd: RoundMode;
  /** Doğal risk puanı üst sınırları → skor 1..5 */
  th: [number, number, number, number];
  params: Param[];
  /** Kontrol puanı alt sınırları → kontrol skoru 1..3 */
  kth: [number, number, number];
  /** İkincil kontrol katsayısı */
  f: number;
  /** İkincil kontrol tavanı (0 = sınırsız) */
  cap: number;
  exDoc: boolean;
  /** Bütünleşik kontrol puanı alt sınırları → skor 1..3 */
  cth: [number, number, number];
  rmode: ResidualMode;
  /** Kalıntı risk puanı üst sınırları (puan yönteminde) */
  rth: [number, number, number, number];
}

export interface Dataset {
  risks: Risk[];
  controls: Control[];
  src: { name: string; date: string | null };
}

export interface ScoredControl {
  c: Control;
  p: number;
}

export interface CalcResult {
  raw: number;
  dims: [DimKey, number][];
  sw: number;
  set: "IT" | "İş";
  imp: number;
  /** Doğal risk puanı ve skoru */
  dp: number;
  ds: number;
  act: ScoredControl[];
  rest: ScoredControl[];
  /** Bütünleşik kontrol puanı ve skoru */
  integ: number;
  is: number;
  /** Kalıntı risk puanı ve skoru */
  rp: number;
  rs: number;
  top: Control | null;
}

export type TableKind = "r" | "c";
export type Tab = "sim" | "tbl" | "heat" | "met" | "data";
