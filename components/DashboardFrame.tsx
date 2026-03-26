"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = { href: string; label: string; icon: React.ReactNode };

function IconOverview() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 13.5a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-4.5z" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v15.128A9.757 9.757 0 0118 15.75c0-1.027-.23-2.002-.64-2.873-.408-.868-1.022-1.65-1.8-2.29V6.75z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042a8.967 8.967 0 004-2.292v15.128a9.757 9.757 0 00-4-1.096V6.042z" />
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  );
}
function IconReview() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}
function navForRole(role: string): { title: string; items: NavItem[]; badge: string } {
  const r = role.toUpperCase();
  if (r === "TUTOR") {
    return {
      title: "Tutor workspace",
      badge: "Tutor",
      items: [
        { href: "/dashboard/tutor", label: "Overview", icon: <IconOverview /> },
        { href: "/dashboard/tutor/messages", label: "Messages", icon: <IconChat /> },
        { href: "/dashboard/tutor/courses", label: "My courses", icon: <IconBook /> },
        { href: "/dashboard/tutor/assignments", label: "Assignments", icon: <IconClipboard /> },
        {
          href: "/dashboard/tutor/assignments/review-assignments",
          label: "Review work",
          icon: <IconReview />,
        },
        { href: "/dashboard/tutor/submissions", label: "Submissions", icon: <IconClipboard /> },
      ],
    };
  }
  if (r === "ADMIN") {
    return {
      title: "Administration",
      badge: "Admin",
      items: [
        { href: "/dashboard/admin", label: "Overview", icon: <IconOverview /> },
        { href: "/dashboard/admin/messages", label: "Messages", icon: <IconChat /> },
        { href: "/courses", label: "Course catalog", icon: <IconBook /> },
      ],
    };
  }
  return {
    title: "Learning hub",
    badge: "Student",
    items: [
      { href: "/dashboard/student", label: "Overview", icon: <IconOverview /> },
      { href: "/dashboard/student/messages", label: "Messages", icon: <IconChat /> },
      { href: "/courses", label: "Browse courses", icon: <IconBook /> },
      { href: "/dashboard/student/assignments", label: "My assignments", icon: <IconClipboard /> },
    ],
  };
}

export default function DashboardFrame({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { title, items, badge } = navForRole(role);

  /** Pick the most specific nav href that matches the current path (avoids parent + child both “active”). */
  const activeHref = (() => {
    if (pathname === "/courses" || pathname.startsWith("/courses/")) {
      const courseLink = items.find((i) => i.href === "/courses");
      if (courseLink) return "/courses";
    }
    const sorted = [...items].sort((a, b) => b.href.length - a.href.length);
    const hit = sorted.find(
      (i) => i.href !== "/courses" && (pathname === i.href || pathname.startsWith(`${i.href}/`))
    );
    return hit?.href ?? null;
  })();

  const linkClass = (href: string) => {
    const active = href === activeHref;
    const base =
      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors";
    if (active) {
      return `${base} bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80 shadow-sm`;
    }
    return `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="mx-auto flex max-w-[1600px]">
        {/* Mobile bar — below main Navbar */}
        <div className="fixed inset-x-0 top-14 z-40 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
        </div>

        {/* Sidebar */}
        <aside
          className={`
            fixed left-0 top-[7.25rem] z-30 h-[calc(100vh-7.25rem)] w-72 overflow-y-auto border-r border-slate-200/80 bg-white/95 backdrop-blur-sm transition-transform lg:static lg:top-auto lg:h-auto lg:min-h-[calc(100vh-4rem)] lg:translate-x-0 lg:bg-white/80
            ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="flex h-full flex-col px-4 pb-8 pt-4 lg:pt-8">
            <div className="mb-6 hidden px-2 lg:block">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {title}
              </p>
            </div>

            <span className="mb-4 inline-flex w-fit items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {badge}
            </span>

            <p className="mb-6 max-w-[18rem] text-xs leading-relaxed text-slate-500">
              Structured courses, tutoring support, and progress in one place.
            </p>

            <nav className="flex flex-1 flex-col gap-1" aria-label="Dashboard">
              {items.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={linkClass(item.href)}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main */}
        <main className="min-h-[calc(100vh-4rem)] flex-1 px-4 pb-12 pt-[8.5rem] lg:px-10 lg:pb-12 lg:pl-8 lg:pr-10 lg:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}
