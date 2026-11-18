import { useEffect, useState } from 'react'

const EMPTY = { name: '', price: '', stock: '', image_url: '' }

function toForm(p) {
  return p ? { name: p.name, price: String(p.price), stock: String(p.stock), image_url: p.image_url ?? '' } : EMPTY
}

// Vista previa: comprueba que la URL sea realmente una imagen
function ImagePreview({ url }) {
  const [status, setStatus] = useState('loading')
  useEffect(() => setStatus('loading'), [url])
  if (!url) return null
  return (
    <div className="flex items-center gap-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
        {status !== 'error' && (
          <img
            src={url}
            alt=""
            onLoad={() => setStatus('ok')}
            onError={() => setStatus('error')}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <p className={`text-xs ${status === 'error' ? 'text-amber-400' : status === 'ok' ? 'text-emerald-400' : 'text-slate-500'}`}>
        {status === 'error'
          ? 'Esa URL no es una imagen. En la página del producto haz clic derecho sobre la foto → "Copiar dirección de imagen".'
          : status === 'ok'
            ? 'Imagen válida ✓'
            : 'Comprobando imagen…'}
      </p>
    </div>
  )
}

export function ProductForm({ onCreate, onUpdate, editing, onCancelEdit }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Al elegir "Editar" en un producto, el formulario se llena con sus datos
  useEffect(() => {
    setForm(toForm(editing))
    setError('')
  }, [editing])

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const data = {
      name: form.name.trim(),
      price: Number(form.price),
      stock: Number(form.stock || 0),
      image_url: form.image_url.trim() || null,
    }
    try {
      if (editing) await onUpdate(editing.id, data)
      else await onCreate(data)
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
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 rounded-2xl border bg-slate-900/60 p-5 ${editing ? 'border-indigo-500/60' : 'border-slate-800'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{editing ? 'Editar producto' : 'Registrar producto'}</h2>
        {editing && <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300">#{editing.id}</span>}
      </div>

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
        <input type="url" value={form.image_url} onChange={update('image_url')} className={input} placeholder="https://…/foto.jpg" />
      </label>
      <ImagePreview url={form.image_url.trim()} />

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar producto'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-800"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
