import { type SupportedChainId } from "@yo-protocol/core";
import { arbitrum, base, mainnet } from "wagmi/chains";

export const supportedChains = [base, mainnet, arbitrum] as const;
export const defaultAppChain = base;

export const chainMeta: Record<SupportedChainId, { label: string; shortLabel: string; blurb: string }> = {
  1: {
    label: "Ethereum",
    shortLabel: "ETH",
    blurb: "Deep liquidity and conservative vault access.",
  },
  8453: {
    label: "Base",
    shortLabel: "Base",
    blurb: "Fast consumer flows with lower gas.",
  },
  42161: {
    label: "Arbitrum",
    shortLabel: "ARB",
    blurb: "Supported for wallet routing and chain handling.",
  },
};

export const supportedChainIds = supportedChains.map((chain) => chain.id) as SupportedChainId[];

export function isSupportedAppChain(chainId?: number): chainId is SupportedChainId {
  return Boolean(chainId && supportedChainIds.includes(chainId as SupportedChainId));
}

export function getChainMeta(chainId?: number) {
  if (!chainId || !isSupportedAppChain(chainId)) {
    return {
      label: `Chain ${chainId ?? "unknown"}`,
      shortLabel: "Unknown",
      blurb: "Chain metadata is not mapped in the app layer yet.",
    };
  }

  return chainMeta[chainId];
}

export function getChainLabel(chainId?: number) {
  return getChainMeta(chainId).label;
}

export function getExplorerTxUrl(chainId: number | undefined, hash: string | undefined) {
  if (!hash || !chainId || !isSupportedAppChain(chainId)) {
    return undefined;
  }

  const chain = supportedChains.find((item) => item.id === chainId);
  return chain?.blockExplorers?.default.url
    ? `${chain.blockExplorers.default.url}/tx/${hash}`
    : undefined;
}
