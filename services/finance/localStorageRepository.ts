import { FinancialRepository } from "./FinancialRepository";
import {
  loadUserPlan,
  saveUserPlan,
  deleteUserPlan,
} from "../../context/storage";

/**
 * Compatibility adapter around the existing localStorage implementation.
 * This deliberately preserves current behavior while giving Relay Finance a
 * swappable persistence boundary.
 */
export const localStorageRepository: FinancialRepository = {
  loadPlan: loadUserPlan,
  savePlan: saveUserPlan,
  deletePlan: deleteUserPlan,
};
