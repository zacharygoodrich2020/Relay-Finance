import { UserPlan } from "../../types";
import {
  generateForecast,
  ForecastResult,
} from "../../utils/forecastCalculator";
import { ScenarioRequest } from "../muse/types";

export interface RelayForecastOptions {
  months?: number;
  startDate?: Date;
  startingBalance?: number;
  includeGoalContributions?: boolean;
  conservativeMode?: boolean;
}

/**
 * Single reusable entry point for Relay's deterministic forecast engine.
 */
export function calculateForecast(
  plan: UserPlan,
  options: RelayForecastOptions = {}
): ForecastResult {
  return generateForecast(plan, {
    months: options.months ?? plan.forecastConfig.months,
    startingBalance:
      options.startingBalance ?? plan.forecastConfig.startingBalance ?? plan.currentBalance,
    startDate:
      options.startDate ??
      (plan.forecastConfig.startDate
        ? new Date(plan.forecastConfig.startDate)
        : new Date()),
    includeGoalContributions:
      options.includeGoalContributions ??
      plan.forecastConfig.includeGoalContributions,
    conservativeMode:
      options.conservativeMode ?? plan.forecastConfig.conservativeMode,
  });
}

/**
 * Run a non-destructive what-if scenario.
 *
 * Adjustments are represented as one-time income/expenses on a cloned plan.
 * The saved UserPlan is never modified.
 */
export function calculateScenario(
  plan: UserPlan,
  scenario: ScenarioRequest
): ForecastResult {
  const cloned: UserPlan = JSON.parse(JSON.stringify(plan));
  const now = new Date().toISOString();

  for (const [index, adjustment] of scenario.adjustments.entries()) {
    const id = `scenario-${index}-${adjustment.date}`;

    if (adjustment.kind === "income") {
      cloned.income.push({
        id,
        name: adjustment.label,
        amount: adjustment.amount,
        frequency: "one_time" as any,
        startDate: adjustment.date,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      cloned.expenses.push({
        id,
        name: adjustment.label,
        amount: adjustment.amount,
        category: "miscellaneous" as any,
        dueDate: adjustment.date,
        recurring: false,
        priority: "medium" as any,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const startDate = new Date();
  let months = cloned.forecastConfig.months;
  if (scenario.throughDate) {
    const through = new Date(scenario.throughDate);
    months = Math.max(
      1,
      (through.getFullYear() - startDate.getFullYear()) * 12 +
        through.getMonth() -
        startDate.getMonth() +
        1
    );
  }

  return calculateForecast(cloned, { months, startDate });
}
