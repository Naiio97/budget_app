import { notFound } from "next/navigation";
import { accounts } from "@/lib/accounts";
import { transactions } from "@/lib/mock-data";
import StarPrimaryToggle from "./StarPrimaryToggle";
import TransactionsFeed from "@/components/TransactionsFeed"

const fmtCZK = (n:number)=>new Intl.NumberFormat("cs-CZ",{style:"currency",currency:"CZK"}).format(n);

export default async function AccountDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const acc = accounts.find(a => a.id === id);
  if (!acc) return notFound();

  // ⇦ jen transakce pro daný účet
  const txs = transactions
    .filter(t => t.accountId === acc.id)
    .sort((a,b) => +new Date(b.ts) - +new Date(a.ts));

  const incomes = txs.filter(t => t.amountCZK > 0);
  const expenses = txs.filter(t => t.amountCZK < 0);
  const sumIncome = incomes.reduce((a,b)=>a+b.amountCZK,0);
  const sumExpense = expenses.reduce((a,b)=>a+Math.abs(b.amountCZK),0);
  const net = sumIncome - sumExpense;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            {acc.provider} – {acc.accountName}
          </h1>
          <StarPrimaryToggle id={acc.id} />
        </div>
        <div className="text-[13px] text-[var(--muted)]">
          Stav k {new Date(acc.asOf).toLocaleString("cs-CZ")}
        </div>
      </div>

      {/* Souhrn pro tento účet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-4">
          <div className="text-[13px] text-[var(--muted)]">Příjmy</div>
          <div className="text-2xl font-semibold text-[color:var(--success)]">{fmtCZK(sumIncome)}</div>
        </div>
        <div className="glass p-4">
          <div className="text-[13px] text-[var(--muted)]">Výdaje</div>
          <div className="text-2xl font-semibold text-[color:var(--danger)]">{fmtCZK(sumExpense)}</div>
        </div>
        <div className="glass p-4">
          <div className="text-[13px] text-[var(--muted)]">Bilance</div>
          <div className="text-2xl font-semibold">{fmtCZK(net)}</div>
        </div>
      </div>

      <TransactionsFeed rows={txs}/>
    </div>
  );
}
