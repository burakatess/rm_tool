import { describe, expect, it } from "vitest";
import { builtinDataset, FIXES } from "./sampleData";
import { M0 } from "./constants";
import { applyFixes, calc, computeAll, devs, lowLevel, upLevel } from "./engine";
import { clone } from "./text";

describe("hesap motoru", () => {
  const ds = builtinDataset();
  const res = computeAll(ds.risks, ds.controls, M0);

  it("paylaşılan matrisin 20 riskinden 19'unu birebir üretir (RE-12 yuvarlama istisnası)", () => {
    const off = ds.risks.filter((r) => devs(r, res.get(r.id)!).length).map((r) => r.id);
    expect(off).toEqual(["RE-12"]);
  });

  it("RE-1: doğal 20 / bütünleşik 7,90 / kalıntı puanı 12,10, skor 2 (Düşük)", () => {
    const c = res.get("RE-1")!;
    expect([c.imp, c.dp, c.ds, c.is, c.rs]).toEqual([5, 20, 5, 3, 2]);
    expect(c.integ).toBeCloseTo(7.9, 5);
    expect(c.rp).toBeCloseTo(12.1, 5);
  });

  it("iptal kontrol (KE-846) bütünleşik puana girmez", () => {
    expect(res.get("RE-237")!.integ).toBeCloseTo(7.35, 5);
  });

  it("iş riskinde Finansal/İtibar/Regülasyon/Müşteri ağırlıkları kullanılır", () => {
    const r = { ...ds.risks[0], id: "X", it: false, fin: 4, iti: 3, reg: null, mus: "N/A" as const };
    expect(calc(r, M0, []).imp).toBe(4); // ceil((30·4+30·3)/60)=ceil(3,5)
  });

  it("seviye sınırları", () => {
    expect([2, 3, 6, 7, 10, 11, 16, 17].map((v) => upLevel(v, M0.th))).toEqual([1, 2, 2, 3, 3, 4, 4, 5]);
    expect([2.4, 2.5, 4.9, 5, 7.35, 7.5].map((v) => lowLevel(v, M0.cth))).toEqual([0, 1, 1, 2, 2, 3]);
  });

  it("kalıntı puan eşikleri yöntemi", () => {
    const m = { ...clone(M0), rmode: "puan" as const };
    expect(calc(ds.risks[0], m, ds.controls).rs).toBe(4); // 12,1 > 10
  });

  it("önerilen nitelik düzeltmeleri 20 kontrolü günceller", () => {
    const cs = clone(ds.controls);
    expect(applyFixes(cs, M0.params, FIXES)).toBe(20);
  });
});
