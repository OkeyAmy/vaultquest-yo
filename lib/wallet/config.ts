import { createConfig, http } from "wagmi";
import { injected } from "@wagmi/core";

import { supportedChains } from "@/lib/chains";
import { env } from "@/lib/env";

export const wagmiConfig = createConfig({
  ssr: true,
  chains: supportedChains,
  connectors: [injected({ shimDisconnect: true })],
  multiInjectedProviderDiscovery: true,
  transports: {
    1: http(env.rpcUrls.ethereum),
    8453: http(env.rpcUrls.base),
    42161: http(env.rpcUrls.arbitrum),
  },
});
