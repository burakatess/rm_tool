import type { Extra } from "../../domain/types";
import { exRaw, isD, isDateField } from "../../domain/text";
import { CommitInput } from "../common";

const label = (h: string) => (h === "Custom field (Last Comment(SR))" ? "Last Comment (SR)" : h === "Outward issue link (Risk-Kontrol)" ? "Outward issue link" : h);

/** GRC kayıt alanları (Kayıt ID, tarihler, sorumlu…) için düzenlenebilir alanlar. */
export function RecordFields({ keys, ex, idPrefix, onChange }: { keys: string[]; ex: Extra; idPrefix: string; onChange: (key: string, value: string) => void }) {
  return (
    <>
      {keys.map((h, i) => {
        const v = exRaw(ex, h);
        const date = isDateField(h) || isD(v);
        const id = `${idPrefix}-${i}`;
        return (
          <div className="fld" key={h}>
            <label className="lbl" htmlFor={id}>{label(h)}</label>
            <CommitInput id={id} type={date ? "date" : "text"} value={date && isD(v) ? v.slice(2) : String(v)}
              onCommit={(val) => onChange(h, date && val ? `d:${val}` : val.trim())} />
          </div>
        );
      })}
    </>
  );
}
