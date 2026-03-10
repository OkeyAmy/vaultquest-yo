"use client";

import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, ChartNoAxesCombined, ExternalLink, Layers3, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits, type Address } from "viem";
import {
  useAllowance,
  usePendingRedemptions,
  usePerformanceBenchmark,
  useSharePriceHistory,
  useUserPerformance,
  useVaultAllocations,
  useVaultHistory,
  useVaultPendingRedeems,
  useVaultPercentile,
  useVaultPerformance,
  useVaultState,
  useVaultTransactionHistory,
  useVaults,
  useYieldConfig,
} from "@yo-protocol/react";
import { YO_GATEWAY_ADDRESS } from "@yo-protocol/core";

import { SavingsActionModal } from "@/components/savings/action-modal";
import { Button } from "@/components/ui/button";
import { usePortfolioPositions } from "@/hooks/use-yo-data";
import { getChainMeta, getExplorerTxUrl, isSupportedAppChain } from "@/lib/chains";
import { getVaultRouteHref, flattenVaults } from "@/lib/yo/types";
import { formatPercent, formatTokenFromUnits, formatUsd, safeNumber, timeAgo } from "@/lib/utils";

type VaultDetailClientProps = {
  chainId: number;
  vaultId: string;
};

export function VaultDetailClient({ chainId, vaultId }: VaultDetailClientProps) {
  const [actionMode, setActionMode] = useState<"deposit" | "redeem" | null>(null);

  const { address, isConnected } = useAccount();
  const catalog = useVaults();
  const portfolio = usePortfolioPositions(address, catalog.vaults);

  const venue = useMemo(() => {
    const venues = flattenVaults(catalog.vaults ?? []);
    return venues.find((item) => item.vaultId.toLowerCase() === vaultId.toLowerCase() && item.chain.id === chainId);
  }, [catalog.vaults, chainId, vaultId]);

  const position = useMemo(() => {
    if (!venue) {
      return undefined;
    }

    return (portfolio.data ?? []).find(
      (item) => item.vault.contracts.vaultAddress.toLowerCase() === venue.contracts.vaultAddress.toLowerCase(),
    );
  }, [portfolio.data, venue]);

  const vaultAddress = (venue?.contracts.vaultAddress ?? "0x0000000000000000000000000000000000000000") as Address;
  const hooksEnabled = Boolean(venue?.contracts.vaultAddress);
  const { defaultSlippageBps } = useYieldConfig();
  const { vaultState, refetch: refetchVaultState } = useVaultState(vaultAddress, {
    enabled: hooksEnabled,
  });
  const vaultHistory = useVaultHistory(vaultAddress, { enabled: hooksEnabled });
  const sharePriceHistory = useSharePriceHistory(vaultAddress, { enabled: hooksEnabled });
  const vaultPerformance = useVaultPerformance(vaultAddress, { enabled: hooksEnabled });
  const vaultPercentile = useVaultPercentile(vaultAddress, { enabled: hooksEnabled });
  const vaultBenchmark = usePerformanceBenchmark(vaultAddress, { enabled: hooksEnabled });
  const vaultAllocations = useVaultAllocations(vaultAddress, { enabled: hooksEnabled });
  const vaultPendingRedeems = useVaultPendingRedeems(vaultAddress, { enabled: hooksEnabled });
  const vaultTransactions = useVaultTransactionHistory(vaultAddress, {
    enabled: hooksEnabled,
    limit: 12,
  });
  const userPendingRedeems = usePendingRedemptions(vaultAddress, address, {
    enabled: Boolean(address && hooksEnabled),
  });
  const userPerformance = useUserPerformance(vaultAddress, address, {
    enabled: Boolean(address && hooksEnabled),
  });
  const allowance = useAllowance(
    venue?.asset.address as Address | undefined,
    YO_GATEWAY_ADDRESS,
    address,
    {
      enabled: Boolean(address && venue?.asset.address),
    },
  );
  const latestAllocation = vaultAllocations.allocations.at(-1);
  const vaultHistoryItems = useMemo(() => {
    if (!vaultTransactions.history || !("items" in vaultTransactions.history)) {
      return [];
    }

    return vaultTransactions.history.items;
  }, [vaultTransactions.history]);

  if (catalog.isLoading && !venue) {
    return (
      <div className="space-y-5">
        <div className="glass-panel panel-pad-compact h-52" />
        <div className="grid gap-5 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="glass-panel panel-pad-compact h-44" />
          ))}
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="glass-panel panel-pad text-center">
        <div className="font-display text-3xl text-white">Vault route not found</div>
        <p className="mt-3 text-sm leading-7 text-white/62">
          VaultQuest could not match this vault ID and chain combination to the current YO catalog.
        </p>
        <div className="mt-5">
          <Link href="/app">
            <Button variant="secondary">Back to dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <section className="glass-panel panel-pad-compact overflow-hidden">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="eyebrow">{getChainMeta(venue.chain.id).label} vault detail</div>
              <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">{venue.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
                This route gives the vault enough context to be trusted: live snapshot data, history, allocation view, pending redeem context, and your current wallet exposure.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2" onClick={() => setActionMode("deposit")}>
                <ArrowUpFromLine className="h-4 w-4" />
                Deposit assets
              </Button>
              <Button variant="secondary" className="gap-2" disabled={!position || position.position.assets <= 0n} onClick={() => setActionMode("redeem")}>
                <ArrowDownToLine className="h-4 w-4" />
                Redeem position
              </Button>
              <Link href="/app/account">
                <Button variant="ghost">Account center</Button>
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="30d yield" value={formatPercent(venue.yield["30d"])} secondary={`${venue.asset.symbol} route`} />
            <MetricCard
              label="Vault pending"
              value={vaultPendingRedeems.pendingRedeems?.formatted ?? "Unavailable"}
              secondary={vaultPendingRedeems.pendingRedeems ? `${venue.asset.symbol} waiting to exit` : "YO did not return a pending total for this vault"}
            />
            <MetricCard
              label="Your assets"
              value={position ? `${formatTokenFromUnits(position.position.assets, venue.asset.decimals)} ${venue.asset.symbol}` : "0"}
              secondary="Wallet-linked vault exposure"
            />
            <MetricCard
              label="Your shares"
              value={position ? `${formatTokenFromUnits(position.position.shares, venue.shareAsset.decimals)} ${venue.shareAsset.symbol}` : "0"}
              secondary="Redeemable share balance"
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MetricCard
              label="Asset allowance"
              value={allowance.allowance ? formatTokenFromUnits(allowance.allowance.allowance, venue.asset.decimals) : "Loading"}
              secondary={`${venue.asset.symbol} approved to YO gateway`}
            />
            <MetricCard
              label="Execution slippage"
              value={`${(defaultSlippageBps / 100).toFixed(2)}%`}
              secondary="Default provider protection"
            />
            <MetricCard
              label="Share price"
              value={vaultState?.exchangeRate ? formatTokenFromUnits(vaultState.exchangeRate, venue.asset.decimals, 6) : venue.sharePrice.formatted}
              secondary="Current onchain exchange rate"
            />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-3">
              <SparklineCard
                label="Yield history"
                value={formatPercent(venue.yield["30d"])}
                secondary="30d vault yield"
                points={vaultHistory.yieldHistory.map((point) => point.value)}
                tone="mint"
                formatter={(value) => `${value.toFixed(2)}%`}
              />
              <SparklineCard
                label="TVL history"
                value={venue.tvl.formatted}
                secondary={venue.asset.symbol}
                points={vaultHistory.tvlHistory.map((point) => point.value)}
                tone="warm"
                formatter={(value) => formatUsd(value)}
              />
              <SparklineCard
                label="Share price"
                value={vaultState?.exchangeRate ? formatTokenFromUnits(vaultState.exchangeRate, venue.asset.decimals, 6) : venue.sharePrice.formatted}
                secondary={venue.shareAsset.symbol}
                points={sharePriceHistory.history.map((point) => Number(point.pricePerShare))}
                tone="blue"
                formatter={(value) => value.toFixed(4)}
              />
            </div>

            <section className="glass-panel panel-pad-compact">
              <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-[#94cdb7]">
                <Layers3 className="h-4 w-4" />
                Allocation and pool context
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <MetricCard
                  label="Snapshot TVL"
                  value={venue.tvl.formatted}
                  secondary={`${venue.asset.symbol} under management`}
                />
                <MetricCard
                  label="Share price"
                  value={vaultState?.exchangeRate ? formatTokenFromUnits(vaultState.exchangeRate, venue.asset.decimals, 6) : venue.sharePrice.formatted}
                  secondary={venue.shareAsset.symbol}
                />
              </div>
              <div className="mt-4 rounded-[22px] border border-white/8 bg-[#081a15] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Latest allocation snapshot</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {latestAllocation
                    ? Object.entries(latestAllocation.protocols).map(([protocol, allocation]) => (
                        <span key={protocol} className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/70">
                          {protocol}: {allocation}
                        </span>
                      ))
                    : <span className="text-sm text-white/55">No allocation time series was returned for this vault.</span>}
                </div>
              </div>
            </section>

            <section className="glass-panel panel-pad-compact">
              <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-[#94cdb7]">
                <ChartNoAxesCombined className="h-4 w-4" />
                Vault history
              </div>
              <div className="mt-4 space-y-3">
                {vaultHistoryItems.map((item) => (
                  <a
                    key={`${item.transactionHash}-${item.createdAt}`}
                    href={getExplorerTxUrl(venue.chain.id, item.transactionHash) ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-[22px] border border-white/8 bg-[#081a15] p-4 transition hover:border-white/15 hover:bg-white/6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-white/40">
                      <span>{item.type}</span>
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {item.assets.formatted} {venue.asset.symbol}
                    </div>
                    <div className="mt-1 text-xs text-white/45">{item.network}</div>
                  </a>
                ))}
                {!vaultTransactions.isLoading && vaultHistoryItems.length === 0 ? (
                  <div className="rounded-[22px] border border-white/8 bg-[#081a15] px-4 py-4 text-sm text-white/62">
                    No vault transaction history was returned by YO for this venue.
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="glass-panel panel-pad-compact">
              <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-[#94cdb7]">
                <ShieldCheck className="h-4 w-4" />
                Trust context
              </div>
              <div className="mt-4 grid gap-3">
                <MetricCard
                  label="YO ranking"
                  value={vaultPercentile.percentile?.yoRanking ?? "Unavailable"}
                  secondary="Percentile response"
                />
                <MetricCard
                  label="YO advantage 30d"
                  value={vaultPercentile.percentile?.yoAdvantage30d ?? "Unavailable"}
                  secondary="Against compared pools"
                />
                <MetricCard
                  label="Performance"
                  value={vaultPerformance.performance?.realized.formatted ?? "Unavailable"}
                  secondary={vaultPerformance.performance ? `Unrealized ${vaultPerformance.performance.unrealized.formatted}` : "Vault performance unavailable from YO"}
                />
                <MetricCard
                  label="Benchmark pools"
                  value={String(vaultBenchmark.benchmark?.pools.length ?? 0)}
                  secondary="Pools returned in benchmark data"
                />
              </div>
            </section>

            <section className="glass-panel panel-pad-compact">
              <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-[#94cdb7]">
                <ShieldCheck className="h-4 w-4" />
                Your route on this vault
              </div>
              <div className="mt-4 grid gap-3">
                <MetricCard
                  label="Current assets"
                  value={position ? `${formatTokenFromUnits(position.position.assets, venue.asset.decimals)} ${venue.asset.symbol}` : "0"}
                  secondary="Wallet-linked vault position"
                />
                <MetricCard
                  label="Queued redeem"
                  value={userPendingRedeems.pendingRedemptions?.assets?.formatted ?? "0"}
                  secondary={userPendingRedeems.pendingRedemptions ? `${venue.asset.symbol} still pending` : "No queued user redeem"}
                />
                <MetricCard
                  label="User performance"
                  value={userPerformance.performance?.realized.formatted ?? "Unavailable"}
                  secondary={userPerformance.performance ? `Unrealized ${userPerformance.performance.unrealized.formatted}` : "No user performance returned"}
                />
              </div>
            </section>

            <section className="glass-panel panel-pad-compact">
              <div className="text-sm uppercase tracking-[0.24em] text-[#94cdb7]">Vault links</div>
              <div className="mt-4 space-y-3">
                <Link href="/app">
                  <Button variant="secondary" className="w-full justify-between">
                    Back to dashboard
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/app/account">
                  <Button variant="ghost" className="w-full justify-between">
                    Open account center
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
                {venue.chain.explorer ? (
                  <a href={`${venue.chain.explorer}/address/${venue.contracts.vaultAddress}`} target="_blank" rel="noreferrer">
                    <Button variant="ghost" className="w-full justify-between">
                      View contract
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                ) : null}
              </div>
            </section>
          </aside>
        </section>
      </div>

      <SavingsActionModal
        open={Boolean(actionMode)}
        mode={actionMode ?? "deposit"}
        venue={venue}
        position={position}
        onClose={() => setActionMode(null)}
        onCompleted={() => {
          void portfolio.refetch();
          void refetchVaultState();
          void vaultHistory.refetch();
          void sharePriceHistory.refetch();
          void vaultPerformance.refetch();
          void vaultPercentile.refetch();
          void vaultBenchmark.refetch();
          void vaultAllocations.refetch();
          void vaultPendingRedeems.refetch();
          void vaultTransactions.refetch();
          void userPendingRedeems.refetch();
          void userPerformance.refetch();
          void allowance.refetch();
        }}
      />
    </>
  );
}

function MetricCard({ label, value, secondary }: { label: string; value: string; secondary: string }) {
  return (
    <div className="min-w-0 rounded-[22px] border border-white/8 bg-white/5 px-4 py-3">
      <div className="break-words text-white/40">{label}</div>
      <div className="mt-2 break-words text-sm font-medium text-white sm:text-base">{value}</div>
      <div className="mt-1 break-words text-xs leading-5 text-white/45">{secondary}</div>
    </div>
  );
}

function SparklineCard({
  label,
  value,
  secondary,
  points,
  tone,
  formatter,
}: {
  label: string;
  value: string;
  secondary: string;
  points: number[];
  tone: "mint" | "warm" | "blue";
  formatter: (value: number) => string;
}) {
  const normalized = points.filter((point) => Number.isFinite(point));
  const path = useMemo(() => createSparklinePath(normalized), [normalized]);
  const latest = normalized.at(-1);

  const stroke =
    tone === "mint"
      ? "#76e4bc"
      : tone === "warm"
        ? "#ffd5a1"
        : "#89b9ff";

  return (
    <div className="glass-panel panel-pad-compact">
      <div className="text-xs uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className="mt-2 font-display text-2xl text-white">{value}</div>
      <div className="mt-1 text-xs text-white/45">
        {latest !== undefined ? `${formatter(latest)} latest` : secondary}
      </div>
      <div className="mt-4 rounded-[22px] border border-white/8 bg-[#081a15] p-3">
        {path ? (
          <svg viewBox="0 0 220 72" className="h-[72px] w-full">
            <path d={path} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <div className="flex h-[72px] items-center justify-center text-sm text-white/45">
            No chart data returned.
          </div>
        )}
      </div>
    </div>
  );
}

function createSparklinePath(points: number[]) {
  if (points.length < 2) {
    return "";
  }

  const width = 220;
  const height = 72;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}
