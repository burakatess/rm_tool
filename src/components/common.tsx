import { useEffect, useState, type InputHTMLAttributes } from "react";
import { CL, RL } from "../domain/constants";
import { useToast } from "../state/store";

export function RiskPill({ level }: { level: number }) {
  return <span className={`pill L${level}`}>{RL[level]}</span>;
}
export function CtrlPill({ level }: { level: number }) {
  return <span className={`pill L${[5, 3, 2, 1][level]}`}>{CL[level]}</span>;
}

/** Odaktan çıkınca ya da Enter'a basınca kaydeden metin/sayı/tarih kutusu. */
export function CommitInput({ value, onCommit, ...rest }: { value: string; onCommit: (v: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => { if (v !== value) onCommit(v); };
  return (
    <input
      {...rest}
      value={v}
      onChange={(e) => { setV(e.target.value); if (rest.type === "date") onCommit(e.target.value); }}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter" && rest.type !== "date") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setV(value); }}
    />
  );
}

export function Toast() {
  const msg = useToast((s) => s.msg);
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}

export function DistBar({ counts }: { counts: number[] }) {
  const tot = counts.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="dist">
      {[1, 2, 3, 4, 5].map((l) => (counts[l] ? <i key={l} style={{ width: `${(counts[l] / tot) * 100}%`, background: `var(--l${l})` }} title={`${RL[l]}: ${counts[l]}`} /> : null))}
    </div>
  );
}
export const shortCounts = (cnt: number[]) => [5, 4, 3, 2, 1].map((l) => `${RL[l].split(" ").map((w) => w[0]).join("")} ${cnt[l]}`).join(" · ");
