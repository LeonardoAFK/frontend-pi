import { CATEGORY_OPTIONS } from "@/lib/types";

export type MapFilterMode = "all" | "registered" | "category";

interface Props {
  mode: MapFilterMode;
  category: number | "";
  onModeChange: (mode: MapFilterMode) => void;
  onCategoryChange: (category: number | "") => void;
}

export function MapFilters({
  mode,
  category,
  onModeChange,
  onCategoryChange,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-slate-950">Filtro</h2>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-[#4668A9] focus:bg-white"
          value={mode}
          onChange={(e) => onModeChange(e.target.value as MapFilterMode)}
        >
          <option value="all">Todos</option>
          <option value="registered">Mis inscripciones</option>
          <option value="category">Por categoría</option>
        </select>

        {mode === "category" && (
          <select
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-[#4668A9] focus:bg-white"
            value={category}
            onChange={(e) =>
              onCategoryChange(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
          >
            <option value="">Todas las categorías</option>

            {CATEGORY_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}