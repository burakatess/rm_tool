import { useEffect, useMemo, useRef } from "react";
import { useApp, toast } from "../../state/store";
import { useResults } from "../../state/results";
import { PAGE_SIZES } from "../../domain/constants";
import { devs } from "../../domain/engine";
import { fx, inactive, norm } from "../../domain/text";
import { CtrlPill, RiskPill } from "../common";
import { RiskDetail } from "./RiskDetail";

export function Simulator() {
  const risks = useApp((s) => s.risks);
  const ui = useApp((s) => s.ui);
  const setUi = useApp((s) => s.setUi);
  const mutate = useApp((s) => s.mutate);
  const results = useResults();
  const listRef = useRef<HTMLDivElement>(null);

  const procs = useMemo(() => [...new Set(risks.map((r) => r.proc))], [risks]);
  const rows = useMemo(() => {
    const q = norm(ui.q);
    return risks.filter((r) => (!ui.proc || r.proc === ui.proc) && (!q || norm(`${r.id} ${r.desc} ${r.sub}`).includes(q)));
  }, [risks, ui.q, ui.proc]);

  const ps = PAGE_SIZES.includes(ui.ps) ? ui.ps : 30;
  const pages = Math.max(1, Math.ceil(rows.length / ps));
  const pg = Math.min(Math.max(0, ui.pg), pages - 1);
  const from = pg * ps;
  const page = rows.slice(from, from + ps);
  const sel = risks.find((r) => r.id === ui.sel) ?? risks[0];

  // Başka sekmeden bir riske gidildiğinde o riskin sayfasını aç ve satırı görünür yap
  useEffect(() => {
    if (!ui.jump || !sel) return;
    const i = rows.findIndex((r) => r.id === sel.id);
    setUi({ jump: false, ...(i >= 0 ? { pg: Math.floor(i / ps) } : {}) });
    requestAnimationFrame(() => {
      const tr = listRef.current?.querySelector<HTMLTableRowElement>("tr.on");
      const box = listRef.current;
      if (tr && box) box.scrollTop = Math.max(0, tr.offsetTop - box.clientHeight / 2 + tr.offsetHeight / 2);
    });
  }, [ui.jump, sel, rows, ps, setUi]);

  // Sayfa değişince listenin başına dön
  useEffect(() => { if (listRef.current && !ui.jump) listRef.current.scrollTop = 0; }, [pg, ps]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sel) {
    return <div className="panel"><div className="empty">Henüz risk yok. Veri yükle sekmesinden Excel yükleyin ya da risk ekleyin. <button className="btn" onClick={() => addRisk()}>Risk ekle</button></div></div>;
  }

  function addRisk() {
    let id = "";
    mutate((s) => {
      id = `YR-${s.seq++}`;
      s.risks.push({ id, status: "Onaylı", proc: s.ui.proc || s.risks[0]?.proc || "Tanımsız süreç", sub: "Yeni alt süreç", desc: "Yeni risk tanımı", it: true, fin: null, iti: null, reg: null, mus: null, g: 3, b: 3, e: 3, o: 3, ex: {}, rec: {} });
      s.ui.sel = id;
      s.ui.jump = true;
    });
    toast(`${id} eklendi`);
  }

  return (
    <div className="simgrid">
      <section className="panel" aria-label="Risk kütüğü">
        <div className="ph">
          <h2>Risk kütüğü <span className="num muted" style={{ fontWeight: 500 }}>{rows.length}</span></h2>
          <div className="filters">
            <input type="search" placeholder="ID veya tanımda ara" value={ui.q} aria-label="Risk ara" onChange={(e) => setUi({ q: e.target.value, pg: 0 })} />
            <select aria-label="Süreç filtresi" value={ui.proc} onChange={(e) => setUi({ proc: e.target.value, pg: 0 })}>
              <option value="">Tüm süreçler</option>
              {procs.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button className="btn" onClick={addRisk}>Risk ekle</button>
          </div>
        </div>
        <div className="sbody" ref={listRef}>
          <table>
            <thead><tr><th>ID</th><th>Risk</th><th>Doğal</th><th>Kontrol</th><th>Kalıntı</th></tr></thead>
            <tbody>
              {page.map((r) => {
                const c = results.get(r.id)!;
                const d = devs(r, c);
                return (
                  <tr key={r.id} className={r.id === sel.id ? "on" : ""} onClick={() => setUi({ sel: r.id })} data-risk={r.id}>
                    <td className="num">{r.id}
                      {d.length > 0 && <div className="dev" title={`${d.join(", ")} Excel kaydından farklı`}>● sapma</div>}
                      {inactive(r.status) && <div className="dev" style={{ color: "var(--muted)" }}>{r.status}</div>}
                    </td>
                    <td className="desc"><span>{r.desc}</span></td>
                    <td><span className="num">{c.imp}×{r.o}={c.dp}</span><br /><RiskPill level={c.ds} /></td>
                    <td><span className="num">{fx(c.integ)}</span><br /><CtrlPill level={c.is} /></td>
                    <td><span className="num">{fx(c.rp)}</span><br /><RiskPill level={c.rs} /></td>
                  </tr>
                );
              })}
              {!page.length && <tr><td colSpan={5} className="empty">Aramaya uyan risk yok.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <label className="check" style={{ fontWeight: 400 }}>Sayfa başına{" "}
            <select aria-label="Sayfa başına risk" value={ps} onChange={(e) => setUi({ ps: +e.target.value, jump: true })}>
              {PAGE_SIZES.map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          <span className="num muted">{rows.length ? `${from + 1}–${Math.min(from + ps, rows.length)} / ${rows.length}` : "0"}</span>
          <div className="acts">
            <button className="btn sm" disabled={pg === 0} onClick={() => setUi({ pg: 0 })} aria-label="İlk sayfa">«</button>
            <button className="btn sm" disabled={pg === 0} onClick={() => setUi({ pg: pg - 1 })}>‹ Önceki</button>
            <select aria-label="Sayfa" value={pg} onChange={(e) => setUi({ pg: +e.target.value })}>
              {Array.from({ length: pages }, (_, i) => <option key={i} value={i}>{i + 1} / {pages}</option>)}
            </select>
            <button className="btn sm" disabled={pg >= pages - 1} onClick={() => setUi({ pg: pg + 1 })}>Sonraki ›</button>
            <button className="btn sm" disabled={pg >= pages - 1} onClick={() => setUi({ pg: pages - 1 })} aria-label="Son sayfa">»</button>
          </div>
        </div>
      </section>
      <RiskDetail key={sel.id} risk={sel} />
    </div>
  );
}
