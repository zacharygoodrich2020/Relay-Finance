import type { ForecastResult } from "../../utils/forecastCalculator";
import {
  CreateExpenseInput,
  CreateIncomeInput,
  Expense,
  Forecast,
  Income,
  UserPlan,
} from "../../types";

export type MuseToolName =
  | "get_financial_snapshot"
  | "list_upcoming_transactions"
  | "set_current_balance"
  | "add_income"
  | "add_expense"
  | "update_income"
  | "update_expense"
  | "delete_income"
  | "delete_expense"
  | "run_scenario";

export interface FinancialSnapshot {
  currentBalance: number;
  income: Income[];
  expenses: Expense[];
  forecast: Forecast[];
}

export interface ScenarioAdjustment {
  label: string;
  amount: number;
  date: string;
  kind: "income" | "expense";
}

export interface ScenarioRequest {
  adjustments: ScenarioAdjustment[];
  throughDate?: string;
}

export interface MuseFinancePort {
  getPlan(): Promise<UserPlan>;
  getFinancialSnapshot(): Promise<FinancialSnapshot>;
  addIncome(input: CreateIncomeInput): Promise<void>;
  addExpense(input: CreateExpenseInput): Promise<void>;
  setCurrentBalance(amount: number): Promise<void>;
  runScenario(input: ScenarioRequest): Promise<ForecastResult>;
}

/**
 * Muse is never the source of truth for financial math. Tool calls mutate or
 * query Relay's finance domain; forecasts/scenarios are calculated by Relay.
 */
export interface MuseToolDefinition {
  name: MuseToolName;
  description: string;
  mutatesData: boolean;
  requiresConfirmation: boolean;
}
