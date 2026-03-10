"use client";

import type {
  DailyAllocationSnapshot,
  FormattedValue,
  GlobalVaultHistoryResponse,
  PendingRedeem,
  PerformanceBenchmark,
  PriceMap,
  SharePriceHistoryPoint,
  SupportedChainId,
  TimeseriesPoint,
  TokenBalance,
  UserBalances,
  UserHistoryItem,
  UserPerformance,
  UserRewardsByAssetResponse,
  UserSnapshot,
  VaultHistoryResponse,
  VaultPercentile,
  VaultPerformance,
  VaultSnapshot,
  VaultStatsItem,
} from "@yo-protocol/core";
import type { Address } from "viem";
import { useQuery } from "@tanstack/react-query";

import { catalogClient, getYoClient } from "@/lib/yo/clients";
import type { UserPositionWithVault } from "@/lib/yo/types";

export type AccountHistoryItem = UserHistoryItem & {
  vaultId: string;
  vaultName: string;
  vaultAddress: Address;
  chainId: SupportedChainId;
  assetSymbol: string;
  shareSymbol: string;
};

export type AccountPendingRedeemItem = {
  vaultId: string;
  vaultName: string;
  vaultAddress: Address;
  chainId: SupportedChainId;
  assetSymbol: string;
  shareSymbol: string;
  pending: PendingRedeem;
};

export type AccountPerformanceItem = {
  vaultId: string;
  vaultName: string;
  vaultAddress: Address;
  chainId: SupportedChainId;
  assetSymbol: string;
  performance: UserPerformance;
};

export type AccountRewardsItem = {
  vaultId: string;
  vaultName: string;
  vaultAddress: Address;
  chainId: SupportedChainId;
  assetSymbol: string;
  rewards: UserRewardsByAssetResponse;
};

export type AccountSnapshotItem = {
  vaultId: string;
  vaultName: string;
  vaultAddress: Address;
  chainId: SupportedChainId;
  assetSymbol: string;
  snapshots: UserSnapshot[];
};

export type AccountInsights = {
  history: AccountHistoryItem[];
  pendingRedeems: AccountPendingRedeemItem[];
  performance: AccountPerformanceItem[];
  rewards: AccountRewardsItem[];
  snapshots: AccountSnapshotItem[];
};

export type VaultDetailData = {
  snapshot?: VaultSnapshot;
  yieldHistory: TimeseriesPoint[];
  tvlHistory: TimeseriesPoint[];
  sharePriceHistory: SharePriceHistoryPoint[];
  allocations: DailyAllocationSnapshot[];
  percentile?: VaultPercentile;
  performance?: VaultPerformance;
  benchmark?: PerformanceBenchmark;
  pendingRedeems?: FormattedValue;
  history: VaultHistoryResponse["items"];
};

export type VaultExecutionStatus = {
  paused: boolean;
  idleBalance?: bigint;
};

function hasPositiveFormattedValue(value?: FormattedValue) {
  if (!value) {
    return false;
  }

  return Number(value.raw) > 0 || value.formatted !== "0";
}

export function useVaultCatalog() {
  return useQuery<VaultStatsItem[]>({
    queryKey: ["yo", "vault-catalog"],
    queryFn: () => catalogClient.getVaults(),
    staleTime: 60_000,
  });
}

export function usePriceMap() {
  return useQuery<PriceMap>({
    queryKey: ["yo", "prices"],
    queryFn: () => catalogClient.getPrices(),
    staleTime: 60_000,
  });
}

export function useVaultActivity(limit = 6) {
  return useQuery<GlobalVaultHistoryResponse>({
    queryKey: ["yo", "vault-activity", limit],
    queryFn: () => catalogClient.getGlobalVaultHistory({ limit }),
    staleTime: 30_000,
  });
}

export function usePortfolioPositions(account?: Address, vaults?: VaultStatsItem[]) {
  return useQuery<UserPositionWithVault[]>({
    queryKey: ["yo", "portfolio-positions", account],
    queryFn: async () => {
      if (!account) {
        return [];
      }

      const positions = await catalogClient.getUserPositionsAllChains(account, vaults);
      return positions as UserPositionWithVault[];
    },
    enabled: Boolean(account),
    staleTime: 30_000,
  });
}

export function useWalletBalances(account?: Address) {
  return useQuery<UserBalances>({
    queryKey: ["yo", "wallet-balances", account],
    queryFn: () => {
      if (!account) {
        throw new Error("Wallet is not connected");
      }

      return catalogClient.getUserBalances(account);
    },
    enabled: Boolean(account),
    staleTime: 30_000,
  });
}

export function useChainTokenBalance(chainId: SupportedChainId, token?: Address, account?: Address) {
  return useQuery<TokenBalance>({
    queryKey: ["yo", "token-balance", chainId, token, account],
    queryFn: () => {
      if (!token || !account) {
        throw new Error("Missing token or wallet address");
      }

      return getYoClient(chainId).getTokenBalance(token, account);
    },
    enabled: Boolean(token && account),
    staleTime: 15_000,
  });
}

export function useDepositPreview(
  chainId: SupportedChainId,
  vaultAddress?: Address,
  assets?: bigint,
) {
  return useQuery<bigint>({
    queryKey: ["yo", "deposit-preview", chainId, vaultAddress, assets?.toString()],
    queryFn: () => {
      if (!vaultAddress || assets === undefined) {
        throw new Error("Missing vault or amount");
      }

      return getYoClient(chainId).quotePreviewDeposit(vaultAddress, assets);
    },
    enabled: Boolean(vaultAddress && assets !== undefined && assets > 0n),
    staleTime: 10_000,
  });
}

export function useWithdrawQuote(
  chainId: SupportedChainId,
  vaultAddress?: Address,
  assets?: bigint,
) {
  return useQuery<bigint>({
    queryKey: ["yo", "withdraw-quote", chainId, vaultAddress, assets?.toString()],
    queryFn: () => {
      if (!vaultAddress || assets === undefined) {
        throw new Error("Missing vault or amount");
      }

      return getYoClient(chainId).quotePreviewWithdraw(vaultAddress, assets);
    },
    enabled: Boolean(vaultAddress && assets !== undefined && assets > 0n),
    staleTime: 10_000,
  });
}

export function useAccountInsights(account?: Address, positions?: UserPositionWithVault[]) {
  return useQuery<AccountInsights>({
    queryKey: [
      "yo",
      "account-insights",
      account,
      positions?.map((item) => `${item.vault.chain.id}:${item.vault.contracts.vaultAddress}`).join("|"),
    ],
    queryFn: async () => {
      if (!account || !positions?.length) {
        return {
          history: [],
          pendingRedeems: [],
          performance: [],
          rewards: [],
          snapshots: [],
        };
      }

      const uniquePositions = Array.from(
        new Map(
          positions.map((item) => [`${item.vault.chain.id}:${item.vault.contracts.vaultAddress.toLowerCase()}`, item]),
        ).values(),
      );

      const results = await Promise.all(
        uniquePositions.map(async (item) => {
          const chainId = item.vault.chain.id as SupportedChainId;
          const vaultAddress = item.vault.contracts.vaultAddress as Address;
          const client = getYoClient(chainId);

          const [history, pending, performance, rewards, snapshots] = await Promise.all([
            client.getUserHistory(vaultAddress, account, 6).catch(() => [] as UserHistoryItem[]),
            client.getPendingRedemptions(vaultAddress, account).catch(() => undefined),
            client.getUserPerformance(vaultAddress, account).catch(() => undefined),
            client.getUserRewardsByAsset(account, item.vault.asset.address).catch(() => undefined),
            client.getUserSnapshots(vaultAddress, account).catch(() => [] as UserSnapshot[]),
          ]);

          return {
            item,
            history,
            pending,
            performance,
            rewards,
            snapshots,
          };
        }),
      );

      const history = results
        .flatMap(({ item, history: historyItems }) =>
          historyItems.map((historyItem) => ({
            ...historyItem,
            vaultId: item.vault.id,
            vaultName: item.vault.name,
            vaultAddress: item.vault.contracts.vaultAddress as Address,
            chainId: item.vault.chain.id as SupportedChainId,
            assetSymbol: item.vault.asset.symbol,
            shareSymbol: item.vault.shareAsset.symbol,
          })),
        )
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

      const pendingRedeems = results
        .filter(
          (result): result is typeof result & { pending: PendingRedeem } =>
            Boolean(
              result.pending &&
                (hasPositiveFormattedValue(result.pending.assets) || hasPositiveFormattedValue(result.pending.shares)),
            ),
        )
        .map(({ item, pending }) => ({
          vaultId: item.vault.id,
          vaultName: item.vault.name,
          vaultAddress: item.vault.contracts.vaultAddress as Address,
          chainId: item.vault.chain.id as SupportedChainId,
          assetSymbol: item.vault.asset.symbol,
          shareSymbol: item.vault.shareAsset.symbol,
          pending,
        }));

      const performance = results
        .filter(
          (result): result is typeof result & { performance: UserPerformance } => Boolean(result.performance),
        )
        .map(({ item, performance: performanceItem }) => ({
          vaultId: item.vault.id,
          vaultName: item.vault.name,
          vaultAddress: item.vault.contracts.vaultAddress as Address,
          chainId: item.vault.chain.id as SupportedChainId,
          assetSymbol: item.vault.asset.symbol,
          performance: performanceItem,
        }));

      const rewards = results
        .filter(
          (result): result is typeof result & { rewards: UserRewardsByAssetResponse } => Boolean(result.rewards),
        )
        .map(({ item, rewards: rewardsItem }) => ({
          vaultId: item.vault.id,
          vaultName: item.vault.name,
          vaultAddress: item.vault.contracts.vaultAddress as Address,
          chainId: item.vault.chain.id as SupportedChainId,
          assetSymbol: item.vault.asset.symbol,
          rewards: rewardsItem,
        }));

      const snapshots = results
        .filter((result): result is typeof result & { snapshots: UserSnapshot[] } => result.snapshots.length > 0)
        .map(({ item, snapshots: snapshotItems }) => ({
          vaultId: item.vault.id,
          vaultName: item.vault.name,
          vaultAddress: item.vault.contracts.vaultAddress as Address,
          chainId: item.vault.chain.id as SupportedChainId,
          assetSymbol: item.vault.asset.symbol,
          snapshots: snapshotItems,
        }));

      return {
        history,
        pendingRedeems,
        performance,
        rewards,
        snapshots,
      };
    },
    enabled: Boolean(account && positions?.length),
    staleTime: 30_000,
  });
}

export function useVaultDetail(chainId: SupportedChainId, vaultAddress?: Address) {
  return useQuery<VaultDetailData>({
    queryKey: ["yo", "vault-detail", chainId, vaultAddress],
    queryFn: async () => {
      if (!vaultAddress) {
        throw new Error("Missing vault address");
      }

      const client = getYoClient(chainId);

      const [
        snapshot,
        yieldHistory,
        tvlHistory,
        sharePriceHistory,
        allocations,
        percentile,
        performance,
        benchmark,
        pendingRedeems,
        history,
      ] = await Promise.all([
        client.getVaultSnapshot(vaultAddress).catch(() => undefined),
        client.getVaultYieldHistory(vaultAddress).catch(() => [] as TimeseriesPoint[]),
        client.getVaultTvlHistory(vaultAddress).catch(() => [] as TimeseriesPoint[]),
        client.getSharePriceHistory(vaultAddress).catch(() => [] as SharePriceHistoryPoint[]),
        client.getVaultAllocationsTimeSeries(vaultAddress).catch(() => [] as DailyAllocationSnapshot[]),
        client.getVaultPercentile(vaultAddress).catch(() => undefined),
        client.getVaultPerformance(vaultAddress).catch(() => undefined),
        client.getPerformanceBenchmark(vaultAddress).catch(() => undefined),
        client.getVaultPendingRedeems(vaultAddress).catch(() => undefined),
        client.getVaultHistory(vaultAddress, 12).catch(() => ({ items: [], nextCursor: null }) as VaultHistoryResponse),
      ]);

      return {
        snapshot,
        yieldHistory,
        tvlHistory,
        sharePriceHistory,
        allocations,
        percentile,
        performance,
        benchmark,
        pendingRedeems,
        history: history.items,
      };
    },
    enabled: Boolean(vaultAddress),
    staleTime: 30_000,
  });
}

export function useVaultExecutionStatus(chainId: SupportedChainId, vaultAddress?: Address) {
  return useQuery<VaultExecutionStatus>({
    queryKey: ["yo", "vault-execution-status", chainId, vaultAddress],
    queryFn: async () => {
      if (!vaultAddress) {
        throw new Error("Missing vault address");
      }

      const client = getYoClient(chainId);
      const [paused, idleBalance] = await Promise.all([
        client.isPaused(vaultAddress).catch(() => false),
        client.getIdleBalance(vaultAddress).catch(() => undefined),
      ]);

      return {
        paused,
        idleBalance,
      };
    },
    enabled: Boolean(vaultAddress),
    staleTime: 15_000,
  });
}

export function useProtocolTvlHistory() {
  return useQuery<TimeseriesPoint[]>({
    queryKey: ["yo", "protocol-tvl-history"],
    queryFn: async () => {
      const points = await catalogClient.getTotalTvlTimeseries();
      return points.map((point) => ({
        timestamp: point.timestamp,
        value: Number(point.tvlUsd),
      }));
    },
    staleTime: 60_000,
  });
}
