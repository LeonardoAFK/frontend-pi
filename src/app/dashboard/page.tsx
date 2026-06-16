"use client";

import { api, getToken } from "@/lib/api";
import {
  CATEGORY_OPTIONS,
  getCategoryLabel,
  REACTION_OPTIONS,
  type EventResponse,
  type ReactionSummary,
} from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const emptyReactions: ReactionSummary = {
  like: 0,
  love: 0,
  laugh: 0,
  wow: 0,
  sad: 0,
};

function getReactionTotal(event: EventResponse) {
  const reactions = event.reactions ?? emptyReactions;

  return (
    reactions.like +
    reactions.love +
    reactions.laugh +
    reactions.wow +
    reactions.sad
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return date.toLocaleString();
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-2xl bg-[#EEF2F8] px-3 py-2 text-xl">
          {icon}
        </span>
      </div>

      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setTokenState(getToken());
  }, []);

  const {
    data: eventsData = [],
    isLoading: eventsLoading,
    isError: eventsIsError,
    error: eventsError,
  } = useQuery({
    queryKey: ["dashboard-events", token],
    queryFn: () => api.getEvents(),
    enabled: !!token,
  });

  const {
    data: registeredEventsData = [],
    isLoading: registeredLoading,
  } = useQuery({
    queryKey: ["dashboard-registered-events", token],
    queryFn: () => api.getMyRegisteredEvents(),
    enabled: !!token,
    retry: false,
  });

  const events = Array.isArray(eventsData) ? eventsData : [];
  const registeredEvents = Array.isArray(registeredEventsData)
    ? registeredEventsData
    : [];

  const stats = useMemo(() => {
    const totalEvents = events.length;
    const myRegistrations = registeredEvents.length;

    const totalReactions = events.reduce(
      (total, event) => total + getReactionTotal(event),
      0
    );

    const publicEvents = events.filter((event) => event.isPublic).length;
    const privateEvents = totalEvents - publicEvents;

    const reactionsSummary = events.reduce<ReactionSummary>(
      (summary, event) => {
        const reactions = event.reactions ?? emptyReactions;

        return {
          like: summary.like + reactions.like,
          love: summary.love + reactions.love,
          laugh: summary.laugh + reactions.laugh,
          wow: summary.wow + reactions.wow,
          sad: summary.sad + reactions.sad,
        };
      },
      { ...emptyReactions }
    );

    const eventsByCategory = CATEGORY_OPTIONS.map((category) => ({
      ...category,
      count: events.filter((event) => event.category === category.value).length,
    }));

    const maxCategoryCount = Math.max(
      ...eventsByCategory.map((category) => category.count),
      1
    );

    const topEventsByReactions = [...events]
      .sort((a, b) => getReactionTotal(b) - getReactionTotal(a))
      .slice(0, 5);

    const upcomingEvents = [...events]
      .filter((event) => new Date(event.startDate).getTime() >= Date.now())
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      )
      .slice(0, 5);

    const nextEvent = upcomingEvents[0] ?? null;

    const topEvent = topEventsByReactions[0] ?? null;

    return {
      totalEvents,
      myRegistrations,
      totalReactions,
      publicEvents,
      privateEvents,
      reactionsSummary,
      eventsByCategory,
      maxCategoryCount,
      topEventsByReactions,
      upcomingEvents,
      nextEvent,
      topEvent,
    };
  }, [events, registeredEvents]);

  if (!token) {
    return (
      <section className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-2 text-sm">
            Debes iniciar sesión para ver las estadísticas de eventos.
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

  const isLoading = eventsLoading || registeredLoading;

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#4668A9]">
            Panel general
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Dashboard de eventos
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Vista general de eventos, categorías, reacciones e inscripciones.
          </p>
        </div>

        <Link
          href="/events/create"
          className="rounded-full bg-[#4668A9] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#38578F]"
        >
          Crear evento
        </Link>
      </div>

      {eventsIsError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {eventsError instanceof Error
            ? eventsError.message
            : "No se pudieron cargar las estadísticas."}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando dashboard...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Eventos creados"
              value={stats.totalEvents}
              description="Total de eventos visibles para tu usuario."
              icon="📍"
            />

            <StatCard
              title="Mis inscripciones"
              value={stats.myRegistrations}
              description="Eventos en los que estás inscrito."
              icon="🎟️"
            />

            <StatCard
              title="Reacciones totales"
              value={stats.totalReactions}
              description={
                stats.topEvent
                  ? `Evento destacado: ${stats.topEvent.name}`
                  : "Aún no hay reacciones registradas."
              }
              icon="💬"
            />

            <StatCard
              title="Próximo evento"
              value={stats.nextEvent ? stats.nextEvent.name : "Sin eventos"}
              description={
                stats.nextEvent
                  ? formatDate(stats.nextEvent.startDate)
                  : "No hay eventos próximos disponibles."
              }
              icon="🗓️"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Eventos por categoría
                  </h2>
                  <p className="text-sm text-slate-500">
                    Distribución de eventos según la categoría registrada.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {stats.eventsByCategory.map((category) => {
                  const width =
                    category.count === 0
                      ? 0
                      : (category.count / stats.maxCategoryCount) * 100;

                  return (
                    <div key={category.value}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          {category.label}
                        </span>
                        <span className="font-semibold text-slate-950">
                          {category.count}
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#4668A9]"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">
                  Resumen de reacciones
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Total acumulado por tipo de reacción.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {REACTION_OPTIONS.map((reaction) => (
                    <div
                      key={reaction.id}
                      className="rounded-2xl bg-slate-50 p-4"
                    >
                      <p className="text-2xl">{reaction.emoji}</p>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        {reaction.label}
                      </p>
                      <p className="text-2xl font-bold text-slate-950">
                        {stats.reactionsSummary[reaction.key]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">
                  Visibilidad
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Eventos públicos y privados.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-sm font-medium text-emerald-700">
                      Públicos
                    </p>
                    <p className="mt-1 text-3xl font-bold text-emerald-900">
                      {stats.publicEvents}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-blue-50 p-4">
                    <p className="text-sm font-medium text-blue-700">
                      Privados
                    </p>
                    <p className="mt-1 text-3xl font-bold text-blue-900">
                      {stats.privateEvents}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Eventos con más reacciones
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ranking basado en la suma de todas las reacciones.
              </p>

              <div className="mt-5 space-y-3">
                {stats.topEventsByReactions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Todavía no hay eventos disponibles.
                  </p>
                ) : (
                  stats.topEventsByReactions.map((event, index) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-950">
                          #{index + 1} {event.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {getCategoryLabel(event.category)} ·{" "}
                          {event.createdByUserName || "Sin creador"}
                        </p>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[#4668A9]">
                        {getReactionTotal(event)} reacciones
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                Próximos eventos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Los eventos más cercanos según la fecha de inicio.
              </p>

              <div className="mt-5 space-y-3">
                {stats.upcomingEvents.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No hay eventos próximos.
                  </p>
                ) : (
                  stats.upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-2xl bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-slate-950">
                            {event.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(event.startDate)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {event.address}
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                          {getCategoryLabel(event.category)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}