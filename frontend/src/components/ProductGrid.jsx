import { useState } from 'react'

// Imagen con respaldo: si la URL no es una imagen válida, muestra la inicial del nombre
function Thumb({ product }) {
  const [broken, setBroken] = useState(false)
  if (!product.image_url || broken) {
    return <span className="text-4xl font-bold text-slate-700">{product.name.charAt(0).toUpperCase()}</span>
  }
  return (
    <img
      src={product.image_url}
      alt={product.name}
      loading="lazy"
      onError={() => setBroken(true)}
      className="h-full w-full object-cover"
    />
  )
}

export function ProductGrid({ products, loading, error, onRetry, query = '', selectedId, onSelect, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-900" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
        <p className="text-sm text-red-400">No se pudo cargar el catálogo: {error}</p>
        <p className="mt-1 text-xs text-slate-500">Si la API está en Render (plan gratis) puede tardar ~50 s en despertar.</p>
        <button onClick={onRetry} className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
          Reintentar
        </button>
      </div>
    )
  }

  if (products.length === 0 && query) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">
        Sin resultados para «{query}»
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">
        El catálogo está vacío. Registra el primer producto.
      </div>
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <li key={p.id} className="group/card relative">
          <button
            type="button"
            onClick={() => onSelect?.(p.id)}
            aria-pressed={p.id === selectedId}
            className={`group block w-full overflow-hidden rounded-2xl border bg-slate-900/60 text-left transition hover:-translate-y-0.5 hover:border-indigo-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              p.id === selectedId ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-slate-800'
            }`}
          >
          <div className="relative flex h-32 items-center justify-center bg-slate-800/50">
            <Thumb key={p.image_url} product={p} />
            <span className="absolute right-2 top-2 rounded-full bg-slate-950/80 px-2 py-0.5 text-[11px] font-medium text-indigo-300 opacity-0 transition group-hover:opacity-100 group-aria-pressed:opacity-100">
              {p.id === selectedId ? 'En vitrina 3D' : 'Ver en 3D'}
            </span>
          </div>
          <div className="space-y-2 p-4">
            <h3 className="truncate font-medium">{p.name}</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold tabular-nums">${Number(p.price).toFixed(2)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  p.stock > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                {p.stock > 0 ? `Stock: ${p.stock}` : 'Agotado'}
              </span>
            </div>
          </div>
          </button>
          <div className="absolute bottom-[3.25rem] right-2 flex gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover/card:opacity-100 sm:focus-within:opacity-100">
            <button
              type="button"
              onClick={() => onEdit?.(p)}
              className="rounded-md bg-slate-950/85 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-indigo-600"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(p)}
              className="rounded-md bg-slate-950/85 px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-600 hover:text-white"
            >
              Eliminar
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
