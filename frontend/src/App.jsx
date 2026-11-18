import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createProduct, deleteProduct, getProducts, updateProduct } from './api'
import { ProductForm } from './components/ProductForm'
import { ProductGrid } from './components/ProductGrid'
import { SafeViewer } from './components/SafeViewer'
import { StatsPanel } from './components/StatsPanel'
import { ServerWakeNotice } from './components/ServerWakeNotice'
import { CatalogToolbar, filterAndSort } from './components/CatalogToolbar'

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recientes')
  const [selectedId, setSelectedId] = useState(null)
  const viewerRef = useRef(null)
  const formRef = useRef(null)
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setProducts(await getProducts())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(product) {
    const created = await createProduct(product)
    setProducts((prev) => [created, ...prev])
    setSelectedId(created.id)
    setError('')
  }

  async function handleUpdate(id, data) {
    const updated = await updateProduct(id, data)
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)))
    setSelectedId(id)
    setEditing(null)
  }

  function handleEdit(product) {
    setEditing(product)
    setSelectedId(product.id)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function handleDelete(product) {
    if (!window.confirm(`¿Eliminar «${product.name}»?`)) return
    try {
      await deleteProduct(product.id)
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
      if (editing?.id === product.id) setEditing(null)
    } catch (err) {
      window.alert(`No se pudo eliminar: ${err.message}`)
    }
  }

  // El seleccionado en el catálogo; si no hay, el más reciente (la API los devuelve primero)
  const featured = products.find((p) => p.id === selectedId) ?? products[0]

  function handleSelect(id) {
    setSelectedId(id)
    // En móvil el visor queda arriba: lo traemos a la vista
    viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const visibleProducts = useMemo(() => filterAndSort(products, query, sort), [products, query, sort])
  const isFiltering = query.trim() !== ''

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <ServerWakeNotice loading={loading} />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Catálogo de Productos</h1>
        <p className="mt-1 text-sm text-slate-400">React + FastAPI (Render) + PostgreSQL (Supabase)</p>
      </header>

      {!loading && !error && (
        <div className="mb-8">
          <StatsPanel products={products} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div ref={formRef}>
          <ProductForm
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            editing={editing}
            onCancelEdit={() => setEditing(null)}
          />
        </div>
        <div ref={viewerRef}>
          <SafeViewer product={featured} loading={loading} />
        </div>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Productos</h2>
          {!loading && !error && (
            <span className="text-sm tabular-nums text-slate-500">
              {isFiltering ? `${visibleProducts.length} de ${products.length}` : `${products.length} registrados`}
            </span>
          )}
        </div>
        <CatalogToolbar query={query} onQueryChange={setQuery} sort={sort} onSortChange={setSort} />
        <ProductGrid
          products={visibleProducts}
          loading={loading}
          error={error}
          onRetry={load}
          query={products.length > 0 ? query.trim() : ''}
          selectedId={featured?.id}
          onSelect={handleSelect}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </section>
    </div>
  )
}
