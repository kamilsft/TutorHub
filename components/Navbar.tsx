"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

function isLoggedIn() {
  if (typeof document === "undefined") return false;
  const hasCookie = document.cookie.split(";").some((c) => c.trim().startsWith("authToken="));
  const hasLocal = typeof window !== "undefined" && !!window.localStorage.getItem("token");
  return hasCookie || hasLocal;
}

function getRoleFromToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    // base64url -> base64
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    const obj = JSON.parse(json);
    return (obj.role as string) || null;
  } catch {
    return null;
  }
}

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [dashboardHref, setDashboardHref] = useState<string>("/dashboard");
  const logoHref = loggedIn ? dashboardHref : "/";

  useEffect(() => {
    setLoggedIn(isLoggedIn());

    const updateRoleHref = () => {
      const role = getRoleFromToken();
      if (!role) {
        setDashboardHref("/dashboard");
        return;
      }
      const r = role.toLowerCase();
      if (r === "tutor") setDashboardHref("/dashboard/tutor");
      else if (r === "student") setDashboardHref("/dashboard/student");
      else if (r === "admin") setDashboardHref("/dashboard/admin");
      else setDashboardHref("/dashboard");
    };

    updateRoleHref();

    const onAuthChange = () => {
      setLoggedIn(isLoggedIn());
      updateRoleHref();
    };
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "token") {
        setLoggedIn(isLoggedIn());
        updateRoleHref();
      }
    };

    window.addEventListener("auth-change", onAuthChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("auth-change", onAuthChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function handleLogout() {
    // remove cookie
    document.cookie = "authToken=; path=/; max-age=0; SameSite=Lax";
    // remove localStorage token
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("token");
    }
    // notify listeners (so Navbar in same tab updates)
    window.dispatchEvent(new Event("auth-change"));
    // redirect to home
    if (typeof window !== "undefined") window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href={logoHref} className="flex items-center gap-2">
          <Image
            src="/tutorhub-logo.png"
            alt="TutorHub - Structured tutoring, one hub."
            width={160}
            height={52}
            className="h-9 w-auto sm:h-10"
            priority
          />
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {!loggedIn ? (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-500 transition-all"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              <Link
                href={dashboardHref}
                className="text-sm font-medium text-slate-700 hover:text-emerald-600 transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:text-emerald-600 transition"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
