import { useRef, useState } from "react";
import { useDAppKit, useCurrentAccount } from "@mysten/dapp-kit-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Transaction } from "@mysten/sui/transactions";
import { sui } from "../services/suiClient";
import { decodeEvent, type DecodedEvent } from "../services/events";
import { executionError, errorText } from "../utils/errors";
export interface TxState {
  phase:
    | "idle"
    | "simulating"
    | "review"
    | "signing"
    | "confirming"
    | "success"
    | "error"
    | "unknown";
  gas?: bigint;
  digest?: string;
  error?: string;
  events?: DecodedEvent[];
  label?: string;
}
export function useTransaction() {
  const kit = useDAppKit(),
    account = useCurrentAccount(),
    cache = useQueryClient();
  const [state, set] = useState<TxState>({ phase: "idle" });
  const locked = useRef(false),
    prepared = useRef<{ tx: Transaction; owner: string; time: number } | null>(
      null,
    );
  async function prepare(
    build: () => Promise<Transaction> | Transaction,
    label: string,
  ) {
    if (locked.current || !account) return;
    locked.current = true;
    prepared.current = null;
    set({ phase: "simulating", label });
    try {
      const owner = account.address;
      const tx = await build();
      const r = await sui.simulateTransaction({
        transaction: tx,
        include: { effects: true, events: true },
      });
      if (r.FailedTransaction)
        throw executionError(r.FailedTransaction.status.error!);
      if (r.gasPaymentMocked)
        throw new Error(
          "Simulation used mocked gas; fund your wallet with SUI / 请先存入 SUI 支付 Gas",
        );
      const g = r.Transaction.effects.gasUsed;
      const gas =
        BigInt(g.computationCost) +
        BigInt(g.storageCost) -
        BigInt(g.storageRebate);
      prepared.current = { tx, owner, time: Date.now() };
      set({
        phase: "review",
        gas,
        label,
        events: r.Transaction.events
          .map(decodeEvent)
          .filter((e): e is DecodedEvent => e !== null),
      });
    } catch (e) {
      set({ phase: "error", error: errorText(e), label });
    } finally {
      locked.current = false;
    }
  }
  async function confirm() {
    if (locked.current || !prepared.current) return;
    locked.current = true;
    const p = prepared.current;
    prepared.current = null;
    let digest: string | undefined;
    let knownFailure = false;
    try {
      if (account?.address !== p.owner)
        throw new Error(
          "Wallet changed; prepare again / 钱包已变化，请重新预览",
        );
      if (Date.now() - p.time > 60000)
        throw new Error(
          "Preview expired; prepare again / 预览已过期，请重新计算",
        );
      set((s) => ({ ...s, phase: "signing", events: undefined }));
      const r = await kit.signAndExecuteTransaction({ transaction: p.tx });
      const executed = r.Transaction ?? r.FailedTransaction;
      digest = executed.digest;
      if (r.FailedTransaction) {
        knownFailure = true;
        throw executionError(r.FailedTransaction.status.error!);
      }
      set((s) => ({ ...s, phase: "confirming", digest }));
      const confirmed = await sui.waitForTransaction({
        digest,
        include: { effects: true, events: true },
        timeout: 60000,
      });
      if (confirmed.FailedTransaction) {
        knownFailure = true;
        throw executionError(confirmed.FailedTransaction.status.error!);
      }
      set((s) => ({
        ...s,
        phase: "success",
        digest,
        events: confirmed.Transaction.events
          .map(decodeEvent)
          .filter((e): e is DecodedEvent => e !== null),
      }));
      await cache.invalidateQueries();
    } catch (e) {
      set((s) => ({
        ...s,
        phase: digest && !knownFailure ? "unknown" : "error",
        digest,
        error: errorText(e),
      }));
    } finally {
      locked.current = false;
    }
  }
  async function recheck() {
    if (!state.digest || locked.current) return;
    locked.current = true;
    try {
      const r = await sui.getTransaction({
        digest: state.digest,
        include: { events: true },
      });
      if (r.FailedTransaction) {
        set((s) => ({
          ...s,
          phase: "error",
          error: errorText(executionError(r.FailedTransaction!.status.error!)),
        }));
      } else {
        set((s) => ({
          ...s,
          phase: "success",
          error: undefined,
          events: r.Transaction.events
            .map(decodeEvent)
            .filter((e): e is DecodedEvent => e !== null),
        }));
        await cache.invalidateQueries();
      }
    } catch (e) {
      set((s) => ({ ...s, error: errorText(e) }));
    } finally {
      locked.current = false;
    }
  }
  return {
    state,
    prepare,
    confirm,
    recheck,
    close: () => {
      prepared.current = null;
      set({ phase: "idle" });
    },
    busy: ["simulating", "signing", "confirming"].includes(state.phase),
  };
}
