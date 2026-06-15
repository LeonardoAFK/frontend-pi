"use client";

import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    try {
      await api.register(form);
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar");
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Registro</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400"
          type="text"
          placeholder="Nombre"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        />

        <input
          className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400"
          type="text"
          placeholder="Apellido"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
        />

        <input
          className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400"
          type="text"
          placeholder="Nombre de usuario"
          value={form.userName}
          onChange={(e) => setForm({ ...form, userName: e.target.value })}
        />

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

        <input
          className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400"
          type="password"
          placeholder="Confirmar contraseña"
          value={form.confirmPassword}
          onChange={(e) =>
            setForm({ ...form, confirmPassword: e.target.value })
          }
        />

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <button className="w-full rounded-md bg-blue-700 px-4 py-3 text-white hover:bg-blue-800">
          Crear cuenta
        </button>
      </form>
    </section>
  );
}