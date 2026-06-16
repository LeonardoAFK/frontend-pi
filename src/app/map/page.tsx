"use client";

import { EventMap } from "@/components/map/event-map";
import { MapFilters, type MapFilterMode } from "@/components/map/map-filters";
import { MapLegend } from "@/components/map/map-legend";
import { api, getToken } from "@/lib/api";
import {
  CATEGORY_OPTIONS,
  getCategoryLabel,
  REACTION_OPTIONS,
  type CreateEventPayload,
  type EventResponse,
  type ReactionType,
} from "@/lib/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";


function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
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

function collectStringValues(value: unknown): string[] {
  if (!value) return [];

  if (typeof value === "string") {
    return [normalizeText(value)].filter(Boolean);
  }

  if (typeof value === "number") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStringValues);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(
      collectStringValues
    );
  }

  return [];
}

function toDateTimeInput(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function fromDateTimeInput(value: string) {
  return new Date(value).toISOString();
}

export default function MapPage() {
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);

  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventActionLoading, setEventActionLoading] = useState(false);
  const [eventActionError, setEventActionError] = useState("");
  const [eventActionMessage, setEventActionMessage] = useState("");
  const [editForm, setEditForm] = useState<CreateEventPayload | null>(null);

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

  const { data: currentUser } = useQuery({
    queryKey: ["me", token],
    queryFn: () => api.getMe(),
    enabled: !!token,
    retry: false,
  });

  const tokenPayload = useMemo(() => decodeJwtPayload(token), [token]);

  const currentUserIdFromToken = useMemo(
    () =>
      getStringClaim(tokenPayload, [
        "nameid",
        "sub",
        "userId",
        "UserId",
        "id",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
      ]),
    [tokenPayload]
  );

  const currentUserNameFromToken = useMemo(
    () =>
      getStringClaim(tokenPayload, [
        "unique_name",
        "name",
        "userName",
        "UserName",
        "email",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      ]),
    [tokenPayload]
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

    const eventCreatorId = normalizeText(selectedEvent.createdByUserId);
    const eventCreatorName = normalizeText(selectedEvent.createdByUserName);

    const possibleCurrentUserValues = new Set([
      ...collectStringValues(currentUser),
      ...collectStringValues(tokenPayload),
      normalizeText(currentUserIdFromToken),
      normalizeText(currentUserNameFromToken),
    ]);

    if (eventCreatorId && possibleCurrentUserValues.has(eventCreatorId)) {
      return true;
    }

    if (eventCreatorName && possibleCurrentUserValues.has(eventCreatorName)) {
      return true;
    }

    return false;
  }, [
    selectedEvent,
    currentUser,
    tokenPayload,
    currentUserIdFromToken,
    currentUserNameFromToken,
  ]);

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
      await api.registerToEvent(selectedEvent.id);

      setRegistrationOverrides((current) => ({
        ...current,
        [selectedEvent.id]: true,
      }));

      setParticipantMessage("Inscripción realizada correctamente.");
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

    setParticipantError("");
    setParticipantMessage("");
    setParticipantLoading(true);

    try {
      await api.cancelRegistration(selectedEvent.id);

      setRegistrationOverrides((current) => ({
        ...current,
        [selectedEvent.id]: false,
      }));

      setParticipantMessage("Inscripción cancelada correctamente.");
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

  function openEditEvent() {
    if (!selectedEvent) return;

    setEventActionError("");
    setEventActionMessage("");

    setEditForm({
      id: selectedEvent.id,
      name: selectedEvent.name,
      description: selectedEvent.description,
      startDate: toDateTimeInput(selectedEvent.startDate),
      endDate: toDateTimeInput(selectedEvent.endDate),
      latitude: selectedEvent.latitude,
      longitude: selectedEvent.longitude,
      address: selectedEvent.address,
      maxParticipants: selectedEvent.maxParticipants,
      isPublic: selectedEvent.isPublic,
      category: selectedEvent.category,
      price: selectedEvent.price ?? 0,
      imageUrl: selectedEvent.imageUrl ?? null,
    });

    setIsEditingEvent(true);
  }

  function updateEditForm<K extends keyof CreateEventPayload>(
    key: K,
    value: CreateEventPayload[K]
  ) {
    setEditForm((current) => {
      if (!current) return current;

      return {
        ...current,
        [key]: value,
      };
    });
  }

  async function handleUpdateEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editForm || !selectedEventIsOwner) return;

    setEventActionLoading(true);
    setEventActionError("");
    setEventActionMessage("");

    try {
      const payload: CreateEventPayload = {
        ...editForm,
        startDate: fromDateTimeInput(editForm.startDate),
        endDate: fromDateTimeInput(editForm.endDate),
        maxParticipants: Number(editForm.maxParticipants),
        price: Number(editForm.price ?? 0),
        category: Number(editForm.category),
        latitude: Number(editForm.latitude),
        longitude: Number(editForm.longitude),
      };

      const updatedEvent = await api.updateEvent(payload);

      setSelectedEvent(updatedEvent);
      setIsEditingEvent(false);
      setEditForm(null);
      setEventActionMessage("Evento actualizado correctamente.");

      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-events"] });
    } catch (err) {
      setEventActionError(
        err instanceof Error ? err.message : "No se pudo actualizar el evento"
      );
    } finally {
      setEventActionLoading(false);
    }
  }

  async function handleDeleteEvent() {
    if (!selectedEvent || !selectedEventIsOwner) return;

    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar el evento "${selectedEvent.name}"?`
    );

    if (!confirmed) return;

    setEventActionLoading(true);
    setEventActionError("");
    setEventActionMessage("");

    try {
      await api.deleteEvent(selectedEvent.id);

      setSelectedEvent(null);
      setEventActionMessage("Evento eliminado correctamente.");

      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await queryClient.invalidateQueries({ queryKey: ["registered-events"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-events"] });
    } catch (err) {
      setEventActionError(
        err instanceof Error ? err.message : "No se pudo eliminar el evento"
      );
    } finally {
      setEventActionLoading(false);
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
                <div className="space-y-3">
                  <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
                    Este evento fue creado por ti.
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={openEditEvent}
                      disabled={eventActionLoading}
                      className="rounded-xl bg-[#4668A9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#38578F] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Modificar
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteEvent}
                      disabled={eventActionLoading}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Eliminar evento
                    </button>
                  </div>

                  {eventActionError && (
                    <p className="text-sm font-medium text-red-600">
                      {eventActionError}
                    </p>
                  )}

                  {eventActionMessage && (
                    <p className="text-sm font-medium text-emerald-600">
                      {eventActionMessage}
                    </p>
                  )}

                  {isEditingEvent && editForm && (
                    <form
                      onSubmit={handleUpdateEvent}
                      className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-600">
                          Nombre
                        </label>
                        <input
                          value={editForm.name}
                          onChange={(event) => updateEditForm("name", event.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4668A9]"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-600">
                          Categoría
                        </label>
                        <select
                          value={editForm.category}
                          onChange={(event) =>
                            updateEditForm("category", Number(event.target.value))
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4668A9]"
                        >
                          {CATEGORY_OPTIONS.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-600">
                          Descripción
                        </label>
                        <textarea
                          value={editForm.description}
                          onChange={(event) =>
                            updateEditForm("description", event.target.value)
                          }
                          className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4668A9]"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-600">
                          Dirección
                        </label>
                        <input
                          value={editForm.address}
                          onChange={(event) => updateEditForm("address", event.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4668A9]"
                          required
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-bold text-slate-600">
                            Inicio
                          </label>
                          <input
                            type="datetime-local"
                            value={editForm.startDate}
                            onChange={(event) =>
                              updateEditForm("startDate", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4668A9]"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold text-slate-600">
                            Fin
                          </label>
                          <input
                            type="datetime-local"
                            value={editForm.endDate}
                            onChange={(event) =>
                              updateEditForm("endDate", event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4668A9]"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-bold text-slate-600">
                            Cupo
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={editForm.maxParticipants}
                            onChange={(event) =>
                              updateEditForm("maxParticipants", Number(event.target.value))
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4668A9]"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold text-slate-600">
                            Precio
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={editForm.price ?? 0}
                            onChange={(event) =>
                              updateEditForm("price", Number(event.target.value))
                            }
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4668A9]"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={editForm.isPublic}
                          onChange={(event) =>
                            updateEditForm("isPublic", event.target.checked)
                          }
                        />
                        Evento público
                      </label>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={eventActionLoading}
                          className="flex-1 rounded-xl bg-[#4668A9] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#38578F] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {eventActionLoading ? "Guardando..." : "Guardar cambios"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingEvent(false);
                            setEditForm(null);
                          }}
                          disabled={eventActionLoading}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : selectedEventIsRegistered ? (
                <button
                  type="button"
                  onClick={handleCancelRegistration}
                  disabled={participantLoading}
                  className="w-full rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {participantLoading ? "Procesando..." : "Cancelar inscripción"}
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
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}