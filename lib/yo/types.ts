import type {
  Asset,
  FormattedValue,
  SecondaryVaultInfo,
  UserVaultPosition,
  VaultStatsItem,
  Yield,
} from "@yo-protocol/core";

export type VaultVenue = {
  key: string;
  vaultId: string;
  name: string;
  type?: string;
  asset: Asset;
  shareAsset: Asset;
  chain: {
    id: number;
    name: string;
    explorer?: string;
    blockTime?: number;
  };
  contracts: {
    vaultAddress: string;
    authorityAddress?: string;
  };
  yield: Yield;
  tvl: FormattedValue;
  cap: FormattedValue;
  sharePrice: FormattedValue;
  merklRewardYield?: string;
  route: "primary" | "secondary";
};

export type UserPositionWithVault = {
  vault: VaultStatsItem;
  position: UserVaultPosition;
};

function toVenue(baseVault: VaultStatsItem, override?: SecondaryVaultInfo): VaultVenue {
  const source = override ?? baseVault;

  return {
    key: `${baseVault.id}-${source.chain.id}`,
    vaultId: baseVault.id,
    name: baseVault.name,
    type: baseVault.type,
    asset: source.asset,
    shareAsset: source.shareAsset,
    chain: source.chain,
    contracts: source.contracts,
    yield: baseVault.yield,
    tvl: baseVault.tvl,
    cap: baseVault.cap,
    sharePrice: baseVault.sharePrice,
    merklRewardYield: baseVault.merklRewardYield,
    route: override ? "secondary" : "primary",
  };
}

export function flattenVaults(vaults: VaultStatsItem[]) {
  const venues = vaults.flatMap((vault) => {
    const baseVenue = toVenue(vault);
    const secondaryVenues = (vault.secondaryVaults ?? []).map((secondary) =>
      toVenue(vault, secondary),
    );

    return [baseVenue, ...secondaryVenues];
  });

  return Array.from(new Map(venues.map((venue) => [venue.key, venue])).values());
}

export function getVaultRouteHref(venue: Pick<VaultVenue, "vaultId" | "chain">) {
  return `/app/vault/${venue.chain.id}/${venue.vaultId}`;
}
