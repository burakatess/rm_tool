import { useApp, toast } from "../../state/store";
import type { Methodology as M } from "../../domain/types";
import { BUS, CL, CTRL_HEAD, ENUMS, ITD, M0, MP, P0, RL, getP, setP } from "../../domain/constants";
import { maxScore } from "../../domain/engine";
import { clone, fxs, hnorm, isNum, newId } from "../../domain/text";
import { methodWorkbook, saveBlob, stamp, workbookBlob } from "../../io/exporter";
import { remapPV } from "../../io/importer";
import { CommitInput } from "../common";

const asc = (a: readonly number[]) => a.every((x, i) => i === 0 || x > a[i - 1]);

function MInput({ path }: { path: string }) {
  const m = useApp((s) => s.m);
  const mutate = useApp((s) => s.mutate);
  const def = MP.find((x) => x[1] === path)!;
  const v = getP(m, path);
  const id = `m-${path.replace(/\./g, "-")}`;
  const lab = def[0].replace(/^[^·]*· /, "");
  return (
    <div className="mrow">
      <label htmlFor={id}>{lab}</label>
      {def[2] === "n"
        ? <CommitInput id={id} type="number" step="any" value={String(v)} onCommit={(val) => { const n = parseFloat(val.replace(",", ".")); if (isFinite(n)) mutate((s) => setP(s.m, path, n)); }} />
        : <select id={id} value={String(v)} onChange={(e) => { const k = ENUMS[def[2] as Exclude<typeof def[2], "n">].find(([x]) => String(x) === e.target.value)![0]; mutate((s) => setP(s.m, path, k)); }}>
            {ENUMS[def[2] as Exclude<typeof def[2], "n">].map(([k, t]) => <option key={String(k)} value={String(k)}>{t}</option>)}
          </select>}
    </div>
  );
}

function UpBands({ th }: { th: readonly number[] }) {
  return <div className="bands">{[1, 2, 3, 4, 5].map((l) => <span key={l} className={`band bg${l}`}>{RL[l]}: {l === 1 ? `≤ ${fxs(th[0])}` : l === 5 ? `> ${fxs(th[3])}` : `${fxs(th[l - 2])} < … ≤ ${fxs(th[l - 1])}`}</span>)}</div>;
}
function LowBands({ th }: { th: readonly number[] }) {
  const bg = [5, 3, 2, 1];
  return <div className="bands">{[0, 1, 2, 3].map((l) => <span key={l} className={`band bg${bg[l]}`}>{CL[l]}: {l === 0 ? `< ${fxs(th[0])}` : l === 3 ? `≥ ${fxs(th[2])}` : `${fxs(th[l - 1])} ≤ … < ${fxs(th[l])}`}</span>)}</div>;
}
const Warn = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (ok ? null : <p className="warnline">{children}</p>);

function ParamsEditor() {
  const m = useApp((s) => s.m);
  const controls = useApp((s) => s.controls);
  const mutate = useApp((s) => s.mutate);
  const use = new Map<string, number>();
  for (const c of controls) for (const [pid, oid] of Object.entries(c.pv ?? {})) use.set(`${pid}|${oid}`, (use.get(`${pid}|${oid}`) ?? 0) + 1);
  const cols = m.params.map((P) => hnorm(P.col));
  const fixed = [...CTRL_HEAD.slice(0, 10), ...CTRL_HEAD.slice(15)].map(hnorm);
  const editP = (_i: number, fn: (s: M) => void) => mutate((s) => fn(s.m));

  return (
    <div className="pgrid">
      {m.params.map((P, i) => {
        const mx = Math.max(0, ...P.opts.map((o) => (isNum(o.pts) ? o.pts : 0)));
        return (
          <div className="pcard" key={P.id}>
            <div className="row">
              <h3>P{i + 1} <span className="muted" style={{ fontWeight: 500 }}>· en fazla {fxs(mx)} puan</span></h3>
              <div className="acts">
                {i > 0 && <button className="btn sm" aria-label="Yukarı taşı" onClick={() => editP(i, (s) => { [s.params[i - 1], s.params[i]] = [s.params[i], s.params[i - 1]]; })}>↑</button>}
                <button className="btn sm" onClick={() => { editP(i, (s) => { s.params.splice(i, 1); }); toast(`${P.col} parametresi silindi`); }}>P{i + 1}'i sil</button>
              </div>
            </div>
            <div className="fld">
              <label className="lbl" htmlFor={`pc-${P.id}`}>Excel kolon adı</label>
              <CommitInput id={`pc-${P.id}`} type="text" value={P.col} onCommit={(v) => { if (v.trim()) editP(i, (s) => { s.params[i].col = v.trim(); }); }} />
            </div>
            <Warn ok={cols.filter((c) => c === hnorm(P.col)).length <= 1}>Bu kolon adı başka bir P'de de kullanılıyor.</Warn>
            <Warn ok={!fixed.includes(hnorm(P.col))}>Bu ad şablonun sabit kolonlarından biriyle çakışıyor.</Warn>
            <div className="scroll">
              <table className="ptab">
                <thead><tr><th>Seçenek (Excel'deki metin)</th><th style={{ width: 84 }}>Puan</th><th style={{ width: 70 }}>Kullanım</th><th style={{ width: 40 }} /></tr></thead>
                <tbody>
                  {P.opts.map((o, j) => (
                    <tr key={o.id}>
                      <td><CommitInput type="text" aria-label={`P${i + 1} seçenek ${j + 1}`} value={o.txt} onCommit={(v) => { if (v.trim()) editP(i, (s) => { s.params[i].opts[j].txt = v.trim(); }); }} /></td>
                      <td><CommitInput type="number" step="any" aria-label={`P${i + 1} seçenek ${j + 1} puanı`} value={String(o.pts)} onCommit={(v) => { const n = parseFloat(v.replace(",", ".")); if (isFinite(n)) editP(i, (s) => { s.params[i].opts[j].pts = n; }); }} /></td>
                      <td className="num muted">{use.get(`${P.id}|${o.id}`) ?? 0}</td>
                      <td><button className="btn sm" aria-label="Seçeneği sil" onClick={() => editP(i, (s) => { s.params[i].opts.splice(j, 1); })}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div><button className="btn sm" onClick={() => editP(i, (s) => { s.params[i].opts.push({ id: newId(), txt: "Yeni seçenek", pts: 0 }); })}>Seçenek ekle</button></div>
          </div>
        );
      })}
    </div>
  );
}

export function Methodology() {
  const m = useApp((s) => s.m);
  const mutate = useApp((s) => s.mutate);
  const wBus = BUS.reduce((a, k) => a + m.w[k], 0);
  const wIt = ITD.reduce((a, k) => a + m.w[k], 0);
  const resetParams = (next: M) => mutate((s) => { const old = s.m.params; s.m = next; remapPV(old, next.params, s.controls); remapPV(old, next.params, s.base.controls); });

  return (
    <div className="mgrid">
      <section className="panel"><div className="ph"><h2>1 · Etki ağırlıkları</h2></div><div className="pb">
        <h3>İş etkisi (Flag for IT boş)</h3>{BUS.map((k) => <MInput key={k} path={`w.${k}`} />)}
        <Warn ok={Math.abs(wBus - 100) < 0.01}>Toplam %{fxs(wBus)}. Ağırlıklar oransal kullanılır; şablonla tutarlılık için toplamın %100 olması önerilir.</Warn>
        <h3>BT etkisi (Flag for IT = 1)</h3>{ITD.map((k) => <MInput key={k} path={`w.${k}`} />)}
        <Warn ok={Math.abs(wIt - 100) < 0.01}>Toplam %{fxs(wIt)}. Toplamın %100 olması önerilir.</Warn>
        <MInput path="rnd" />
        <p className="note">Boş ve N/A boyutlar hesaptan çıkar, kalan ağırlıklar yeniden dağıtılır. Seçili setteki boyutların hepsi boşsa diğer set kullanılır.</p>
      </div></section>
      <section className="panel"><div className="ph"><h2>2 · Doğal risk seviyesi sınırları</h2></div><div className="pb">
        {[0, 1, 2, 3].map((i) => <MInput key={i} path={`th.${i}`} />)}
        <Warn ok={asc(m.th)}>Sınırlar küçükten büyüğe sıralı olmalı.</Warn>
        <UpBands th={m.th} />
        <p className="note">Doğal risk puanı = etki × olasılık (1–25). Puan bu üst sınırlara göre Doğal Risk Skoruna (1–5) ve seviyeye çevrilir.</p>
      </div></section>
      <section className="panel span-all"><div className="ph"><h2>3 · Kontrol puanı: P parametreleri</h2>
        <div className="acts">
          <button className="btn" onClick={() => { mutate((s) => { s.m.params.push({ id: newId(), col: `Yeni Parametre ${s.m.params.length + 1}`, opts: [{ id: newId(), txt: "Bulunmamaktadır.", pts: 0 }, { id: newId(), txt: "Mevcut", pts: 1 }] }); }); toast("Yeni P eklendi; kolon adını ve seçenekleri düzenleyin"); }}>P parametresi ekle</button>
          <button className="btn" onClick={() => { resetParams({ ...clone(m), params: clone(P0) }); toast("P parametreleri güncel tabloya döndü"); }}>Güncel tabloya döndür</button>
        </div></div><div className="pb">
        <p className="note">Kontrol puanı = {m.params.map((_, i) => `P${i + 1}`).join(" + ") || "—"} (en fazla {fxs(maxScore(m))}). Kolon adı, Kontrol Excel'inde bu parametrenin okunduğu ve yazıldığı başlıktır; seçenek metinleri Excel'deki hücre değerleriyle eşleştirilir. Boş şablon ve indirilen Kontrol Excel'i bu ayarla oluşur. Bir seçeneği silerseniz onu kullanan kontroller o parametreden 0 puan alır.</p>
        <ParamsEditor />
      </div></section>
      <section className="panel"><div className="ph"><h2>4 · Kontrol skoru</h2></div><div className="pb">
        <h3>Kontrol skoru sınırları (alt sınır)</h3>{[0, 1, 2].map((i) => <MInput key={i} path={`kth.${i}`} />)}
        <Warn ok={asc(m.kth)}>Sınırlar küçükten büyüğe sıralı olmalı.</Warn>
        <LowBands th={m.kth} />
        <p className="note">Tek bir kontrolün puanı bu sınırlara göre Kontrol Skoruna çevrilir.</p>
      </div></section>
      <section className="panel"><div className="ph"><h2>5 · Bütünleşik kontrol seviyesi</h2></div><div className="pb">
        <MInput path="f" /><MInput path="cap" /><MInput path="exDoc" />
        <h3>Seviye sınırları (alt sınır)</h3>{[0, 1, 2].map((i) => <MInput key={i} path={`cth.${i}`} />)}
        <Warn ok={asc(m.cth)}>Sınırlar küçükten büyüğe sıralı olmalı.</Warn>
        <LowBands th={m.cth} />
        <p className="note">Bütünleşik puan = en yüksek kontrol puanı + katsayı × diğer aktif kontrollerin toplamı. İptal kontroller hesaba girmez.</p>
      </div></section>
      <section className="panel"><div className="ph"><h2>6 · Kalıntı risk seviyesi</h2></div><div className="pb">
        <MInput path="rmode" />
        {m.rmode === "puan" ? <>
          <h3>Kalıntı puanı üst sınırları</h3>{[0, 1, 2, 3].map((i) => <MInput key={i} path={`rth.${i}`} />)}
          <Warn ok={asc(m.rth)}>Sınırlar küçükten büyüğe sıralı olmalı.</Warn>
          <UpBands th={m.rth} />
          <p className="note">Kalıntı puanı = doğal risk puanı − bütünleşik kontrol puanı; sıfır veya altı Çok Düşük sayılır. Bu yöntem paylaşılan matristeki kalıntı seviyelerini üretmez (ör. RE-1 12,10 Düşük iken RE-238 11,65 Orta); alternatif senaryo olarak kullanın.</p>
        </> : <>
          <div className="scroll">
            <table className="rmx">
              <thead><tr><th />{[0, 1, 2, 3].map((c) => <th key={c} className="lbl">{CL[c]}</th>)}</tr></thead>
              <tbody>{[5, 4, 3, 2, 1].map((l) => <tr key={l}><th className="lbl" style={{ textAlign: "right" }}>{RL[l]}</th>{[0, 1, 2, 3].map((c) => { const v = Math.max(1, l - c); return <td key={c} className={`bg${v}`}>{RL[v]}</td>; })}</tr>)}</tbody>
            </table>
          </div>
          <p className="note">Kalıntı Risk Skoru = max(1, Doğal Risk Skoru − Bütünleşik Kontrol Skoru). Kalıntı Risk Puanı (doğal puan − bütünleşik kontrol puanı) bilgi amaçlı hesaplanır ve Excel'e yazılır.</p>
        </>}
      </div></section>
      <section className="panel"><div className="ph"><h2>Ayarları sakla ve paylaş</h2></div><div className="pb">
        <p className="note">Ayarlar bu tarayıcıda saklanır. Ayar dosyası tüm sınırları ve P parametrelerini içerir; karşı taraf dosyayı Veri yükle sekmesindeki Metodoloji alanına yükler.</p>
        <div className="acts">
          <button className="btn" onClick={() => { const n = `BGD_Metodoloji_${stamp()}.xlsx`; saveBlob(workbookBlob(methodWorkbook(m)), n); toast(`${n} indirildi`); }}>Metodoloji ayarlarını indir (.xlsx)</button>
          <button className="btn" onClick={() => { resetParams(clone(M0)); toast("Metodoloji varsayılana döndü"); }}>Tümünü varsayılana döndür</button>
        </div>
      </div></section>
    </div>
  );
}
