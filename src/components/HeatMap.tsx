import { useApp } from "../state/store";
import { useResults } from "../state/results";
import { RL } from "../domain/constants";
import { upLevel } from "../domain/engine";
import { fx, isNum } from "../domain/text";
import { RiskPill } from "./common";

export function HeatMap() {
  const risks = useApp((s) => s.risks);
  const th = useApp((s) => s.m.th);
  const setUi = useApp((s) => s.setUi);
  const results = useResults();
  const go = (id: string) => setUi({ sel: id, tab: "sim", jump: true });
  const cells = new Map<string, string[]>();
  for (const r of risks) {
    const k = `${results.get(r.id)!.imp}-${r.o}`;
    cells.set(k, [...(cells.get(k) ?? []), r.id]);
  }
  const moved = risks.filter((r) => isNum(r.rec?.rs) && results.get(r.id)!.rs !== r.rec.rs);

  return (
    <div className="grid">
      <section className="panel">
        <div className="ph"><h2>Doğal risk ısı haritası</h2><span className="muted">Etki (dikey) × Olasılık (yatay)</span></div>
        <div className="pb">
          <div className="scroll">
            <div className="heat">
              <div />
              {[1, 2, 3, 4, 5].map((o) => <div key={o} className="ax">O{o}</div>)}
              {[5, 4, 3, 2, 1].map((i) => [
                <div key={`a${i}`} className="ax">E{i}</div>,
                ...[1, 2, 3, 4, 5].map((o) => (
                  <div key={`${i}-${o}`} className={`cell bg${upLevel(i * o, th)}`}>
                    {(cells.get(`${i}-${o}`) ?? []).map((id) => <button key={id} className="chip" onClick={() => go(id)}>{id}</button>)}
                    <span className="sc">{i * o}</span>
                  </div>
                ))
              ])}
            </div>
          </div>
          <p className="note">Hücre rengi, doğal risk sınırlarına göre seviyeyi gösterir. Bir riske tıklayınca simülatörde açılır.</p>
        </div>
      </section>
      <section className="panel">
        <div className="ph"><h2>Kalıntı risk değişimi</h2><span className="muted">Excel kaydı → simülasyon</span></div>
        <div className="pb">
          {moved.length ? (
            <div className="scroll">
              <table>
                <thead><tr><th>Risk</th><th>Excel</th><th>Simülasyon</th><th>Kontrol puanı</th></tr></thead>
                <tbody>
                  {moved.map((r) => {
                    const c = results.get(r.id)!;
                    return <tr key={r.id} className="clickable" onClick={() => go(r.id)}><td className="num">{r.id}</td><td><RiskPill level={r.rec.rs!} /></td><td><RiskPill level={c.rs} /></td><td className="num">{fx(r.rec.integ)} → {fx(c.integ)}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="note">Şu an hiçbir riskin kalıntı seviyesi Excel kaydından farklı değil.</p>}
          <h2>Kalıntı seviyesine göre riskler</h2>
          {[5, 4, 3, 2, 1].map((l) => {
            const xs = risks.filter((r) => results.get(r.id)!.rs === l);
            return (
              <div key={l} className="row-inline wrapgap">
                <span className={`pill L${l}`}>{RL[l]} · {xs.length}</span>
                {xs.map((r) => <button key={r.id} className="chip" onClick={() => go(r.id)}>{r.id}</button>)}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
