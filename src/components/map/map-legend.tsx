const items = [
  { label: "Activo", color: "bg-[#22a06b]" },
  { label: "Inscrito", color: "bg-[#2563eb]" },
  { label: "Seleccionado", color: "bg-[#9333ea]" },
];

export function MapLegend() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-slate-950">Marcadores</h2>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span
              className={`h-3 w-3 rounded-full ${item.color} ring-2 ring-white`}
            />
            <span className="font-medium text-slate-700">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}