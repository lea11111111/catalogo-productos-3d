import { useCallback, useEffect, useMemo, useState } from 'react'
import { createProduct, getProducts } from './api'
import { ProductForm } from './components/ProductForm'
import { ProductGrid } from './components/ProductGrid'
import { Product3DViewer } from './components/Product3DViewer'
import { StatsPanel } from './components/StatsPanel'
import { ServerWakeNotice } from './components/ServerWakeNotice'
import { CatalogToolbar, filterAndSort } from './components/CatalogToolbar'

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recientes')

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
    setError('')
  }

  // La API devuelve los más recientes primero: el destacado es el último registrado
  const featured = products[0]

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
        <ProductForm onCreate={handleCreate} />
        <Product3DViewer product={featured} loading={loading} />
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
        />
      </section>
    </div>
  )
}
