# Relay Finance + Muse architecture

## Goal

Muse should be able to understand natural-language requests and safely operate
Relay Finance, while Relay's deterministic finance engine remains the source of
truth for balances, schedules, forecasts, and scenarios.

## Phase 1

This branch introduces two boundaries without changing the UI:

1. `FinancialRepository` separates persistence from React/browser storage.
2. `MuseFinancePort` and the Muse tool catalog define what the agent may read
   and change.

The existing localStorage behavior remains available through
`localStorageRepository`.

## Safety rule

Muse must not invent balances or calculate authoritative forecasts itself.
Read operations can run immediately. Financial mutations require confirmation
before execution. Scenario operations are non-destructive.

## Planned flow

User -> Muse -> validated tool call -> Relay finance domain -> repository

The UI and Muse should eventually use the same domain/service layer so there is
one source of truth.

## Next implementation steps

- Refactor FinancialProvider to receive a FinancialRepository.
- Move forecast/scenario calculations behind a reusable finance service.
- Implement MuseFinancePort against the shared service.
- Add validation and confirmation for mutating Muse calls.
- Add a Muse chat surface only after the tool layer is tested.
- Replace localStorage with persistent server/database storage when remote
  agent access is required.
