import { useMemo, useState } from "react";
import { useApp, useStage, toast } from "../../state/store";
import { builtinDataset } from "../../domain/sampleData";
import { P0 } from "../../domain/constants";
import { countChanges } from "../../domain/changes";
import { shortTxt } from "../../domain/text";
import { blankWorkbook, saveBlob, workbookBlob } from "../../io/exporter";
import { SLOT_NAMES, buildFromStage, evalStage, readSlot, remapPV, type SlotKey, type StageEval } from "../../io/importer";

const DESC: Record<SlotKey, string> = {
  r: "GRC Risk dışa aktarımı veya doldurulmuş Risk şablonu.",
  c: "GRC Kontrol dışa aktarımı veya doldurulmuş Kontrol şablonu. Risk ID'ler, yüklenen ya da sistemdeki risklerle eşleşmeli.",
  m: "Opsiyonel. Simülatörden indirilen metodoloji ayar dosyası (sınırlar ve P parametreleri)."
};

function Slot({ k, E }: { k: SlotKey; E: StageEval }) {
  const st = useStage((s) => s.stage[k]);
  const incl = useStage((s) => s.stage.incl);
  const setSlot = useStage((s) => s.setSlot);
  const setIncl = useStage((s) => s.setIncl);
  const m = useApp((s) => s.m);
  const [over, setOver] = useState(false);
  const res = E[k];

  async function pick(file: File | undefined) {
    if (!file) return;
    setSlot(k, { name: file.name, loading: true });
    await new Promise((r) => setTimeout(r, 20));
    setSlot(k, await readSlot(k, file));
  }

  const bad = !!st && !st.loading && (!!st.fatal || !!res?.err.length);
  let status: React.ReactNode = null;
  if (st?.loading) status = <div className="loading"><span className="spin" aria-hidden="true" />Dosya okunuyor ve kontrol ediliyor…</div>;
  else if (st?.fatal) status = <ul className="msgs err"><li>{st.fatal}</li></ul>;
  else if (res?.err.length) status = <ul className="msgs err">{res.err.map((x) => <li key={x}>{x}</li>)}</ul>;
  else if (res) {
    const line = k === "r" && E.r ? `${E.r.risks.length} risk okundu${E.r.cancelledList.length ? ` · ${E.r.cancelledList.length} iptal risk atlandı` : ""}${E.r.dup ? ` · ${E.r.dup} tekrar eden satır` : ""}`
      : k === "c" && E.c ? `${E.c.stats.controls} kontrol okundu · ${E.c.stats.active} aktif${E.c.stats.orphan + E.c.stats.dropped ? ` · ${E.c.stats.orphan + E.c.stats.dropped} satır atlandı` : ""}`
      : E.m ? `${E.m.n} parametre${E.m.params ? ` · ${E.m.params.length} P parametresi` : ""} okundu` : "";
    status = <>
      <p className="okline">✓ {line}</p>
      {k === "r" && E.r && (E.r.cancelledList.length > 0 || incl) && (
        <details open>
          <summary>İptal statüsündeki riskler ({E.r.cancelledAll.length})</summary>
          <p className="note">Risk Statü kolonu İptal, Pasif, Kapalı veya Silindi olan satırlar ve onlara bağlı kontroller varsayılan olarak hesaba alınmaz.</p>
          <div className="scroll"><table className="mini"><thead><tr><th>Satır</th><th>Risk ID</th><th>Statü</th><th>Risk tanımı</th></tr></thead>
            <tbody>{E.r.cancelledAll.slice(0, 50).map((x) => <tr key={x.ln}><td className="num">{x.ln}</td><td className="num">{x.id}</td><td>{x.status}</td><td>{shortTxt(x.desc, 70)}</td></tr>)}</tbody></table></div>
          <label className="check small"><input type="checkbox" checked={incl} onChange={(e) => setIncl(e.target.checked)} /> İptal statüsündeki riskleri de içe al (statüleriyle birlikte gösterilir)</label>
        </details>
      )}
      {res.warn.length > 0 && (
        <details open={res.warn.length <= 5}>
          <summary>Uyarılar ({res.warn.length})</summary>
          <ul className="msgs">{res.warn.slice(0, 80).map((x, i) => <li key={i}>{x}</li>)}{res.warn.length > 80 && <li>… ve {res.warn.length - 80} uyarı daha</li>}</ul>
        </details>
      )}
    </>;
  }

  return (
    <section className={`panel slot ${st && !st.loading ? (bad ? "bad" : "ready") : ""}`}>
      <div className="ph"><h2>{SLOT_NAMES[k]}</h2>{k !== "m" && <button className="btn" onClick={() => saveBlob(workbookBlob(blankWorkbook(k as "r" | "c", m)), k === "r" ? "BGD_Risk_Sablonu_Bos.xlsx" : "BGD_Kontrol_Sablonu_Bos.xlsx")}>Boş şablon</button>}</div>
      <div className="pb">
        <p className="note">{DESC[k]}</p>
        {st ? <>
          <div className="row"><span className="num small breakall">{st.name}</span><button className="btn" onClick={() => setSlot(k, null)}>Kaldır</button></div>
          {status}
        </> : (
          <label className={`drop ${over ? "over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}>
            <strong>Dosyayı buraya bırakın</strong><span className="muted">veya seçmek için tıklayın · .xlsx</span>
            <input type="file" accept=".xlsx,.xls,.xlsm" className="sr" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        )}
      </div>
    </section>
  );
}

export function DataLoad() {
  const stage = useStage((s) => s.stage);
  const clear = useStage((s) => s.clear);
  const risks = useApp((s) => s.risks);
  const controls = useApp((s) => s.controls);
  const base = useApp((s) => s.base);
  const m = useApp((s) => s.m);
  const setUi = useApp((s) => s.setUi);
  const E = useMemo(() => evalStage(stage, { risks, m }), [stage, risks, m]);
  const staged = (["r", "c", "m"] as SlotKey[]).filter((k) => stage[k]);
  const what = [E.r && !E.r.err.length ? `${E.r.risks.length} risk` : null, E.c && !E.c.err.length ? `${E.c.stats.controls} kontrol` : null, E.m ? "metodoloji ayarları" : null].filter(Boolean);
  const keep = [!stage.r && stage.c ? "riskler sistemdeki haliyle kalır" : null, stage.r && !stage.c ? "kontroller sistemdeki haliyle kalır (yeni risk listesinde olmayanlar çıkarılır)" : null].filter(Boolean);

  function apply() {
    if (!E.ok) return;
    const out = buildFromStage(E, stage, { risks, controls, m, srcName: base.src.name });
    const st = useApp.getState();
    if (out.data) {
      st.loadDataset(out.data, out.m);
      setUi({ tab: "sim" });
      toast(`${out.data.risks.length} risk ve ${out.data.controls.length} kontrol sisteme işlendi`);
    } else {
      st.mutate((s) => { remapPV(s.m.params, out.m.params, s.controls); remapPV(s.m.params, out.m.params, s.base.controls); s.m = out.m; s.ui.tab = "met"; });
      toast("Metodoloji ayarları uygulandı");
    }
    clear();
  }

  return (
    <div className="stack">
      <section className="panel"><div className="ph"><h2>Boş şablonlar</h2>
        <div className="acts">
          <button className="btn pri" onClick={() => saveBlob(workbookBlob(blankWorkbook("r", m)), "BGD_Risk_Sablonu_Bos.xlsx")}>Boş Risk şablonunu indir</button>
          <button className="btn pri" onClick={() => saveBlob(workbookBlob(blankWorkbook("c", m)), "BGD_Kontrol_Sablonu_Bos.xlsx")}>Boş Kontrol şablonunu indir</button>
        </div></div><div className="pb">
        <p className="note">GRC kolon sırasıyla, doldurulmak üzere boş taslaklar. Kontrol şablonundaki P kolonları ve “Geçerli değerler” sayfası Metodoloji sekmesindeki güncel P parametrelerinden oluşur. Her dosyada kolonların nasıl doldurulacağını anlatan bir Açıklama sayfası bulunur.</p>
      </div></section>
      <div className="slots"><Slot k="r" E={E} /><Slot k="c" E={E} /><Slot k="m" E={E} /></div>
      <section className="panel"><div className="ph"><h2>Sisteme uygula</h2></div><div className="pb">
        {staged.length
          ? <p className="note">{E.ok ? <>Uygulanacak: <b>{what.join(", ")}</b>{keep.length ? `. ${keep.join("; ")}.` : "."} Simülasyonda yaptığınız kaydedilmemiş değişikliklerin yerini alır; saklamak istiyorsanız önce Excel tabloları sekmesinden indirin.</> : "Kırmızı işaretli alandaki sorunu giderin ya da dosyayı kaldırın."}</p>
          : <p className="note">Yukarıdaki alanlara dosya yükleyin. Dosyalar önce kontrol edilir; “Uygula” dediğinizde sistem güncellenir.</p>}
        <div className="acts"><button className="btn pri" disabled={!E.ok} onClick={apply}>Uygula</button>{staged.length > 0 && <button className="btn" onClick={clear}>Tümünü temizle</button>}</div>
      </div></section>
      <div className="mgrid">
        <section className="panel"><div className="ph"><h2>Şu an sistemdeki veri</h2></div><div className="pb">
          <div className="row"><span>{base.src.name}{base.src.date ? ` · ${new Date(base.src.date).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}` : ""}</span><span className="num muted">{risks.length} risk · {controls.length} kontrol</span></div>
          <p className="note">Yüklemeden bu yana <span className="num">{countChanges({ risks, controls }, base)}</span> değişiklik var. “Yüklenen veriye sıfırla” son uygulanan dosyaların değerlerine döner. Veri yalnızca bu tarayıcıda saklanır; sunucuya gönderilmez.</p>
          <div className="acts">
            <button className="btn" onClick={() => setUi({ tab: "tbl" })}>Excel tablolarını gör / indir</button>
            <button className="btn" onClick={() => {
              const d = builtinDataset();
              const st = useApp.getState();
              remapPV(P0, st.m.params, d.controls);
              st.loadDataset(d);
              toast("Yerleşik örnek veri yüklendi");
            }}>Yerleşik örnek veriye dön</button>
          </div>
        </div></section>
        <section className="panel"><div className="ph"><h2>Çalışma döngüsü</h2></div><div className="pb">
          <ol className="flow">
            <li>Boş şablonları indirip doldurun ya da GRC'den Risk ve Kontrol Excel'lerini alın.</li>
            <li>Her dosyayı kendi alanına yükleyin, kontrol sonucunu inceleyip “Uygula”ya basın.</li>
            <li>Simülatörde veya Excel tablolarında değişiklik yapın; sınırları ve P parametrelerini Metodoloji sekmesinden ayarlayın.</li>
            <li>Excel tabloları sekmesinden Risk ve Kontrol Excel'lerini ayrı ayrı indirin; bu dosyalar bir sonraki yüklemenin kaynağı olur.</li>
          </ol>
        </div></section>
      </div>
    </div>
  );
}
