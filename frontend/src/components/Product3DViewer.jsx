import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, RoundedBox, Float, ContactShadows, Environment, Lightformer, Sparkles } from '@react-three/drei'

// Color estable a partir del nombre del producto
function colorFromName(name = '') {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return `hsl(${Math.abs(hash) % 360}, 70%, 55%)`
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
    loader.load(
      url,
      (tex) => {
        if (cancelled) return tex.dispose()
        tex.colorSpace = THREE.SRGBColorSpace
        // Recorte tipo "cover" para la cara de 1.8 x 2.2
        const imgAspect = tex.image.width / tex.image.height
        const faceAspect = 1.8 / 2.2
        if (imgAspect > faceAspect) {
          tex.repeat.set(faceAspect / imgAspect, 1)
          tex.offset.set((1 - tex.repeat.x) / 2, 0)
        } else {
          tex.repeat.set(1, imgAspect / faceAspect)
          tex.offset.set(0, (1 - tex.repeat.y) / 2)
        }
        loaded = tex
        setTexture(tex)
      },
      undefined,
      () => !cancelled && setTexture(null),
    )
    return () => {
      cancelled = true
      // Libera de la GPU la textura anterior al cambiar de imagen o desmontar
      loaded?.dispose()
    }
  }, [url])
  return texture
}

function ProductBox({ color, texture, productKey }) {
  const spin = useRef()
  const pop = useRef()
  const scale = useRef(0.6)
  // Al cambiar de producto, la caja "aparece" con un pequeño rebote
  useEffect(() => {
    scale.current = 0.6
  }, [productKey])
  useFrame((_, delta) => {
    spin.current.rotation.y += delta * 0.4
    scale.current += (1 - scale.current) * Math.min(1, delta * 6)
    pop.current.scale.setScalar(scale.current)
  })
  return (
    <Float speed={2} rotationIntensity={0.25} floatIntensity={0.5} floatingRange={[0, 0.25]}>
      <group ref={pop} position={[0, 0.35, 0]}>
        <group ref={spin}>
          <RoundedBox args={[2, 2.4, 1.2]} radius={0.12} smoothness={4}>
            <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} envMapIntensity={1.2} />
          </RoundedBox>
          {texture && (
            <>
              <mesh position={[0, 0, 0.605]}>
                <planeGeometry args={[1.8, 2.2]} />
                <meshStandardMaterial map={texture} roughness={0.45} />
              </mesh>
              <mesh position={[0, 0, -0.605]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[1.8, 2.2]} />
                <meshStandardMaterial map={texture} roughness={0.45} />
              </mesh>
            </>
          )}
        </group>
      </group>
    </Float>
  )
}

// Pedestal de exhibición con un anillo de luz del color del producto
function Pedestal({ color }) {
  return (
    <group position={[0, -1.35, 0]}>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[1.7, 1.85, 0.4, 64]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.45, 1.6, 64]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function Product3DViewer({ product, loading = false }) {
  const color = colorFromName(product?.name)
  const texture = useImageTexture(product?.image_url)
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="h-80 w-full cursor-grab active:cursor-grabbing">
        <Canvas camera={{ position: [0, 1.2, 6], fov: 45 }} dpr={[1, 2]}>
          <ambientLight intensity={0.35} />
          <spotLight position={[4, 6, 4]} angle={0.4} penumbra={0.8} intensity={60} />
          <pointLight position={[-3, -1, -2]} intensity={8} color="#818cf8" />
          {/* Iluminación de estudio generada localmente (sin descargar HDR) */}
          <Environment resolution={256}>
            <Lightformer form="rect" intensity={2} position={[0, 4, 3]} scale={[6, 2, 1]} />
            <Lightformer form="rect" intensity={1} color="#818cf8" position={[-4, 1, -2]} scale={[2, 4, 1]} />
            <Lightformer form="rect" intensity={1} color="#f0abfc" position={[4, 1, -2]} scale={[2, 4, 1]} />
          </Environment>
          <ProductBox color={color} texture={texture} productKey={product?.id} />
          <Pedestal color={color} />
          <Sparkles count={30} scale={[5, 3.5, 3]} size={2} speed={0.3} opacity={0.5} color={color} />
          <ContactShadows position={[0, -1.34, 0]} opacity={0.6} scale={5} blur={2} far={3} />
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
