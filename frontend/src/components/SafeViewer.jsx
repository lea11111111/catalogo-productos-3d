import { Component, lazy, Suspense, useState } from 'react'

const Product3DViewer = lazy(() =>
  import('./Product3DViewer').then((m) => ({ default: m.Product3DViewer })),
)

// Comprueba si el navegador permite WebGL (Brave/Safari estricto pueden bloquearlo)
function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}

// Si el 3D falla por cualquier motivo, mostramos la tarjeta plana en vez de tumbar toda la app
class ViewerBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err) {
    console.warn('Visor 3D desactivado:', err)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function FlatViewer({ product, loading, reason }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="flex h-80 w-full items-center justify-center bg-slate-900">
        {product?.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-6xl font-bold text-slate-700">{product?.name?.charAt(0).toUpperCase() ?? '·'}</span>
        )}
      </div>
      <div className="border-t border-slate-800 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">Vitrina</p>
        {product ? (
          <div className="mt-1 flex items-baseline justify-between gap-4">
            <h2 className="truncate text-lg font-semibold">{product.name}</h2>
            <span className="text-lg font-semibold tabular-nums">${Number(product.price).toFixed(2)}</span>
          </div>
        ) : (
          <h2 className="mt-1 text-lg font-semibold text-slate-500">{loading ? 'Cargando…' : 'Aún no hay productos'}</h2>
        )}
        {reason && <p className="mt-2 text-xs text-amber-400/80">{reason}</p>}
      </div>
    </div>
  )
}

export function SafeViewer({ product, loading }) {
  const [webgl] = useState(hasWebGL)
  const reason = 'Tu navegador bloqueó el 3D (WebGL). Activa la aceleración por hardware o desactiva los escudos para ver la vitrina 3D.'
  if (!webgl) return <FlatViewer product={product} loading={loading} reason={reason} />
  return (
    <ViewerBoundary fallback={<FlatViewer product={product} loading={loading} reason={reason} />}>
      <Suspense fallback={<FlatViewer product={product} loading={loading} />}>
        <Product3DViewer product={product} loading={loading} />
      </Suspense>
    </ViewerBoundary>
  )
}
