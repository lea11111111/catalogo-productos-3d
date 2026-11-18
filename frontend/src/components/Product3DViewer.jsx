import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { makeCutout } from '../lib/cutout'
import { buildInflatedGeometry } from '../lib/inflate'
import { OrbitControls, RoundedBox, Float, Environment, Lightformer, Sparkles, MeshReflectorMaterial } from '@react-three/drei'

// Color estable a partir del nombre del producto
function colorFromName(name = '') {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return `hsl(${Math.abs(hash) % 360}, 70%, 55%)`
}

// La tarjeta toma la proporción de cada foto, sin recortarla, dentro de este tamaño máximo
const MAX_W = 2.8
const MAX_H = 2.6
const CARD_D = 0.14
const CARD_BOTTOM = -1.0 // borde inferior del producto: flota un poco por encima del pedestal
// Tamaño máximo de la figura recortada (algo menor que la tarjeta para que respire)
const CUT_MAX_W = 2.5
const CUT_MAX_H = 2.2

function faceSize(aspect = 0.8) {
  return aspect > MAX_W / MAX_H ? [MAX_W, MAX_W / aspect] : [MAX_H * aspect, MAX_H]
}

// Carga la imagen del producto como textura; si falla (CORS, URL rota) devuelve null
function useImageTexture(url) {
  const [texture, setTexture] = useState(null)
  useEffect(() => {
    setTexture(null)
    if (!url) return
    let cancelled = false
    let loaded = null
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    const onLoad = (tex) => {
      if (cancelled) return tex.dispose()
      tex.colorSpace = THREE.SRGBColorSpace
      tex.userData.aspect = tex.image.width / tex.image.height || 0.8
      loaded = tex
      setTexture(tex)
    }
    // Muchas tiendas no permiten usar sus fotos en WebGL (CORS).
    // Si falla, reintentamos a través de un proxy de imágenes público que sí lo permite.
    const viaProxy = `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=800&output=webp`
    loader.load(url, onLoad, undefined, () => {
      if (cancelled) return
      loader.load(viaProxy, onLoad, undefined, () => !cancelled && setTexture(null))
    })
    return () => {
      cancelled = true
      // Libera de la GPU la textura anterior al cambiar de imagen o desmontar
      loaded?.dispose()
    }
  }, [url])
  return texture
}

// Gira, flota y "aparece" con un pequeño rebote al cambiar de producto
function Showcase({ productKey, height, children }) {
  const spin = useRef()
  const pop = useRef()
  const scale = useRef(0.6)
  useEffect(() => {
    scale.current = 0.6
  }, [productKey])
  useFrame((_, delta) => {
    spin.current.rotation.y += delta * 0.35
    scale.current += (1 - scale.current) * Math.min(1, delta * 6)
    pop.current.scale.setScalar(scale.current)
  })
  return (
    <Float speed={2} rotationIntensity={0.25} floatIntensity={0.5} floatingRange={[0, 0.25]}>
      <group ref={pop} position={[0, CARD_BOTTOM + height / 2 + 0.08, 0]}>
        <group ref={spin}>{children}</group>
      </group>
    </Float>
  )
}

// Tarjeta con la foto (respaldo cuando el fondo de la foto no se puede recortar)
function CardModel({ color, texture }) {
  const [FACE_W, FACE_H] = faceSize(texture?.userData.aspect)
  return (
    <>
      <RoundedBox args={[FACE_W + 0.16, FACE_H + 0.16, CARD_D]} radius={0.06} smoothness={4}>
        <meshStandardMaterial color="#0f172a" roughness={0.25} metalness={0.7} emissive={color} emissiveIntensity={0.12} />
      </RoundedBox>
      {texture ? (
        <>
          <mesh position={[0, 0, CARD_D / 2 + 0.005]}>
            <planeGeometry args={[FACE_W, FACE_H]} />
            <meshStandardMaterial map={texture} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, -CARD_D / 2 - 0.005]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[FACE_W, FACE_H]} />
            <meshStandardMaterial map={texture} roughness={0.5} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, 0, CARD_D / 2 + 0.005]}>
          <planeGeometry args={[FACE_W, FACE_H]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      )}
    </>
  )
}

// Figura inflada: la silueta del producto con volumen redondeado
function useCutoutGeometry(cutout) {
  return useMemo(() => (cutout ? buildInflatedGeometry(cutout, CUT_MAX_W, CUT_MAX_H) : null), [cutout])
}

function CutoutModel({ cutout }) {
  const shape = useCutoutGeometry(cutout)
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(cutout.canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [cutout])
  useEffect(() => () => {
    texture.dispose()
    shape?.geo.dispose()
  }, [texture, shape])
  return (
    <mesh geometry={shape.geo}>
      {/* emissiveMap: la foto conserva sus colores reales aunque la luz sea tenue */}
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive="#ffffff"
        emissiveIntensity={0.55}
        roughness={0.38}
        side={THREE.DoubleSide}
        metalness={0.05}
      />
    </mesh>
  )
}

// Intenta recortar el fondo de la foto; status: 'idle' | 'loading' | 'ok' | 'fail'
function useCutout(url) {
  const [state, setState] = useState({ url: null, status: 'idle', cutout: null })
  useEffect(() => {
    if (!url) return
    let cancelled = false
    setState({ url, status: 'loading', cutout: null })
    makeCutout(url)
      .then((cutout) => !cancelled && setState({ url, status: cutout ? 'ok' : 'fail', cutout }))
      .catch(() => !cancelled && setState({ url, status: 'fail', cutout: null }))
    return () => {
      cancelled = true
    }
  }, [url])
  if (!url) return { status: 'idle', cutout: null }
  return state.url === url ? state : { status: 'loading', cutout: null }
}

function ProductModel({ product, color }) {
  const url = product?.image_url
  const { status, cutout } = useCutout(url)
  const shape = useCutoutGeometry(status === 'ok' ? cutout : null)
  // Solo se usa la tarjeta si no hay foto o si el recorte falló
  const cardTexture = useImageTexture(status === 'fail' ? url : null)
  if (status === 'loading') return null
  if (status === 'ok' && shape) {
    return (
      <Showcase productKey={product?.id} height={shape.height}>
        <CutoutModel cutout={cutout} />
      </Showcase>
    )
  }
  const [, h] = faceSize(cardTexture?.userData.aspect)
  return (
    <Showcase productKey={product?.id} height={h}>
      <CardModel color={color} texture={cardTexture} />
    </Showcase>
  )
}

// Pedestal de exhibición con un anillo de luz del color del producto
function Pedestal({ color }) {
  return (
    <group position={[0, -1.6, 0]}>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[1.25, 1.35, 0.24, 64]} />
        <meshStandardMaterial color="#1e293b" roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 1.13, 64]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Superficie tipo espejo que refleja el producto */}
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.05, 64]} />
        <MeshReflectorMaterial
          resolution={512}
          blur={[300, 80]}
          mixBlur={1}
          mixStrength={3}
          mirror={0.7}
          roughness={0.6}
          depthScale={0.6}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0b1120"
          metalness={0.6}
        />
      </mesh>
    </group>
  )
}

export function Product3DViewer({ product, loading = false }) {
  const color = colorFromName(product?.name)
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="h-80 w-full cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [0, 0.2, 6.3], fov: 42 }} dpr={[1, 2]}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[0, 2, 6]} intensity={1.1} />
          <spotLight position={[4, 6, 4]} angle={0.4} penumbra={0.8} intensity={60} />
          {/* Luz de contorno por detrás: hace resaltar la silueta */}
          <pointLight position={[0, 1.5, -3]} intensity={18} color="#c7d2fe" />
          <pointLight position={[-3, -1, -2]} intensity={8} color="#818cf8" />
          {/* Iluminación de estudio generada localmente (sin descargar HDR) */}
          <Environment resolution={256}>
            <Lightformer form="rect" intensity={2} position={[0, 4, 3]} scale={[6, 2, 1]} />
            <Lightformer form="rect" intensity={1} color="#818cf8" position={[-4, 1, -2]} scale={[2, 4, 1]} />
            <Lightformer form="rect" intensity={1} color="#f0abfc" position={[4, 1, -2]} scale={[2, 4, 1]} />
          </Environment>
          <ProductModel product={product} color={color} />
          <Pedestal color={color} />
          <Sparkles count={30} scale={[5, 3.5, 3]} size={2} speed={0.3} opacity={0.5} color={color} />
          <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.9} />
        </Canvas>
      </div>
      <div className="border-t border-slate-800 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">Vitrina 3D</p>
        {product ? (
          <>
            <div className="mt-1 flex items-baseline justify-between gap-4">
              <h2 className="truncate text-lg font-semibold">{product.name}</h2>
              <span className="text-lg font-semibold tabular-nums">${Number(product.price).toFixed(2)}</span>
            </div>
            <p className={`mt-1 text-xs ${product.stock > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {product.stock > 0 ? `${product.stock} en stock` : 'Agotado'}
            </p>
          </>
        ) : (
          <h2 className="mt-1 text-lg font-semibold text-slate-500">{loading ? 'Cargando…' : 'Aún no hay productos'}</h2>
        )}
        <p className="mt-2 text-xs text-slate-500">Arrastra para rotar · toca un producto del catálogo para verlo aquí</p>
      </div>
    </div>
  )
}
