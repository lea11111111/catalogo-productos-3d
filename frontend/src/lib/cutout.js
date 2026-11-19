// Convierte la foto de un producto en una "figura recortada":
// 1) quita el fondo liso (relleno por inundación desde los bordes)
// 2) traza el contorno de la silueta
// 3) devuelve los polígonos para extruirlos en 3D y una textura sin fondo

const MASK_SIZE = 360 // resolución del análisis: suficiente para bordes limpios
const TEX_SIZE = 800 // resolución máxima de la textura

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Muchas tiendas bloquean el uso de sus fotos en canvas/WebGL (CORS):
// si falla la carga directa, se usa un proxy de imágenes público que sí lo permite.
export async function loadCorsImage(url) {
  try {
    return await loadImage(url)
  } catch {
    return loadImage(`https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${TEX_SIZE}&output=png`)
  }
}

const dist = (data, i, r, g, b) => Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b)

// Máscara de primer plano: 1 = producto, 0 = fondo
function backgroundMask(data, w, h) {
  const border = []
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x)
  for (let y = 1; y < h - 1; y++) border.push(y * w, y * w + w - 1)

  // Colores de fondo: los grupos de color más frecuentes en el borde (ej. pared blanca + piso gris)
  const buckets = new Map()
  for (const p of border) {
    const i = p * 4
    const key = ((data[i] >> 5) << 6) | ((data[i + 1] >> 5) << 3) | (data[i + 2] >> 5)
    const bk = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    bk.n++; bk.r += data[i]; bk.g += data[i + 1]; bk.b += data[i + 2]
    buckets.set(key, bk)
  }
  const bgColors = [...buckets.values()]
    .filter((bk) => bk.n >= border.length * 0.06)
    .map((bk) => [bk.r / bk.n, bk.g / bk.n, bk.b / bk.n])

  const nearestBg = (i) => Math.min(...bgColors.map(([r, g, b]) => dist(data, i, r, g, b)))

  // ¿Fondo de estudio (uniforme) o con degradado? Se mide cuánto varía el color del borde.
  const spreads = border.map((p) => nearestBg(p * 4)).sort((a, b) => a - b)
  const spread = spreads[Math.floor(spreads.length * 0.9)] ?? 0
  const uniform = spread < 14
  const strict = Math.max(9, spread * 2 + 5)
  const chroma = (i) => Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2])
  const lum = (i) => (data[i] + data[i + 1] + data[i + 2]) / 3
  const bgNeutral = bgColors.every(([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b) < 8)
  const bgLum = bgColors.length ? Math.max(...bgColors.map(([r, g, b]) => (r + g + b) / 3)) : 0

  const mask = new Uint8Array(w * h).fill(1)
  const seedOf = new Int32Array(w * h) // pixel del borde desde el que se llegó (su color es la referencia)
  const queue = new Int32Array(w * h)
  let head = 0, tail = 0
  for (const p of border) {
    if (mask[p] && nearestBg(p * 4) < (uniform ? strict : 60)) {
      mask[p] = 0
      seedOf[p] = p
      queue[tail++] = p
    }
  }
  const isBackground = (q, p) => {
    const qi = q * 4
    if (uniform) {
      // Fondo de estudio: solo se borra lo casi idéntico al fondo, o su sombra gris suave.
      // Así no se pierden partes del producto de color parecido (ej. una suela crema sobre gris).
      if (nearestBg(qi) < strict) return true
      return bgNeutral && chroma(qi) < 7 && lum(qi) > bgLum - 40 && lum(qi) < bgLum + 12
    }
    // Fondo con degradado: se avanza mientras el color cambie suavemente
    const pi = p * 4, si = seedOf[p] * 4
    const local = dist(data, qi, data[pi], data[pi + 1], data[pi + 2])
    const global = dist(data, qi, data[si], data[si + 1], data[si + 2])
    return local < 18 && global < 150
  }
  while (head < tail) {
    const p = queue[head++]
    const x = p % w, y = (p / w) | 0
    const neighbors = [x > 0 && p - 1, x < w - 1 && p + 1, y > 0 && p - w, y < h - 1 && p + w]
    for (const q of neighbors) {
      if (q === false || !mask[q]) continue
      if (isBackground(q, p)) {
        mask[q] = 0
        seedOf[q] = seedOf[p]
        queue[tail++] = q
      }
    }
  }
  return mask
}

// Componentes conexas; devuelve una lista de [indices] ordenada por tamaño
function components(mask, w, h) {
  const label = new Int32Array(w * h).fill(-1)
  const comps = []
  const stack = []
  for (let p = 0; p < w * h; p++) {
    if (!mask[p] || label[p] !== -1) continue
    const id = comps.length
    const pixels = []
    stack.push(p)
    label[p] = id
    while (stack.length) {
      const c = stack.pop()
      pixels.push(c)
      const x = c % w, y = (c / w) | 0
      for (const q of [x > 0 && c - 1, x < w - 1 && c + 1, y > 0 && c - w, y < h - 1 && c + w]) {
        if (q !== false && mask[q] && label[q] === -1) {
          label[q] = id
          stack.push(q)
        }
      }
    }
    comps.push(pixels)
  }
  return comps.sort((a, b) => b.length - a.length)
}

// Contorno exterior de una región (seguimiento de borde de Moore). Devuelve puntos [x, y] en píxeles.
function traceContour(region, w, h) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && region[y * w + x] === 1
  let start = -1
  for (let p = 0; p < w * h; p++) if (region[p]) { start = p; break }
  if (start < 0) return []
  const sx = start % w, sy = (start / w) | 0
  // 8 direcciones en sentido horario empezando por el oeste
  const dirs = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]]
  const pts = [[sx, sy]]
  let cx = sx, cy = sy
  let back = 0 // dirección desde la que llegamos (el pixel al oeste del inicio está fuera)
  for (let guard = 0; guard < w * h * 4; guard++) {
    let found = false
    for (let k = 1; k <= 8; k++) {
      const d = (back + k) % 8
      const nx = cx + dirs[d][0], ny = cy + dirs[d][1]
      if (inside(nx, ny)) {
        cx = nx; cy = ny
        back = (d + 4) % 8 // apunta de vuelta al pixel anterior
        found = true
        break
      }
    }
    if (!found || (cx === sx && cy === sy)) break
    pts.push([cx, cy])
  }
  return pts
}

// Simplificación de Ramer–Douglas–Peucker
function simplify(pts, eps) {
  if (pts.length < 3) return pts
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]
  const len = Math.hypot(bx - ax, by - ay) || 1
  let maxD = 0, idx = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((by - ay) * pts[i][0] - (bx - ax) * pts[i][1] + bx * ay - by * ax) / len
    if (d > maxD) { maxD = d; idx = i }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]]
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)]
}

// Suavizado de Chaikin (contorno cerrado)
function smooth(pts) {
  const out = []
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]
    out.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1])
  }
  return out
}

/**
 * Analiza la foto y devuelve la figura recortada, o null si el fondo no es lo bastante liso.
 * contours: polígonos en coordenadas normalizadas de la imagen (0..1, y hacia abajo)
 * bbox: caja del producto en coordenadas normalizadas
 */
export async function makeCutout(url) {
  const img = await loadCorsImage(url)
  const aspect = img.naturalWidth / img.naturalHeight
  const w = aspect >= 1 ? MASK_SIZE : Math.round(MASK_SIZE * aspect)
  const h = aspect >= 1 ? Math.round(MASK_SIZE / aspect) : MASK_SIZE

  const small = document.createElement('canvas')
  small.width = w
  small.height = h
  const sctx = small.getContext('2d', { willReadFrequently: true })
  sctx.drawImage(img, 0, 0, w, h)
  const { data } = sctx.getImageData(0, 0, w, h) // lanza error si la imagen no permite CORS

  const mask = backgroundMask(data, w, h)
  const comps = components(mask, w, h)
  const total = w * h
  const fg = comps.reduce((s, c) => s + c.length, 0)
  // Si casi todo es fondo o casi nada lo es, el recorte no es fiable
  if (!comps.length || comps[0].length / total < 0.04 || fg / total > 0.92) return null

  // Partes del producto: la mayor y las que sean al menos el 15 % de ella (ej. dos lentes)
  const parts = comps.filter((c) => c.length >= comps[0].length * 0.15).slice(0, 4)
  const keep = new Uint8Array(total)
  let r = 0, g = 0, b = 0
  for (const c of parts) for (const p of c) {
    keep[p] = 1
    r += data[p * 4]; g += data[p * 4 + 1]; b += data[p * 4 + 2]
  }
  const count = parts.reduce((s, c) => s + c.length, 0)

  const contours = []
  let minX = 1, minY = 1, maxX = 0, maxY = 0
  for (const c of parts) {
    const region = new Uint8Array(total)
    for (const p of c) region[p] = 1
    let pts = simplify(traceContour(region, w, h), 0.8)
    if (pts.length < 4) continue
    pts = smooth(pts).map(([x, y]) => [(x + 0.5) / w, (y + 0.5) / h])
    for (const [x, y] of pts) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
    contours.push(pts)
  }
  if (!contours.length) return null

  // Textura a mayor resolución con el fondo transparente (la máscara se escala)
  const scale = Math.min(1, TEX_SIZE / Math.max(img.naturalWidth, img.naturalHeight))
  const tw = Math.round(img.naturalWidth * scale), th = Math.round(img.naturalHeight * scale)
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = w
  maskCanvas.height = h
  const mctx = maskCanvas.getContext('2d')
  const mimg = mctx.createImageData(w, h)
  for (let p = 0; p < total; p++) mimg.data[p * 4 + 3] = keep[p] ? 255 : 0
  mctx.putImageData(mimg, 0, 0)

  const tex = document.createElement('canvas')
  tex.width = tw
  tex.height = th
  const tctx = tex.getContext('2d')
  tctx.drawImage(img, 0, 0, tw, th)
  tctx.globalCompositeOperation = 'destination-in'
  tctx.imageSmoothingEnabled = true
  tctx.drawImage(maskCanvas, 0, 0, tw, th)

  return {
    canvas: tex,
    mask: keep,
    mw: w,
    mh: h,
    contours,
    bbox: { minX, minY, maxX, maxY },
    imageAspect: aspect,
    edgeColor: `rgb(${Math.round((r / count) * 0.55)}, ${Math.round((g / count) * 0.55)}, ${Math.round((b / count) * 0.55)})`,
  }
}
