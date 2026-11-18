import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, RoundedBox, Float, ContactShadows } from '@react-three/drei'

// Color estable a partir del nombre del producto
function colorFromName(name = '') {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return `hsl(${Math.abs(hash) % 360}, 70%, 55%)`
}

function ProductBox({ color }) {
  const ref = useRef()
  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.4
  })
  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.6}>
      <RoundedBox ref={ref} args={[2, 2.4, 1.2]} radius={0.12} smoothness={4}>
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.15} />
      </RoundedBox>
    </Float>
  )
}

export function Product3DViewer({ product }) {
  const color = colorFromName(product?.name)
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="h-72 w-full">
        <Canvas camera={{ position: [0, 1, 5], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 5, 2]} intensity={1.2} />
          <pointLight position={[-3, -2, -2]} intensity={0.6} color="#818cf8" />
          <ProductBox color={color} />
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
