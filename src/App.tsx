import { useMemo } from "react";
import { useApp, toast } from "./state/store";
import { ResultsContext } from "./state/results";
import { computeAll, devs, applyFixes } from "./domain/engine";
import { countChanges } from "./domain/changes";
import { FIXES } from "./domain/sampleData";
import { isNum, inactive } from "./domain/text";
import type { Tab } from "./domain/types";
import { DistBar, Toast, shortCounts } from "./components/common";
import { Simulator } from "./components/simulator/Simulator";
import { ExcelTables } from "./components/tables/ExcelTables";
import { HeatMap } from "./components/HeatMap";
import { Methodology } from "./components/methodology/Methodology";
import { DataLoad } from "./components/data/DataLoad";

const TABS: [Tab, string][] = [["sim", "Simülatör"], ["tbl", "Excel tabloları"], ["heat", "Isı haritası"], ["met", "Metodoloji ve sınırlar"], ["data", "Veri yükle"]];

export default function App() {
  const hydrated = useApp((s) => s.hydrated);
  const risks = useApp((s) => s.risks);
  const controls = useApp((s) => s.controls);
  const m = useApp((s) => s.m);
  const base = useApp((s) => s.base);
  const tab = useApp((s) => s.ui.tab);
  const setUi = useApp((s) => s.setUi);
  const mutate = useApp((s) => s.mutate);
  const resetToBase = useApp((s) => s.resetToBase);

  const results = useMemo(() => computeAll(risks, controls, m), [risks, controls, m]);
  const stats = useMemo(() => {
    const res = [0, 0, 0, 0, 0, 0], rec = [0, 0, 0, 0, 0, 0];
    let nDev = 0;
    for (const r of risks) {
      const c = results.get(r.id)!;
      res[c.rs]++;
      if (isNum(r.rec?.rs)) rec[r.rec.rs]++;
      if (devs(r, c).length) nDev++;
    }
    return { res, rec, nDev, hasRec: rec.some(Boolean), active: controls.filter((c) => !inactive(c.status)).length, changes: countChanges({ risks, controls }, base) };
  }, [risks, controls, results, base]);

  if (!hydrated) return <div className="wrap"><div className="loading"><span className="spin" aria-hidden="true" />Kayıtlı veri yükleniyor…</div></div>;

  return (
    <ResultsContext.Provider value={results}>
      <div className="wrap">
        <header>
          <div className="lbl">Bilgi Güvenliği Direktörlüğü · Risk ve kontrol metodolojisi</div>
          <h1>BGD Risk Simülatörü</h1>
          <p>Etki, olasılık ve kontrol niteliklerini değiştirin; doğal risk, bütünleşik kontrol ve kalıntı risk metodoloji kurallarıyla anında yeniden hesaplanır. Sapma işareti, sonucun yüklenen Excel'deki kayıtlı değerden farklı olduğunu gösterir.</p>
          <p className="src">
            <span className="lbl">Veri</span> {base.src.name}
            {base.src.date ? ` · yüklendi ${new Date(base.src.date).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}` : ""}
            <button className="link" onClick={() => setUi({ tab: "data" })}>Excel yükle</button>
            <button className="link" onClick={() => setUi({ tab: "tbl" })}>Tabloları gör / indir</button>
          </p>
        </header>
        <div className="summary">
          <div className="stat"><span className="lbl">Risk / aktif kontrol</span><b className="num">{risks.length} / {stats.active}</b></div>
          <div className="stat"><span className="lbl">Kalıntı dağılımı (simülasyon)</span><DistBar counts={stats.res} /><span className="num muted small">{shortCounts(stats.res)}</span></div>
          <div className="stat"><span className="lbl">Kalıntı dağılımı (Excel kaydı)</span>{stats.hasRec ? <><DistBar counts={stats.rec} /><span className="num muted small">{shortCounts(stats.rec)}</span></> : <span className="muted small">Excel'de kalıntı skoru boş</span>}</div>
          <div className="stat"><span className="lbl">Kayıttan sapan risk</span><b className="num" style={{ color: stats.nDev ? "var(--l4)" : "var(--l1)" }}>{stats.nDev}</b></div>
          <div className="stat"><span className="lbl">Yapılan değişiklik</span><b className="num">{stats.changes}</b></div>
        </div>
        <div className="bar">
          <div className="tabs" role="tablist">
            {TABS.map(([k, t]) => <button key={k} className="tab" role="tab" aria-selected={tab === k} onClick={() => setUi({ tab: k })}>{t}</button>)}
          </div>
          <div className="acts">
            <button className="btn" title="Gözden geçirme raporunun 7. bölümündeki tür/işlev düzeltmeleri" onClick={() => {
              let n = 0;
              mutate((s) => { n = applyFixes(s.controls, s.m.params, FIXES); });
              toast(n ? `${n} kontrolün niteliği güncellendi` : "Bu veride düzeltme önerilen kontrol yok");
            }}>Önerilen nitelik düzeltmelerini uygula</button>
            <button className="btn" title="Son yüklenen Excel'deki değerlere döner" onClick={() => { resetToBase(); toast("Yüklenen veriye dönüldü"); }}>Yüklenen veriye sıfırla</button>
          </div>
        </div>
        {tab === "sim" && <Simulator />}
        {tab === "tbl" && <ExcelTables />}
        {tab === "heat" && <HeatMap />}
        {tab === "met" && <Methodology />}
        {tab === "data" && <DataLoad />}
      </div>
      <Toast />
    </ResultsContext.Provider>
  );
}
