import {
  CreateExpenseInput,
  CreateIncomeInput,
  UserPlan,
} from "../../types";
import { calculateScenario } from "../finance/forecastService";
import {
  FinancialSnapshot,
  MuseFinancePort,
  ScenarioRequest,
} from "./types";

export interface MuseFinanceActions {
  getPlan(): UserPlan;
  addIncome(input: CreateIncomeInput): Promise<void>;
  addExpense(input: CreateExpenseInput): Promise<void>;
  setCurrentBalance(amount: number): Promise<void>;
}

/**
 * Adapter used by the eventual Muse agent/runtime.
 *
 * Mutating calls exposed here are expected to be invoked only after the
 * confirmation policy in toolCatalog has been satisfied.
 */
export function createMuseFinancePort(
  actions: MuseFinanceActions
): MuseFinancePort {
  return {
    async getPlan() {
      return actions.getPlan();
    },

    async getFinancialSnapshot(): Promise<FinancialSnapshot> {
      const plan = actions.getPlan();
      return {
        currentBalance: plan.currentBalance,
        income: plan.income,
        expenses: plan.expenses,
        forecast: plan.forecast,
      };
    },

    async addIncome(input: CreateIncomeInput) {
      await actions.addIncome(input);
    },

    async addExpense(input: CreateExpenseInput) {
      await actions.addExpense(input);
    },

    async setCurrentBalance(amount: number) {
      if (!Number.isFinite(amount)) {
        throw new Error("Balance must be a finite number");
      }
      await actions.setCurrentBalance(amount);
    },

    async runScenario(input: ScenarioRequest) {
      return calculateScenario(actions.getPlan(), input);
    },
  };
}
