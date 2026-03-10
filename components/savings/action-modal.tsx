"use client";

import { YO_GATEWAY_ADDRESS, type SupportedChainId } from "@yo-protocol/core";
import { useAllowance, useDeposit, usePreviewDeposit, useRedeem, useYieldConfig } from "@yo-protocol/react";
import { AlertTriangle, CheckCircle2, ExternalLink, LoaderCircle, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

import {
  useChainTokenBalance,
  useVaultExecutionStatus,
  useWithdrawQuote,
} from "@/hooks/use-yo-data";
import { getExplorerTxUrl, isSupportedAppChain } from "@/lib/chains";
import { getYoClient } from "@/lib/yo/clients";
import { cn, formatTokenFromUnits } from "@/lib/utils";
import type { UserPositionWithVault, VaultVenue } from "@/lib/yo/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface SavingsActionModalProps {
  open: boolean;
  mode: "deposit" | "redeem";
  venue: VaultVenue | null;
  position?: UserPositionWithVault;
  onClose: () => void;
  onCompleted: () => void;
}

export function SavingsActionModal({
  open,
  mode,
  venue,
  position,
  onClose,
  onCompleted,
}: SavingsActionModalProps) {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const [amount, setAmount] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [switchingBeforeRedeem, setSwitchingBeforeRedeem] = useState(false);

  const {
    deposit,
    step: depositStep,
    isLoading: isDepositLoading,
    error: depositError,
    isSuccess: isDepositSuccess,
    hash: depositHash,
    approveHash: depositApproveHash,
    reset: resetDeposit,
  } = useDeposit({
    vault: (venue?.contracts.vaultAddress ?? "0x0000000000000000000000000000000000000000") as Address,
    onConfirmed: () => onCompleted(),
    onError: (error) => setLocalError(error.message),
  });

  const {
    redeem,
    step: redeemStep,
    isLoading: isRedeemLoading,
    error: redeemError,
    isSuccess: isRedeemSuccess,
    hash: redeemHash,
    approveHash: redeemApproveHash,
    instant,
    assetsOrRequestId,
    reset: resetRedeem,
  } = useRedeem({
    vault: (venue?.contracts.vaultAddress ?? "0x0000000000000000000000000000000000000000") as Address,
    onConfirmed: () => onCompleted(),
    onError: (error) => setLocalError(error.message),
  });

  useEffect(() => {
    if (!open) {
      setAmount("");
      setLocalError(null);
      setSwitchingBeforeRedeem(false);
      resetDeposit();
      resetRedeem();
    }
  }, [open, resetDeposit, resetRedeem]);

  const decimals = venue?.asset.decimals ?? 18;
  const parsedAmount = useMemo(() => {
    const sanitized = amount.replace(/,/g, "").trim();
    if (!sanitized) {
      return undefined;
    }

    try {
      const parsed = parseUnits(sanitized, decimals);
      return parsed > 0n ? parsed : undefined;
    } catch {
      return undefined;
    }
  }, [amount, decimals]);

  const venueChainId = (venue?.chain.id ?? 8453) as SupportedChainId;
  const vaultAddress = venue?.contracts.vaultAddress as Address | undefined;
  const tokenAddress = venue?.asset.address as Address | undefined;
  const { defaultSlippageBps } = useYieldConfig();
  const walletBalance = useChainTokenBalance(venueChainId, tokenAddress, address);
  const depositPreview = usePreviewDeposit(
    (vaultAddress ?? "0x0000000000000000000000000000000000000000") as Address,
    mode === "deposit" ? parsedAmount : undefined,
    {
      enabled: Boolean(vaultAddress && mode === "deposit" && parsedAmount !== undefined),
    },
  );
  const redeemQuote = useWithdrawQuote(venueChainId, vaultAddress, mode === "redeem" ? parsedAmount : undefined);
  const executionStatus = useVaultExecutionStatus(venueChainId, vaultAddress);
  const allowance = useAllowance(
    mode === "deposit" ? tokenAddress : vaultAddress,
    YO_GATEWAY_ADDRESS,
    address,
    {
      enabled: Boolean(address && (mode === "deposit" ? tokenAddress : vaultAddress)),
    },
  );

  const positionAssets = position?.position.assets ?? 0n;
  const positionShares = position?.position.shares ?? 0n;
  const walletAssetBalance = walletBalance.data?.balance ?? 0n;

  const networkMismatch = Boolean(venue && chainId !== venue.chain.id);
  const unsupportedChain = Boolean(isConnected && !isSupportedAppChain(chainId));

  const primaryHash = mode === "deposit" ? depositHash : redeemHash;
  const approveHash = mode === "deposit" ? depositApproveHash : redeemApproveHash;
  const explorerUrl = venue ? getExplorerTxUrl(venue.chain.id, primaryHash) : undefined;
  const approveUrl = venue ? getExplorerTxUrl(venue.chain.id, approveHash) : undefined;

  const stepLabel = mode === "deposit"
    ? describeDepositStep(depositStep, isSwitchingChain)
    : describeRedeemStep(redeemStep, switchingBeforeRedeem || isSwitchingChain);

  const currentError = localError ?? depositError?.message ?? redeemError?.message ?? null;
  const isWorking =
    switchingBeforeRedeem ||
    isSwitchingChain ||
    isDepositLoading ||
    isRedeemLoading;

  async function handleSubmit() {
    if (!venue) {
      return;
    }

    setLocalError(null);

    if (!isConnected || !address) {
      setLocalError("Connect a wallet from the header before submitting a live transaction.");
      return;
    }

    if (!parsedAmount) {
      setLocalError("Enter a valid amount.");
      return;
    }

    if (executionStatus.data?.paused) {
      setLocalError("This vault is currently paused and cannot accept a live transaction.");
      return;
    }

    if (mode === "deposit") {
      if (parsedAmount > walletAssetBalance) {
        setLocalError("The entered amount is greater than your wallet balance on this chain.");
        return;
      }

      try {
        await deposit({
          token: tokenAddress as Address,
          amount: parsedAmount,
          chainId: venue.chain.id,
        });
      } catch (error) {
        setLocalError(error instanceof Error ? error.message : "Deposit failed.");
      }

      return;
    }

    if (parsedAmount > positionAssets) {
      setLocalError("The entered amount is greater than your redeemable position.");
      return;
    }

    try {
      if (chainId !== venue.chain.id) {
        setSwitchingBeforeRedeem(true);
        await switchChainAsync?.({ chainId: venue.chain.id });
        setSwitchingBeforeRedeem(false);
      }

      const sharesToRedeem =
        redeemQuote.data ??
        (await getYoClient(venueChainId).quotePreviewWithdraw(vaultAddress as Address, parsedAmount));

      await redeem(sharesToRedeem);
    } catch (error) {
      setSwitchingBeforeRedeem(false);
      setLocalError(error instanceof Error ? error.message : "Redeem failed.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={venue ? `${mode === "deposit" ? "Deposit into" : "Redeem from"} ${venue.name}` : "Transaction"}
      subtitle={venue ? `${venue.asset.symbol} on ${venue.chain.name}. Review the chain and amount before signing.` : undefined}
      className="max-w-4xl"
    >
      {!venue ? null : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="min-w-0 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Fact label="Vault" value={venue.name} />
              <Fact label="Route" value={`${venue.route} on ${venue.chain.name}`} />
              <Fact label="Asset" value={venue.asset.symbol} />
              <Fact label="Wallet" value={address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Disconnected"} />
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[#091a15] p-4">
              <label className="mb-3 block text-sm font-medium text-white">Amount</label>
              <div className="flex flex-col gap-3">
                <input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  className="min-w-0 w-full bg-transparent text-3xl font-display text-white outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setAmount(
                        formatUnits(
                          mode === "deposit" ? walletAssetBalance : positionAssets,
                          venue.asset.decimals,
                        ),
                      )
                    }
                    className="rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.22em] text-[#94cdb7] transition hover:border-white/20"
                  >
                    Use max
                  </button>
                  <span className="text-sm text-white/55">
                    {mode === "deposit" ? "Wallet balance" : "Redeemable balance"}: {formatTokenFromUnits(
                      mode === "deposit" ? walletAssetBalance : positionAssets,
                      venue.asset.decimals,
                    )} {venue.asset.symbol}
                  </span>
                </div>
                {mode === "redeem" ? (
                  <div className="text-sm text-white/55">
                    Shares held: {formatTokenFromUnits(positionShares, venue.shareAsset.decimals)} {venue.shareAsset.symbol}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-white/65">
              <div className="flex items-center gap-2 font-medium text-white">
                <ShieldAlert className="h-4 w-4 text-[#ffd5a1]" />
                Review before signing
              </div>
              <ul className="mt-3 space-y-2 leading-7">
                <li>Transactions hit live onchain YO contracts.</li>
                <li>Gas fees are external and shown by your wallet.</li>
                <li>Verify the selected chain and token amount before approval.</li>
                <li>Yield is variable and redeem timing can depend on vault liquidity.</li>
              </ul>
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-[#081a15] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-white/45">Execution preview</div>
              <div className="mt-3 space-y-3 text-sm text-white/68">
                <PreviewRow
                  label={mode === "deposit" ? "Estimated shares" : "Estimated shares burned"}
                  value={
                    parsedAmount && mode === "deposit" && depositPreview.shares !== undefined
                      ? `${formatTokenFromUnits(depositPreview.shares, venue.shareAsset.decimals)} ${venue.shareAsset.symbol}`
                      : parsedAmount && mode === "redeem" && redeemQuote.data !== undefined
                        ? `${formatTokenFromUnits(redeemQuote.data, venue.shareAsset.decimals)} ${venue.shareAsset.symbol}`
                        : "Enter an amount"
                  }
                />
                <PreviewRow label="Current chain" value={unsupportedChain ? "Unsupported" : String(chainId ?? "Not connected")} />
                <PreviewRow label="Target chain" value={`${venue.chain.id} (${venue.chain.name})`} />
                <PreviewRow label="Network handling" value={networkMismatch ? "Wallet switch required" : "Ready on current network"} />
                <PreviewRow
                  label={mode === "deposit" ? "Gateway allowance" : "Share allowance"}
                  value={
                    allowance.allowance
                      ? `${formatTokenFromUnits(
                          allowance.allowance.allowance,
                          mode === "deposit" ? venue.asset.decimals : venue.shareAsset.decimals,
                        )} ${mode === "deposit" ? venue.asset.symbol : venue.shareAsset.symbol}`
                      : "Checking allowance"
                  }
                />
                <PreviewRow label="Default slippage" value={`${(defaultSlippageBps / 100).toFixed(2)}%`} />
                <PreviewRow
                  label="Vault status"
                  value={
                    executionStatus.isLoading
                      ? "Checking vault status"
                      : executionStatus.data?.paused
                        ? "Paused"
                        : "Live"
                  }
                />
                <PreviewRow
                  label="Idle balance"
                  value={
                    executionStatus.data?.idleBalance !== undefined
                      ? `${formatTokenFromUnits(executionStatus.data.idleBalance, venue.asset.decimals)} ${venue.asset.symbol}`
                      : "Not returned"
                  }
                />
              </div>
            </div>

            {executionStatus.data?.paused ? (
              <div className="rounded-[24px] border border-[#ff8a7a]/20 bg-[#ff8a7a]/10 px-4 py-4 text-sm text-[#ffd2cc]">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>This vault is paused. VaultQuest is blocking execution until YO reports the route as live again.</span>
                </div>
              </div>
            ) : null}

            {stepLabel ? (
              <div className="rounded-[24px] border border-[#b9ffdf]/18 bg-[#b9ffdf]/10 px-4 py-4 text-sm text-white">
                <div className="flex items-center gap-3">
                  {isWorking ? <LoaderCircle className="h-4 w-4 animate-spin text-[#b9ffdf]" /> : <CheckCircle2 className="h-4 w-4 text-[#b9ffdf]" />}
                  <span>{stepLabel}</span>
                </div>
              </div>
            ) : null}

            {currentError ? (
              <div className="rounded-[24px] border border-[#ff8a7a]/20 bg-[#ff8a7a]/10 px-4 py-4 text-sm text-[#ffd2cc]">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{currentError}</span>
                </div>
              </div>
            ) : null}

            {(isDepositSuccess || isRedeemSuccess) && primaryHash ? (
              <div className="rounded-[24px] border border-[#b9ffdf]/18 bg-[#b9ffdf]/10 p-4 text-sm text-white">
                <div className="font-medium text-white">
                  {mode === "deposit" ? "Deposit confirmed" : instant === false ? "Redeem request submitted" : "Redeem confirmed"}
                </div>
                <div className="mt-2 text-white/70">
                  {mode === "redeem" && instant === false && assetsOrRequestId !== undefined
                    ? `Request id ${assetsOrRequestId.toString()} recorded onchain.`
                    : "The latest wallet action has been confirmed by the network."}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {explorerUrl ? (
                    <a href={explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#b9ffdf] transition hover:text-white">
                      View transaction
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                  {approveUrl ? (
                    <a href={approveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-white/70 transition hover:text-white">
                      View approval
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" className="min-w-0 flex-1" onClick={onClose}>
                Close
              </Button>
              <Button
                className="min-w-0 flex-1"
                onClick={() => void handleSubmit()}
                disabled={isWorking || !venue || !isConnected || Boolean(executionStatus.data?.paused)}
              >
                {mode === "deposit" ? "Submit deposit" : "Submit redeem"}
              </Button>
            </div>
            {!isConnected ? (
              <p className="text-sm text-white/50">Connect a wallet from the header to enable the live transaction flow.</p>
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[20px] border border-white/8 bg-white/5 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.22em] text-white/40">{label}</div>
      <div className="mt-2 break-words text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/6 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-white/45">{label}</span>
      <span className={cn("min-w-0 break-words text-left text-white sm:text-right", value === "Enter an amount" && "text-white/45")}>{value}</span>
    </div>
  );
}

function describeDepositStep(step: ReturnType<typeof useDeposit>["step"], switching: boolean) {
  if (switching || step === "switching-chain") {
    return "Switching your wallet to the vault chain...";
  }
  if (step === "approving") {
    return "Approval transaction requested. Confirm the token approval in your wallet.";
  }
  if (step === "depositing") {
    return "Deposit transaction requested. Confirm the live YO deposit in your wallet.";
  }
  if (step === "waiting") {
    return "Waiting for onchain confirmation...";
  }
  if (step === "success") {
    return "Deposit confirmed onchain.";
  }
  return null;
}

function describeRedeemStep(step: ReturnType<typeof useRedeem>["step"], switching: boolean) {
  if (switching) {
    return "Switching your wallet to the vault chain...";
  }
  if (step === "approving") {
    return "Approval requested. Confirm any share approval needed for the redeem flow.";
  }
  if (step === "redeeming") {
    return "Redeem transaction requested. Confirm it in your wallet.";
  }
  if (step === "waiting") {
    return "Waiting for onchain confirmation...";
  }
  if (step === "success") {
    return "Redeem flow confirmed onchain.";
  }
  return null;
}
