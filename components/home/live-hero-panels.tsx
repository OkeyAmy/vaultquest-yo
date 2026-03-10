"use client";

import { DatabaseZap, Radar, Wallet } from "lucide-react";
import { useGlobalVaultHistory, useTotalTvl, useVaults } from "@yo-protocol/react";

import { chainMeta, supportedChainIds } from "@/lib/chains";
import { flattenVaults } from "@/lib/yo/types";
import { formatCompactNumber, formatUsd } from "@/lib/utils";

export function LiveHeroStats() {
  const vaultCatalog = useVaults();
  const protocolTvl = useTotalTvl();
  const activity = useGlobalVaultHistory({ limit: 8 });

  const venueCount = flattenVaults(vaultCatalog.vaults ?? []).length;
  const latestProtocolTvl = Number(protocolTvl.tvl?.at(-1)?.tvlUsd ?? 0);

  const stats = [
    {
      icon: Wallet,
      label: "supported chains",
      value: String(supportedChainIds.length),
    },
    {
      icon: DatabaseZap,
      label: "live vault venues",
      value: vaultCatalog.isLoading ? "Loading" : formatCompactNumber(venueCount),
    },
    {
      icon: Radar,
      label: "protocol TVL",
      value: protocolTvl.isLoading ? "Loading" : formatUsd(latestProtocolTvl),
    },
  ];

  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-3">
      {stats.map((item, index) => (
        <div
          key={item.label}
          className="glass-panel panel-pad-compact animate-fade-up"
          style={{ animationDelay: `${index * 120}ms` }}
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/45">
            <item.icon className="h-4 w-4 text-[#94cdb7]" />
            <span>{item.label}</span>
          </div>
          <div className="mt-3 font-display text-3xl text-white">{item.value}</div>
        </div>
      ))}
      <div className="sm:col-span-3 rounded-[24px] border border-white/10 bg-[#081a15] px-4 py-4 text-sm text-white/62">
        YO live feed currently returned {activity.history?.items.length ?? 0} recent protocol transactions for the latest dashboard pull.
      </div>
    </div>
  );
}

export function SupportedChainsStrip() {
  return (
    <div className="mt-5 grid gap-2 sm:grid-cols-3">
      {supportedChainIds.map((chainId) => (
        <div key={chainId} className="rounded-[20px] border border-white/10 bg-[#081a15] px-3 py-3">
          <div className="text-xs uppercase tracking-[0.22em] text-[#94cdb7]">Supported</div>
          <div className="mt-1 font-display text-lg text-white">{chainMeta[chainId].label}</div>
        </div>
      ))}
    </div>
  );
}
