"use client";

import { EventMap } from "@/components/map/event-map";
import { MapFilters, type MapFilterMode } from "@/components/map/map-filters";
import { MapLegend } from "@/components/map/map-legend";
import { api, getToken } from "@/lib/api";
import {
  getCategoryLabel,
  REACTION_OPTIONS,
  type EventResponse,
  type ReactionType,
} from "@/lib/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  if (!payload) return null;

  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

export default function MapPage() {
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);

  const [reactionLoading, setReactionLoading] = useState(false);
  const [reactionError, setReactionError] = useState("");

  const [participantLoading, setParticipantLoading] = useState(false);
  const [participantError, setParticipantError] = useState("");
  const [participantMessage, setParticipantMessage] = useState("");

  const [token, setTokenState] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<MapFilterMode>("all");
  const [selectedCategory, setSelectedCategory] = useState<number | "">("");

  const [registrationOverrides, setRegistrationOverrides] = useState<
    Record<number, boolean>
  >({});

  const queryClient = useQueryClient();

  useEffect(() => {
    setTokenState(getToken());
  }, []);

  const currentUserPayload = useMemo(() => decodeJwtPayload(token), [token]);

  const currentUserId = useMemo(
    () =>
      getStringClaim(currentUserPayload, [
        "nameid",
        "sub",
        "userId",
        "UserId",
        "id",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
      ]),
    [currentUserPayload]
  );

  const currentUserName = useMemo(
    () =>
      getStringClaim(currentUserPayload, [
        "unique_name",
        "name",
        "userName",
        "UserName",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      ]),
    [currentUserPayload]
  );

  const {
    data: eventsData = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["events", token],
    queryFn: () => api.getEvents(),
    enabled: !!token,
  });

  const events = Array.isArray(eventsData) ? eventsData : [];

  const { data: registeredEventsData = [] } = useQuery({
    queryKey: ["my-registered-events", token],
    queryFn: () => api.getMyRegisteredEvents(),
    enabled: !!token,
    retry: false,
  });

  const registeredEvents = Array.isArray(registeredEventsData)
    ? registeredEventsData
    : [];

  const registeredEventIds = useMemo(
    () => registeredEvents.map((event) => event.id),
    [registeredEvents]
  );

  const effectiveRegisteredEventIds = useMemo(() => {
    const ids = new Set(registeredEventIds);

    Object.entries(registrationOverrides).forEach(([eventId, isRegistered]) => {
      const id = Number(eventId);

      if (isRegistered) {
        ids.add(id);
      } else {
        ids.delete(id);
      }
    });

    return Array.from(ids);
  }, [registeredEventIds, registrationOverrides]);

  const selectedEventIsRegistered = selectedEvent
    ? effectiveRegisteredEventIds.includes(selectedEvent.id)
    : false;

  const selectedEventIsOwner = useMemo(() => {
    if (!selectedEvent) return false;

    const createdByUserId = selectedEvent.createdByUserId?.trim();
    const createdByUserName = selectedEvent.createdByUserName?.trim();

    if (currentUserId && createdByUserId && currentUserId === createdByUserId) {
      return true;
    }

    if (
      currentUserName &&
      createdByUserName &&
      currentUserName.toLowerCase() === createdByUserName.toLowerCase()
    ) {
      return true;
    }

    return false;
  }, [selectedEvent, currentUserId, currentUserName]);

  const visibleEvents = useMemo(() => {
    if (filterMode === "registered") {
      return events.filter((event) =>
        effectiveRegisteredEventIds.includes(event.id)
      );
    }

    if (filterMode === "category" && selectedCategory !== "") {
      return events.filter((event) => event.category === selectedCategory);
    }

    return events;
  }, [events, filterMode, effectiveRegisteredEventIds, selectedCategory]);

  useEffect(() => {
    if (!selectedEvent) return;

    const selectedStillVisible = visibleEvents.some(
      (event) => event.id === selectedEvent.id
    );

    if (!selectedStillVisible) {
      setSelectedEvent(null);
    }
  }, [selectedEvent, visibleEvents]);

  useEffect(() => {
    if (!selectedEvent) return;

    const updatedSelected = events.find((event) => event.id === selectedEvent.id);

    if (updatedSelected) {
      setSelectedEvent(updatedSelected);
    }
  }, [events, selectedEvent?.id]);

  function handleFilterModeChange(mode: MapFilterMode) {
    setFilterMode(mode);

    if (mode !== "category") {
      setSelectedCategory("");
    }
  }

  function refreshEventListsInBackground() {
    void queryClient.invalidateQueries({ queryKey: ["events"] });
    void queryClient.invalidateQueries({ queryKey: ["my-registered-events"] });
  }

  async function handleRegisterToEvent() {
    if (!selectedEvent) return;

    if (selectedEventIsOwner) {
      setParticipantError("No puedes inscribirte a un evento que tú creaste.");
      return;
    }

    setParticipantError("");
    setParticipantMessage("");
    setParticipantLoading(true);

    try {
      const response = await api.registerToEvent(selectedEvent.id);

      setRegistrationOverrides((current) => ({
        ...current,
        [selectedEvent.id]: true,
      }));

      setParticipantMessage(response || "Inscripción realizada correctamente.");

      refreshEventListsInBackground();
    } catch (err) {
      setParticipantError(
        err instanceof Error ? err.message : "No se pudo realizar la inscripción"
      );
    } finally {
      setParticipantLoading(false);
    }
  }

  async function handleCancelRegistration() {
    if (!selectedEvent) return;

    const confirmed = window.confirm(
      "¿Seguro que quieres cancelar tu inscripción a este evento?"
    );

    if (!confirmed) return;

    setParticipantError("");
    setParticipantMessage("");
    setParticipantLoading(true);

    try {
      const response = await api.cancelRegistration(selectedEvent.id);

      setRegistrationOverrides((current) => ({
        ...current,
        [selectedEvent.id]: false,
      }));

      setParticipantMessage(response || "Inscripción cancelada correctamente.");

      refreshEventListsInBackground();
    } catch (err) {
      setParticipantError(
        err instanceof Error ? err.message : "No se pudo cancelar la inscripción"
      );
    } finally {
      setParticipantLoading(false);
    }
  }

  async function handleReaction(reactionType: ReactionType) {
    if (!selectedEvent) return;

    setReactionError("");
    setReactionLoading(true);

    try {
      if (selectedEvent.myReaction === reactionType) {
        await api.deleteReaction(selectedEvent.id);
      } else {
        await api.reactToEvent(selectedEvent.id, reactionType);
      }

      void queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (err) {
      setReactionError(
        err instanceof Error ? err.message : "No se pudo reaccionar al evento"
      );
    } finally {
      setReactionLoading(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">
          Mapa de eventos
        </h1>

        {!token && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Debes iniciar sesión para ver eventos y reacciones.{" "}
            <Link href="/login" className="font-semibold underline">
              Ir al login
            </Link>
          </div>
        )}

        {token && isLoading && (
          <p className="mb-3 text-sm text-slate-600">Cargando eventos...</p>
        )}

        {token && isError && (
          <p className="mb-3 text-sm font-medium text-red-600">
            {error instanceof Error
              ? error.message
              : "No se pudieron cargar los eventos"}
          </p>
        )}

        {token && (
          <div className="mb-4 grid gap-4 md:grid-cols-[220px_1fr]">
            <MapLegend />

            <MapFilters
              mode={filterMode}
              category={selectedCategory}
              onModeChange={handleFilterModeChange}
              onCategoryChange={setSelectedCategory}
            />
          </div>
        )}

        <EventMap
          events={token ? visibleEvents : []}
          onSelect={(event) => {
            setSelectedEvent(event);
            setReactionError("");
            setParticipantError("");
            setParticipantMessage("");
          }}
          selectedEventId={selectedEvent?.id}
          registeredEventIds={effectiveRegisteredEventIds}
        />
      </div>

      <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Detalle del evento
        </h2>

        {!token ? (
          <p className="text-sm text-slate-600">
            Inicia sesión para consultar el detalle de los eventos.
          </p>
        ) : !selectedEvent ? (
          <p className="text-sm text-slate-600">
            Haz click en un marcador para ver el evento.
          </p>
        ) : (
          <div className="space-y-3 text-sm text-slate-700">
            {selectedEvent.imageUrl && (
              <img
                src={selectedEvent.imageUrl}
                alt={selectedEvent.name}
                className="h-48 w-full rounded-lg object-cover"
              />
            )}

            <div>
              <p className="text-base font-semibold text-slate-900">
                {selectedEvent.name}
              </p>
              <p className="text-sm text-slate-500">
                {getCategoryLabel(selectedEvent.category)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {REACTION_OPTIONS.map((reaction) => {
                const count = selectedEvent.reactions?.[reaction.key] ?? 0;
                const isActive = selectedEvent.myReaction === reaction.id;

                return (
                  <button
                    key={reaction.id}
                    type="button"
                    onClick={() => handleReaction(reaction.id)}
                    disabled={reactionLoading}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                      isActive
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    } ${
                      reactionLoading ? "cursor-not-allowed opacity-70" : ""
                    }`}
                    title={reaction.label}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{count}</span>
                  </button>
                );
              })}
            </div>

            {reactionError && (
              <p className="text-sm font-medium text-red-600">
                {reactionError}
              </p>
            )}

            <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
              <p>
                <strong>Dirección:</strong> {selectedEvent.address}
              </p>
              <p>
                <strong>Descripción:</strong> {selectedEvent.description}
              </p>
              <p>
                <strong>Inicio:</strong>{" "}
                {new Date(selectedEvent.startDate).toLocaleString()}
              </p>
              <p>
                <strong>Fin:</strong>{" "}
                {new Date(selectedEvent.endDate).toLocaleString()}
              </p>
              <p>
                <strong>Cupo:</strong> {selectedEvent.maxParticipants}
              </p>
              <p>
                <strong>Precio:</strong> {selectedEvent.price ?? 0}
              </p>
              <p>
                <strong>Creador:</strong>{" "}
                {selectedEvent.createdByUserName || "Sin dato"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-3 text-sm font-semibold text-slate-900">
                Participación
              </p>

              {selectedEventIsOwner ? (
                <div className="space-y-2">
                  <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
                    Este evento fue creado por ti.
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled
                      className="rounded-xl bg-[#4668A9] px-4 py-2 text-sm font-semibold text-white opacity-80"
                    >
                      Modificar
                    </button>

                    <button
                      type="button"
                      disabled
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white opacity-80"
                    >
                      Ver inscritos
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 opacity-80"
                  >
                    Eliminar evento
                  </button>

                  <p className="text-xs text-slate-500">
                    Estas acciones las conectamos en el siguiente paso.
                  </p>
                </div>
              ) : selectedEventIsRegistered ? (
                <button
                  type="button"
                  onClick={handleCancelRegistration}
                  disabled={participantLoading}
                  className="w-full rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {participantLoading
                    ? "Procesando..."
                    : "Cancelar inscripción"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRegisterToEvent}
                  disabled={participantLoading}
                  className="w-full rounded-xl bg-[#4668A9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#38578F] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {participantLoading ? "Procesando..." : "Inscribirme"}
                </button>
              )}

              {participantMessage && (
                <p className="mt-2 text-sm font-medium text-emerald-700">
                  {participantMessage}
                </p>
              )}

              {participantError && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {participantError}
                </p>
              )}
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}