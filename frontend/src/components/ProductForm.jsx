import { useState } from 'react'

const EMPTY = { name: '', price: '', stock: '', image_url: '' }

export function ProductForm({ onCreate }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onCreate({
        name: form.name.trim(),
        price: Number(form.price),
        stock: Number(form.stock || 0),
        image_url: form.image_url.trim() || null,
      })
      setForm(EMPTY)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const input =
    'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30'

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-lg font-semibold">Registrar producto</h2>

      <label className="block space-y-1">
        <span className="text-sm text-slate-400">Nombre</span>
        <input required maxLength={120} value={form.name} onChange={update('name')} className={input} placeholder="Ej. Audífonos" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Precio</span>
          <input required type="number" min="0" step="0.01" value={form.price} onChange={update('price')} className={input} placeholder="0.00" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-400">Stock</span>
          <input type="number" min="0" step="1" value={form.stock} onChange={update('stock')} className={input} placeholder="0" />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm text-slate-400">URL de imagen (opcional)</span>
        <input type="url" value={form.image_url} onChange={update('image_url')} className={input} placeholder="https://…" />
      </label>

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? 'Guardando…' : 'Agregar producto'}
      </button>
    </form>
  )
}
