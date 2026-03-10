import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { AccountCenter } from "@/components/savings/account-center";

export default function AccountPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="page-shell page-stack">
        <AccountCenter />
      </main>
      <SiteFooter />
    </div>
  );
}
