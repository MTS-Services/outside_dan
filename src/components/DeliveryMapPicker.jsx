import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/client';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default marker icons with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function DeliveryMapPicker({
  zone,
  streetName,
  houseNumber,
  onStreetNameChange,
  onHouseNumberChange,
  onPinSet,
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [mapError, setMapError] = useState('');

  async function reverseAt(lat, lng) {
    setLoading(true);
    setMapError('');
    try {
      const { data } = await api.get('/geocode/reverse', { params: { lat, lon: lng } });
      if (zone?.postalCode && data.postalCode && data.postalCode !== zone.postalCode) {
        setMapError(`Diese Position liegt in PLZ ${data.postalCode}, nicht in ${zone.postalCode}. Bitte innerhalb deiner Lieferzone wählen.`);
        onStreetNameChange('');
        onPinSet(null);
        return;
      }
      onStreetNameChange(data.streetName || '');
      if (data.houseNumber) onHouseNumberChange(data.houseNumber);
      onPinSet({ lat, lon: lng, postalCode: data.postalCode });
    } catch (err) {
      setMapError(err.response?.data?.error || err.displayMessage || 'Adresse konnte nicht ermittelt werden');
      onPinSet(null);
    } finally {
      setLoading(false);
    }
  }

  function placeMarker(lat, lng, { reverse = true } = {}) {
    const map = mapInstance.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        reverseAt(pos.lat, pos.lng);
      });
      markerRef.current = marker;
    }
    if (reverse) reverseAt(lat, lng);
  }

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current, {
      center: [47.4, 15.2],
      zoom: 12,
      scrollWheelZoom: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    mapInstance.current.on('click', (e) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!zone?.postalCode || !mapInstance.current) return;
    let cancelled = false;
    setLoading(true);
    setMapError('');
    onStreetNameChange('');
    onHouseNumberChange('');
    onPinSet(null);
    if (markerRef.current) {
      mapInstance.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    api.get('/geocode/zone-center', {
      params: { postalCode: zone.postalCode, label: zone.label || '' },
    })
      .then(({ data }) => {
        if (cancelled || !mapInstance.current) return;
        mapInstance.current.setView([data.lat, data.lon], 14);
      })
      .catch(() => {
        if (!cancelled) setMapError('Karte für dieses Gebiet konnte nicht geladen werden.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [zone?.id]);

  if (!zone) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/50 text-center">
        Bitte zuerst eine Lieferzone auswählen, um die Karte zu öffnen.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/60">
        Tippe auf die Karte, um deine Straße zu wählen. Danach nur noch die Hausnummer eintragen.
      </p>
      <div className="relative rounded-xl overflow-hidden border border-white/10">
        <div ref={mapRef} className="h-56 sm:h-64 w-full z-0" />
        {loading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-sm text-white/80 z-10 pointer-events-none">
            Wird geladen…
          </div>
        )}
      </div>
      {mapError && (
        <p className="text-sm text-red-400/90 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{mapError}</p>
      )}
      {streetName && (
        <div className="text-sm text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          Gewählte Straße: <strong>{streetName}</strong>
          <span className="text-white/50"> · {zone.postalCode}{zone.label ? ` – ${zone.label}` : ''}</span>
        </div>
      )}
    </div>
  );
}
