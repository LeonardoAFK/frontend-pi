"use client";

import { clearToken, getToken } from "@/lib/api";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/map", label: "Mapa" },
  { href: "/events/create", label: "Crear evento" },
  { href: "/profile", label: "Perfil" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Navbar() {
  const [isLogged, setIsLogged] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsLogged(!!getToken());
  }, [pathname]);

  function logout() {
    clearToken();
    setIsLogged(false);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/map" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#4668A9] text-sm font-bold text-white shadow-md shadow-blue-900/20">
            EP
          </span>

          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-950 sm:text-base">
              Eventos en tu Entorno
            </p>
            <p className="hidden text-xs text-slate-500 sm:block">
              Descubre, crea e inscríbete en eventos
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 overflow-x-auto text-sm">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-2 font-medium transition ${
                  isActive
                    ? "bg-[#4668A9] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {!isLogged ? (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap rounded-full px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="whitespace-nowrap rounded-full px-3 py-2 font-medium text-black shadow-sm hover:bg-slate-800"
              >
                Registro
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={logout}
              className="whitespace-nowrap rounded-full bg-slate-950 px-3 py-2 font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Salir
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}