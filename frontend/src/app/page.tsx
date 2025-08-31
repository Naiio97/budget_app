import { transactions } from "@/lib/mock-data";
import TransactionsFeed from "@/components/TransactionsFeed"

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
      <TransactionsFeed rows={transactions} mode="compact" maxRows={5} />
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
