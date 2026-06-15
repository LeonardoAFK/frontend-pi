"use client";

import { EventMap } from "@/components/map/event-map";
import { api, getToken } from "@/lib/api";
import {
  getCategoryLabel,
  REACTION_OPTIONS,
  type EventResponse,
  type ReactionType,
} from "@/lib/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function MapPage() {
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [reactionError, setReactionError] = useState("");
  const [token, setTokenState] = useState<string | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    setTokenState(getToken());
  }, []);

  const {
    data: events = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["events", token],
    queryFn: () => api.getEvents(),
    enabled: !!token,
  });

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

      await queryClient.invalidateQueries({ queryKey: ["events"] });

      const updatedEvents = await queryClient.fetchQuery({
        queryKey: ["events", token],
        queryFn: () => api.getEvents(),
      });

      const updatedSelected = updatedEvents.find(
        (event) => event.id === selectedEvent.id
      );

      if (updatedSelected) {
        setSelectedEvent(updatedSelected);
      }
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

        <EventMap events={token ? events : []} onSelect={setSelectedEvent} />
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
                    } ${reactionLoading ? "cursor-not-allowed opacity-70" : ""}`}
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
        )}
      </aside>
    </section>
  );
}