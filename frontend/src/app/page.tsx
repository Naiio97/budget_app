import { transactions } from "@/lib/mock-data";

const fmt = (n: number) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(n);

export default function Page() {
  const incomes = transactions.filter(t => t.amountCZK > 0);
  const expenses = transactions.filter(t => t.amountCZK < 0);
  const sumIncome = incomes.reduce((a, b) => a + b.amountCZK, 0);
  const sumExpense = expenses.reduce((a, b) => a + Math.abs(b.amountCZK), 0);
  const net = sumIncome - sumExpense;

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card title="Příjmy"  value={fmt(sumIncome)}  color="var(--success)" />
        <Card title="Výdaje"  value={fmt(sumExpense)} color="var(--danger)" />
        <Card title="Bilance" value={fmt(net)} />
      </div>

      {/* Insight chip */}
      <div className="inline-flex items-center gap-2 glass px-3 py-2 text-[13px] in-pop">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "linear-gradient(135deg,#007aff,#5ac8fa)" }}
        />
        <span className="text-[var(--muted)]">
          Tento měsíc +12 % za „Jídlo venku“ oproti průměru 3 měsíců.
        </span>
      </div>

      {/* Transactions list */}
      <section className="glass overflow-hidden">
        <div className="px-4 py-2 text-[15px] text-[var(--muted)] border-b hairline">
          Poslední transakce
        </div>
        <ul className="text-sm divide-y hairline">
          {transactions.map(t => (
            <li key={t.id} className="px-4 py-3 flex items-center justify-between hover:bg-white/50 transition">
              <div className="text-[color:var(--ink)]">{t.rawDescription}</div>
              <div
                className={t.amountCZK < 0 ? "text-[color:var(--danger)]" : "text-[color:var(--success)]"}
              >
                {fmt(t.amountCZK)}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Card({ title, value, color }: { title: string; value: string; color?: string }) {
  return (
    <div className="glass p-5 transition-transform duration-200 hover:scale-[1.01] in-pop">
      <div className="text-[13px] text-[var(--muted)] mb-1">{title}</div>
      <div className="text-3xl font-semibold tracking-tight" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
