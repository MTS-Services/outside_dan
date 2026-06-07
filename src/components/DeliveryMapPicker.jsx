import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/client';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function DeliveryMapPicker({
  zone,
  onStreetNameChange,
  onHouseNumberChange,
  onPinSet,
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const zoneRef = useRef(zone);
  const onStreetNameChangeRef = useRef(onStreetNameChange);
  const onHouseNumberChangeRef = useRef(onHouseNumberChange);
  const onPinSetRef = useRef(onPinSet);
  const reverseAtRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const [streetName, setStreetName] = useState('');

  zoneRef.current = zone;
  onStreetNameChangeRef.current = onStreetNameChange;
  onHouseNumberChangeRef.current = onHouseNumberChange;
  onPinSetRef.current = onPinSet;

  const reverseAt = useCallback(async (lat, lng) => {
    const activeZone = zoneRef.current;
    setLoading(true);
    setMapError('');
    try {
      const { data } = await api.get('/geocode/reverse', { params: { lat, lon: lng } });
      if (activeZone?.postalCode && data.postalCode && data.postalCode !== activeZone.postalCode) {
        setMapError(`Diese Position liegt in PLZ ${data.postalCode}, nicht in ${activeZone.postalCode}. Bitte innerhalb deiner Lieferzone wählen.`);
        setStreetName('');
        onStreetNameChangeRef.current('');
        onPinSetRef.current(null);
        return;
      }
      setStreetName(data.streetName || '');
      onStreetNameChangeRef.current(data.streetName || '');
      if (data.houseNumber) onHouseNumberChangeRef.current(data.houseNumber);
      onPinSetRef.current({ lat, lon: lng, postalCode: data.postalCode });
    } catch (err) {
      setMapError(err.response?.data?.error || err.displayMessage || 'Adresse konnte nicht ermittelt werden');
      setStreetName('');
      onStreetNameChangeRef.current('');
      onPinSetRef.current(null);
    } finally {
      setLoading(false);
    }
  }, []);

  reverseAtRef.current = reverseAt;

  // Init map only after zone is selected and the container is in the DOM
  useEffect(() => {
    if (!zone?.id) return undefined;

    let cancelled = false;

    const init = () => {
      if (cancelled || !mapRef.current) return;

      if (!mapInstance.current) {
        const map = L.map(mapRef.current, {
          center: [47.4, 15.2],
          zoom: 12,
          scrollWheelZoom: true,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        map.on('click', (e) => {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const m = L.marker([lat, lng], { draggable: true }).addTo(map);
            m.on('dragend', () => {
              const pos = m.getLatLng();
              reverseAtRef.current?.(pos.lat, pos.lng);
            });
            markerRef.current = m;
          }
          reverseAtRef.current?.(lat, lng);
        });

        mapInstance.current = map;
        requestAnimationFrame(() => {
          map.invalidateSize();
          setTimeout(() => map.invalidateSize(), 200);
        });
      }

      setLoading(true);
      setMapError('');
      setStreetName('');
      onStreetNameChangeRef.current('');
      onHouseNumberChangeRef.current('');
      onPinSetRef.current(null);

      if (markerRef.current && mapInstance.current) {
        mapInstance.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }

      api.get('/geocode/zone-center', {
        params: { postalCode: zone.postalCode, label: zone.label || '' },
      })
        .then(({ data }) => {
          if (cancelled || !mapInstance.current) return;
          mapInstance.current.setView([data.lat, data.lon], 14);
          requestAnimationFrame(() => mapInstance.current?.invalidateSize());
        })
        .catch(() => {
          if (!cancelled) setMapError('Karte für dieses Gebiet konnte nicht geladen werden.');
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    };

    // Defer until React has painted the map container
    const t = setTimeout(init, 0);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [zone?.id]);

  // Destroy map on unmount
  useEffect(() => () => {
    mapInstance.current?.remove();
    mapInstance.current = null;
    markerRef.current = null;
  }, []);

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
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-ink-800">
        <div
          ref={mapRef}
          className="delivery-map h-56 sm:h-64 w-full"
          style={{ minHeight: '14rem' }}
        />
        {loading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-sm text-white/80 z-[500] pointer-events-none">
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
