import { useMemo, useState } from "react";
import { Calculator, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

type ToolId =
  | "calc"
  | "percent"
  | "discount"
  | "vat"
  | "margin"
  | "compound"
  | "loan"
  | "units"
  | "tip"
  | "split"
  | "count"
  | "age"
  | "gpa"
  | "bmi"
  | "salary"
  | "scale"
  | "fx"
  | "breakeven"
  | "pxrem"
  | "rule3";

const TOOLS: { id: ToolId; name: string; blurb: string }[] = [
  { id: "calc", name: "Calculator", blurb: "Add, subtract, multiply, divide." },
  { id: "percent", name: "Percentage", blurb: "X% of Y, and what percent is X of Y." },
  { id: "discount", name: "Discount", blurb: "Sale price from list and off %." },
  { id: "vat", name: "VAT / tax", blurb: "Nigeria 7.5% default, or your rate." },
  { id: "margin", name: "Margin & markup", blurb: "Cost, sell, profit." },
  { id: "compound", name: "Compound interest", blurb: "Principal, rate, years." },
  { id: "loan", name: "Loan / EMI", blurb: "Monthly payment on a loan." },
  { id: "units", name: "Unit converter", blurb: "Length, weight, volume, temp." },
  { id: "tip", name: "Tip", blurb: "Tip and split a bill." },
  { id: "split", name: "Bill split", blurb: "Even split plus extras." },
  { id: "count", name: "Word count", blurb: "Words, characters, minutes to read." },
  { id: "age", name: "Age / dates", blurb: "Age from a birth date, days between." },
  { id: "gpa", name: "Grade / GPA", blurb: "Score to grade. 5-point or percent." },
  { id: "bmi", name: "BMI", blurb: "Height and weight." },
  { id: "salary", name: "Salary", blurb: "Monthly to annual and back." },
  { id: "scale", name: "Scale", blurb: "Resize a number by a percent." },
  { id: "fx", name: "Currency", blurb: "You type the rate. No live feed." },
  { id: "breakeven", name: "Break even", blurb: "Fixed cost, price, variable." },
  { id: "pxrem", name: "px to rem", blurb: "16px base, or yours." },
  { id: "rule3", name: "Rule of three", blurb: "If A is B, C is ?" },
];

function n(v: string) {
  const x = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(x) ? x : 0;
}
function fmt(v: number, d = 2) {
  if (!Number.isFinite(v)) return "n/a";
  return v.toLocaleString(undefined, { maximumFractionDigits: d });
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.7rem] tracking-[0.14em] text-dim uppercase">{label}</span>
      <input className="field" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Result({ children }: { children: string }) {
  return <p className="font-display mt-4 text-3xl font-semibold tracking-tight">{children}</p>;
}

function CalcPad() {
  const [expr, setExpr] = useState("");
  const [out, setOut] = useState("0");
  function key(k: string) {
    if (k === "C") {
      setExpr("");
      setOut("0");
      return;
    }
    if (k === "=") {
      try {
        const safe = expr.replace(/[^0-9.+\-*/() ]/g, "");
        const val = Function(`"use strict"; return (${safe || 0})`)();
        setOut(String(val));
      } catch {
        setOut("Error");
      }
      return;
    }
    setExpr((e) => e + k);
  }
  const keys = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "C", "+", "="];
  return (
    <div>
      <p className="mb-2 min-h-6 text-sm text-muted">{expr || " "}</p>
      <p className="font-display mb-4 text-4xl font-semibold">{out}</p>
      <div className="grid grid-cols-4 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => key(k)}
            className={cn(
              "min-h-12 rounded-xl border border-line text-sm font-semibold",
              k === "=" ? "bg-primary text-fg" : "bg-navy",
            )}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DailyTools() {
  const [id, setId] = useState<ToolId>("calc");
  const [shown, setShown] = useState(9);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [text, setText] = useState("");
  const [unitFrom, setUnitFrom] = useState("m");
  const [unitTo, setUnitTo] = useState("ft");
  const [kind, setKind] = useState<"length" | "mass" | "volume" | "temp">("length");

  const active = TOOLS.find((t) => t.id === id)!;

  const unitOut = useMemo(() => {
    const x = n(a);
    const length: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34 };
    const mass: Record<string, number> = { mg: 0.000001, g: 0.001, kg: 1, lb: 0.453592, oz: 0.0283495, t: 1000 };
    const volume: Record<string, number> = { ml: 0.001, l: 1, cup: 0.24, pt: 0.473, gal: 3.785 };
    if (kind === "temp") {
      let celsius = x;
      if (unitFrom === "F") celsius = ((x - 32) * 5) / 9;
      if (unitFrom === "K") celsius = x - 273.15;
      if (unitTo === "C") return celsius;
      if (unitTo === "F") return (celsius * 9) / 5 + 32;
      return celsius + 273.15;
    }
    const table = kind === "length" ? length : kind === "mass" ? mass : volume;
    const base = x * (table[unitFrom] || 1);
    return base / (table[unitTo] || 1);
  }, [a, kind, unitFrom, unitTo]);

  function body() {
    if (id === "calc") return <CalcPad />;
    if (id === "percent") {
      return (
        <div className="space-y-3">
          <Field label="X" value={a} onChange={setA} placeholder="15" />
          <Field label="Y" value={b} onChange={setB} placeholder="200" />
          <Result>{`${a || 0}% of ${b || 0} = ${fmt((n(a) / 100) * n(b))}`}</Result>
          <p className="text-sm text-muted">
            {a || 0} is {n(b) ? fmt((n(a) / n(b)) * 100) : "0"}% of {b || 0}
          </p>
        </div>
      );
    }
    if (id === "discount") {
      const price = n(a);
      const off = n(b);
      return (
        <div className="space-y-3">
          <Field label="List price" value={a} onChange={setA} />
          <Field label="Off %" value={b} onChange={setB} />
          <Result>{`Pay ${fmt(price * (1 - off / 100))}`}</Result>
          <p className="text-sm text-muted">You save {fmt(price * (off / 100))}</p>
        </div>
      );
    }
    if (id === "vat") {
      const net = n(a);
      const rate = n(b || "7.5");
      return (
        <div className="space-y-3">
          <Field label="Amount (ex-VAT)" value={a} onChange={setA} />
          <Field label="VAT %" value={b} onChange={setB} placeholder="7.5" />
          <Result>{`Inc VAT ${fmt(net * (1 + rate / 100))}`}</Result>
          <p className="text-sm text-muted">VAT = {fmt(net * (rate / 100))}</p>
        </div>
      );
    }
    if (id === "margin") {
      const cost = n(a);
      const sell = n(b);
      const profit = sell - cost;
      return (
        <div className="space-y-3">
          <Field label="Cost" value={a} onChange={setA} />
          <Field label="Sell" value={b} onChange={setB} />
          <Result>{`Profit ${fmt(profit)}`}</Result>
          <p className="text-sm text-muted">
            Margin {sell ? fmt((profit / sell) * 100) : 0}% · Markup {cost ? fmt((profit / cost) * 100) : 0}%
          </p>
        </div>
      );
    }
    if (id === "compound") {
      const p = n(a);
      const r = n(b) / 100;
      const y = n(c);
      const fv = p * Math.pow(1 + r, y);
      return (
        <div className="space-y-3">
          <Field label="Principal" value={a} onChange={setA} />
          <Field label="Rate % / year" value={b} onChange={setB} />
          <Field label="Years" value={c} onChange={setC} />
          <Result>{fmt(fv)}</Result>
        </div>
      );
    }
    if (id === "loan") {
      const p = n(a);
      const monthly = n(b) / 100 / 12;
      const months = n(c) * 12;
      const emi =
        monthly === 0 ? (months ? p / months : 0) : (p * monthly * Math.pow(1 + monthly, months)) / (Math.pow(1 + monthly, months) - 1);
      return (
        <div className="space-y-3">
          <Field label="Loan amount" value={a} onChange={setA} />
          <Field label="Yearly rate %" value={b} onChange={setB} />
          <Field label="Years" value={c} onChange={setC} />
          <Result>{`Monthly ${fmt(emi)}`}</Result>
        </div>
      );
    }
    if (id === "units") {
      const options =
        kind === "temp"
          ? ["C", "F", "K"]
          : kind === "length"
            ? ["mm", "cm", "m", "km", "in", "ft", "yd", "mi"]
            : kind === "mass"
              ? ["mg", "g", "kg", "lb", "oz", "t"]
              : ["ml", "l", "cup", "pt", "gal"];
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["length", "mass", "volume", "temp"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  if (k === "temp") {
                    setUnitFrom("C");
                    setUnitTo("F");
                  } else if (k === "length") {
                    setUnitFrom("m");
                    setUnitTo("ft");
                  } else if (k === "mass") {
                    setUnitFrom("kg");
                    setUnitTo("lb");
                  } else {
                    setUnitFrom("l");
                    setUnitTo("gal");
                  }
                }}
                className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold capitalize", kind === k ? "border-transparent bg-primary text-fg" : "border-line")}
              >
                {k}
              </button>
            ))}
          </div>
          <Field label="Value" value={a} onChange={setA} />
          <div className="grid grid-cols-2 gap-3">
            <select className="field" value={unitFrom} onChange={(e) => setUnitFrom(e.target.value)}>
              {options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <select className="field" value={unitTo} onChange={(e) => setUnitTo(e.target.value)}>
              {options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <Result>{fmt(unitOut, 4)}</Result>
        </div>
      );
    }
    if (id === "tip" || id === "split") {
      const bill = n(a);
      const tip = n(b || "10");
      const people = Math.max(1, n(c || "1"));
      const total = bill * (1 + tip / 100);
      return (
        <div className="space-y-3">
          <Field label="Bill" value={a} onChange={setA} />
          <Field label="Tip %" value={b} onChange={setB} placeholder="10" />
          <Field label="People" value={c} onChange={setC} placeholder="1" />
          <Result>{`Each ${fmt(total / people)}`}</Result>
          <p className="text-sm text-muted">Total {fmt(total)}</p>
        </div>
      );
    }
    if (id === "count") {
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      return (
        <div className="space-y-3">
          <textarea className="field min-h-32" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste text" />
          <Result>{`${words} words`}</Result>
          <p className="text-sm text-muted">
            {text.length} characters · ~{Math.max(1, Math.round(words / 200))} min read
          </p>
        </div>
      );
    }
    if (id === "age") {
      const birth = a ? new Date(a) : null;
      const other = b ? new Date(b) : new Date();
      const days = birth && !Number.isNaN(+birth) ? Math.floor((+other - +birth) / 86400000) : 0;
      const years = days / 365.25;
      return (
        <div className="space-y-3">
          <Field label="From (YYYY-MM-DD)" value={a} onChange={setA} placeholder="1994-06-12" />
          <Field label="To (blank = today)" value={b} onChange={setB} />
          <Result>{`${fmt(years, 1)} years`}</Result>
          <p className="text-sm text-muted">{fmt(days, 0)} days</p>
        </div>
      );
    }
    if (id === "gpa") {
      const score = n(a);
      const max = n(b || "100");
      const pct = max ? (score / max) * 100 : 0;
      const grade = pct >= 70 ? "A" : pct >= 60 ? "B" : pct >= 50 ? "C" : pct >= 45 ? "D" : pct >= 40 ? "E" : "F";
      const gp = pct >= 70 ? 5 : pct >= 60 ? 4 : pct >= 50 ? 3 : pct >= 45 ? 2 : pct >= 40 ? 1 : 0;
      return (
        <div className="space-y-3">
          <Field label="Score" value={a} onChange={setA} />
          <Field label="Out of" value={b} onChange={setB} placeholder="100" />
          <Result>{`${grade} · ${fmt(pct, 1)}%`}</Result>
          <p className="text-sm text-muted">5-point GPA piece: {gp}.0</p>
        </div>
      );
    }
    if (id === "bmi") {
      const kg = n(a);
      const cm = n(b);
      const m = cm / 100;
      const bmi = m ? kg / (m * m) : 0;
      const band = bmi < 18.5 ? "Under" : bmi < 25 ? "Healthy band" : bmi < 30 ? "Over" : "High";
      return (
        <div className="space-y-3">
          <Field label="kg" value={a} onChange={setA} />
          <Field label="cm" value={b} onChange={setB} />
          <Result>{fmt(bmi, 1)}</Result>
          <p className="text-sm text-muted">{band}</p>
        </div>
      );
    }
    if (id === "salary") {
      const monthly = n(a);
      const months = n(b || "12");
      return (
        <div className="space-y-3">
          <Field label="Monthly" value={a} onChange={setA} />
          <Field label="Months in year" value={b} onChange={setB} placeholder="12" />
          <Result>{`Annual ${fmt(monthly * months, 0)}`}</Result>
        </div>
      );
    }
    if (id === "scale") {
      return (
        <div className="space-y-3">
          <Field label="Original" value={a} onChange={setA} />
          <Field label="Scale %" value={b} onChange={setB} placeholder="50" />
          <Result>{fmt(n(a) * (n(b) / 100))}</Result>
        </div>
      );
    }
    if (id === "fx") {
      return (
        <div className="space-y-3">
          <Field label="Amount" value={a} onChange={setA} />
          <Field label="Rate (1 unit of from = ? to)" value={b} onChange={setB} placeholder="e.g. 1600 for USD to NGN" />
          <Result>{fmt(n(a) * n(b))}</Result>
          <p className="text-sm text-muted">You set the rate. Nothing is fetched.</p>
        </div>
      );
    }
    if (id === "breakeven") {
      const fixed = n(a);
      const price = n(b);
      const variable = n(c);
      const units = price - variable > 0 ? fixed / (price - variable) : 0;
      return (
        <div className="space-y-3">
          <Field label="Fixed cost" value={a} onChange={setA} />
          <Field label="Price per unit" value={b} onChange={setB} />
          <Field label="Variable per unit" value={c} onChange={setC} />
          <Result>{`${fmt(units, 1)} units`}</Result>
        </div>
      );
    }
    if (id === "pxrem") {
      const px = n(a);
      const base = n(b || "16");
      return (
        <div className="space-y-3">
          <Field label="px" value={a} onChange={setA} />
          <Field label="Root px" value={b} onChange={setB} placeholder="16" />
          <Result>{`${fmt(base ? px / base : 0, 4)} rem`}</Result>
        </div>
      );
    }
    const x = n(c) * (n(b) / (n(a) || 1));
    return (
      <div className="space-y-3">
        <Field label="A" value={a} onChange={setA} />
        <Field label="is B" value={b} onChange={setB} />
        <Field label="C" value={c} onChange={setC} />
        <Result>{`C is ${fmt(x)}`}</Result>
      </div>
    );
  }

  return (
    <section id="daily" className="px-4 py-16 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8">
          <p className="mb-2 font-display text-[0.7rem] tracking-[0.22em] text-primary-bright uppercase">
            Everyday Tools Free
          </p>
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Everyday Tools <span className="text-primary-bright">&lsquo;Free&rsquo;</span>
          </h2>
          <p className="mt-3 max-w-lg text-muted">
            Calculator, VAT, grades, units, loans. They run in this page, in your browser storage. They open instantly. No API. No keys.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div>
            <div className="grid grid-cols-3 gap-2">
              {TOOLS.slice(0, shown).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setId(t.id);
                    setA("");
                    setB("");
                    setC("");
                  }}
                  className={cn(
                    "min-h-11 rounded-xl border px-2 text-center text-xs font-medium sm:text-sm",
                    id === t.id ? "border-transparent bg-primary text-fg" : "border-line text-muted",
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
            {shown < TOOLS.length ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-semibold"
                  onClick={() => setShown(TOOLS.length)}
                >
                  Load more
                </button>
              </div>
            ) : null}
          </div>
          <div className="glass-card rounded-[1.6rem] p-6">
            <div className="mb-5 flex items-start gap-3">
              {id === "units" || id === "scale" ? <Scale className="mt-1 size-5 text-primary-bright" /> : <Calculator className="mt-1 size-5 text-primary-bright" />}
              <div>
                <h3 className="font-display text-2xl font-semibold">{active.name}</h3>
                <p className="text-sm text-muted">{active.blurb}</p>
              </div>
            </div>
            {body()}
          </div>
        </div>
      </div>
    </section>
  );
}
