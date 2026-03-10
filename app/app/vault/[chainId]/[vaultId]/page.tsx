import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { VaultDetailClient } from "@/components/savings/vault-detail-client";

export default async function VaultDetailPage({
  params,
}: {
  params: Promise<{ chainId: string; vaultId: string }>;
}) {
  const { chainId, vaultId } = await params;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="page-shell page-stack">
        <VaultDetailClient chainId={Number(chainId)} vaultId={vaultId} />
      </main>
      <SiteFooter />
    </div>
  );
}
