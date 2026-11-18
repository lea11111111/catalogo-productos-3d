import * as THREE from 'three'

// "Infla" la silueta del producto: cuanto más lejos del borde, más volumen.
// El resultado es una figura redondeada (como un objeto real) en vez de un recorte plano.

// Distancia de cada pixel del producto al fondo más cercano (chamfer 3-4, dos pasadas)
function distanceField(mask, w, h) {
  const INF = 1e9
  const d = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? INF : 0
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x])
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!d[i]) continue
      d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4)
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      if (!d[i]) continue
      d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4)
    }
  }
  for (let i = 0; i < w * h; i++) d[i] /= 3 // a pixeles
  return d
}

/**
 * @param cutout resultado de makeCutout (mask, mw, mh, imageAspect)
 * @param maxW, maxH tamaño máximo en unidades 3D
 * @param thickness grosor relativo (0.35 = el centro sobresale 35 % del ancho local)
 */
export function buildInflatedGeometry({ mask, mw: w, mh: h }, maxW, maxH, thickness = 0.55) {
  const dist = distanceField(mask, w, h)

  let minX = w, minY = h, maxX = 0, maxY = 0, dmax = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!mask[i]) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (dist[i] > dmax) dmax = dist[i]
    }
  }
  const bw = maxX - minX + 1, bh = maxY - minY + 1
  const k = Math.min(maxW / bw, maxH / bh) // tamaño de un pixel en unidades 3D
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2

  // Perfil de sección circular, con el centro plano en objetos muy anchos (ej. una bocina)
  const cap = Math.min(dmax, Math.max(bw, bh) * 0.22)
  const profile = (dd) => {
    const t = Math.min(dd, cap) / cap
    return cap * Math.sqrt(1 - (1 - t) * (1 - t))
  }
  const edge = profile(1)

  // Un vértice por pixel del producto
  const index = new Int32Array(w * h).fill(-1)
  const px = [], py = [], pz = [], uu = [], vv = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!mask[i]) continue
      index[i] = px.length
      px.push((x - cx) * k)
      py.push(-(y - cy) * k)
      pz.push(Math.max(0, profile(dist[i]) - edge) * k * thickness)
      uu.push((x + 0.5) / w)
      vv.push(1 - (y + 0.5) / h)
    }
  }
  const n = px.length

  // Suaviza el contorno escalonado (los vértices interiores no se mueven)
  for (let iter = 0; iter < 3; iter++) {
    const nx = px.slice(), ny = py.slice()
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = index[y * w + x]
        if (a < 0 || pz[a] > 0) continue // solo vértices del borde
        let sx = 0, sy = 0, c = 0
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + ox, yy = y + oy
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
          const b = index[yy * w + xx]
          if (b < 0) continue
          sx += px[b]; sy += py[b]; c++
        }
        if (c) {
          nx[a] = (px[a] + sx) / (c + 1)
          ny[a] = (py[a] + sy) / (c + 1)
        }
      }
    }
    for (let a = 0; a < n; a++) { px[a] = nx[a]; py[a] = ny[a] }
  }

  // Cara frontal (z+) y trasera (z-) comparten el contorno (z = 0), así la figura queda cerrada
  const positions = new Float32Array(n * 2 * 3)
  const uvs = new Float32Array(n * 2 * 2)
  for (let a = 0; a < n; a++) {
    positions.set([px[a], py[a], pz[a]], a * 3)
    positions.set([px[a], py[a], -pz[a]], (a + n) * 3)
    uvs.set([uu[a], vv[a]], a * 2)
    uvs.set([uu[a], vv[a]], (a + n) * 2)
  }
  const tris = []
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const a = index[y * w + x], b = index[y * w + x + 1]
      const c = index[(y + 1) * w + x], d = index[(y + 1) * w + x + 1]
      const quad = []
      if (a >= 0 && c >= 0 && b >= 0) quad.push([a, c, b])
      if (b >= 0 && c >= 0 && d >= 0) quad.push([b, c, d])
      if (!quad.length) {
        if (a >= 0 && c >= 0 && d >= 0) quad.push([a, c, d])
        else if (a >= 0 && d >= 0 && b >= 0) quad.push([a, d, b])
      }
      for (const [p, q, r] of quad) {
        tris.push(p, q, r) // frente
        tris.push(r + n, q + n, p + n) // reverso (orden invertido)
      }
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(tris)
  geo.computeVertexNormals()
  return { geo, height: bh * k }
}
