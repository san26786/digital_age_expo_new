/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Ticket,
  User,
  Shield,
  LogIn,
} from "lucide-react";

import { MenuItem } from "@/lib/services/menu";
import { LogoutButton } from "@/components/member/LogoutButton";

interface NavbarProps {
  menu: MenuItem[];
  domainName: string;
  session: any;
  /**
   * The announcement bar's event line, resolved from the database by Header.
   *
   * Previously the bar hardcoded "DAE 2026" and "London Grand Center • October 12-14, 2026",
   * which contradicted the event every other part of the site rendered from find_events
   * ("26 to 28 August 2026, Online Virtual Event"). A visitor saw two different shows in the
   * same viewport. Null when no event resolves — the bar then renders without the event line
   * rather than asserting something untrue.
   */
  eventBar?: { badge: string; detail: string } | null;
}

/* =====================================================
   DESKTOP NAV ITEM (shared by visible row, hidden
   measuring row, and the "More" overflow dropdown so
   widths/markup always match)
===================================================== */
type NavEntry = Pick<MenuItem, "id" | "title" | "link" | "target"> & {
  children?: MenuItem["children"];
};

function NavItemLink({
  item,
  active,
  onEnter,
  onLeave,
  align,
}: {
  item: NavEntry;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
  align: "left" | "right";
}) {
  const hasChildren = !!item.children && item.children.length > 0;

  return (
    <div
      className="group relative"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <Link
        href={item.link}
        target={item.target !== "_self" ? item.target : undefined}
        className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-white/5 hover:text-pink-500 xl:px-3 xl:text-sm"
      >
        <span>{item.title}</span>

        {hasChildren && (
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${
              active ? "rotate-180" : "group-hover:rotate-180"
            }`}
          />
        )}
      </Link>

      {hasChildren && (
        <div
          className={`absolute top-full mt-2 w-64 origin-top rounded-2xl border border-white/10 bg-surface-2 p-3 shadow-2xl transition-all duration-300 ${
            align === "right" ? "right-0" : "left-0"
          } ${
            active
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-95 opacity-0 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100"
          }`}
        >
          <div className="mb-2 border-b border-white/5 px-2.5 pb-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              {item.title} Options
            </span>
          </div>

          <div className="grid gap-1">
            {item.children!.map((child) => (
              <Link
                key={child.id}
                href={child.link}
                target={child.target !== "_self" ? child.target : undefined}
                className="group/link flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 transition-all duration-200 hover:bg-white/5 hover:text-white"
              >
                <span>{child.title}</span>
                <ChevronRight className="h-3.5 w-3.5 translate-x-[-4px] text-pink-500 opacity-0 transition-all duration-200 group-hover/link:translate-x-0 group-hover/link:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const MORE_ID = "__more__";
const GAP_PX = 6; // matches the row's gap-1.5, kept as a safety buffer per item

function DesktopNav({
  menu,
  activeDropdown,
  setActiveDropdown,
}: {
  menu: MenuItem[];
  activeDropdown: number | string | null;
  setActiveDropdown: (v: number | string | null) => void;
}) {
  const navItems: NavEntry[] = useMemo(
    () => [{ id: -1, title: "Home", link: "/", target: "_self", children: [] }, ...menu],
    [menu]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(navItems.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const recalc = () => {
      const available = container.offsetWidth;
      const children = Array.from(measure.children) as HTMLElement[];
      const moreEl = children[children.length - 1];
      const itemEls = children.slice(0, navItems.length);
      const moreWidth = moreEl ? moreEl.offsetWidth + GAP_PX : 0;

      let total = 0;
      let count = navItems.length;

      for (let i = 0; i < itemEls.length; i++) {
        total += itemEls[i].offsetWidth + GAP_PX;
        const isLast = i === itemEls.length - 1;
        const budget = isLast ? available : available - moreWidth;

        if (total > budget) {
          count = i;
          break;
        }
      }

      setVisibleCount(Math.max(count, 0));
    };

    recalc();

    const ro = new ResizeObserver(recalc);
    ro.observe(container);
    return () => ro.disconnect();
  }, [navItems]);

  const visibleItems = navItems.slice(0, visibleCount);
  const overflowItems = navItems.slice(visibleCount);

  return (
    <nav
      ref={containerRef}
      className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 overflow-x-clip overflow-y-visible lg:flex xl:gap-1.5"
    >
      {/* VISIBLE ITEMS */}
      {visibleItems.map((item, index) => (
        <NavItemLink
          key={item.id}
          item={item}
          active={activeDropdown === item.id}
          onEnter={() =>
            item.children && item.children.length > 0 && setActiveDropdown(item.id)
          }
          onLeave={() => setActiveDropdown(null)}
          align={index >= visibleItems.length - 2 ? "right" : "left"}
        />
      ))}

      {/* MORE (overflow) BUTTON */}
      {overflowItems.length > 0 && (
        <div
          className="group relative shrink-0"
          onMouseEnter={() => setActiveDropdown(MORE_ID)}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <button
            type="button"
            onClick={() =>
              setActiveDropdown(activeDropdown === MORE_ID ? null : MORE_ID)
            }
            className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-white/5 hover:text-pink-500 xl:px-3 xl:text-sm"
            aria-label="More menu items"
          >
            <Menu className="h-3.5 w-3.5 shrink-0" />
            <span>More</span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${
                activeDropdown === MORE_ID ? "rotate-180" : "group-hover:rotate-180"
              }`}
            />
          </button>

          <div
            className={`absolute right-0 top-full mt-2 w-72 origin-top rounded-2xl border border-white/10 bg-surface-2 p-3 shadow-2xl transition-all duration-300 ${
              activeDropdown === MORE_ID
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-95 opacity-0 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100"
            }`}
          >
            <div className="mb-2 border-b border-white/5 px-2.5 pb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                More
              </span>
            </div>

            <div className="grid max-h-[70vh] gap-1 overflow-y-auto">
              {overflowItems.map((item) => {
                const hasChildren = !!item.children && item.children.length > 0;
                return (
                  <div key={item.id}>
                    <Link
                      href={item.link}
                      target={item.target !== "_self" ? item.target : undefined}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-300 transition-all hover:bg-white/5 hover:text-white"
                    >
                      <span>{item.title}</span>
                      {!hasChildren && (
                        <ChevronRight className="h-3.5 w-3.5 text-pink-500 opacity-0 transition-opacity group-hover/link:opacity-100" />
                      )}
                    </Link>

                    {hasChildren && (
                      <div className="ml-2 grid gap-1 border-l border-white/5 py-1 pl-3">
                        {item.children!.map((child) => (
                          <Link
                            key={child.id}
                            href={child.link}
                            target={child.target !== "_self" ? child.target : undefined}
                            className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-400 transition-all hover:bg-white/5 hover:text-white"
                          >
                            <span>{child.title}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN MEASURING ROW — exact same items, used only to read natural
          widths so we know how many fit before flipping to the More menu.
          Never visible, never interactive. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 flex items-center gap-1.5 xl:gap-1.5"
        style={{ visibility: "hidden", position: "absolute", whiteSpace: "nowrap", zIndex: -1 }}
      >
        {navItems.map((item) => {
          const hasChildren = !!item.children && item.children.length > 0;
          return (
            <div
              key={`measure-${item.id}`}
              className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold xl:px-3 xl:text-sm"
            >
              <span>{item.title}</span>
              {hasChildren && <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
            </div>
          );
        })}
        <div className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold xl:px-3 xl:text-sm">
          <Menu className="h-3.5 w-3.5 shrink-0" />
          <span>More</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </div>
      </div>
    </nav>
  );
}

export function Navbar({
  menu,
  domainName,
  session,
  eventBar = null,
}: NavbarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openMobileSubmenu, setOpenMobileSubmenu] =
    useState<number | null>(null);

  const [activeDropdown, setActiveDropdown] =
    useState<number | string | null>(null);

  const toggleMobileSubmenu = (id: number) => {
    setOpenMobileSubmenu(
      openMobileSubmenu === id ? null : id
    );
  };

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-surface-1/90 backdrop-blur-xl">

      {/* =====================================================
          TOP ANNOUNCEMENT / ROLE BAR
      ===================================================== */}
      <div className="flex min-h-10 w-full items-center justify-between gap-3 bg-gradient-to-r from-brand-purple to-brand-pink px-4 py-2 text-xs font-medium text-white sm:px-6 lg:px-8">

        {/* Left Side */}
        <div className="flex min-w-0 items-center gap-2">
          {eventBar && (
            <>
              <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider">
                {eventBar.badge}
              </span>

              <span className="hidden truncate text-[11px] sm:inline">{eventBar.detail}</span>
            </>
          )}
        </div>

        {/* Right Side */}
        <div className="flex shrink-0 items-center gap-3 sm:gap-5">

          {/* Role Access */}
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white transition-all hover:scale-105 hover:bg-white/20 sm:flex"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>
              Portal Access
              {session?.user?.role
                ? ` (${session.user.role})`
                : ""}
            </span>
          </button>

          {/* Login / User */}
          {session ? (
            <span className="hidden text-[11px] text-white/90 md:inline">
              Welcome,{" "}
              <strong>
                {session.user?.name ||
                  session.user?.login ||
                  "User"}
              </strong>
            </span>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-[11px] font-semibold text-white transition-colors hover:text-pink-200"
            >
              <LogIn className="h-3 w-3" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>

      {/* =====================================================
          MAIN NAVBAR
      ===================================================== */}
      {/* Bar height grows with the logo (was h-16 / 64px) so the mark keeps ~8-16px of
          breathing room above and below rather than touching the bar edges. */}
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">

        {/* =================================================
            LOGO
        ================================================= */}
        <Link
          href="/"
          className="group mr-2 flex shrink-0 items-center"
          aria-label={domainName}
        >
          {/*
            width/height are the ASPECT RATIO hint Next.js uses to reserve layout space —
            they were 180x42 (4.29:1) while digitalageexpo_logo.png is actually 2172x724
            (3:1), so the reserved box was the wrong shape and the row shifted once the
            image decoded. 576x192 is the same 3:1 and ~3x the largest rendered width.
          */}
          <Image
            src="/images/digitalageexpo_logo.png"
            alt={domainName}
            width={576}
            height={192}
            priority
            className="h-12 w-auto brightness-110 transition-transform duration-300 group-hover:scale-105 sm:h-14 xl:h-16"
          />
        </Link>

        {/* =================================================
            DESKTOP NAVIGATION (auto-collapsing "More" overflow)
        ================================================= */}
        <DesktopNav
          menu={menu}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
        />

        {/* =================================================
            RIGHT ACTION AREA
        ================================================= */}
        <div className="flex shrink-0 items-center gap-2 xl:gap-3">

          {/* SESSION ACCOUNT */}
          {session && (
            <div
              className="group relative hidden sm:block"
              onMouseEnter={() =>
                setActiveDropdown("account")
              }
              onMouseLeave={() =>
                setActiveDropdown(null)
              }
            >
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-white/10 hover:text-pink-500"
              >
                <User className="h-3.5 w-3.5" />

                <span className="max-w-[100px] truncate">
                  {session.user?.name ||
                    session.user?.login ||
                    "Account"}
                </span>

                <ChevronDown
                  className={`h-3 w-3 transition-transform ${
                    activeDropdown === "account"
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </button>

              <div
                className={`absolute right-0 top-full mt-2 w-60 origin-top rounded-2xl border border-white/10 bg-surface-2 p-3 shadow-2xl transition-all duration-300 ${
                  activeDropdown === "account"
                    ? "pointer-events-auto scale-100 opacity-100"
                    : "pointer-events-none scale-95 opacity-0 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100"
                }`}
              >
                <div className="mb-2 border-b border-white/5 px-2.5 pb-2">
                  <span className="block text-[10px] uppercase tracking-widest text-zinc-500">
                    My Account
                  </span>

                  <span className="mt-1 block truncate text-xs font-semibold text-white">
                    {session.user?.name ||
                      session.user?.login}
                  </span>
                </div>

                <Link
                  href="/members/user_event_summary"
                  className="group/link flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 hover:text-white"
                >
                  Dashboard
                  <ChevronRight className="h-3.5 w-3.5 text-pink-500 opacity-0 group-hover/link:opacity-100" />
                </Link>

                <Link
                  href="/account_onboarding"
                  className="group/link flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/5 hover:text-white"
                >
                  Account Onboarding
                  <ChevronRight className="h-3.5 w-3.5 text-pink-500 opacity-0 group-hover/link:opacity-100" />
                </Link>


                <div className="mt-2 border-t border-white/5 pt-2">
                  <LogoutButton className="block w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-zinc-300 transition hover:bg-red-500/10 hover:text-red-400" />
                </div>
              </div>
            </div>
          )}

        
          {/* MOBILE MENU BUTTON */}
          <button
            type="button"
            onClick={() =>
              setDrawerOpen(!drawerOpen)
            }
            className="rounded-xl bg-zinc-900 p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white lg:hidden"
            aria-label="Toggle menu"
          >
            {drawerOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* =====================================================
          MOBILE SIDE DRAWER
      ===================================================== */}
    </header>

    {/* Rendered as a sibling of <header>, not a descendant — <header> has
        backdrop-blur-xl, and backdrop-filter creates a new containing block for
        position:fixed descendants, which was pinning this drawer (and its backdrop)
        to the header's own small box instead of the viewport. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] flex lg:hidden">

          {/* BACKDROP */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() =>
              setDrawerOpen(false)
            }
          />

          {/* DRAWER */}
          <div className="relative ml-auto flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-white/10 bg-surface-1 p-6 shadow-2xl">

            {/* DRAWER HEADER */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <Link
                href="/"
                onClick={() =>
                  setDrawerOpen(false)
                }
              >
                {/* logo.png is 600x141 (4.255:1) — declared at its intrinsic size. */}
                <Image
                  src="/images/logo.png"
                  alt={domainName}
                  width={600}
                  height={141}
                  className="h-11 w-auto brightness-110"
                />
              </Link>

              <button
                type="button"
                onClick={() =>
                  setDrawerOpen(false)
                }
                className="rounded-xl bg-zinc-900 p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-2 gap-2 border-b border-zinc-900 py-4">

              <Link
                href="/"
                onClick={() =>
                  setDrawerOpen(false)
                }
                className="rounded-xl bg-zinc-900 px-3 py-2.5 text-center text-xs font-bold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              >
                Home
              </Link>

              <Link
                href="/free-ticket"
                onClick={() =>
                  setDrawerOpen(false)
                }
                className="rounded-xl bg-gradient-to-r from-brand-purple to-brand-pink px-3 py-2.5 text-center text-xs font-bold text-white"
              >
                Claim Ticket
              </Link>

              <Link
                href="/login"
                onClick={() =>
                  setDrawerOpen(false)
                }
                className="rounded-xl bg-zinc-900 px-3 py-2.5 text-center text-xs font-bold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              >
                Login
              </Link>

              {session && (
                <Link
                  href="/dashboard"
                  onClick={() =>
                    setDrawerOpen(false)
                  }
                  className="rounded-xl bg-zinc-900 px-3 py-2.5 text-center text-xs font-bold text-pink-400 transition hover:bg-zinc-800 hover:text-white"
                >
                  Dashboard
                </Link>
              )}
            </div>

            {/* MOBILE MENU */}
            <div className="mt-4 flex-1 space-y-1">

              {/* LOGIN PORTALS */}
              <div className="border-b border-zinc-900 py-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveDropdown(
                      activeDropdown ===
                        "mobile-login"
                        ? null
                        : "mobile-login"
                    )
                  }
                  className="flex w-full items-center justify-between py-2"
                >
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    Login Portals
                  </span>

                  <ChevronDown
                    className={`h-4 w-4 text-zinc-400 transition-transform ${
                      activeDropdown ===
                      "mobile-login"
                        ? "rotate-180 text-pink-500"
                        : ""
                    }`}
                  />
                </button>

                {activeDropdown ===
                  "mobile-login" && (
                  <div className="mt-1 grid gap-1 border-l border-zinc-800/60 pl-3">

                    <Link
                      href="/login?role=speaker"
                      onClick={() =>
                        setDrawerOpen(false)
                      }
                      className="py-2 text-xs font-semibold uppercase text-zinc-400 hover:text-white"
                    >
                      Speaker Login
                    </Link>

                    <Link
                      href="/login?role=visitor"
                      onClick={() =>
                        setDrawerOpen(false)
                      }
                      className="py-2 text-xs font-semibold uppercase text-zinc-400 hover:text-white"
                    >
                      Visitor Login
                    </Link>

                    <Link
                      href="/login?role=exhibitor"
                      onClick={() =>
                        setDrawerOpen(false)
                      }
                      className="py-2 text-xs font-semibold uppercase text-zinc-400 hover:text-white"
                    >
                      Exhibitor Login
                    </Link>

                  </div>
                )}
              </div>

              {/* DYNAMIC MENU */}
              {menu.map((item) => {
                const hasChildren =
                  !!item.children &&
                  item.children.length > 0;

                const isOpen =
                  openMobileSubmenu === item.id;

                return (
                  <div
                    key={item.id}
                    className="border-b border-zinc-900 py-2 last:border-0"
                  >
                    <div className="flex items-center justify-between">

                      <Link
                        href={item.link}
                        target={
                          item.target !== "_self"
                            ? item.target
                            : undefined
                        }
                        onClick={() =>
                          !hasChildren &&
                          setDrawerOpen(false)
                        }
                        className="py-2 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:text-pink-500"
                      >
                        {item.title}
                      </Link>

                      {hasChildren && (
                        <button
                          type="button"
                          onClick={() =>
                            toggleMobileSubmenu(
                              item.id
                            )
                          }
                          className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-pink-500"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              isOpen
                                ? "rotate-180"
                                : ""
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {hasChildren && isOpen && (
                      <div className="ml-2 space-y-1 border-l border-pink-500/20 py-1 pl-3">

                        {item.children.map(
                          (child) => (
                            <Link
                              key={child.id}
                              href={child.link}
                              target={
                                child.target !==
                                "_self"
                                  ? child.target
                                  : undefined
                              }
                              onClick={() =>
                                setDrawerOpen(
                                  false
                                )
                              }
                              className="group flex items-center justify-between py-2 text-xs font-semibold text-zinc-400 transition-colors hover:text-pink-500"
                            >
                              <span>
                                {child.title}
                              </span>

                              <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                            </Link>
                          )
                        )}

                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* MOBILE ACCOUNT AREA */}
            <div className="mt-6 border-t border-white/10 pt-4">

              {session ? (
                <div className="space-y-2">

                  <div className="mb-3 flex items-center gap-2">
                    <div className="rounded-full bg-pink-500/10 p-2 text-pink-400">
                      <User className="h-4 w-4" />
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                        Signed in as
                      </div>

                      <div className="text-xs font-semibold text-white">
                        {session.user?.name ||
                          session.user?.login}
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/dashboard"
                    onClick={() =>
                      setDrawerOpen(false)
                    }
                    className="block rounded-xl border border-white/5 bg-zinc-900 px-3 py-3 text-xs font-semibold text-white transition hover:bg-zinc-800"
                  >
                    Dashboard
                  </Link>

                  <Link
                    href="/account_onboarding"
                    onClick={() =>
                      setDrawerOpen(false)
                    }
                    className="block rounded-xl border border-white/5 bg-zinc-900 px-3 py-3 text-xs font-semibold text-white transition hover:bg-zinc-800"
                  >
                    Account Onboarding
                  </Link>

                  <LogoutButton className="w-full rounded-xl border border-white/5 bg-zinc-900 px-3 py-3 text-left text-xs font-semibold text-red-400 transition hover:bg-red-500/10" />

                </div>
              ) : (
                <div className="flex gap-2">

                  <Link
                    href="/login"
                    onClick={() =>
                      setDrawerOpen(false)
                    }
                    className="flex-1 rounded-xl border border-white/10 px-3 py-3 text-center text-xs font-bold text-zinc-300 transition hover:bg-white/5 hover:text-white"
                  >
                    Login
                  </Link>

                  <Link
                    href="/register"
                    onClick={() =>
                      setDrawerOpen(false)
                    }
                    className="flex-1 rounded-xl bg-gradient-to-r from-brand-purple to-brand-pink px-3 py-3 text-center text-xs font-bold text-white"
                  >
                    Sign Up
                  </Link>

                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}