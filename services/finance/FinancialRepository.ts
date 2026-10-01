import { UserPlan } from "../../types";

/**
 * Persistence boundary for Relay Finance.
 *
 * UI/state code should depend on this contract instead of a concrete storage
 * mechanism. Today the implementation is localStorage; later Muse can use a
 * server/database implementation without changing the finance UI.
 */
export interface FinancialRepository {
  loadPlan(): Promise<UserPlan | null>;
  savePlan(plan: UserPlan): Promise<UserPlan>;
  deletePlan(): Promise<void>;
}
