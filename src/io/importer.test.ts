import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { M0 } from "../domain/constants";
import { computeAll, devs } from "../domain/engine";
import { clone } from "../domain/text";
import { blankWorkbook, controlTable, controlWorkbook, methodWorkbook, riskTable, riskWorkbook } from "./exporter";
import { matchOpt, parseControls, parseMethod, parseParams, parseRisks, remapPV, sheetTables } from "./importer";

const load = (p: string) => sheetTables(XLSX.read(readFileSync(p), { type: "buffer", cellDates: true }));
const roundTrip = (wb: XLSX.WorkBook) => sheetTables(XLSX.read(XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellDates: true }), { type: "buffer", cellDates: true }));

describe("Excel içe aktarma", () => {
  const R = parseRisks(load("tests/fixtures/risk.xlsx").find((t) => t.kind === "r")!);
  const C = parseControls(load("tests/fixtures/kontrol.xlsx").find((t) => t.kind === "c")!, new Set(R.risks.map((r) => r.id)), R.cancelled, M0.params);

  it("şablondaki 20 risk ve 81 kontrolü uyarısız okur", () => {
    expect(R.err).toEqual([]);
    expect(R.warn).toEqual([]);
    expect(R.risks).toHaveLength(20);
    expect(C.warn).toEqual([]);
    expect(C.stats).toEqual({ controls: 81, active: 77, orphan: 0, dropped: 0 });
  });

  it("kayıt alanlarını ve tarihleri korur", () => {
    expect(R.risks[0].ex).toMatchObject({ "Kayıt ID": 313673, "Risk İşleme": "Risk Kabulü", "Mutabakat Tarihi": "d:2023-04-07", "Özet": "R0001" });
  });

  it("iptal statüsündeki riskleri listeler ve isteğe bağlı içe alır", () => {
    const T = load("tests/fixtures/risk_iptalli.xlsx").find((t) => t.kind === "r")!;
    const a = parseRisks(T);
    expect(a.risks).toHaveLength(18);
    expect(a.cancelledList.map((x) => [x.id, x.status, x.ln])).toEqual([["RE-3", "İptal", 4], ["RE-9", "Pasif", 10]]);
    expect(parseRisks(T, true).risks).toHaveLength(20);
  });

  it("P seçeneklerini esnek eşler", () => {
    const [p1, , p3] = M0.params;
    expect(matchOpt(p3, "Bulunmamaktadır.")?.id).toBe("a");
    expect(matchOpt(p3, "İşlem elektronik imza ile gerçekleştirilmektedir")?.id).toBe("d");
    expect(matchOpt(p1, "BT Manuel")?.id).toBe("b");
    expect(matchOpt(p1, "otomatik kontrol")?.id).toBe("c");
    expect(matchOpt(p1, "tamamen alakasız")).toBeNull();
  });

  it("dışa aktar → içe al döngüsünde sonuçlar değişmez", () => {
    const res = computeAll(R.risks, C.controls, M0);
    const R2 = parseRisks(roundTrip(riskWorkbook(riskTable(R.risks, res))).find((t) => t.kind === "r")!);
    const C2 = parseControls(roundTrip(controlWorkbook(controlTable(R.risks, C.controls, M0, res))).find((t) => t.kind === "c")!, new Set(R2.risks.map((r) => r.id)), R2.cancelled, M0.params);
    expect(R2.warn).toEqual([]);
    expect(C2.warn).toEqual([]);
    expect(R2.risks[0].ex).toEqual(R.risks[0].ex);
    const res2 = computeAll(R2.risks, C2.controls, M0);
    expect(R2.risks.filter((r) => devs(r, res2.get(r.id)!).length)).toHaveLength(0);
  });

  it("metodoloji ve P parametreleri dosyası döngüsü", () => {
    const m = clone(M0);
    m.params[0].col = "Kontrol Tipi";
    m.cth = [3, 5.5, 8];
    const ts = roundTrip(methodWorkbook(m));
    const M = parseMethod(ts.find((t) => t.kind === "m"), M0);
    const P = parseParams(ts.find((t) => t.kind === "p")!);
    expect(M.m.cth).toEqual([3, 5.5, 8]);
    expect(P.params?.map((p) => p.col)[0]).toBe("Kontrol Tipi");
    expect(P.params?.[2].opts[0].alias).toEqual(["Bulunmamaktadır."]);
    const cs = clone(C.controls);
    const before = cs.map((c) => c.pv.p2);
    remapPV(M0.params, P.params!, cs);
    expect(cs.map((c) => P.params![1].opts.find((o) => o.id === c.pv[P.params![1].id])?.txt)).toEqual(before.map((id) => M0.params[1].opts.find((o) => o.id === id)?.txt));
  });

  it("boş şablon güncel P kolonlarıyla oluşur", () => {
    const wb = blankWorkbook("c", M0);
    expect(wb.SheetNames).toEqual(["Kontroller", "Geçerli değerler", "P puanları", "Açıklama"]);
    const head = XLSX.utils.sheet_to_json<string[]>(wb.Sheets.Kontroller, { header: 1 })[0];
    expect(head.slice(10, 15)).toEqual(M0.params.map((p) => p.col));
  });
});
