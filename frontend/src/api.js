const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const PRODUCTS = `${API_URL}/api/v1/products`

async function handle(res) {
  if (!res.ok) {
    let detail = `Error ${res.status}`
    try {
      const body = await res.json()
      if (Array.isArray(body.detail)) detail = body.detail.map((d) => d.msg).join(', ')
      else if (body.detail) detail = body.detail
    } catch { /* respuesta sin JSON */ }
    throw new Error(detail)
  }
  return res.json()
}

export const getProducts = () => fetch(PRODUCTS).then(handle)

export const createProduct = (product) =>
  fetch(PRODUCTS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  }).then(handle)

export { API_URL }
