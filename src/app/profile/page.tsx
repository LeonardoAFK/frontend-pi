"use client";

import { api, clearToken, getToken } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

function cleanUserName(value?: string | null) {
  if (!value) return "";

  return value
    .replace("UserName=", "")
    .replace("Username=", "")
    .replace("userName=", "")
    .trim();
}

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) return "U";

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

type JwtPayload = Record<string, unknown>;

function decodeJwtPayload(token: string | null): JwtPayload | null {
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

function getStringClaim(payload: JwtPayload | null, keys: string[]) {
  if (!payload) return "";

  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function firstValue(...values: Array<string | null | undefined>) {
  return values.find((value) => value && value.trim())?.trim() || "";
}

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [token, setTokenState] = useState<string | null>(null);
  const [imageMessage, setImageMessage] = useState("");
  const [imageError, setImageError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setTokenState(getToken());
  }, []);

  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["profile", token],
    queryFn: () => api.getMe(),
    enabled: !!token,
    retry: false,
  });

  const tokenPayload = useMemo(() => decodeJwtPayload(token), [token]);

  const tokenUserName = useMemo(
    () =>
      getStringClaim(tokenPayload, [
        "unique_name",
        "userName",
        "UserName",
        "name",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      ]),
    [tokenPayload]
  );

  const tokenEmail = useMemo(
    () =>
      getStringClaim(tokenPayload, [
        "email",
        "Email",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      ]),
    [tokenPayload]
  );

  const tokenFirstName = useMemo(
    () =>
      getStringClaim(tokenPayload, [
        "firstName",
        "FirstName",
        "given_name",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
      ]),
    [tokenPayload]
  );

  const tokenLastName = useMemo(
    () =>
      getStringClaim(tokenPayload, [
        "lastName",
        "LastName",
        "family_name",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
      ]),
    [tokenPayload]
  );

  const firstName = firstValue(user?.firstName, tokenFirstName);
  const lastName = firstValue(user?.lastName, tokenLastName);
  const email = firstValue(user?.email, tokenEmail);

  const userName = firstValue(
    cleanUserName(user?.userName),
    cleanUserName(user?.message),
    cleanUserName(tokenUserName)
  );

  const displayName = useMemo(() => {
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    return fullName || userName || email || "Usuario";
  }, [firstName, lastName, userName, email]);

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => api.uploadProfileImage(file),
    onSuccess: async () => {
      setImageMessage("Imagen de perfil actualizada correctamente.");
      setImageError("");
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err) => {
      setImageMessage("");
      setImageError(
        err instanceof Error ? err.message : "No se pudo subir la imagen."
      );
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => api.changePassword(passwordForm),
    onSuccess: () => {
      setPasswordMessage("Contraseña actualizada correctamente.");
      setPasswordError("");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (err) => {
      setPasswordMessage("");
      setPasswordError(
        err instanceof Error ? err.message : "No se pudo cambiar la contraseña."
      );
    },
  });

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setImageMessage("");
    setImageError("");
    uploadImageMutation.mutate(file);
  }

  function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (!passwordForm.currentPassword) {
      setPasswordError("Ingresa tu contraseña actual.");
      return;
    }

    if (!passwordForm.newPassword) {
      setPasswordError("Ingresa la nueva contraseña.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    changePasswordMutation.mutate();
  }

  if (!token) {
    return (
      <section className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <h1 className="text-2xl font-bold">Perfil</h1>
          <p className="mt-2 text-sm">
            Debes iniciar sesión para ver tu perfil.
          </p>

          <Link
            href="/login"
            className="mt-4 inline-flex rounded-full bg-[#4668A9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#38578F]"
          >
            Ir al login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt="Imagen de perfil"
                className="h-20 w-20 rounded-3xl object-cover shadow-sm"
              />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[#4668A9] text-2xl font-bold text-white shadow-sm">
                {getInitials(displayName)}
              </div>
            )}

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#4668A9]">
                Mi cuenta
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-950">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Administra tu información y accesos dentro de la plataforma.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando perfil...
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error instanceof Error
            ? error.message
            : "No se pudo cargar la información del perfil."}
        </div>
      )}

      {!isLoading && !isError && (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Información del usuario
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Datos asociados a la sesión actual.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Usuario
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {userName || "Sin dato"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Correo
                  </p>
                  <p className="mt-1 break-words font-semibold text-slate-950">
                    {email || "Sin dato"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Accesos rápidos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Navega rápidamente por las secciones principales.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Link
                  href="/map"
                  className="rounded-2xl bg-[#EEF2F8] p-4 text-sm font-bold text-[#4668A9] transition hover:bg-blue-100"
                >
                  🗺️ Mapa
                </Link>

                <Link
                  href="/events/create"
                  className="rounded-2xl bg-[#EEF2F8] p-4 text-sm font-bold text-[#4668A9] transition hover:bg-blue-100"
                >
                  ➕ Crear evento
                </Link>

                <Link
                  href="/dashboard"
                  className="rounded-2xl bg-[#EEF2F8] p-4 text-sm font-bold text-[#4668A9] transition hover:bg-blue-100"
                >
                  📊 Dashboard
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Imagen de perfil
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Sube una imagen para personalizar tu cuenta.
              </p>

              <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:bg-slate-100">
                <span className="text-3xl">📷</span>
                <span className="mt-2 text-sm font-semibold text-slate-700">
                  {uploadImageMutation.isPending
                    ? "Subiendo imagen..."
                    : "Seleccionar imagen"}
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  PNG, JPG o WEBP
                </span>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={uploadImageMutation.isPending}
                  className="hidden"
                />
              </label>

              {imageMessage && (
                <p className="mt-3 text-sm font-medium text-emerald-600">
                  {imageMessage}
                </p>
              )}

              {imageError && (
                <p className="mt-3 text-sm font-medium text-red-600">
                  {imageError}
                </p>
              )}
            </div>

            <form
              onSubmit={handleChangePassword}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold text-slate-950">
                Cambiar contraseña
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Actualiza tu contraseña de acceso.
              </p>

              <div className="mt-5 space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Contraseña actual
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-[#4668A9] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-[#4668A9] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Confirmar nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-[#4668A9] focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="mt-5 w-full rounded-xl bg-[#4668A9] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#38578F] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {changePasswordMutation.isPending
                  ? "Guardando..."
                  : "Cambiar contraseña"}
              </button>

              {passwordMessage && (
                <p className="mt-3 text-sm font-medium text-emerald-600">
                  {passwordMessage}
                </p>
              )}

              {passwordError && (
                <p className="mt-3 text-sm font-medium text-red-600">
                  {passwordError}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </section>
  );
}