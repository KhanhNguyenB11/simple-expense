"use client";

import Header from "@/components/Header";
import { usePathname } from "next/navigation";

type AppShellProps = {
  children: React.ReactNode;
};

const HIDE_HEADER_PATHS = new Set(["/login"]);

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const shouldShowHeader = !HIDE_HEADER_PATHS.has(pathname);

  return (
    <>
      {shouldShowHeader ? <Header /> : null}
      {children}
    </>
  );
}
