import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, RoundedBox, Float, ContactShadows } from '@react-three/drei'

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
        setTexture(tex)
      },
      undefined,
      () => !cancelled && setTexture(null),
    )
    return () => {
      cancelled = true
    }
  }, [url])
  return texture
}

function ProductBox({ color, texture }) {
  const ref = useRef()
  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.4
  })
  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.6}>
      <group ref={ref}>
        <RoundedBox args={[2, 2.4, 1.2]} radius={0.12} smoothness={4}>
          <meshStandardMaterial color={color} roughness={0.35} metalness={0.15} />
        </RoundedBox>
        {texture && (
          <>
            <mesh position={[0, 0, 0.605]}>
              <planeGeometry args={[1.8, 2.2]} />
              <meshStandardMaterial map={texture} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, -0.605]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[1.8, 2.2]} />
              <meshStandardMaterial map={texture} roughness={0.5} />
            </mesh>
          </>
        )}
      </group>
    </Float>
  )
}

export function Product3DViewer({ product }) {
  const color = colorFromName(product?.name)
  const texture = useImageTexture(product?.image_url)
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="h-72 w-full">
        <Canvas camera={{ position: [0, 1, 5], fov: 45 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 5, 2]} intensity={1.2} />
          <pointLight position={[-3, -2, -2]} intensity={0.6} color="#818cf8" />
          <ProductBox color={color} texture={texture} />
          <ContactShadows position={[0, -1.8, 0]} opacity={0.5} scale={8} blur={2.5} />
          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      </div>
      <div className="border-t border-slate-800 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wider text-indigo-400">Producto destacado</p>
        {product ? (
          <div className="mt-1 flex items-baseline justify-between gap-4">
            <h2 className="truncate text-lg font-semibold">{product.name}</h2>
            <span className="text-lg font-semibold tabular-nums">${Number(product.price).toFixed(2)}</span>
          </div>
        ) : (
          <h2 className="mt-1 text-lg font-semibold text-slate-500">Aún no hay productos</h2>
        )}
        <p className="mt-2 text-xs text-slate-500">Modelo 3D interactivo · arrastra para rotar</p>
      </div>
    </div>
  )
}
