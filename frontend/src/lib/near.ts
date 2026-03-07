"use client";

import { JsonRpcProvider } from "near-api-js";
import { CONTRACT_ID, USDC_CONTRACT_ID, NEAR_NODE_URL, BURROW_CONTRACT_ID, RHEA_APY_URL } from "@/config";
import type { Config, Kid, BurrowAccount, VaultInfo } from "./types";

const provider = new JsonRpcProvider({ url: NEAR_NODE_URL });

// ─── View Helpers ────────────────────────────────────────────

async function viewMethod<T>(
  contractId: string,
  methodName: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const result = await provider.callFunction({
    contractId,
    method: methodName,
    args,
  });
  return result as unknown as T;
}

// ─── Contract View Methods ───────────────────────────────────

export async function getConfig(): Promise<Config> {
  return viewMethod<Config>(CONTRACT_ID, "get_config");
}

export async function getKids(): Promise<Kid[]> {
  return viewMethod<Kid[]>(CONTRACT_ID, "get_kids");
}

export async function getContractUSDCBalance(): Promise<string> {
  return viewMethod<string>(USDC_CONTRACT_ID, "ft_balance_of", {
    account_id: CONTRACT_ID,
  });
}

export async function getVaultBalance(): Promise<string> {
  try {
    const account = await viewMethod<BurrowAccount>(
      BURROW_CONTRACT_ID,
      "get_account",
      { account_id: CONTRACT_ID }
    );

    if (!account || !account.supplied) return "0";

    const usdcEntry = account.supplied.find(
      (s) => s.token_id === USDC_CONTRACT_ID
    );

    return usdcEntry?.balance ?? "0";
  } catch {
    return "0";
  }
}

export async function getUsdcApy(): Promise<number> {
  try {
    const response = await fetch(RHEA_APY_URL);
    const data = await response.json();

    // The API returns an array of assets; find USDC by token_id.
    const assets = Array.isArray(data) ? data : data?.data ?? [];
    for (const asset of assets) {
      if (asset.token_id === USDC_CONTRACT_ID) {
        // supply_apy is typically a decimal (e.g., 0.05 for 5%)
        return Number(asset.supply_apy ?? 0) * 100;
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

export async function getVaultInfo(): Promise<VaultInfo> {
  return viewMethod<VaultInfo>(CONTRACT_ID, "get_vault_info");
}

// ─── Contract Call Helpers ────────────────────────────────────

export interface WalletCallMethod {
  signAndSendTransaction: (params: {
    signerId: string;
    receiverId: string;
    actions: Array<{
      type: "FunctionCall";
      params: {
        methodName: string;
        args: Record<string, unknown>;
        gas: string;
        deposit: string;
      };
    }>;
  }) => Promise<unknown>;
}

const GAS = "100000000000000"; // 100 TGas
const ONE_YOCTO = "1";
const ZERO_DEPOSIT = "0";

export async function addKid(
  wallet: WalletCallMethod,
  signerId: string,
  name: string,
  walletId: string,
  amount: string
): Promise<unknown> {
  return wallet.signAndSendTransaction({
    signerId,
    receiverId: CONTRACT_ID,
    actions: [
      {
        type: "FunctionCall",
        params: {
          methodName: "add_kid",
          args: { name, wallet_id: walletId, amount },
          gas: GAS,
          deposit: ZERO_DEPOSIT,
        },
      },
    ],
  });
}

export async function removeKid(
  wallet: WalletCallMethod,
  signerId: string,
  walletId: string
): Promise<unknown> {
  return wallet.signAndSendTransaction({
    signerId,
    receiverId: CONTRACT_ID,
    actions: [
      {
        type: "FunctionCall",
        params: {
          methodName: "remove_kid",
          args: { wallet_id: walletId },
          gas: GAS,
          deposit: ZERO_DEPOSIT,
        },
      },
    ],
  });
}

export async function updateKidAmount(
  wallet: WalletCallMethod,
  signerId: string,
  walletId: string,
  amount: string
): Promise<unknown> {
  return wallet.signAndSendTransaction({
    signerId,
    receiverId: CONTRACT_ID,
    actions: [
      {
        type: "FunctionCall",
        params: {
          methodName: "update_kid_amount",
          args: { wallet_id: walletId, amount },
          gas: GAS,
          deposit: ZERO_DEPOSIT,
        },
      },
    ],
  });
}

export async function setTransferDay(
  wallet: WalletCallMethod,
  signerId: string,
  day: number
): Promise<unknown> {
  return wallet.signAndSendTransaction({
    signerId,
    receiverId: CONTRACT_ID,
    actions: [
      {
        type: "FunctionCall",
        params: {
          methodName: "set_transfer_day",
          args: { day },
          gas: GAS,
          deposit: ZERO_DEPOSIT,
        },
      },
    ],
  });
}

export async function distribute(
  wallet: WalletCallMethod,
  signerId: string
): Promise<unknown> {
  return wallet.signAndSendTransaction({
    signerId,
    receiverId: CONTRACT_ID,
    actions: [
      {
        type: "FunctionCall",
        params: {
          methodName: "distribute",
          args: {},
          gas: GAS,
          deposit: ZERO_DEPOSIT,
        },
      },
    ],
  });
}

export async function withdrawFromVault(
  wallet: WalletCallMethod,
  signerId: string,
  amount: string
): Promise<unknown> {
  return wallet.signAndSendTransaction({
    signerId,
    receiverId: CONTRACT_ID,
    actions: [
      {
        type: "FunctionCall",
        params: {
          methodName: "withdraw_from_vault",
          args: { amount },
          gas: GAS,
          deposit: ZERO_DEPOSIT,
        },
      },
    ],
  });
}

/**
 * Transfer USDC from the connected wallet to the contract (funding).
 * This calls ft_transfer on the USDC contract.
 */
export async function fundContract(
  wallet: WalletCallMethod,
  signerId: string,
  amount: string
): Promise<unknown> {
  return wallet.signAndSendTransaction({
    signerId,
    receiverId: USDC_CONTRACT_ID,
    actions: [
      {
        type: "FunctionCall",
        params: {
          methodName: "ft_transfer",
          args: {
            receiver_id: CONTRACT_ID,
            amount,
            memo: "Fund allowance contract",
          },
          gas: GAS,
          deposit: ONE_YOCTO,
        },
      },
    ],
  });
}
