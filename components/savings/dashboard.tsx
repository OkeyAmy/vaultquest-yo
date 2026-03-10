"use client";

import Link from "next/link";
import type {
  GlobalVaultHistoryItem,
  PriceMap,
  SupportedChainId,
  VaultStatsItem,
} from "@yo-protocol/core";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeDollarSign,
  DatabaseZap,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet2,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  useClaimMerklRewards,
  useGlobalVaultHistory,
  useMerklRewards,
  usePrices,
  useTotalTvl,
  useUserBalances,
  useVaults,
} from "@yo-protocol/react";

import { AccountActivityPanel, PendingRedeemPanel, RewardsPanel } from "@/components/savings/account-center";
import { SavingsActionModal } from "@/components/savings/action-modal";
import { RecommendationPanel } from "@/components/savings/recommendation-panel";
import { RiskPanel } from "@/components/savings/risk-panel";
import { Button } from "@/components/ui/button";
import {
  useAccountInsights,
  usePortfolioPositions,
} from "@/hooks/use-yo-data";
import {
  chainMeta,
  getChainLabel,
  getExplorerTxUrl,
  isSupportedAppChain,
  supportedChainIds,
} from "@/lib/chains";
import {
  cn,
  formatCompactNumber,
  formatPercent,
  formatUsd,
  safeNumber,
  timeAgo,
  truncateAddress,
} from "@/lib/utils";
import { flattenVaults, getVaultRouteHref, type UserPositionWithVault, type VaultVenue } from "@/lib/yo/types";

type ChainFilter = "all" | SupportedChainId;

type ActionState = {
  mode: "deposit" | "redeem";
  venue: VaultVenue;
} | null;

export function SavingsDashboard() {
  const [search, setSearch] = useState("");
  const [chainFilter, setChainFilter] = useState<ChainFilter>("all");
  const [actionState, setActionState] = useState<ActionState>(null);
  const [compareKeys, setCompareKeys] = useState<string[]>([]);

  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const vaultCatalog = useVaults();
  const priceMap = usePrices();
  const activity = useGlobalVaultHistory({ limit: 6 });
  const portfolio = usePortfolioPositions(address, vaultCatalog.vaults);
  const walletBalances = useUserBalances(address, { enabled: Boolean(address) });
  const accountInsights = useAccountInsights(address, portfolio.data);
  const merklRewards = useMerklRewards(address, { enabled: Boolean(address) });
  const protocolTvl = useTotalTvl();
  const claimRewards = useClaimMerklRewards({
    onError: () => undefined,
  });

  const venues = useMemo(() => flattenVaults(vaultCatalog.vaults ?? []), [vaultCatalog.vaults]);

  const filteredVenues = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return venues
      .filter((venue) => (chainFilter === "all" ? true : venue.chain.id === chainFilter))
      .filter((venue) => {
        if (!needle) {
          return true;
        }

        return [venue.name, venue.asset.symbol, venue.chain.name, venue.route]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((left, right) => {
        const yieldDelta = safeNumber(right.yield["30d"]) - safeNumber(left.yield["30d"]);
        if (yieldDelta !== 0) {
          return yieldDelta;
        }

        return left.chain.id - right.chain.id;
      });
  }, [venues, search, chainFilter]);

  const positionsByVaultAddress = useMemo(() => {
    return new Map(
      (portfolio.data ?? []).map((item) => [item.vault.contracts.vaultAddress.toLowerCase(), item]),
    );
  }, [portfolio.data]);

  const portfolioSummary = useMemo(() => {
    return summarizePortfolio(portfolio.data ?? [], priceMap.prices ?? {});
  }, [portfolio.data, priceMap.prices]);

  const comparedVenues = useMemo(
    () => venues.filter((venue) => compareKeys.includes(venue.key)),
    [compareKeys, venues],
  );

  const unsupportedChain = Boolean(isConnected && !isSupportedAppChain(chainId));

  function toggleCompare(venueKey: string) {
    setCompareKeys((current) => {
      if (current.includes(venueKey)) {
        return current.filter((key) => key !== venueKey);
      }

      if (current.length >= 2) {
        return [...current.slice(1), venueKey];
      }

      return [...current, venueKey];
    });
  }

  return (
    <div className="space-y-12 pb-16">
      <section className="glass-panel panel-pad overflow-hidden">
        <div className="flex flex-col gap-8 lg:flex-row lg:justify-between">
          <div className="max-w-3xl">
            <div className="eyebrow">Smart savings dashboard</div>
            <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl lg:text-5xl lg:leading-[1.15]">
              Live YO vaults with portfolio context, wallet-aware recommendations, and a dedicated transaction rail.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65">
              Browse vaults on the left, then use the right-side workspace to see what your wallet can fund now, what is still pending, and what changed after the last YO action.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-4 sm:flex-row lg:flex-col lg:items-end lg:justify-start">
            <QuickStat label="Live vault venues" value={formatCompactNumber(venues.length || 0)} icon={DatabaseZap} />
            <QuickStat
              label="Connected chain"
              value={unsupportedChain ? "Unsupported" : getChainLabel(chainId)}
              icon={Wallet2}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {supportedChainIds.map((supportedId) => (
            <button
              key={supportedId}
              type="button"
              onClick={() => void switchChainAsync?.({ chainId: supportedId })}
              disabled={isSwitchingChain}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-left transition hover:border-white/20 hover:bg-white/8 disabled:opacity-50"
            >
              <div className="text-xs uppercase tracking-[0.22em] text-[#94cdb7]">
                {chainMeta[supportedId].label}
              </div>
              <div className="mt-1 text-sm text-white/70">{chainMeta[supportedId].blurb}</div>
            </button>
          ))}
        </div>

        <div className="my-10 h-px w-full bg-white/10" />

        <div className="grid gap-10 xl:grid-cols-3">
          <PortfolioPanel
            address={address}
            isConnected={isConnected}
            totalSuppliedUsd={portfolioSummary.totalSuppliedUsd}
            activePositions={portfolioSummary.activePositions}
            chainExposure={portfolioSummary.chainExposure}
            idleWalletUsd={safeNumber(walletBalances.balances?.totalBalanceUsd ?? 0)}
            trackedAssets={walletBalances.balances?.assets.length ?? 0}
            contained
          />
          <ProtocolInsightPanel
            latestTvlUsd={Number(protocolTvl.tvl?.at(-1)?.tvlUsd ?? 0)}
            points={protocolTvl.tvl?.map((point) => Number(point.tvlUsd)) ?? []}
            isLoading={protocolTvl.isLoading}
            contained
          />
          <RecommendationPanel
            isConnected={isConnected}
            walletBalances={walletBalances.balances}
            venues={venues}
            onDeposit={(venue) => setActionState({ mode: "deposit", venue })}
            contained
          />
        </div>
      </section>

      <section className="space-y-8">
        {unsupportedChain ? (
          <div className="rounded-[28px] border border-[#ff8a7a]/25 bg-[#ff8a7a]/10 p-4 text-[#ffd2cc] sm:p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
              <div>
                <div className="font-display text-xl text-white">Unsupported chain connected</div>
                <p className="mt-2 text-sm leading-7 text-[#ffd2cc]">
                  VaultQuest only allows transactions on Base, Ethereum, or Arbitrum. Switch to one of those networks before trying to deposit or redeem.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="glass-panel panel-pad">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              <ChainFilterButton active={chainFilter === "all"} onClick={() => setChainFilter("all")}>
                All chains
              </ChainFilterButton>
              {supportedChainIds.map((supportedId) => (
                <ChainFilterButton
                  key={supportedId}
                  active={chainFilter === supportedId}
                  onClick={() => setChainFilter(supportedId)}
                >
                  {chainMeta[supportedId].label}
                </ChainFilterButton>
              ))}
            </div>
            <label className="relative block w-full max-w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by vault, asset, or route"
                className="field-shell pl-11"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/app/account">
              <Button variant="secondary" className="gap-2">
                <BadgeDollarSign className="h-4 w-4" />
                Open account center
              </Button>
            </Link>
          </div>
        </div>

        {comparedVenues.length > 0 ? (
          <ComparePanel venues={comparedVenues} onClear={() => setCompareKeys([])} />
        ) : null}

        <div className="grid gap-5 2xl:grid-cols-2">
          {vaultCatalog.isLoading
            ? Array.from({ length: 4 }).map((_, index) => <VaultSkeleton key={index} />)
            : filteredVenues.map((venue) => (
              <VaultCard
                key={venue.key}
                venue={venue}
                position={positionsByVaultAddress.get(venue.contracts.vaultAddress.toLowerCase())}
                prices={priceMap.prices ?? {}}
                disabled={!isConnected || unsupportedChain}
                onDeposit={() => setActionState({ mode: "deposit", venue })}
                onRedeem={() => setActionState({ mode: "redeem", venue })}
                comparing={compareKeys.includes(venue.key)}
                onToggleCompare={() => toggleCompare(venue.key)}
              />
            ))}
        </div>

        {!vaultCatalog.isLoading && filteredVenues.length === 0 ? (
          <div className="glass-panel panel-pad text-center">
            <div className="font-display text-2xl text-white">
              {chainFilter === 42161
                ? "No live YO vault venues are exposed on Arbitrum right now."
                : "No vaults matched this filter."}
            </div>
            <p className="mt-3 text-sm leading-7 text-white/60">
              {chainFilter === 42161
                ? "Arbitrum remains supported in the wallet and chain handling layer, but the live YO catalog currently surfaces Base and Ethereum venues."
                : "Try a different chain filter or search term."}
            </p>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <PendingRedeemPanel
            pendingRedeems={accountInsights.data?.pendingRedeems ?? []}
            isLoading={accountInsights.isLoading}
            compact
          />
          <AccountActivityPanel
            items={accountInsights.data?.history ?? []}
            isLoading={accountInsights.isLoading}
            compact
          />
          <RiskPanel compact />
        </div>
        <div className="flex flex-col gap-6">
          <RewardsPanel
            rewards={accountInsights.data?.rewards ?? []}
            claimableCountText={String(merklRewards.rewards?.rewards.length ?? 0)}
            hasClaimable={merklRewards.hasClaimable}
            isLoading={accountInsights.isLoading || merklRewards.isLoading}
            isClaiming={claimRewards.isLoading}
            onClaim={() => {
              if (!merklRewards.rewards) {
                return;
              }

              void claimRewards.claim(merklRewards.rewards);
            }}
            compact
          />
          <ActivityPanel items={activity.history?.items ?? []} isLoading={activity.isLoading} compact />
        </div>
      </section>

      <SavingsActionModal
        open={Boolean(actionState)}
        mode={actionState?.mode ?? "deposit"}
        venue={actionState?.venue ?? null}
        position={actionState ? positionsByVaultAddress.get(actionState.venue.contracts.vaultAddress.toLowerCase()) : undefined}
        onClose={() => setActionState(null)}
        onCompleted={() => {
          void portfolio.refetch();
          void walletBalances.refetch();
          void activity.refetch();
          void accountInsights.refetch();
        }}
      />
    </div >
  );
}

function QuickStat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Sparkles }) {
  return (
    <div className="min-w-0 flex flex-col justify-center rounded-[24px] border border-white/10 bg-white/6 p-6 sm:p-8 transition hover:bg-white/8">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/50">
        <Icon className="h-5 w-5 shrink-0 text-[#94cdb7]" />
        <span className="truncate font-medium">{label}</span>
      </div>
      <div className="mt-4 truncate font-display text-3xl leading-tight text-white sm:text-4xl">{value}</div>
    </div>
  );
}

function ChainFilterButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm transition",
        active
          ? "border-[#b9ffdf]/35 bg-[#b9ffdf]/12 text-white"
          : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/8",
      )}
    >
      {children}
    </button>
  );
}

function VaultCard({
  venue,
  position,
  prices,
  disabled,
  onDeposit,
  onRedeem,
  comparing,
  onToggleCompare,
}: {
  venue: VaultVenue;
  position?: UserPositionWithVault;
  prices: PriceMap;
  disabled: boolean;
  onDeposit: () => void;
  onRedeem: () => void;
  comparing: boolean;
  onToggleCompare: () => void;
}) {
  const assetPrice = venue.asset.coingeckoId ? safeNumber(prices[venue.asset.coingeckoId]) : 0;
  const tvlUsd = assetPrice
    ? safeNumber(venue.tvl.raw) / 10 ** venue.asset.decimals * assetPrice
    : 0;
  const userAssets = position?.position.assets ?? 0n;
  const userShares = position?.position.shares ?? 0n;

  return (
    <article className="glass-panel panel-pad p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/45">
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-[#94cdb7]">{venue.chain.name}</span>
            <span>{venue.route}</span>
          </div>
          <h2 className="mt-4 break-words font-display text-3xl text-white">{venue.name}</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Save {venue.asset.symbol} with a live YO vault route on {venue.chain.name}. Review the network before signing.
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <div className="text-xs uppercase tracking-[0.22em] text-white/45">30d yield</div>
          <div className="mt-3 font-display text-4xl sm:text-5xl text-[#b9ffdf]">{formatPercent(venue.yield["30d"])}</div>
          <div className="mt-2 text-sm text-white/45">7d {formatPercent(venue.yield["7d"], 1)}</div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <MetricCard
          compact
          label="TVL"
          value={`${venue.tvl.formatted} ${venue.asset.symbol}`}
          secondary={tvlUsd ? formatUsd(tvlUsd) : "Live onchain value"}
        />
        <MetricCard compact label="Share price" value={venue.sharePrice.formatted} secondary={venue.shareAsset.symbol} />
        <MetricCard compact label="Vault cap" value={venue.cap.formatted} secondary={venue.asset.symbol} />
        <MetricCard
          compact
          label="Reward boost"
          value={venue.merklRewardYield ? `${venue.merklRewardYield}%` : "N/A"}
          secondary="Additional incentives"
        />
      </div>

      <div className="mt-5 rounded-[22px] border border-white/8 bg-[#081a15] p-4">
        <div className="flex flex-col gap-2 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>Your position</span>
          <span>{disabled ? "Connect on a supported chain" : `${venue.shareAsset.symbol} balance`}</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">Assets</div>
            <div className="mt-1 break-words text-lg font-medium text-white">
              {position ? `${Number(formatUnits(userAssets, venue.asset.decimals)).toFixed(4)} ${venue.asset.symbol}` : "0.0000"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/40">Shares</div>
            <div className="mt-1 break-words text-lg font-medium text-white">
              {position ? `${Number(formatUnits(userShares, venue.shareAsset.decimals)).toFixed(4)} ${venue.shareAsset.symbol}` : "0.0000"}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs leading-6 text-white/45">
          Live onchain vault. Verify chain, asset, amount, and gas before submitting.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <Button
          className="h-auto min-h-11 min-w-0 w-full gap-2 whitespace-normal px-4 py-3 text-center leading-5"
          size="md"
          disabled={disabled}
          onClick={onDeposit}
        >
          <ArrowUpFromLine className="h-4 w-4" />
          Deposit assets
        </Button>
        <Button
          variant="secondary"
          className="h-auto min-h-11 min-w-0 w-full gap-2 whitespace-normal px-4 py-3 text-center leading-5"
          size="md"
          disabled={disabled || userAssets <= 0n}
          onClick={onRedeem}
        >
          <ArrowDownToLine className="h-5 w-5" />
          Redeem
        </Button>
        <Link href={getVaultRouteHref(venue)} className="min-w-0">
          <Button
            variant="ghost"
            className="h-auto min-h-11 w-full gap-2 whitespace-normal px-4 py-3 text-center leading-5"
            size="md"
          >
            <ShieldCheck className="h-5 w-5" />
            View details
          </Button>
        </Link>
        <Button
          variant={comparing ? "primary" : "secondary"}
          className="h-auto min-h-11 min-w-0 w-full gap-2 whitespace-normal px-4 py-3 text-center leading-5"
          size="md"
          onClick={onToggleCompare}
        >
          Compare
        </Button>
      </div>
    </article>
  );
}

function MetricCard({
  label,
  value,
  secondary,
  compact = false,
}: {
  label: string;
  value: string;
  secondary: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 flex flex-col justify-center rounded-[24px] border border-white/8 bg-white/4 transition hover:bg-white/6",
        compact ? "p-4 sm:p-5" : "p-6 sm:p-7",
      )}
    >
      <div className={cn("break-words font-medium tracking-wide text-white/50", compact ? "text-xs" : "text-sm")}>
        {label}
      </div>
      <div
        className={cn(
          "break-words font-display tracking-tight text-white",
          compact ? "mt-3 text-lg leading-6 sm:text-xl" : "mt-4 text-3xl",
        )}
      >
        {value}
      </div>
      <div className={cn("break-words text-white/45", compact ? "mt-1 text-xs leading-5" : "mt-2 text-sm")}>
        {secondary}
      </div>
    </div>
  );
}

function PortfolioPanel({
  address,
  isConnected,
  totalSuppliedUsd,
  activePositions,
  chainExposure,
  idleWalletUsd,
  trackedAssets,
  contained = false,
}: {
  address?: string;
  isConnected: boolean;
  totalSuppliedUsd: number;
  activePositions: number;
  chainExposure: string[];
  idleWalletUsd: number;
  trackedAssets: number;
  contained?: boolean;
}) {
  return (
    <section className={contained ? "" : "glass-panel panel-pad"}>
      <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-[#94cdb7]">
        <BadgeDollarSign className="h-4 w-4" />
        Portfolio snapshot
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <MetricCard label="Total supplied" value={isConnected ? formatUsd(totalSuppliedUsd) : "$0"} secondary="Across active YO positions" />
        <MetricCard label="Active positions" value={String(activePositions)} secondary={isConnected ? "Live position count" : "Connect wallet to load"} />
        <MetricCard label="Idle wallet balance" value={isConnected ? formatUsd(idleWalletUsd) : "$0"} secondary={`${trackedAssets} tracked wallet assets`} />
        <MetricCard label="Wallet" value={truncateAddress(address)} secondary={isConnected ? "Connected" : "Disconnected"} />
      </div>
      <div className="mt-5 rounded-[20px] border border-white/8 bg-[#081a15] px-4 py-4 text-sm text-white/65">
        <div className="text-xs uppercase tracking-[0.22em] text-white/40">Chain exposure</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {chainExposure.length > 0 ? (
            chainExposure.map((chain) => (
              <span key={chain} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
                {chain}
              </span>
            ))
          ) : (
            <span>No vault exposure loaded yet.</span>
          )}
        </div>
      </div>
    </section>
  );
}

function ComparePanel({ venues, onClear }: { venues: VaultVenue[]; onClear: () => void }) {
  return (
    <section className="glass-panel panel-pad">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="eyebrow">Compare mode</div>
          <h2 className="mt-2 font-display text-2xl text-white">Check two YO routes side by side.</h2>
        </div>
        <Button variant="secondary" onClick={onClear}>Clear compare</Button>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {venues.map((venue) => (
          <div key={venue.key} className="rounded-[24px] border border-white/8 bg-[#081a15] p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">{venue.chain.name}</div>
                <div className="mt-1 font-display text-2xl text-white">{venue.name}</div>
              </div>
              <Link href={getVaultRouteHref(venue)}>
                <Button variant="ghost" size="sm">Open</Button>
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <MetricCard label="30d yield" value={formatPercent(venue.yield["30d"])} secondary="Primary compare metric" />
              <MetricCard label="TVL" value={`${venue.tvl.formatted} ${venue.asset.symbol}`} secondary="Live YO snapshot" />
              <MetricCard label="Share price" value={venue.sharePrice.formatted} secondary={venue.shareAsset.symbol} />
              <MetricCard label="Reward boost" value={venue.merklRewardYield ? `${venue.merklRewardYield}%` : "N/A"} secondary="Merkl incentive overlay" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProtocolInsightPanel({
  latestTvlUsd,
  points,
  isLoading,
  contained = false,
}: {
  latestTvlUsd: number;
  points: number[];
  isLoading: boolean;
  contained?: boolean;
}) {
  return (
    <section className={contained ? "" : "glass-panel panel-pad"}>
      <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-[#94cdb7]">
        <DatabaseZap className="h-4 w-4" />
        Protocol insight
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricCard
          label="Latest protocol TVL"
          value={isLoading ? "Loading" : formatUsd(latestTvlUsd)}
          secondary="YO total TVL timeseries"
        />
        <MetricCard
          label="Trend points"
          value={String(points.length)}
          secondary="Loaded from the YO API"
        />
      </div>
      <div className="mt-4 rounded-[22px] border border-white/8 bg-[#081a15] p-3">
        {points.length > 1 ? (
          <svg viewBox="0 0 220 72" className="h-[72px] w-full">
            <path d={createSparklinePath(points)} fill="none" stroke="#76e4bc" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <div className="flex h-[72px] items-center justify-center text-sm text-white/45">
            No protocol TVL trend data returned.
          </div>
        )}
      </div>
    </section>
  );
}

function ActivityPanel({ items, isLoading, compact = false }: { items: GlobalVaultHistoryItem[]; isLoading: boolean; compact?: boolean }) {
  return (
    <section className={cn("glass-panel", compact ? "panel-pad-compact" : "panel-pad")}>
      <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-[#94cdb7]">
        <ShieldCheck className="h-4 w-4" />
        Live vault activity
      </div>
      <div className={compact ? "mt-4 space-y-3" : "mt-5 space-y-3"}>
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-[20px] border border-white/8 bg-[#081a15] p-4">
              <div className="h-4 w-20 rounded-full bg-white/10" />
              <div className="mt-3 h-4 w-40 rounded-full bg-white/10" />
            </div>
          ))
          : items.map((item) => (
            <a
              key={`${item.transactionHash}-${item.createdAt}`}
              href={getExplorerTxUrl(resolveChainId(item.network), item.transactionHash) ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="block rounded-[20px] border border-white/8 bg-[#081a15] p-4 transition hover:border-white/15 hover:bg-white/6"
            >
              <div className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-white/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span>{item.type}</span>
                <span>{timeAgo(item.createdAt)}</span>
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                {item.assets.formatted} on {item.network}
              </div>
              <div className="mt-1 text-xs text-white/45">{truncateAddress(item.transactionHash, 8, 6)}</div>
            </a>
          ))}
        {!isLoading && items.length === 0 ? (
          <div className="rounded-[20px] border border-white/8 bg-[#081a15] p-4 text-sm text-white/60">
            No recent vault activity returned by the YO API.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function VaultSkeleton() {
  return (
    <div className="glass-panel panel-pad">
      <div className="h-4 w-24 rounded-full bg-white/10" />
      <div className="mt-4 h-8 w-40 rounded-full bg-white/10" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 rounded-[20px] bg-white/10" />
        ))}
      </div>
      <div className="mt-5 h-24 rounded-[22px] bg-white/10" />
    </div>
  );
}

function summarizePortfolio(positions: UserPositionWithVault[], prices: PriceMap) {
  const totalSuppliedUsd = positions.reduce((total, item) => {
    const amount = Number(formatUnits(item.position.assets, item.vault.asset.decimals));
    const price = item.vault.asset.coingeckoId ? safeNumber(prices[item.vault.asset.coingeckoId]) : 0;
    return total + amount * price;
  }, 0);

  const chainExposure = Array.from(
    new Set(
      positions.map((item) => {
        const chain = item.vault.chain.name;
        return chain.charAt(0).toUpperCase() + chain.slice(1);
      }),
    ),
  );

  return {
    totalSuppliedUsd,
    activePositions: positions.length,
    chainExposure,
  };
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

function resolveChainId(network: string | undefined) {
  if (network === "ethereum") return 1;
  if (network === "base") return 8453;
  if (network === "arbitrum") return 42161;
  return undefined;
}
