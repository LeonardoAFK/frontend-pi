"use client";

import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [message, setMessage] = useState("Cargando...");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getMe()
      .then((data) => {
        setMessage(
          data.message ??
            data.userName ??
            data.email ??
            "Usuario autenticado"
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar");
      });
  }, []);

  return (
    <section className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Perfil</h1>

      {error ? (
        <p className="text-sm font-medium text-red-600">{error}</p>
      ) : (
        <p className="text-sm text-slate-700">{message}</p>
      )}
    </section>
  );
}