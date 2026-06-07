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

const GEO_ERRORS = {
  1: 'Standortzugriff verweigert. Bitte in den Browser-Einstellungen erlauben oder die Karte antippen.',
  2: 'Standort konnte nicht ermittelt werden.',
  3: 'Standortabfrage hat zu lange gedauert. Bitte erneut versuchen.',
};

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
  const placePinAtRef = useRef(null);
  const autoLocateDoneRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
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

  const placePinAt = useCallback((lat, lng, { pan = true } = {}) => {
    const map = mapInstance.current;
    if (!map) return;
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
    if (pan) map.setView([lat, lng], Math.max(map.getZoom(), 16));
    reverseAtRef.current?.(lat, lng);
  }, []);

  reverseAtRef.current = reverseAt;
  placePinAtRef.current = placePinAt;

  const requestUserLocation = useCallback(({ silent = false } = {}) => {
    if (!navigator.geolocation) {
      if (!silent) setMapError('Standort ist in diesem Browser nicht verfügbar. Bitte die Karte antippen.');
      return;
    }
    setLocating(true);
    if (!silent) setMapError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        placePinAtRef.current?.(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        if (!silent) setMapError(GEO_ERRORS[err.code] || 'Standort konnte nicht ermittelt werden.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, []);

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
          placePinAtRef.current?.(e.latlng.lat, e.latlng.lng);
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

          // Auto-detect location once per zone (browser asks permission)
          if (autoLocateDoneRef.current !== zone.id) {
            autoLocateDoneRef.current = zone.id;
            setTimeout(() => requestUserLocation({ silent: true }), 400);
          }
        })
        .catch(() => {
          if (!cancelled) setMapError('Karte für dieses Gebiet konnte nicht geladen werden.');
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    };

    const t = setTimeout(init, 0);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [zone?.id, requestUserLocation]);

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
        Wir versuchen deinen Standort automatisch zu erkennen (Browser fragt nach Erlaubnis).
        Alternativ: Karte antippen oder unten den Standort-Button nutzen.
      </p>
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-ink-800">
        <div
          ref={mapRef}
          className="delivery-map h-72 sm:h-96 md:h-[28rem] w-full"
          style={{ minHeight: '18rem' }}
        />
        <button
          type="button"
          onClick={() => requestUserLocation()}
          disabled={loading || locating}
          className="absolute top-3 right-3 z-[500] px-3 py-2 rounded-lg bg-brand-500 text-ink-900 text-xs font-bold shadow-lg hover:bg-brand-400 transition disabled:opacity-50"
        >
          {locating ? 'Standort…' : '📍 Mein Standort'}
        </button>
        {(loading || locating) && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-sm text-white/80 z-[400] pointer-events-none">
            {locating ? 'Standort wird ermittelt…' : 'Wird geladen…'}
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
