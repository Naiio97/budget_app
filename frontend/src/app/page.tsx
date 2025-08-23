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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">💰 Budget – Dashboard</h1>

      {/* 3 „karty“ */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card title="Příjmy"  value={fmt(sumIncome)}  className="text-[var(--green)]" />
        <Card title="Výdaje"  value={fmt(sumExpense)} className="text-[var(--red)]" />
        <Card title="Bilance" value={fmt(net)} />
      </div>

      {/* Seznam posledních transakcí */}
      <section className="glass p-4">
        <div className="text-sm text-white/70 mb-2">Poslední transakce</div>
        <ul className="text-sm divide-y hairline">
          {transactions.map(t => (
            <li key={t.id} className="py-2 flex items-center justify-between">
              <div className="text-white/85">{t.rawDescription}</div>
              <div className={t.amountCZK < 0 ? "text-[var(--red)]" : "text-[var(--green)]"}>
                {fmt(t.amountCZK)}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Card({
  title,
  value,
  className = "",
}: {
  title: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="glass p-4">
      <div className="text-sm text-white/70">{title}</div>
      <div className={`text-3xl font-semibold ${className}`}>{value}</div>
    </div>
  );
}