import { useEffect, useMemo, useRef, useState } from "react";
import { useApp, toast } from "../../state/store";
import { useResults } from "../../state/results";
import type { Control, Risk, TableKind } from "../../domain/types";
import { CALC_COLS, CTRL_REC, INP_COLS, RISK_HEAD, RISK_REC } from "../../domain/constants";
import { cellTxt, hnorm, norm, shortTxt, uid } from "../../domain/text";
import { controlTable, controlWorkbook, ctrlHead, isWide, riskTable, riskWorkbook, saveBlob, stamp, workbookBlob, type Table } from "../../io/exporter";
import { edSpec, edValue, setCell } from "./editing";

const EMPTY = "__bos__";
const defW = (h: string) => (isWide(h) ? 260 : Math.max(84, Math.min(190, h.length * 7.2 + 34)));

export function ExcelTables() {
  const risks = useApp((s) => s.risks);
  const controls = useApp((s) => s.controls);
  const m = useApp((s) => s.m);
  const ui = useApp((s) => s.ui);
  const setUi = useApp((s) => s.setUi);
  const mutate = useApp((s) => s.mutate);
  const results = useResults();
  const kind: TableKind = ui.tsub === "c" ? "c" : "r";
  const [edit, setEdit] = useState<{ id: string; h: string } | null>(null);
  const [live, setLive] = useState<{ ci: number; w: number } | null>(null);
  const edRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const T = useMemo<Table<Risk> | Table<Control>>(() => (kind === "r" ? riskTable(risks, results) : controlTable(risks, controls, m, results)), [kind, risks, controls, m, results]);
  const head = T.head;
  const txt = useMemo(() => T.items.map((it) => it.v.map(cellTxt)), [T]);
  const distinct = useMemo(() => head.map((h, ci) => {
    const s = new Set(txt.map((r) => r[ci]));
    return s.size <= 30 && !isWide(h) ? [...s].sort((a, b) => a.localeCompare(b, "tr", { numeric: true })) : null;
  }), [head, txt]);

  const F = ui.tf[kind] ?? {};
  const hid = new Set(ui.hid[kind] ?? []);
  const widths = ui.tw[kind] ?? {};
  const vis = head.map((_, i) => i).filter((i) => i === 0 || !hid.has(head[i]));
  const W = (ci: number) => (live?.ci === ci ? live.w : widths[head[ci]] ?? defW(head[ci]));
  const total = vis.reduce((a, ci) => a + W(ci), 0);
  const q = norm(ui.tq);
  const nF = Object.values(F).filter((v) => v !== "").length;

  const rows = useMemo(() => T.items.map((it, ri) => ({ it, t: txt[ri] })).filter(({ t }) => {
    if (q && !norm(t.join(" ")).includes(q)) return false;
    for (const [h, fv] of Object.entries(F)) {
      if (!fv) continue;
      const ci = head.indexOf(h);
      if (ci < 0) continue;
      if (distinct[ci]) { if ((fv === EMPTY ? "" : fv) !== t[ci]) return false; }
      else if (!norm(t[ci]).includes(norm(fv))) return false;
    }
    return true;
  }), [T, txt, q, F, head, distinct]);

  const idOf = (o: Risk | Control) => (kind === "r" ? o.id : uid(o as Control));

  // Düzenleme kutusu açılınca odakla — tabloyu kaydırmadan
  useEffect(() => {
    const el = edRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    if (el instanceof HTMLInputElement && el.type === "text") el.select();
  }, [edit]);

  function commit(value: string) {
    if (!edit) return;
    const { id, h } = edit;
    setEdit(null);
    const sp = edSpec(kind, h, m);
    if (!sp) return;
    mutate((s) => {
      const obj = kind === "r" ? s.risks.find((r) => r.id === id) : s.controls.find((c) => uid(c) === id);
      if (obj && edValue(obj, h, sp) !== value) setCell(obj, h, sp, value);
    });
  }

  function download() {
    const wb = kind === "r" ? riskWorkbook(T as Table<Risk>) : controlWorkbook(T as Table<Control>);
    const name = `BGD_${kind === "r" ? "Risk" : "Kontrol"}_${stamp()}.xlsx`;
    saveBlob(workbookBlob(wb), name);
    toast(`${name} indirildi`);
  }

  function startResize(e: React.PointerEvent, ci: number) {
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX;
    const w0 = W(ci);
    let w = w0;
    const move = (ev: PointerEvent) => { w = Math.max(50, w0 + ev.clientX - x0); setLive({ ci, w }); };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setLive(null);
      if (w !== w0) useApp.getState().mutate((s) => { s.ui.tw[kind] = { ...(s.ui.tw[kind] ?? {}), [head[ci]]: Math.round(w) }; });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const setFilter = (h: string, v: string) => mutate((s) => { s.ui.tf[kind] = { ...(s.ui.tf[kind] ?? {}), [h]: v }; });
  const setHidden = (list: string[]) => mutate((s) => { s.ui.hid[kind] = list; });
  const recList = kind === "r" ? RISK_REC : CTRL_REC;
  const templ = kind === "r" ? RISK_HEAD : ctrlHead(m);
  const isParamCol = (h: string) => kind === "c" && m.params.some((P) => hnorm(P.col) === hnorm(h));

  return (
    <section className="panel">
      <div className="ph">
        <div className="tabs" role="tablist">
          {([["r", "Risk Excel'i", risks.length], ["c", "Kontrol Excel'i", controls.length]] as const).map(([k, t, n]) => (
            <button key={k} className="tab" role="tab" aria-selected={kind === k} onClick={() => { setEdit(null); setUi({ tsub: k }); }}>{t} <span className="num muted">{n}</span></button>
          ))}
        </div>
        <div className="filters">
          <input type="search" placeholder="Tüm kolonlarda ara" value={ui.tq} aria-label="Tabloda ara" onChange={(e) => setUi({ tq: e.target.value })} />
          <button className="btn" aria-expanded={ui.colp} onClick={() => setUi({ colp: !ui.colp })}>Kolonlar {vis.length}/{head.length}</button>
          {(nF > 0 || q) && <button className="btn" onClick={() => mutate((s) => { s.ui.tf[kind] = {}; s.ui.tq = ""; })}>Filtreleri temizle ({nF + (q ? 1 : 0)})</button>}
          <button className="btn pri" onClick={download}>{kind === "r" ? "Risk" : "Kontrol"} Excel'ini indir</button>
        </div>
      </div>
      <div className="pb">
        {ui.colp && (
          <div className="colpanel">
            <div className="row">
              <h3>Görünen kolonlar · {vis.length}/{head.length}</h3>
              <div className="acts">
                <button className="btn sm" onClick={() => setHidden([])}>Tümünü göster</button>
                <button className="btn sm" onClick={() => setHidden([...new Set([...hid, ...head.filter((h) => CALC_COLS.has(h))])])}>Hesaplananları gizle</button>
                <button className="btn sm" onClick={() => setHidden([...new Set([...hid, ...head.filter((h) => recList.some((x) => hnorm(x) === hnorm(h)) || !templ.some((x) => hnorm(x) === hnorm(h)))])])}>Kayıt bilgilerini gizle</button>
                <button className="btn sm" onClick={() => mutate((s) => { s.ui.tw[kind] = {}; })}>Genişlikleri sıfırla</button>
                <button className="btn sm" onClick={() => setUi({ colp: false })}>Kapat</button>
              </div>
            </div>
            <div className="colgrid">
              {head.map((h, ci) => (
                <label className="check" key={h}>
                  <input type="checkbox" disabled={ci === 0} checked={ci === 0 || !hid.has(h)} onChange={(e) => { const set = new Set(hid); if (e.target.checked) set.delete(h); else set.add(h); setHidden([...set]); }} />
                  <span className={CALC_COLS.has(h) ? "calcc" : ""}>{h}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="legend">
          <span><b style={{ color: "var(--ink)" }}>Siyah başlık</b> hesap girdisi</span>
          <span><b style={{ color: "var(--accent)" }}>Renkli başlık</b> simülasyonla hesaplanır, düzenlenemez</span>
          <span><b>Gri başlık</b> GRC kayıt bilgisi</span>
          <span>Hücreye tıklayıp düzenleyin · ID'ye tıklayınca simülatörde açılır · başlık kenarını sürükleyerek genişletin</span>
          <span className="num">{rows.length} / {T.items.length} satır</span>
        </div>
        <div className="xtwrap">
          <table className="xt" style={{ width: total }}>
            <colgroup>{vis.map((ci) => <col key={ci} style={{ width: W(ci) }} />)}</colgroup>
            <thead>
              <tr>
                {vis.map((ci) => {
                  const h = head[ci];
                  return <th key={h} className={CALC_COLS.has(h) ? "calc" : isParamCol(h) || INP_COLS.has(h) ? "inp" : ""} title={h}>{h}<span className="rz" aria-hidden="true" onPointerDown={(e) => startResize(e, ci)} /></th>;
                })}
              </tr>
              <tr className="frow">
                {vis.map((ci) => {
                  const h = head[ci];
                  const v = F[h] ?? "";
                  return (
                    <th key={h}>
                      {distinct[ci]
                        ? <select aria-label={`${h} filtresi`} className={v ? "on" : ""} value={v} onChange={(e) => setFilter(h, e.target.value)}>
                            <option value="">Tümü</option>
                            {distinct[ci]!.map((x) => <option key={x || EMPTY} value={x === "" ? EMPTY : x}>{x === "" ? "(boş)" : shortTxt(x, 40)}</option>)}
                          </select>
                        : <input type="search" placeholder="Filtre" aria-label={`${h} filtresi`} className={v ? "on" : ""} value={v} onChange={(e) => setFilter(h, e.target.value)} />}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ it, t }) => {
                const o = it.o as Risk & Control;
                const id = idOf(o);
                return (
                  <tr key={id}>
                    {vis.map((ci) => {
                      const h = head[ci];
                      if (ci === 0) return <td key={h} className="idc" title="Simülatörde aç" onClick={() => setUi({ sel: kind === "r" ? o.id : o.risk, tab: "sim", jump: true })}>{t[ci]}</td>;
                      const sp = edSpec(kind, h, m);
                      if (sp && edit?.id === id && edit.h === h) {
                        const v = edValue(o, h, sp);
                        return (
                          <td key={h} className="editing">
                            {sp.t === "sel"
                              ? <select ref={(el) => { edRef.current = el; }} defaultValue={v} onChange={(e) => commit(e.target.value)} onBlur={() => setEdit(null)} onKeyDown={(e) => { if (e.key === "Escape") setEdit(null); }}>
                                  {sp.opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                </select>
                              : <input ref={(el) => { edRef.current = el; }} type={sp.t === "date" ? "date" : "text"} defaultValue={v}
                                  onBlur={(e) => commit(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") commit((e.target as HTMLInputElement).value); if (e.key === "Escape") setEdit(null); }} />}
                          </td>
                        );
                      }
                      return <td key={h} className={sp ? "ed" : ""} title={t[ci]} onClick={sp ? () => setEdit({ id, h }) : undefined}>{t[ci]}</td>;
                    })}
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={vis.length} className="empty">Filtreye uyan satır yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
