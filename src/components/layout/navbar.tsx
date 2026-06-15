"use client";

import Link from "next/link";
import { clearToken, getToken } from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function Navbar() {
  const [isLogged, setIsLogged] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsLogged(!!getToken());
  }, []);

  function logout() {
    clearToken();
    setIsLogged(false);
    router.push("/login");
  }

  return (
  <header className="border-b border-slate-200 bg-white shadow-sm">
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
      <Link href="/map" className="text-lg font-bold text-slate-900">
        Eventos en tu Entorno
      </Link>

      <div className="flex items-center gap-4 text-sm text-slate-700">
        <Link href="/map" className="hover:text-slate-950">
          Mapa
        </Link>
        <Link href="/events/create" className="hover:text-slate-950">
          Crear evento
        </Link>
        <Link href="/profile" className="hover:text-slate-950">
          Perfil
        </Link>

        {!isLogged ? (
          <>
            <Link href="/login" className="hover:text-slate-950">
              Login
            </Link>
            <Link href="/register" className="hover:text-slate-950">
              Registro
            </Link>
          </>
        ) : (
          <button
            onClick={logout}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800"
          >
            Salir
          </button>
        )}
      </div>
    </nav>
  </header>
);
}