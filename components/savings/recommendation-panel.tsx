"use client";

import Link from "next/link";
import { Compass, MoveRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { VaultVenue } from "@/lib/yo/types";
import { getVaultRouteHref } from "@/lib/yo/types";
import { formatPercent, formatUsd, safeNumber } from "@/lib/utils";
import type { UserBalances } from "@yo-protocol/core";

type RecommendationPanelProps = {
  isConnected: boolean;
  walletBalances?: UserBalances;
  venues: VaultVenue[];
  onDeposit: (venue: VaultVenue) => void;
  contained?: boolean;
};

type RecommendedVenue = {
  venue: VaultVenue;
  balanceUsd: number;
  tokenBalance: string;
  chainName: string;
};

function buildRecommendations(walletBalances: UserBalances | undefined, venues: VaultVenue[]) {
  if (!walletBalances) {
    return [] as RecommendedVenue[];
  }

  const recommendations = walletBalances.assets.flatMap((asset) => {
    if (asset.type !== "ERC20" || !asset.contractAddress) {
      return [];
    }

    const match = venues.find(
      (venue) =>
        venue.chain.id === asset.chainId &&
        venue.asset.address.toLowerCase() === asset.contractAddress?.toLowerCase(),
    );

    if (!match || safeNumber(asset.balanceUsd) <= 0) {
      return [];
    }

    return [{
      venue: match,
      balanceUsd: safeNumber(asset.balanceUsd),
      tokenBalance: asset.balance,
      chainName: asset.chainName,
    }];
  });

  return recommendations
    .sort((left, right) => {
      const balanceDelta = right.balanceUsd - left.balanceUsd;
      if (balanceDelta !== 0) {
        return balanceDelta;
      }

      return safeNumber(right.venue.yield["30d"]) - safeNumber(left.venue.yield["30d"]);
    })
    .slice(0, 3);
}

export function RecommendationPanel({
  isConnected,
  walletBalances,
  venues,
  onDeposit,
  contained = false,
}: RecommendationPanelProps) {
  const recommendations = buildRecommendations(walletBalances, venues);

  return (
    <section className={contained ? "" : "glass-panel panel-pad-compact"}>
      <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-[#94cdb7]">
        <Compass className="h-4 w-4" />
        Recommended next deposit
      </div>

      {!isConnected ? (
        <div className="mt-4 rounded-[22px] border border-white/8 bg-[#081a15] px-4 py-4 text-sm leading-6 text-white/65">
          Connect a wallet to match your current assets to the YO vaults that fit them.
        </div>
      ) : recommendations.length === 0 ? (
        <div className="mt-4 rounded-[22px] border border-white/8 bg-[#081a15] px-4 py-4 text-sm leading-6 text-white/65">
          No supported ERC-20 wallet asset was detected for a direct deposit route. Hold a supported vault asset on a supported chain to unlock a recommendation.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {recommendations.map(({ venue, balanceUsd, tokenBalance, chainName }) => (
            <div key={venue.key} className="rounded-[22px] border border-white/8 bg-[#081a15] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/40">{chainName}</div>
                  <div className="mt-1 font-display text-xl text-white">{venue.name}</div>
                </div>
                <div className="rounded-full border border-[#b9ffdf]/20 bg-[#b9ffdf]/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#b9ffdf]">
                  {formatPercent(venue.yield["30d"])} 30d
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/62">
                You already hold {tokenBalance} {venue.asset.symbol}. That makes this the cleanest direct deposit route in your wallet right now.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/65">
                <span>Wallet value: {formatUsd(balanceUsd)}</span>
                <span>Route: {venue.route}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button className="gap-2" onClick={() => onDeposit(venue)}>
                  Deposit assets
                  <MoveRight className="h-4 w-4" />
                </Button>
                <Link href={getVaultRouteHref(venue)}>
                  <Button variant="secondary" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    View details
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
