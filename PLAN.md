# Allowance App - NEAR Protocol

## Overview
A web app that automatically pays kids' weekly allowance in USDC on the NEAR network.
Parent logs in with their NEAR wallet, funds the contract, configures kids and amounts,
and the contract handles automated distributions on the chosen day of the week.

## Architecture

### 1. Smart Contract (Rust, deployed to NEAR mainnet)

**State:**
- `owner_id` — parent's NEAR wallet (only account that can manage settings)
- `kids` — list of recipients:
  - `name: String`
  - `wallet_id: AccountId` (NEAR address)
  - `amount: U128` (USDC amount in micro-units, 6 decimals)
  - `active: bool`
- `transfer_day` — day of week (0=Sunday .. 6=Saturday, default 5=Friday)
- `last_paid_week` — tracks which week was last paid to prevent double-pays

**Public methods:**
- `add_kid(name, wallet_id, amount)` — owner only
- `remove_kid(wallet_id)` — owner only
- `update_kid_amount(wallet_id, amount)` — owner only
- `set_transfer_day(day)` — owner only
- `distribute()` — callable by anyone; checks day-of-week and last_paid_week,
  then sends USDC (ft_transfer) to each active kid
- `get_config()` — view: returns kids list, transfer day, balances, next pay date
- `get_balance()` — view: contract's USDC balance (calls ft_balance_of)

**USDC on NEAR:**
- Contract address: `17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1`
- NEP-141 fungible token standard (ft_transfer, ft_balance_of)
- 6 decimal places (1 USDC = 1_000_000)

**Funding:**
- Parent transfers USDC to the contract address using standard ft_transfer
- The contract implements ft_on_transfer to accept incoming USDC deposits

### 2. Frontend (Next.js + React)

**Pages:**
- **Dashboard** — shows contract USDC balance, list of kids with amounts, next payment date
- **Manage Kids** — add/remove kids, edit names and amounts
- **Settings** — choose day of week for transfers
- **Fund Wallet** — transfer USDC from parent's wallet to the contract

**Tech:**
- Next.js (React) with TypeScript
- `@near-wallet-selector/core` for wallet connection (supports MyNearWallet, Meteor, etc.)
- `near-api-js` for contract interaction
- Tailwind CSS for styling
- Deployed as static site (Vercel, Netlify, or GitHub Pages)

### 3. Automation (Triggering weekly payments)

**Option A — Croncat (preferred):**
- Croncat is NEAR's decentralized cron service
- Register a recurring task that calls `distribute()` weekly
- Costs a small amount of NEAR for gas per execution
- No server needed

**Option B — External cron (fallback):**
- Simple Node.js script called by system cron or GitHub Actions
- Calls `distribute()` on the contract every day
- Contract itself enforces day-of-week logic, so extra calls are no-ops

## Project Structure

```
allowance-app/
  contract/              # Rust smart contract
    Cargo.toml
    src/
      lib.rs             # Contract logic
  frontend/              # Next.js web app
    package.json
    src/
      app/               # Next.js app router
      components/        # React components
      lib/               # NEAR wallet + contract helpers
      config.ts          # Contract address, USDC address
  scripts/
    deploy.sh            # Build + deploy contract to NEAR
    distribute.js        # Cron script (option B fallback)
  PLAN.md
```

## Build & Deploy Steps

### Prerequisites (will install)
- Rust + wasm32-unknown-unknown target
- Node.js 18+
- near-cli-rs

### Phase 1 — Smart Contract
1. Write and compile the Rust contract
2. Write unit tests
3. Deploy to NEAR mainnet
4. Initialize with owner wallet

### Phase 2 — Frontend
1. Scaffold Next.js app with wallet selector
2. Build dashboard, kid management, settings, and funding pages
3. Connect to deployed contract

### Phase 3 — Automation
1. Set up Croncat task OR cron script to call distribute()
2. Test end-to-end flow

### Phase 4 — Polish
1. Error handling and loading states
2. Transaction history view
3. Notifications (optional)

## Security Considerations
- Only contract owner can modify kids/amounts/settings
- distribute() is permissionless but idempotent (can only pay once per week)
- Contract only holds USDC, no other tokens accepted
- ft_on_transfer rejects non-USDC tokens
- All amounts validated (> 0, reasonable limits)
