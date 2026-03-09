"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, LogOut, Wallet } from "lucide-react";
import { useAccount, useChainId, useConnect, useConnectors, useDisconnect } from "wagmi";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { getChainLabel, isSupportedAppChain } from "@/lib/chains";
import { truncateAddress } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";

export function WalletControls() {
  const hydrated = useHydrated();
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();
  const { connect, error, isPending, variables } = useConnect();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const availableConnectors = useMemo(
    () =>
      connectors.filter(
        (
          connector,
        ): connector is Exclude<(typeof connectors)[number], (...args: never[]) => unknown> =>
          typeof connector !== "function" && connector.type !== "safe",
      ),
    [connectors],
  );

  if (!hydrated) {
    return (
      <Button variant="secondary" className="min-w-[148px] justify-center" disabled>
        Loading wallet
      </Button>
    );
  }

  if (!isConnected || !address) {
    return (
      <>
        <Button onClick={() => setOpen(true)} className="min-w-[148px] justify-center gap-2">
          <Wallet className="h-4 w-4" />
          Connect wallet
        </Button>
        <Modal open={open && !isConnected} onClose={() => setOpen(false)} title="Connect your wallet" subtitle="Use a supported wallet to access live YO deposit and redeem flows.">
          <div className="space-y-3">
            {availableConnectors.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                No wallet connector is available in this browser. Open the site in MetaMask, Coinbase Wallet, or a browser with an injected wallet extension.
              </div>
            ) : null}
            {availableConnectors.map((connector) => (
              <button
                key={connector.id}
                type="button"
                onClick={() => connect({ connector })}
                disabled={isPending}
                className="flex w-full items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-left text-white transition hover:border-white/20 hover:bg-white/8"
              >
                <div>
                  <div className="font-medium">{connector.name}</div>
                  <div className="text-sm text-white/55">
                    {describeConnector(connector.id)}
                  </div>
                </div>
                {isPending && variables?.connector?.id === connector.id ? (
                  <span className="text-sm text-[#b9ffdf]">Connecting...</span>
                ) : (
                  <ExternalLink className="h-4 w-4 text-white/45" />
                )}
              </button>
            ))}
            {error ? (
              <div className="rounded-2xl border border-[#ff8a7a]/25 bg-[#ff8a7a]/10 px-4 py-3 text-sm text-[#ffd2cc]">
                {error.message}
              </div>
            ) : null}
          </div>
        </Modal>
      </>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-right">
        <div className="text-xs uppercase tracking-[0.22em] text-white/45">
          {isSupportedAppChain(chainId) ? getChainLabel(chainId) : "Unsupported chain"}
        </div>
        <div className="mt-1 text-sm font-medium text-white">{truncateAddress(address)}</div>
      </div>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(address);
          setCopied(true);
        }}
        className={`rounded-full border p-3 transition ${
          copied
            ? "border-[#b9ffdf]/30 bg-[#b9ffdf]/12 text-[#b9ffdf]"
            : "border-white/10 text-white/70 hover:border-white/20 hover:text-white"
        }`}
        aria-label="Copy wallet address"
      >
        <Copy className="h-4 w-4" />
      </button>
      <Button variant="secondary" onClick={() => disconnect()} className="gap-2">
        <LogOut className="h-4 w-4" />
        Disconnect
      </Button>
    </div>
  );
}

function describeConnector(connectorId: string) {
  if (connectorId === "metaMask") {
    return "MetaMask extension or mobile wallet";
  }

  if (connectorId === "coinbaseWallet") {
    return "Coinbase Wallet extension or mobile wallet";
  }

  return "Browser wallet or injected provider";
}
