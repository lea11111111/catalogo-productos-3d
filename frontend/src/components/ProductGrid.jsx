export function ProductGrid({ products, loading, error, onRetry, query = '' }) {
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
        <li key={p.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="flex h-32 items-center justify-center bg-slate-800/50">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-slate-700">{p.name.charAt(0).toUpperCase()}</span>
            )}
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
        </li>
      ))}
    </ul>
  )
}
