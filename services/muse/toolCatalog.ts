import { MuseToolDefinition } from "./types";

export const museFinanceTools: MuseToolDefinition[] = [
  {
    name: "get_financial_snapshot",
    description: "Read the current balance, income, expenses, and forecast.",
    mutatesData: false,
    requiresConfirmation: false,
  },
  {
    name: "list_upcoming_transactions",
    description: "List expected income and expenses in a requested date range.",
    mutatesData: false,
    requiresConfirmation: false,
  },
  {
    name: "set_current_balance",
    description: "Set Relay's current starting balance.",
    mutatesData: true,
    requiresConfirmation: true,
  },
  {
    name: "add_income",
    description: "Add a one-time or recurring income source.",
    mutatesData: true,
    requiresConfirmation: true,
  },
  {
    name: "add_expense",
    description: "Add a one-time or recurring expense.",
    mutatesData: true,
    requiresConfirmation: true,
  },
  {
    name: "update_income",
    description: "Change an existing income item.",
    mutatesData: true,
    requiresConfirmation: true,
  },
  {
    name: "update_expense",
    description: "Change an existing expense item or due date.",
    mutatesData: true,
    requiresConfirmation: true,
  },
  {
    name: "delete_income",
    description: "Delete an income item.",
    mutatesData: true,
    requiresConfirmation: true,
  },
  {
    name: "delete_expense",
    description: "Delete an expense item.",
    mutatesData: true,
    requiresConfirmation: true,
  },
  {
    name: "run_scenario",
    description:
      "Calculate a what-if scenario without changing the saved financial plan.",
    mutatesData: false,
    requiresConfirmation: false,
  },
];
