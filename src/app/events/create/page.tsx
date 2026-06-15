"use client";

import { EventMap } from "@/components/map/event-map";
import { api } from "@/lib/api";
import { CATEGORY_OPTIONS } from "@/lib/types";
import { useState } from "react";


export default function CreateEventPage() {
  const [pickedLocation, setPickedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    address: "",
    maxParticipants: "",
    isPublic: true,
    category: 1,
    price: "",
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!pickedLocation) {
      setError("Debes seleccionar una ubicación en el mapa");
      return;
    }

    if (!form.name.trim()) {
      setError("Debes ingresar el nombre del evento");
      return;
    }

    if (!form.description.trim()) {
      setError("Debes ingresar una descripción");
      return;
    }

    if (!form.address.trim()) {
      setError("Debes ingresar la dirección");
      return;
    }

    if (!form.maxParticipants) {
      setError("Debes ingresar el cupo máximo");
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError("Debes completar la fecha de inicio y fin");
      return;
    }

    try {
      const createdEvent = await api.createEvent({
        name: form.name,
        description: form.description,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        latitude: pickedLocation.lat,
        longitude: pickedLocation.lng,
        address: form.address,
        maxParticipants: Number(form.maxParticipants),
        isPublic: form.isPublic,
        category: form.category,
        price: form.price === "" ? 0 : Number(form.price),
        createdByUserName: "",
      });

      if (imageFile) {
        await api.uploadEventImage(createdEvent.id, imageFile);
      }

      setMessage("Evento creado correctamente");

      setForm({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        address: "",
        maxParticipants: "",
        isPublic: true,
        category: 1,
        price: "",
      });

      setImageFile(null);
      setPickedLocation(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear el evento"
      );
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Crear evento</h1>
        <p className="text-sm text-slate-600">
          Completa la información del evento y selecciona la ubicación en el
          mapa.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Ubicación</h2>
            <p className="text-sm text-slate-600">
              Haz click en el mapa para escoger la ubicación exacta del evento.
            </p>
          </div>

          <EventMap
            events={[]}
            pickedLocation={pickedLocation}
            onMapClick={setPickedLocation}
          />

          {pickedLocation && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm">
              <strong>Ubicación elegida:</strong>{" "}
              {pickedLocation.lat.toFixed(6)}, {pickedLocation.lng.toFixed(6)}
            </div>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Nombre del evento
            </label>
            <input
              className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400"
              placeholder="Ej: Freestyle en la universidad"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Dirección
            </label>
            <input
              className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400"
              placeholder="Ej: Universidad de Antioquia, Medellín"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Descripción
            </label>
            <textarea
              className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400"
              placeholder="Describe de qué trata el evento"
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Fecha y hora de inicio
              </label>
              <input
                className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900"
                type="datetime-local"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Fecha y hora de fin
              </label>
              <input
                className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900"
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Tipo de evento
              </label>
              <select
                className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: Number(e.target.value) })
                }
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Cupo máximo
              </label>
              <input
                className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400"
                type="number"
                min={1}
                placeholder="Ej: 50"
                value={form.maxParticipants}
                onChange={(e) =>
                  setForm({ ...form, maxParticipants: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Precio
              </label>
              <input
                className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900 placeholder:text-slate-400"
                type="number"
                min={0}
                placeholder="Ej: 10000"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Imagen del evento
              </label>
              <input
                className="w-full rounded-md border border-slate-300 bg-white p-3 text-slate-900"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setImageFile(file);
                }}
              />
              {imageFile && (
                <p className="mt-2 text-sm text-slate-600">
                  Archivo seleccionado: {imageFile.name}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) =>
                  setForm({ ...form, isPublic: e.target.checked })
                }
              />
              Evento público
            </label>
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600">{error}</p>
          )}

          {message && (
            <p className="text-sm font-medium text-green-600">{message}</p>
          )}

          <button className="w-full rounded-md bg-blue-700 px-4 py-3 text-white hover:bg-blue-800">
            Crear evento
          </button>
        </form>
      </div>
    </section>
  );
}