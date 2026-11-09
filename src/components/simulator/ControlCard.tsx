import { useApp, toast } from "../../state/store";
import type { Control } from "../../domain/types";
import { CL, CTRL_REC, FREQ } from "../../domain/constants";
import { cscore, kscore, maxScore, optOf } from "../../domain/engine";
import { dTxt, exRaw, exSet, fx, fxs, inactive, isD, recKeys, shortTxt, uid } from "../../domain/text";
import { RecordFields } from "./RecordFields";

export function ControlCard({ control: x, top, restIds }: { control: Control; top: Control | null; restIds: Set<string> }) {
  const m = useApp((s) => s.m);
  const mutate = useApp((s) => s.mutate);
  const u = uid(x);
  const p = cscore(x, m);
  const ks = kscore(p, m);
  const off = inactive(x.status) || (m.exDoc && x.doc);
  const isTop = !!top && uid(top) === u;
  const keys = recKeys(CTRL_REC, x.ex);
  const n = keys.filter((h) => exRaw(x.ex, h) !== "").length;
  const ow = exRaw(x.ex, "Risk Sorumlusu");
  const up = exRaw(x.ex, "Güncelleme");
  const edit = (fn: (c: Control) => void) => mutate((s) => { const c = s.controls.find((y) => uid(y) === u); if (c) fn(c); });

  const role = isTop ? <span className="tag acc">Ana kontrol · tam puan</span>
    : restIds.has(u) ? <span className="tag">× {fx(m.f, 2)} katkı</span>
    : off ? <span className="tag">Hesap dışı · {inactive(x.status) ? x.status : "doküman"}</span>
    : <span className="tag">Tavan dışı</span>;

  return (
    <div className={`ctl ${isTop ? "top" : ""} ${off ? "off" : ""}`}>
      <div className="ctl-h">
        <span className="row-inline"><span className="id">{x.id}</span> {role}</span>
        <span className="row-inline">
          <span className="score">{fx(p, 1)} / {fxs(maxScore(m))}</span><span className="tag">skor {ks} · {CL[ks]}</span>
          <select aria-label="Kontrol statüsü" value={x.status} onChange={(e) => edit((c) => { c.status = e.target.value; })}>
            {[...new Set(["Onaylı", "İptal", x.status])].map((s) => <option key={s}>{s}</option>)}
          </select>
          {x.user && <button className="btn" onClick={() => { mutate((s) => { s.controls = s.controls.filter((c) => uid(c) !== u); }); toast("Kontrol silindi"); }}>Sil</button>}
        </span>
      </div>
      <textarea rows={2} aria-label="Kontrol tanımı" value={x.desc} onChange={(e) => edit((c) => { c.desc = e.target.value; })} />
      <div className="attrs">
        {m.params.map((P, i) => {
          const cur = x.pv?.[P.id];
          const has = optOf(P, cur);
          const id = `c-${u}-${P.id}`;
          return (
            <div className="fld" key={P.id}>
              <label className="lbl" htmlFor={id} title={P.col}>P{i + 1} · {P.col}</label>
              <select id={id} value={has ? cur : ""} onChange={(e) => edit((c) => { c.pv = c.pv ?? {}; if (e.target.value) c.pv[P.id] = e.target.value; else delete c.pv[P.id]; })}>
                {!has && <option value="">— seçilmedi (0)</option>}
                {P.opts.map((o) => <option key={o.id} value={o.id}>{shortTxt(o.txt)} ({fx(o.pts, 1)})</option>)}
              </select>
            </div>
          );
        })}
        <div className="fld">
          <label className="lbl" htmlFor={`c-${u}-freq`}>Sıklık (puansız)</label>
          <select id={`c-${u}-freq`} value={x.freq} onChange={(e) => edit((c) => { c.freq = e.target.value; })}>
            {[...new Set([...FREQ, x.freq])].map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>
      <label className="check small"><input type="checkbox" checked={x.doc} onChange={(e) => edit((c) => { c.doc = e.target.checked; })} /> Doküman varlığına dayanan kontrol{m.exDoc ? " (hesaptan hariç)" : ""}</label>
      <details className="rec">
        <summary>Kayıt bilgileri <span className="muted">· {n}/{keys.length} alan dolu{ow ? ` · ${ow}` : ""}{up ? ` · güncelleme ${isD(up) ? dTxt(up) : up}` : ""}</span></summary>
        <div className="recgrid"><RecordFields keys={keys} ex={x.ex} idPrefix={`cx-${u}`} onChange={(h, v) => edit((c) => exSet(c.ex, h, v))} /></div>
      </details>
    </div>
  );
}
