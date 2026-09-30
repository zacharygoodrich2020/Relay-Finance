"use client";

import React, { useMemo, useState } from "react";
import { useFinancialActions, useFinancialState } from "@/context";
import { createMuseFinancePort } from "@/services/muse";
import { routeMuseMessage } from "@/services/muse/client";
import type { MuseIntent } from "@/services/muse/intent";

type Message = { role: "user" | "muse"; text: string };

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function parseAmount(text: string): number | null {
  const match = text.match(/\$?([0-9]+(?:,[0-9]{3})*(?:\.\d{1,2})?)/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function parseDate(text: string): string | null {
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (!slash) return null;
  const now = new Date();
  const year = slash[3]
    ? Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3])
    : now.getFullYear();
  const month = String(Number(slash[1])).padStart(2, "0");
  const day = String(Number(slash[2])).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function MusePanel() {
  const state = useFinancialState();
  const actions = useFinancialActions();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pendingIntent, setPendingIntent] = useState<MuseIntent | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "muse",
      text: "I’m Muse. Ask me about your balance, monthly cash flow, lowest projected balance, or a what-if purchase.",
    },
  ]);

  const port = useMemo(
    () =>
      createMuseFinancePort({
        getPlan: () => state.userPlan,
        addIncome: actions.addIncome,
        addExpense: actions.addExpense,
        setCurrentBalance: actions.updateCurrentBalance,
      }),
    [state.userPlan, actions.addIncome, actions.addExpense, actions.updateCurrentBalance]
  );

  async function executeIntent(intent: MuseIntent): Promise<string> {
    const snapshot = await port.getFinancialSnapshot();

    switch (intent.type) {
      case "answer":
        return intent.message;
      case "get_balance":
        return `Your current Relay balance is ${money(snapshot.currentBalance)}.`;
      case "get_lowest_balance": {
        if (!snapshot.forecast.length) return "There isn’t a saved forecast yet.";
        const lowest = snapshot.forecast.reduce((a, b) =>
          a.projectedBalance < b.projectedBalance ? a : b
        );
        return `Your lowest saved projected balance is ${money(lowest.projectedBalance)} in ${lowest.month}.`;
      }
      case "run_scenario": {
        const result: any = await port.runScenario({
          adjustments: [{
            label: intent.label || "Muse what-if",
            amount: intent.amount,
            date: intent.date,
            kind: "expense",
          }],
        });
        return `Scenario only: a ${money(intent.amount)} expense on ${intent.date} gives a projected final balance of ${money(result.summary.finalBalance)} and low point of ${money(result.summary.lowestBalance)}. Nothing was saved.`;
      }
      case "set_balance":
      case "add_income":
      case "add_expense":
        setPendingIntent(intent);
        return `I can make that change. Review it below and confirm before I touch your Relay data.`;
      case "get_cash_flow":
        return respond("monthly cash flow");
    }
  }

  async function confirmPending() {
    const intent = pendingIntent;
    if (!intent) return;
    try {
      if (intent.type === "set_balance") {
        await port.setCurrentBalance(intent.amount);
      } else if (intent.type === "add_income") {
        await port.addIncome({
          name: intent.name,
          amount: intent.amount,
          frequency: intent.frequency as any,
          startDate: intent.startDate,
          isActive: true,
        });
      } else if (intent.type === "add_expense") {
        await port.addExpense({
          name: intent.name,
          amount: intent.amount,
          category: "miscellaneous" as any,
          dueDate: intent.dueDate,
          recurring: intent.recurring,
          frequency: intent.frequency as any,
          priority: "medium" as any,
          isActive: true,
        });
      }
      setMessages((m) => [...m, { role: "muse", text: "Confirmed — Relay has applied that change." }]);
    } catch (error) {
      setMessages((m) => [...m, { role: "muse", text: error instanceof Error ? error.message : "That change failed." }]);
    } finally {
      setPendingIntent(null);
    }
  }

  async function respond(raw: string): Promise<string> {
    const text = raw.trim().toLowerCase();
    const snapshot = await port.getFinancialSnapshot();

    if (/current balance|my balance|balance now/.test(text)) {
      return `Your current Relay balance is ${money(snapshot.currentBalance)}.`;
    }

    if (/monthly|cash flow|income.*expense|expense.*income/.test(text)) {
      const activeIncome = snapshot.income.filter((item) => item.isActive);
      const activeExpenses = snapshot.expenses.filter((item) => item.isActive);
      const monthlyIncome = activeIncome.reduce((sum, item) => {
        const multiplier =
          item.frequency === "weekly" ? 4.33 :
          item.frequency === "biweekly" ? 2.17 :
          item.frequency === "yearly" ? 1 / 12 :
          item.frequency === "quarterly" ? 1 / 3 :
          item.frequency === "daily" ? 30.44 :
          item.frequency === "one_time" ? 0 : 1;
        return sum + item.amount * multiplier;
      }, 0);
      const monthlyExpenses = activeExpenses.reduce((sum, item) => {
        if (!item.recurring) return sum;
        const multiplier =
          item.frequency === "weekly" ? 4.33 :
          item.frequency === "biweekly" ? 2.17 :
          item.frequency === "yearly" ? 1 / 12 :
          item.frequency === "quarterly" ? 1 / 3 :
          item.frequency === "daily" ? 30.44 : 1;
        return sum + item.amount * multiplier;
      }, 0);
      return `Relay shows about ${money(monthlyIncome)} recurring monthly income and ${money(monthlyExpenses)} recurring monthly expenses — roughly ${money(monthlyIncome - monthlyExpenses)} net.`;
    }

    if (/lowest|low point|lowest projected/.test(text)) {
      if (!snapshot.forecast.length) {
        return "There isn’t a saved forecast yet. Generate a forecast first and I’ll read the low point.";
      }
      const lowest = snapshot.forecast.reduce((a, b) =>
        a.projectedBalance < b.projectedBalance ? a : b
      );
      return `Your lowest saved projected balance is ${money(lowest.projectedBalance)} in ${lowest.month}.`;
    }

    if (/what if|if i spend|spend \$|purchase/.test(text)) {
      const amount = parseAmount(text);
      if (amount === null) {
        return "Give me an amount, like: “What if I spend $300 on 10/15?”";
      }
      const date = parseDate(text) ?? new Date().toISOString().slice(0, 10);
      const result: any = await port.runScenario({
        adjustments: [{ label: "Muse what-if purchase", amount, date, kind: "expense" }],
      });
      const summary = result.summary;
      return `If you add a ${money(amount)} expense on ${date}, Relay projects a final balance of ${money(summary.finalBalance)} over this forecast window, with a low point of ${money(summary.lowestBalance)}. This is a scenario only — I did not change your saved plan.`;
    }

    try {
      const routed = await routeMuseMessage(raw);
      return executeIntent(routed.intent);
    } catch {
      return "I couldn’t interpret that yet. Try asking about your balance, cash flow, forecast low point, or a what-if expense.";
    }
  }

  async function send() {
    const raw = input.trim();
    if (!raw) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: raw }]);
    try {
      const answer = await respond(raw);
      setMessages((m) => [...m, { role: "muse", text: answer }]);
    } catch (error) {
      setMessages((m) => [
        ...m,
        {
          role: "muse",
          text: error instanceof Error ? error.message : "I couldn’t run that Relay calculation.",
        },
      ]);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-gray-800 dark:bg-white dark:text-gray-950"
        aria-label="Open Muse"
      >
        ✦ Muse
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/35 p-3 sm:p-6" onClick={() => setOpen(false)}>
          <section
            className="ml-auto flex h-full max-h-[720px] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <div>
                <div className="font-bold">✦ Muse</div>
                <div className="text-xs text-gray-500">Relay Finance companion · local mode</div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "ml-auto bg-gray-950 text-white dark:bg-white dark:text-gray-950"
                      : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>

              {pendingIntent && (
                <div className="mx-4 mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
                  <div className="font-semibold">Confirm change</div>
                  <div className="mt-1 break-words text-xs opacity-80">{JSON.stringify(pendingIntent)}</div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => void confirmPending()} className="rounded-lg bg-gray-950 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-gray-950">Confirm</button>
                    <button onClick={() => setPendingIntent(null)} className="rounded-lg border border-current px-3 py-2 text-xs font-semibold">Cancel</button>
                  </div>
                </div>
              ))}

            <div className="border-t border-gray-200 p-3 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void send()}
                  placeholder="Ask Muse about your money…"
                  className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-gray-600 dark:border-gray-600"
                />
                <button onClick={() => void send()} className="rounded-xl bg-gray-950 px-4 font-semibold text-white dark:bg-white dark:text-gray-950">
                  Send
                </button>
              </div>
              <p className="mt-2 px-1 text-[11px] text-gray-500">
                What-if scenarios never change your saved plan.
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
