const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const integer = new Intl.NumberFormat('es-MX')

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function StatsPanel({ products }) {
  const list = Array.isArray(products) ? products : []

  const total = list.length
  const inventoryValue = list.reduce((sum, p) => sum + toNumber(p.price) * toNumber(p.stock), 0)
  const units = list.reduce((sum, p) => sum + toNumber(p.stock), 0)
  const outOfStock = list.filter((p) => toNumber(p.stock) === 0).length

  const stats = [
    { label: 'Total de productos', value: integer.format(total) },
    { label: 'Valor del inventario', value: currency.format(inventoryValue) },
    { label: 'Unidades en stock', value: integer.format(units) },
    { label: 'Agotados', value: integer.format(outOfStock), warn: outOfStock > 0 },
  ]

  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-2xl border p-4 ${
            s.warn ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800 bg-slate-900/60'
          }`}
        >
          <dt className="text-xs text-slate-500">{s.label}</dt>
          <dd
            className={`mt-1 truncate text-lg font-semibold tabular-nums sm:text-xl ${
              s.warn ? 'text-amber-400' : 'text-slate-100'
            }`}
          >
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
