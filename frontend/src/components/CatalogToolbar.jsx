export const SORT_OPTIONS = [
  { value: 'recientes', label: 'Más recientes' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'nombre', label: 'Nombre (A-Z)' },
]

// Minúsculas y sin acentos: "Audífonos" -> "audifonos"
function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

// Filtra por nombre y ordena sin mutar el arreglo original
export function filterAndSort(products, query, sort) {
  const list = Array.isArray(products) ? products : []
  const q = normalize(query)
  const filtered = q ? list.filter((p) => normalize(p?.name).includes(q)) : list.slice()

  switch (sort) {
    case 'precio-asc':
      return filtered.sort((a, b) => Number(a.price) - Number(b.price))
    case 'precio-desc':
      return filtered.sort((a, b) => Number(b.price) - Number(a.price))
    case 'nombre':
      return filtered.sort((a, b) =>
        String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es', { sensitivity: 'base' }),
      )
    default:
      // 'recientes': la API ya devuelve los más nuevos primero
      return filtered
  }
}

export function CatalogToolbar({ query, onQueryChange, sort, onSortChange }) {
  const input =
    'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30'

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="block flex-1">
        <span className="sr-only">Buscar productos</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className={input}
          placeholder="Buscar por nombre…"
        />
      </label>
      <label className="block sm:w-56">
        <span className="sr-only">Ordenar productos</span>
        <select value={sort} onChange={(e) => onSortChange(e.target.value)} className={input}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
