import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#b9ffdf]/35 bg-[radial-gradient(circle_at_top,#b9ffdf_0%,#5dc89c_45%,#0f2f24_100%)] text-sm font-semibold text-slate-950 shadow-glow">
        VQ
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-lg tracking-wide text-white">VaultQuest</span>
        <span className="block truncate text-xs uppercase tracking-[0.24em] text-[#94cdb7]">
          YO vault workspace
        </span>
      </span>
    </Link>
  );
}
