"use client";

import Link from "next/link";
import { useVaults } from "@yo-protocol/react";

import { flattenVaults } from "@/lib/yo/types";
import { formatPercent, safeNumber } from "@/lib/utils";

export function VaultPreviewStrip() {
  const { vaults, isLoading, isError } = useVaults();

  const preview = flattenVaults(vaults ?? [])
    .sort((left, right) => safeNumber(right.yield["30d"]) - safeNumber(left.yield["30d"]))
    .slice(0, 3);

  return (
    <section className="glass-panel panel-pad overflow-hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="eyebrow">Live vault preview</div>
          <h2 className="section-title mt-3">YO inventory the judges can verify.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
            Vault cards below come from the live YO catalog. Deposit and redeem actions stay inside the dashboard so the core path stays short without falling back to placeholder product data.
          </p>
        </div>
        <Link href="/app" className="text-sm uppercase tracking-[0.2em] text-[#b9ffdf] transition hover:text-white">
          Open live dashboard
        </Link>
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="min-w-0 rounded-[26px] border border-white/10 bg-[#081a15] p-4 lg:p-5">
                <div className="h-4 w-20 rounded-full bg-white/10" />
                <div className="mt-4 h-8 w-40 rounded-full bg-white/10" />
                <div className="mt-6 h-16 rounded-[20px] bg-white/10" />
              </div>
            ))
          : preview.map((vault) => (
              <div key={vault.key} className="min-w-0 rounded-[26px] border border-white/10 bg-[#081a15] p-4 lg:p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/55">
                    {vault.chain.name}
                  </span>
                  <span className="text-sm text-[#b9ffdf]">{formatPercent(vault.yield["30d"])}</span>
                </div>
                <h3 className="mt-4 break-words font-display text-xl text-white sm:text-2xl">{vault.name}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Save {vault.asset.symbol} on {vault.chain.name} with live vault state and chain-aware wallet handling.
                </p>
                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="min-w-0 rounded-[20px] border border-white/8 bg-white/5 px-4 py-3">
                    <div className="text-white/45">TVL</div>
                    <div className="mt-1 break-words font-medium text-white">{vault.tvl.formatted} {vault.asset.symbol}</div>
                  </div>
                  <div className="min-w-0 rounded-[20px] border border-white/8 bg-white/5 px-4 py-3">
                    <div className="text-white/45">Route</div>
                    <div className="mt-1 break-words font-medium text-white">{vault.route}</div>
                  </div>
                </div>
              </div>
            ))}
      </div>
      {isError ? (
        <div className="mt-4 rounded-[22px] border border-[#ff8a7a]/20 bg-[#ff8a7a]/10 px-4 py-3 text-sm text-[#ffd2cc]">
          Live vault data could not be loaded.
        </div>
      ) : null}
    </section>
  );
}
