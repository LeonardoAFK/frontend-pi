"use client";

import { api, setToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    try {
      const response = await api.login(form);
      setToken(response.token);
      router.push("/map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Iniciar sesión</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400"
          type="email"
          placeholder="Correo"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400"
          type="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <button className="w-full rounded-md bg-blue-700 px-4 py-3 text-white hover:bg-blue-800">
          Entrar
        </button>
      </form>
    </section>
  );
}