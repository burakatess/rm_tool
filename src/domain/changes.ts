import type { Dataset } from "./types";
import { uid } from "./text";

/** Son yüklenen veriye göre değişen/eklenen/silinen kayıt sayısı. */
export function countChanges(cur: Pick<Dataset, "risks" | "controls">, base: Dataset): number {
  let n = 0;
  const bc = new Map(base.controls.map((c) => [uid(c), c]));
  const br = new Map(base.risks.map((r) => [r.id, r]));
  for (const c of cur.controls) {
    const b = bc.get(uid(c));
    if (!b) n++;
    else if ((["status", "desc", "freq", "doc"] as const).some((k) => b[k] !== c[k]) || JSON.stringify(b.pv ?? {}) !== JSON.stringify(c.pv ?? {}) || JSON.stringify(b.ex ?? {}) !== JSON.stringify(c.ex ?? {})) n++;
  }
  for (const r of cur.risks) {
    const b = br.get(r.id);
    if (!b) n++;
    else if ((["it", "fin", "iti", "reg", "mus", "g", "b", "e", "o", "desc", "status", "proc", "sub"] as const).some((k) => b[k] !== r[k]) || JSON.stringify(b.ex ?? {}) !== JSON.stringify(r.ex ?? {})) n++;
  }
  const curIds = new Set(cur.controls.map(uid));
  n += base.controls.filter((c) => !curIds.has(uid(c))).length;
  return n;
}
