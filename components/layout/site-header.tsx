import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { WalletControls } from "@/components/wallet/wallet-controls";
import { Button } from "@/components/ui/button";

interface SiteHeaderProps {
  showDashboardLink?: boolean;
}

export function SiteHeader({ showDashboardLink = true }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#071713]/70 backdrop-blur-xl">
      <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-3 sm:flex-nowrap sm:gap-4 sm:py-4">
        <Logo />
        <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto sm:flex-nowrap">
          <div className="hidden items-center gap-2 md:flex">
            {showDashboardLink ? (
              <Link href="/app">
                <Button variant="ghost">Dashboard</Button>
              </Link>
            ) : null}
            <Link href="/app/account">
              <Button variant="ghost">Account</Button>
            </Link>
          </div>
          <WalletControls />
        </div>
      </div>
    </header>
  );
}
