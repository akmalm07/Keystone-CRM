import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { MapPin } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import './PropertyMap.css'

const properties = [
  { name: 'West Village townhouse', neighborhood: 'Manhattan', coordinates: [40.7352, -74.0048] },
  { name: 'SoHo loft', neighborhood: 'Manhattan', coordinates: [40.7237, -74.0003] },
  { name: 'DUMBO condo', neighborhood: 'Brooklyn', coordinates: [40.7033, -73.9892] },
  { name: 'Williamsburg apartment', neighborhood: 'Brooklyn', coordinates: [40.7165, -73.9618] },
  { name: 'Long Island City condo', neighborhood: 'Queens', coordinates: [40.7448, -73.9535] },
] satisfies { name: string; neighborhood: string; coordinates: [number, number] }[]

function propertyIcon(active: boolean) {
  return L.divIcon({ className: active ? 'property-dot property-dot-active' : 'property-dot', iconSize: [18, 18] })
}

export function PropertyMap() {
  const container = useRef<HTMLDivElement>(null)
  const markers = useRef<L.Marker[]>([])
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    if (!container.current) return
    const map = L.map(container.current, { scrollWheelZoom: false, zoomControl: false, zoomSnap: 0.25, minZoom: 10, maxZoom: 17 })
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    markers.current = properties.map((property, index) =>
      L.marker(property.coordinates, { icon: propertyIcon(false), title: property.name, alt: property.name })
        .on('click', () => setSelected(index))
        .addTo(map),
    )
    const bounds = L.latLngBounds(properties.map(property => property.coordinates))
    function fitProperties() {
      map.invalidateSize({ pan: false })
      const { x: width, y: height } = map.getSize()
      map.fitBounds(bounds, {
        paddingTopLeft: width >= 1024 ? [Math.round(width * .51), 48] : [28, Math.round(height * .49)],
        paddingBottomRight: [44, 96],
        maxZoom: 13,
        animate: false,
      })
    }
    const resize = new ResizeObserver(fitProperties)
    resize.observe(container.current)
    return () => { resize.disconnect(); map.remove(); markers.current = [] }
  }, [])

  useEffect(() => {
    markers.current.forEach((marker, index) => {
      marker.setIcon(propertyIcon(index === selected))
      marker.setZIndexOffset(index === selected ? 100 : 0)
    })
  }, [selected])

  const property = properties[selected]
  return (
    <figure className="absolute inset-0">
      <div ref={container} className="keystone-property-map" aria-label="Interactive map of sample properties in New York City" />
      <figcaption className="pointer-events-none absolute bottom-7 right-3 flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 shadow-sm sm:right-6" aria-live="polite">
        <MapPin size={16} className="shrink-0 text-slate-700" aria-hidden="true" />
        <div><strong className="block text-sm">{property.name}</strong><span className="text-xs text-slate-600">{property.neighborhood} · Sample property</span></div>
      </figcaption>
    </figure>
  )
}
