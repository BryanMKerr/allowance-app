"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from "react";
import { setupWalletSelector } from "@near-wallet-selector/core";
import type {
  WalletSelector,
  AccountState,
  Wallet,
} from "@near-wallet-selector/core";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupModal } from "@near-wallet-selector/modal-ui";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import "@near-wallet-selector/modal-ui/styles.css";
import { CONTRACT_ID, NETWORK_ID } from "@/config";

interface WalletContextValue {
  selector: WalletSelector | null;
  modal: WalletSelectorModal | null;
  accounts: AccountState[];
  accountId: string | null;
  wallet: Wallet | null;
  signIn: () => void;
  signOut: () => Promise<void>;
  loading: boolean;
}

const WalletContext = createContext<WalletContextValue>({
  selector: null,
  modal: null,
  accounts: [],
  accountId: null,
  wallet: null,
  signIn: () => {},
  signOut: async () => {},
  loading: true,
});

export const useWallet = () => useContext(WalletContext);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accounts, setAccounts] = useState<AccountState[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const sel = await setupWalletSelector({
          network: NETWORK_ID,
          modules: [setupMyNearWallet()],
        });

        const mod = setupModal(sel, {
          contractId: CONTRACT_ID,
        });

        const state = sel.store.getState();
        const accs = state.accounts;

        if (mounted) {
          setSelector(sel);
          setModal(mod);
          setAccounts(accs);

          if (accs.length > 0) {
            const w = await sel.wallet();
            setWallet(w);
          }
          setLoading(false);
        }

        sel.store.observable.subscribe(async (next) => {
          if (!mounted) return;
          const newAccounts = next.accounts;
          setAccounts(newAccounts);

          if (newAccounts.length > 0) {
            try {
              const w = await sel.wallet();
              setWallet(w);
            } catch {
              setWallet(null);
            }
          } else {
            setWallet(null);
          }
        });
      } catch (err) {
        console.error("Failed to initialize wallet selector:", err);
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const accountId = useMemo(() => {
    const active = accounts.find((a) => a.active);
    return active?.accountId ?? null;
  }, [accounts]);

  const signIn = useCallback(() => {
    if (modal) modal.show();
  }, [modal]);

  const signOut = useCallback(async () => {
    if (wallet) {
      await wallet.signOut();
      setWallet(null);
      setAccounts([]);
    }
  }, [wallet]);

  const value = useMemo(
    () => ({
      selector,
      modal,
      accounts,
      accountId,
      wallet,
      signIn,
      signOut,
      loading,
    }),
    [selector, modal, accounts, accountId, wallet, signIn, signOut, loading]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
