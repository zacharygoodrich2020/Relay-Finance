export type MuseIntent =
  | { type: "answer"; message: string }
  | { type: "get_balance" }
  | { type: "get_cash_flow" }
  | { type: "get_lowest_balance" }
  | { type: "run_scenario"; amount: number; date: string; label?: string }
  | { type: "set_balance"; amount: number }
  | {
      type: "add_income";
      name: string;
      amount: number;
      frequency: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "one_time";
      startDate: string;
    }
  | {
      type: "add_expense";
      name: string;
      amount: number;
      dueDate: string;
      recurring: boolean;
      frequency?: "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
    };

export interface MuseIntentResponse {
  intent: MuseIntent;
  source: "llm" | "local";
}
