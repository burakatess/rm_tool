import { useApp, toast } from "../../state/store";
import { useResults } from "../../state/results";
import type { DimKey, Risk } from "../../domain/types";
import { BUS, CL, DIMS, ENUMS, ITD, RISK_REC, RL } from "../../domain/constants";
import { devs } from "../../domain/engine";
import { dTxt, exRaw, exSet, fx, fxs, isD, isNum, recKeys, uid } from "../../domain/text";
import { CommitInput, CtrlPill, RiskPill } from "../common";
import { RecordFields } from "./RecordFields";
import { ControlCard } from "./ControlCard";

export function RiskDetail({ risk: r }: { risk: Risk }) {
  const m = useApp((s) => s.m);
  const controls = useApp((s) => s.controls);
  const mutate = useApp((s) => s.mutate);
  const c = useResults().get(r.id)!;
  const d = devs(r, c);
  const R = r.rec ?? {};
  const ctrls = controls.filter((x) => x.risk === r.id);
  const restIds = new Set(c.rest.map((x) => uid(x.c)));
  const rkeys = recKeys(RISK_REC, r.ex);
  const filled = rkeys.filter((h) => exRaw(r.ex, h) !== "").length;
  const owner = exRaw(r.ex, "Risk Sorumlusu") || exRaw(r.ex, "Risk Sahibi");
  const upd = exRaw(r.ex, "Güncelleme");
  const used = new Set(c.dims.map((x) => x[0]));
  const busIdle = !BUS.some((k) => used.has(k));
  const itIdle = !ITD.some((k) => used.has(k));
  const fallback = (r.it && c.set !== "IT") || (!r.it && c.set !== "İş");

  const edit = (fn: (x: Risk) => void) => mutate((s) => { const x = s.risks.find((y) => y.id === r.id); if (x) fn(x); });

  const dimSel = (k: DimKey) => {
    const lab = DIMS.find((x) => x[0] === k)![1];
    const v = r[k];
    return (
      <div className="fld" key={k}>
        <label className="lbl" htmlFor={`r-${k}`}>{lab} (%{fxs(m.w[k])})</label>
        <select id={`r-${k}`} value={v == null ? "" : String(v)} onChange={(e) => edit((x) => { const val = e.target.value; x[k] = val === "" ? null : val === "N/A" ? "N/A" : +val; })}>
          <option value="">—</option><option value="N/A">N/A</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    );
  };

  return (
    <section className="panel" aria-label="Kayıt detayı">
      <div className="ph">
        <div><div className="lbl">{r.proc} › {r.sub}</div><h2><span className="num">{r.id}</span> <span className="muted" style={{ fontWeight: 500 }}>· {c.act.length} aktif kontrol</span></h2></div>
        {d.length ? <span className="dev">Excel kaydından farklı: {d.join(", ")}</span> : Object.keys(R).length ? <span className="tag">Excel kaydıyla uyumlu</span> : <span className="tag acc">Kayıtlı sonuç yok</span>}
      </div>
      <div className="pb sbody">
        <details className="rec" open>
          <summary>Kayıt bilgileri <span className="muted">· {filled}/{rkeys.length} alan dolu{owner ? ` · ${owner}` : ""}{upd ? ` · güncelleme ${isD(upd) ? dTxt(upd) : upd}` : ""}</span></summary>
          <div className="recgrid">
            <div className="fld"><label className="lbl" htmlFor="r-status">Risk Statü</label>
              <select id="r-status" value={r.status} onChange={(e) => edit((x) => { x.status = e.target.value; })}>
                {[...new Set(["Onaylı", "İptal", r.status])].map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div className="fld"><label className="lbl" htmlFor="r-proc">Süreç</label><CommitInput id="r-proc" type="text" value={r.proc} onCommit={(v) => edit((x) => { x.proc = v.trim() || "Tanımsız süreç"; })} /></div>
            <div className="fld"><label className="lbl" htmlFor="r-sub">Alt Süreç</label><CommitInput id="r-sub" type="text" value={r.sub} onCommit={(v) => edit((x) => { x.sub = v.trim(); })} /></div>
            <RecordFields keys={rkeys} ex={r.ex} idPrefix="rx" onChange={(h, v) => edit((x) => exSet(x.ex, h, v))} />
          </div>
        </details>
        <textarea aria-label="Risk tanımı" rows={2} value={r.desc} onChange={(e) => edit((x) => { x.desc = e.target.value; })} />
        <div className="chain">
          <div className="step"><span className="lbl">Doğal risk</span><span className="big">{c.dp}</span><RiskPill level={c.ds} /><small>Puan · skor {c.ds} · etki {c.imp} × olasılık {r.o}</small>{isNum(R.imp) && <span className="was">Excel: etki {R.imp}</span>}</div>
          <div className="step"><span className="lbl">Bütünleşik kontrol</span><span className="big">{fx(c.integ)}</span><CtrlPill level={c.is} /><small>Puan · skor {c.is} · {c.act.length} aktif kontrol</small>{isNum(R.integ) && <span className="was">Excel: {fx(R.integ)}{isNum(R.is) ? ` · ${CL[R.is]}` : ""}</span>}</div>
          <div className="step"><span className="lbl">Kalıntı risk</span><span className="big">{fx(c.rp)}</span><RiskPill level={c.rs} /><small>Puan (doğal − kontrol) · skor {c.rs}</small>{isNum(R.rs) && <span className="was">Excel: {RL[R.rs]}</span>}</div>
        </div>
        <div className="row">
          <label className="check"><input type="checkbox" checked={r.it} onChange={(e) => edit((x) => { x.it = e.target.checked; })} /> Flag for IT · BT riski (Gizlilik / Bütünlük / Erişilebilirlik ile ölçülür)</label>
          <div className="fld" style={{ width: 120 }}><label className="lbl" htmlFor="r-o">Olasılık</label>
            <select id="r-o" value={r.o} onChange={(e) => edit((x) => { x.o = +e.target.value; })}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
          </div>
        </div>
        <div className={`dimgrp ${busIdle ? "idle" : ""}`}>
          <div className="row"><h3>İş etkisi</h3>{busIdle ? <span className="tag">Hesapta kullanılmıyor</span> : <span className="tag acc">Etki bu boyutlardan</span>}</div>
          <div className="dims">{BUS.map(dimSel)}</div>
        </div>
        <div className={`dimgrp ${itIdle ? "idle" : ""}`}>
          <div className="row"><h3>BT etkisi</h3>{itIdle ? <span className="tag">Hesapta kullanılmıyor</span> : <span className="tag acc">Etki bu boyutlardan</span>}</div>
          <div className="dims">{ITD.map(dimSel)}</div>
        </div>
        <div className="formula">Etki = {String(ENUMS.rnd.find((x) => x[0] === m.rnd)?.[1]).toLowerCase()} yuvarla(({c.dims.map(([k, w]) => `${fxs(w)}×${r[k]}`).join(" + ") || "—"}) / {fxs(c.sw)}) = {fx(c.raw)} → {c.imp}{fallback ? ` · ${r.it ? "BT" : "iş"} boyutları boş olduğu için ${c.set === "IT" ? "BT" : "iş"} boyutları kullanıldı` : ""}</div>
        <div className="formula">Bütünleşik kontrol = en yüksek + {fx(m.f, 2)} × diğerleri{m.cap ? ` (en fazla ${m.cap})` : ""} = {c.act.length ? `${fx(c.act[0].p, 1)} + ${fx(m.f, 2)} × (${c.rest.map((x) => fx(x.p, 1)).join(" + ") || "0"}) = ${fx(c.integ)}` : "Aktif kontrol yok → 0"}</div>
        <div className="formula">Kalıntı puanı = {c.dp} − {fx(c.integ)} = {fx(c.rp)} · Kalıntı skoru = {m.rmode === "puan" ? `kalıntı puanı ${fx(c.rp)} → eşiklere göre ${c.rs}` : `max(1, doğal skor ${c.ds} − kontrol skoru ${c.is}) = ${c.rs}`}</div>
        <div className="ctl-h"><h2>Kontroller</h2>
          <button className="btn" onClick={() => {
            let id = "";
            mutate((s) => { id = `YK-${s.seq++}`; s.controls.push({ id, status: "Onaylı", risk: r.id, desc: "Yeni kontrol tanımı", pv: {}, freq: "Gerektiğinde", doc: false, ex: {}, user: true }); });
            toast(`${id} eklendi`);
          }}>Kontrol ekle</button>
        </div>
        {ctrls.map((x) => <ControlCard key={uid(x)} control={x} top={c.top} restIds={restIds} />)}
        {!ctrls.length && <div className="empty">Bu riske bağlı kontrol yok. “Kontrol ekle” ile senaryo kurun.</div>}
      </div>
    </section>
  );
}
