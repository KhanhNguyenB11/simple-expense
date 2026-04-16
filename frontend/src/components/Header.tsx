"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

function Header() {
  const router = useRouter();
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentUser,
    retry: false,
  });

  const currentUser = meQuery.data;

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      qc.clear();
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/reports"
            className="text-lg font-bold tracking-tight text-foreground"
          >
            ExpenseTrack
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            {mounted ? (
              <>
                <p className="text-sm font-medium text-foreground">
                  {currentUser?.email ?? "Unknown user"}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {currentUser?.role ?? "user"}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">
                  Loading...
                </p>
                <p className="text-xs text-muted-foreground">user</p>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size={"sm"}
            onClick={logout}
            iconStart={<LogOut />}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}

export default Header;
