"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, Gem, History, Layers3, LoaderCircle, Radar, Trophy } from "lucide-react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { useClaimMerklRewards, useMerklRewards, usePrices, useVaults } from "@yo-protocol/react";

import { Button } from "@/components/ui/button";
import {
  type AccountHistoryItem,
  type AccountPendingRedeemItem,
  type AccountPerformanceItem,
  type AccountRewardsItem,
  type AccountSnapshotItem,
  useAccountInsights,
  usePortfolioPositions,
} from "@/hooks/use-yo-data";
import { getChainMeta, getExplorerTxUrl } from "@/lib/chains";
import { getVaultRouteHref } from "@/lib/yo/types";
import {
  cn,
  formatCompactNumber,
  formatTokenFromUnits,
  formatUsd,
  safeNumber,
  timeAgo,
  truncateAddress,
} from "@/lib/utils";

export function PendingRedeemPanel({
  pendingRedeems,
  isLoading,
  compact = false,
}: {
  pendingRedeems: AccountPendingRedeemItem[];
  isLoading: boolean;
  compact?: boolean;
}) {
  return (
    <section className={cn("glass-panel", compact ? "panel-pad-compact" : "panel-pad")}>
      <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-[#94cdb7]">
        <Radar className="h-5 w-5" />
        Pending redeems
      </div>
      <div className={compact ? "mt-4 space-y-3" : "mt-6 space-y-4"}>
        {isLoading
          ? Array.from({ length: compact ? 2 : 3 }).map((_, index) => (
            <div key={index} className="h-20 rounded-[22px] bg-white/8" />
          ))
          : pendingRedeems.map((item) => (
            <Link
              key={`${item.chainId}:${item.vaultAddress}`}
              href={getVaultRouteHref({ vaultId: item.vaultId, chain: { id: item.chainId, name: item.vaultName } })}
              className="block rounded-[22px] border border-white/8 bg-[#081a15] p-5 sm:p-6 transition hover:border-white/15 hover:bg-white/6"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">{getChainMeta(item.chainId).label}</div>
                  <div className="mt-1 break-words font-medium text-white">{item.vaultName}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-white/45" />
              </div>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-white/40">Assets waiting</div>
                  <div className="mt-1 break-words text-white">
                    {item.pending.assets?.formatted ?? "0"} {item.assetSymbol}
                  </div>
                </div>
                <div>
                  <div className="text-white/40">Shares queued</div>
                  <div className="mt-1 break-words text-white">
                    {item.pending.shares?.formatted ?? "0"} {item.shareSymbol}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        {!isLoading && pendingRedeems.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-[#081a15] px-4 py-4 text-sm leading-6 text-white/62">
            No queued redemptions are currently returned for this account.
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function AccountActivityPanel({
  items,
  isLoading,
  compact = false,
}: {
  items: AccountHistoryItem[];
  isLoading: boolean;
  compact?: boolean;
}) {
  return (
    <section className={cn("glass-panel", compact ? "panel-pad-compact" : "panel-pad")}>
      <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-[#94cdb7]">
        <History className="h-5 w-5" />
        My activity
      </div>
      <div className={compact ? "mt-4 space-y-3" : "mt-6 space-y-4"}>
        {isLoading
          ? Array.from({ length: compact ? 2 : 4 }).map((_, index) => (
            <div key={index} className="h-20 rounded-[22px] bg-white/8" />
          ))
          : items.slice(0, compact ? 4 : 8).map((item) => (
            <a
              key={`${item.transactionHash}-${item.createdAt}-${item.vaultAddress}`}
              href={getExplorerTxUrl(item.chainId, item.transactionHash) ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="block rounded-[22px] border border-white/8 bg-[#081a15] p-5 sm:p-6 transition hover:border-white/15 hover:bg-white/6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.2em] text-white/40">
                <span className="break-words">{item.type}</span>
                <span>{timeAgo(item.createdAt)}</span>
              </div>
              <div className="mt-2 break-words text-sm font-medium text-white">
                {item.assets.formatted} {item.assetSymbol} in {item.vaultName}
              </div>
              <div className="mt-1 text-xs text-white/45">
                {getChainMeta(item.chainId).label} · {truncateAddress(item.transactionHash, 8, 6)}
              </div>
            </a>
          ))}
        {!isLoading && items.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-[#081a15] px-4 py-4 text-sm leading-6 text-white/62">
            No user-level YO transaction history is available yet for this wallet.
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function RewardsPanel({
  rewards,
  claimableCountText,
  hasClaimable,
  isLoading,
  isClaiming,
  onClaim,
  compact = false,
}: {
  rewards: AccountRewardsItem[];
  claimableCountText: string;
  hasClaimable: boolean;
  isLoading: boolean;
  isClaiming: boolean;
  onClaim: () => void;
  compact?: boolean;
}) {
  return (
    <section className={cn("glass-panel", compact ? "panel-pad-compact" : "panel-pad")}>
      <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-[#94cdb7]">
        <Trophy className="h-4 w-4" />
        Rewards and incentives
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <MetricCard label="Tracked assets" value={String(rewards.length)} secondary="Assets with YO reward history" />
        <MetricCard label="Claimable tokens" value={claimableCountText} secondary="Reward tokens ready to claim" />
      </div>
      <div className="mt-5 flex flex-wrap gap-4">
        <Button variant="secondary" disabled={!hasClaimable || isClaiming} className="gap-2" onClick={onClaim}>
          {isClaiming ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Gem className="h-4 w-4" />}
          Claim rewards
        </Button>
        <div className="flex items-center text-sm text-white/55">
          {hasClaimable ? "Claimable rewards detected on YO's Merkl path." : "No claimable Merkl rewards detected right now."}
        </div>
      </div>
      <div className={compact ? "mt-4 space-y-3" : "mt-6 space-y-4"}>
        {isLoading
          ? Array.from({ length: compact ? 2 : 4 }).map((_, index) => (
            <div key={index} className="h-20 rounded-[22px] bg-white/8" />
          ))
          : rewards.slice(0, compact ? 3 : 6).map((item) => (
            <div key={`${item.chainId}:${item.vaultAddress}`} className="rounded-[22px] border border-white/8 bg-[#081a15] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">{getChainMeta(item.chainId).label}</div>
                  <div className="mt-1 break-words font-medium text-white">{item.vaultName}</div>
                </div>
                <div className="text-sm text-[#b9ffdf]">{item.assetSymbol}</div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
                <MetricCard label="Current week" value={item.rewards.currentWeek.totalRewards.formatted} secondary="Current YO rewards" />
                <MetricCard label="Last week" value={item.rewards.lastWeek.totalRewards.formatted} secondary="Previous YO rewards" />
                <MetricCard label="All time" value={item.rewards.allTime.totalRewards.formatted} secondary="Lifetime YO rewards" />
              </div>
            </div>
          ))}
        {!isLoading && rewards.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-[#081a15] px-4 py-4 text-sm leading-6 text-white/62">
            No YO reward history is currently returned for the active vault assets in this wallet.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PerformancePanel({
  items,
  isLoading,
}: {
  items: AccountPerformanceItem[];
  isLoading: boolean;
}) {
  return (
    <section className="glass-panel panel-pad">
      <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-[#94cdb7]">
        <Activity className="h-4 w-4" />
        My performance
      </div>
      <div className="mt-4 space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 rounded-[22px] bg-white/8" />
          ))
          : items.map((item) => (
            <div key={`${item.chainId}:${item.vaultAddress}`} className="rounded-[22px] border border-white/8 bg-[#081a15] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">{getChainMeta(item.chainId).label}</div>
                  <div className="mt-1 break-words font-medium text-white">{item.vaultName}</div>
                </div>
                <div className="text-sm text-white/55">{item.assetSymbol}</div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <MetricCard label="Realized" value={item.performance.realized.formatted} secondary="YO reported" />
                <MetricCard label="Unrealized" value={item.performance.unrealized.formatted} secondary="YO reported" />
              </div>
            </div>
          ))}
        {!isLoading && items.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-[#081a15] px-4 py-4 text-sm leading-6 text-white/62">
            No user performance data is currently available for the active wallet positions.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SnapshotPanel({
  items,
  isLoading,
}: {
  items: AccountSnapshotItem[];
  isLoading: boolean;
}) {
  return (
    <section className="glass-panel panel-pad">
      <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-[#94cdb7]">
        <Activity className="h-4 w-4" />
        Position snapshots
      </div>
      <div className="mt-4 space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 rounded-[22px] bg-white/8" />
          ))
          : items.map((item) => {
            const points = item.snapshots.map((snapshot) => Number(snapshot.assetBalanceUsd));
            const latest = points.at(-1) ?? 0;

            return (
              <div key={`${item.chainId}:${item.vaultAddress}`} className="rounded-[22px] border border-white/8 bg-[#081a15] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-white/40">{getChainMeta(item.chainId).label}</div>
                    <div className="mt-1 break-words font-medium text-white">{item.vaultName}</div>
                  </div>
                  <div className="text-sm text-white/55">{item.assetSymbol}</div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <MetricCard label="Latest snapshot" value={formatUsd(latest)} secondary={`${item.snapshots.length} balance points`} />
                  <div className="rounded-[20px] border border-white/8 bg-white/5 px-4 py-3">
                    <div className="text-white/40">Trend</div>
                    <div className="mt-3 rounded-[18px] border border-white/8 bg-[#081a15] p-2">
                      {points.length > 1 ? (
                        <svg viewBox="0 0 220 64" className="h-[64px] w-full">
                          <path d={createSparklinePath(points)} fill="none" stroke="#76e4bc" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <div className="flex h-[64px] items-center justify-center text-sm text-white/45">
                          Not enough snapshot history yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        {!isLoading && items.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-[#081a15] px-4 py-4 text-sm leading-6 text-white/62">
            No user snapshot history is currently available for the active positions.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PositionsPanel() {
  const { address, isConnected } = useAccount();
  const catalog = useVaults();
  const prices = usePrices();
  const portfolio = usePortfolioPositions(address, catalog.vaults);

  return (
    <section className="glass-panel panel-pad">
      <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-[#94cdb7]">
        <Layers3 className="h-4 w-4" />
        My positions
      </div>
      {!isConnected ? (
        <div className="mt-4 rounded-[22px] border border-white/8 bg-[#081a15] px-4 py-4 text-sm leading-6 text-white/62">
          Connect a wallet to load current YO positions.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {portfolio.isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 rounded-[22px] bg-white/8" />
            ))
            : portfolio.data?.map((item) => {
              const amount = Number(formatUnits(item.position.assets, item.vault.asset.decimals));
              const price = item.vault.asset.coingeckoId ? safeNumber(prices.prices?.[item.vault.asset.coingeckoId]) : 0;
              const usd = amount * price;

              return (
                <Link
                  key={`${item.vault.chain.id}:${item.vault.contracts.vaultAddress}`}
                  href={getVaultRouteHref({ vaultId: item.vault.id, chain: item.vault.chain })}
                  className="block rounded-[22px] border border-white/8 bg-[#081a15] p-5 sm:p-6 transition hover:border-white/15 hover:bg-white/6"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-white/40">{item.vault.chain.name}</div>
                      <div className="mt-1 break-words font-medium text-white">{item.vault.name}</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-white/45" />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <MetricCard
                      label="Assets"
                      value={`${formatTokenFromUnits(item.position.assets, item.vault.asset.decimals)} ${item.vault.asset.symbol}`}
                      secondary="Current position"
                    />
                    <MetricCard
                      label="Shares"
                      value={`${formatTokenFromUnits(item.position.shares, item.vault.shareAsset.decimals)} ${item.vault.shareAsset.symbol}`}
                      secondary="Vault shares"
                    />
                    <MetricCard label="Estimated value" value={formatUsd(usd)} secondary="Spot-price estimate" />
                  </div>
                </Link>
              );
            })}
          {!portfolio.isLoading && (portfolio.data?.length ?? 0) === 0 ? (
            <div className="rounded-[22px] border border-white/8 bg-[#081a15] px-4 py-4 text-sm leading-6 text-white/62">
              No YO positions are loaded for this wallet yet.
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, value, secondary }: { label: string; value: string; secondary: string }) {
  return (
    <div className="min-w-0 flex flex-col justify-center rounded-[24px] border border-white/8 bg-white/4 p-6 sm:p-7 transition hover:bg-white/6">
      <div className="break-words text-sm font-medium tracking-wide text-white/50">{label}</div>
      <div className="mt-4 break-words font-display text-3xl tracking-tight text-white">{value}</div>
      <div className="mt-2 break-words text-sm text-white/45">{secondary}</div>
    </div>
  );
}

export function AccountCenter() {
  const { address, isConnected } = useAccount();
  const catalog = useVaults();
  const prices = usePrices();
  const portfolio = usePortfolioPositions(address, catalog.vaults);
  const insights = useAccountInsights(address, portfolio.data);
  const merklRewards = useMerklRewards(address, { enabled: Boolean(address) });
  const claimRewards = useClaimMerklRewards({
    onError: () => undefined,
  });

  const totalSuppliedUsd = (portfolio.data ?? []).reduce((total, item) => {
    const amount = Number(formatUnits(item.position.assets, item.vault.asset.decimals));
    const price = item.vault.asset.coingeckoId ? safeNumber(prices.prices?.[item.vault.asset.coingeckoId]) : 0;
    return total + amount * price;
  }, 0);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <section className="space-y-8">
        <div className="glass-panel panel-pad">
          <div className="flex flex-col gap-8">
            <div className="max-w-3xl">
              <div className="eyebrow">Account center</div>
              <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl lg:text-5xl lg:leading-[1.15]">
                Positions, activity, pending redeems, and rewards in one place.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65">
                VaultQuest should not stop at execution. This route tracks what the wallet already owns across YO and what still needs attention after a redeem.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/app">
                  <Button variant="secondary">Back to dashboard</Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard label="Wallet" value={truncateAddress(address)} secondary={isConnected ? "Connected" : "Disconnected"} />
              <MetricCard label="Positions" value={formatCompactNumber(portfolio.data?.length ?? 0)} secondary="Active YO exposures" />
              <MetricCard label="Portfolio value" value={formatUsd(totalSuppliedUsd)} secondary="Spot-price estimate across positions" />
            </div>
          </div>
        </div>

        <PositionsPanel />
        <PerformancePanel items={insights.data?.performance ?? []} isLoading={insights.isLoading} />
        <SnapshotPanel items={insights.data?.snapshots ?? []} isLoading={insights.isLoading} />
      </section>

      <aside className="space-y-8">
        <PendingRedeemPanel pendingRedeems={insights.data?.pendingRedeems ?? []} isLoading={insights.isLoading} />
        <AccountActivityPanel items={insights.data?.history ?? []} isLoading={insights.isLoading} />
        <RewardsPanel
          rewards={insights.data?.rewards ?? []}
          claimableCountText={String(merklRewards.rewards?.rewards.length ?? 0)}
          hasClaimable={merklRewards.hasClaimable}
          isLoading={insights.isLoading || merklRewards.isLoading}
          isClaiming={claimRewards.isLoading}
          onClaim={() => {
            if (!merklRewards.rewards) {
              return;
            }

            void claimRewards.claim(merklRewards.rewards);
          }}
        />
      </aside>
    </div>
  );
}

function createSparklinePath(points: number[]) {
  if (points.length < 2) {
    return "";
  }

  const width = 220;
  const height = 64;
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
