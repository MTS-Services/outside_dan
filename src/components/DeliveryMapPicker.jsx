import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../api/client';

const GEO_ERRORS = {
  1: 'Standortzugriff verweigert. Bitte in den Browser-Einstellungen erlauben oder die Karte antippen.',
  2: 'Standort konnte nicht ermittelt werden.',
  3: 'Standortabfrage hat zu lange gedauert. Bitte erneut versuchen.',
};

let mapsLoaderPromise = null;
let mapsConfigCache = null;
let mapsConfigPromise = null;

function fetchMapsConfig() {
  if (mapsConfigCache) return Promise.resolve(mapsConfigCache);
  if (!mapsConfigPromise) {
    mapsConfigPromise = api.get('/maps/config')
      .then((r) => {
        mapsConfigCache = r.data;
        return r.data;
      })
      .catch((err) => {
        mapsConfigPromise = null;
        throw err;
      });
  }
  return mapsConfigPromise;
}

function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsLoaderPromise) return mapsLoaderPromise;
  mapsLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry&language=de&region=AT`;
    script.async = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Google Maps konnte nicht geladen werden'));
    document.head.appendChild(script);
  });
  return mapsLoaderPromise;
}

function parseAddressComponents(components = []) {
  const get = (type) => components.find((c) => c.types.includes(type))?.long_name || '';
  return {
    streetName: get('route') || get('premise') || get('subpremise'),
    houseNumber: get('street_number'),
    postalCode: get('postal_code'),
    city: get('locality') || get('postal_town') || get('administrative_area_level_3') || get('sublocality'),
  };
}

export default function DeliveryMapPicker({
  zone,
  onStreetNameChange,
  onHouseNumberChange,
  onPinSet,
  onRouteCheck,
}) {
  const mapRef = useRef(null);
  const searchWrapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const zoneCenterRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const geocoderRef = useRef(null);
  const routePolylineRef = useRef(null);
  const restaurantMarkerRef = useRef(null);
  const initializedZoneIdRef = useRef(null);
  const zoneRef = useRef(zone);
  const onStreetNameChangeRef = useRef(onStreetNameChange);
  const onHouseNumberChangeRef = useRef(onHouseNumberChange);
  const onPinSetRef = useRef(onPinSet);
  const onRouteCheckRef = useRef(onRouteCheck);
  const reverseAtRef = useRef(null);
  const placePinAtRef = useRef(null);
  const applyPlaceResultRef = useRef(null);

  const [mapsApiKey, setMapsApiKey] = useState(null);
  const [maxDeliveryMinutes, setMaxDeliveryMinutes] = useState(45);
  const [pinCoords, setPinCoords] = useState(null);
  const [inputMode, setInputMode] = useState('map');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [routing, setRouting] = useState(false);
  const [showingRoute, setShowingRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [mapError, setMapError] = useState('');
  const [streetName, setStreetName] = useState('');
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  zoneRef.current = zone;
  onStreetNameChangeRef.current = onStreetNameChange;
  onHouseNumberChangeRef.current = onHouseNumberChange;
  onPinSetRef.current = onPinSet;
  onRouteCheckRef.current = onRouteCheck;

  useEffect(() => {
    Promise.all([
      fetchMapsConfig(),
      api.get('/site-settings'),
    ])
      .then(([maps, settingsRes]) => {
        setMapsApiKey(maps.apiKey);
        const max = parseInt(settingsRes.data?.max_delivery_minutes, 10);
        setMaxDeliveryMinutes(Number.isFinite(max) && max > 0 ? max : maps.maxDeliveryMinutes || 45);
      })
      .catch(() => setMapError('Google Maps ist nicht konfiguriert.'));
  }, []);

  const clearRoute = useCallback(() => {
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }
    if (restaurantMarkerRef.current) {
      restaurantMarkerRef.current.setMap(null);
      restaurantMarkerRef.current = null;
    }
    setRouteInfo(null);
    setShowingRoute(false);
    onRouteCheckRef.current?.(null);
    if (markerRef.current && mapInstance.current) {
      markerRef.current.setMap(mapInstance.current);
    }
  }, []);

  const setPinAndClearRoute = useCallback((lat, lon) => {
    setPinCoords({ lat, lon });
    clearRoute();
  }, [clearRoute]);

  const applyPlaceResult = useCallback((parsed, lat, lng) => {
    const activeZone = zoneRef.current;
    if (activeZone?.postalCode && parsed.postalCode && parsed.postalCode !== activeZone.postalCode) {
      setMapError(`Diese Adresse liegt in PLZ ${parsed.postalCode}, nicht in ${activeZone.postalCode}. Bitte innerhalb deiner Lieferzone wählen.`);
      setStreetName('');
      onStreetNameChangeRef.current('');
      onPinSetRef.current(null);
      setPinCoords(null);
      clearRoute();
      return false;
    }
    if (!parsed.streetName) {
      setMapError('Keine Straße gefunden. Bitte genauer eingeben oder auf der Karte wählen.');
      return false;
    }
    setMapError('');
    setStreetName(parsed.streetName);
    setLocationBlocked(false);
    onStreetNameChangeRef.current(parsed.streetName);
    if (parsed.houseNumber) onHouseNumberChangeRef.current(parsed.houseNumber);
    onPinSetRef.current({ lat, lon: lng, postalCode: parsed.postalCode });
    setPinAndClearRoute(lat, lng);
    placePinAtRef.current?.(lat, lng, { pan: true, skipReverse: true });
    return true;
  }, [clearRoute, setPinAndClearRoute]);

  applyPlaceResultRef.current = applyPlaceResult;

  const reverseAt = useCallback(async (lat, lng) => {
    const activeZone = zoneRef.current;
    setLoading(true);
    setMapError('');
    try {
      const { data } = await api.get('/geocode/reverse', { params: { lat, lon: lng } });
      if (activeZone?.postalCode && data.postalCode && data.postalCode !== activeZone.postalCode) {
        setMapError(`Diese Position liegt in PLZ ${data.postalCode}, nicht in ${activeZone.postalCode}. Bitte innerhalb deiner Lieferzone wählen.`);
        setStreetName('');
        setAddressQuery('');
        onStreetNameChangeRef.current('');
        onPinSetRef.current(null);
        setPinCoords(null);
        clearRoute();
        return;
      }
      setStreetName(data.streetName || '');
      setAddressQuery([data.streetName, data.houseNumber].filter(Boolean).join(' '));
      setLocationBlocked(false);
      onStreetNameChangeRef.current(data.streetName || '');
      if (data.houseNumber) onHouseNumberChangeRef.current(data.houseNumber);
      onPinSetRef.current({ lat, lon: lng, postalCode: data.postalCode });
      setPinAndClearRoute(lat, lng);
    } catch (err) {
      setMapError(err.response?.data?.error || err.displayMessage || 'Adresse konnte nicht ermittelt werden');
      setStreetName('');
      setAddressQuery('');
      onStreetNameChangeRef.current('');
      onPinSetRef.current(null);
      setPinCoords(null);
      clearRoute();
    } finally {
      setLoading(false);
    }
  }, [clearRoute, setPinAndClearRoute]);

  const placePinAt = useCallback((lat, lng, { pan = true, skipReverse = false } = {}) => {
    const map = mapInstance.current;
    const maps = window.google?.maps;
    if (!map || !maps) return;
    const pos = { lat, lng };
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    } else {
      const marker = new maps.Marker({
        map,
        position: pos,
        draggable: true,
      });
      marker.addListener('dragend', () => {
        const p = marker.getPosition();
        reverseAtRef.current?.(p.lat(), p.lng());
      });
      markerRef.current = marker;
    }
    if (pan) {
      map.panTo(pos);
      if (map.getZoom() < 16) map.setZoom(16);
    }
    if (!skipReverse) reverseAtRef.current?.(lat, lng);
  }, []);

  reverseAtRef.current = reverseAt;
  placePinAtRef.current = placePinAt;

  const getPlaceDetails = useCallback((placeId) => new Promise((resolve, reject) => {
    if (!placesServiceRef.current) {
      reject(new Error('Places nicht bereit'));
      return;
    }
    placesServiceRef.current.getDetails(
      {
        placeId,
        fields: ['address_components', 'geometry', 'formatted_address'],
      },
      (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) {
          reject(new Error('Adresse konnte nicht geladen werden'));
          return;
        }
        resolve(place);
      },
    );
  }), []);

  const selectSuggestion = useCallback(async (prediction) => {
    setShowSuggestions(false);
    setAddressQuery(prediction.description);
    setSearching(true);
    setMapError('');
    try {
      const place = await getPlaceDetails(prediction.place_id);
      const parsed = parseAddressComponents(place.address_components);
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      applyPlaceResultRef.current?.(parsed, lat, lng);
    } catch (err) {
      setMapError(err.message || 'Adresse konnte nicht übernommen werden');
    } finally {
      setSearching(false);
    }
  }, [getPlaceDetails]);

  const geocodeManualAddress = useCallback(async () => {
    const query = addressQuery.trim();
    const activeZone = zoneRef.current;
    if (!query || query.length < 3) {
      setMapError('Bitte mindestens 3 Zeichen eingeben.');
      return;
    }
    const maps = window.google?.maps;
    if (!maps || !geocoderRef.current) return;

    setSearching(true);
    setMapError('');
    setShowSuggestions(false);
    try {
      const fullQuery = activeZone?.postalCode
        ? `${query}, ${activeZone.postalCode}, Österreich`
        : `${query}, Österreich`;

      const result = await new Promise((resolve, reject) => {
        geocoderRef.current.geocode({ address: fullQuery, region: 'AT' }, (results, status) => {
          if (status === 'OK' && results?.[0]) resolve(results[0]);
          else reject(new Error('Adresse nicht gefunden. Bitte einen Vorschlag aus der Liste wählen.'));
        });
      });

      const parsed = parseAddressComponents(result.address_components);
      const lat = result.geometry.location.lat();
      const lng = result.geometry.location.lng();
      if (applyPlaceResultRef.current?.(parsed, lat, lng)) {
        setAddressQuery(result.formatted_address || query);
      }
    } catch (err) {
      setMapError(err.message || 'Adresse konnte nicht gefunden werden');
    } finally {
      setSearching(false);
    }
  }, [addressQuery]);

  const showDeliveryRoute = useCallback(async () => {
    if (!pinCoords || !mapInstance.current) {
      setMapError('Bitte zuerst eine Adresse wählen.');
      return;
    }
    const maps = window.google?.maps;
    if (!maps) return;

    setRouting(true);
    setMapError('');

    try {
      const { data } = await api.get('/geocode/drive-route', {
        params: { lat: pinCoords.lat, lon: pinCoords.lon },
        timeout: 20000,
      });

      if (routePolylineRef.current) routePolylineRef.current.setMap(null);
      if (restaurantMarkerRef.current) restaurantMarkerRef.current.setMap(null);
      routePolylineRef.current = null;
      restaurantMarkerRef.current = null;

      const endPos = data.end || pinCoords;

      if (data.polyline && maps.geometry?.encoding) {
        routePolylineRef.current = new maps.Polyline({
          path: maps.geometry.encoding.decodePath(data.polyline),
          map: mapInstance.current,
          strokeColor: '#1a73e8',
          strokeWeight: 5,
          strokeOpacity: 0.9,
        });
      } else if (data.start && endPos) {
        routePolylineRef.current = new maps.Polyline({
          path: [data.start, endPos],
          map: mapInstance.current,
          strokeColor: '#1a73e8',
          strokeWeight: 4,
          strokeOpacity: 0.55,
        });
      }

      if (data.start) {
        restaurantMarkerRef.current = new maps.Marker({
          map: mapInstance.current,
          position: data.start,
          title: data.origin || 'Restaurant',
          label: { text: 'R', color: '#ffffff', fontWeight: '700' },
        });
      }

      if (markerRef.current) {
        markerRef.current.setPosition(endPos);
        markerRef.current.setMap(mapInstance.current);
      } else {
        markerRef.current = new maps.Marker({
          map: mapInstance.current,
          position: endPos,
          draggable: true,
        });
        markerRef.current.addListener('dragend', () => {
          const p = markerRef.current.getPosition();
          reverseAtRef.current?.(p.lat(), p.lng());
        });
      }

      setRouteInfo({
        minutes: data.minutes,
        distanceKm: data.distanceKm,
        durationText: data.durationText,
        distanceText: data.distanceText,
        maxMinutes: data.maxMinutes ?? maxDeliveryMinutes,
        tooFar: data.tooFar,
      });
      setShowingRoute(true);
      onRouteCheckRef.current?.({
        tooFar: data.tooFar,
        minutes: data.minutes,
        maxMinutes: data.maxMinutes ?? maxDeliveryMinutes,
      });

      const bounds = new maps.LatLngBounds();
      if (data.start) bounds.extend(data.start);
      bounds.extend(endPos);
      mapInstance.current.fitBounds(bounds, 48);
    } catch (err) {
      setMapError(err.response?.data?.error || err.displayMessage || 'Route konnte nicht angezeigt werden');
    } finally {
      setRouting(false);
    }
  }, [pinCoords, maxDeliveryMinutes]);

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMapError('Standort ist in diesem Browser nicht verfügbar. Bitte die Karte antippen.');
      return;
    }
    setLocating(true);
    setMapError('');
    setLocationBlocked(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        placePinAtRef.current?.(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocationBlocked(true);
          setMapError('');
        } else {
          setMapError(GEO_ERRORS[err.code] || 'Standort konnte nicht ermittelt werden.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    if (!zone?.id || !mapsApiKey || !mapRef.current) return undefined;

    const zoneChanged = initializedZoneIdRef.current !== zone.id;
    if (!zoneChanged && mapInstance.current) return undefined;

    let cancelled = false;

    const init = async () => {
      try {
        const maps = await loadGoogleMaps(mapsApiKey);
        if (cancelled || !mapRef.current) return;

        if (!mapInstance.current) {
          mapInstance.current = new maps.Map(mapRef.current, {
            center: { lat: 47.4, lng: 15.2 },
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            gestureHandling: 'greedy',
          });
          mapInstance.current.addListener('click', (e) => {
            setInputMode('map');
            placePinAtRef.current?.(e.latLng.lat(), e.latLng.lng());
          });
          placesServiceRef.current = new maps.places.PlacesService(mapInstance.current);
          autocompleteServiceRef.current = new maps.places.AutocompleteService();
          geocoderRef.current = new maps.Geocoder();
        }

        if (zoneChanged) {
          setLoading(true);
          setMapError('');
          setLocationBlocked(false);
          setStreetName('');
          setAddressQuery('');
          setSuggestions([]);
          onStreetNameChangeRef.current('');
          onHouseNumberChangeRef.current('');
          onPinSetRef.current(null);
          setPinCoords(null);
          clearRoute();
          if (markerRef.current) {
            markerRef.current.setMap(null);
            markerRef.current = null;
          }
          initializedZoneIdRef.current = zone.id;
        }

        const { data } = await api.get('/geocode/zone-center', {
          params: { postalCode: zone.postalCode, label: zone.label || '' },
        });
        if (cancelled || !mapInstance.current) return;
        zoneCenterRef.current = { lat: data.lat, lng: data.lon };
        if (zoneChanged) {
          mapInstance.current.setCenter({ lat: data.lat, lng: data.lon });
          mapInstance.current.setZoom(14);
        }
      } catch {
        if (!cancelled) setMapError('Google Karte konnte nicht geladen werden.');
      } finally {
        if (!cancelled && zoneChanged) setLoading(false);
      }
    };

    const t = setTimeout(init, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [zone?.id, mapsApiKey, clearRoute]);

  useEffect(() => {
    if (inputMode !== 'search' || !addressQuery.trim() || addressQuery.length < 3) {
      setSuggestions([]);
      return undefined;
    }
    if (!autocompleteServiceRef.current || !zoneRef.current) return undefined;

    const t = setTimeout(() => {
      const center = zoneCenterRef.current;
      const request = {
        input: addressQuery,
        componentRestrictions: { country: 'at' },
        types: ['address'],
      };
      if (center) {
        request.location = new window.google.maps.LatLng(center.lat, center.lng);
        request.radius = 25000;
      }
      autocompleteServiceRef.current.getPlacePredictions(request, (predictions, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !predictions?.length) {
          setSuggestions([]);
          return;
        }
        setSuggestions(predictions.slice(0, 6));
      });
    }, 300);

    return () => clearTimeout(t);
  }, [addressQuery, inputMode, zone?.id]);

  useEffect(() => {
    function onDocClick(e) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => () => {
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    mapInstance.current = null;
    autocompleteServiceRef.current = null;
    placesServiceRef.current = null;
    geocoderRef.current = null;
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }
    if (restaurantMarkerRef.current) {
      restaurantMarkerRef.current.setMap(null);
      restaurantMarkerRef.current = null;
    }
  }, []);

  if (!zone) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/50 text-center">
        Bitte zuerst eine Lieferzone auswählen, um die Karte zu öffnen.
      </div>
    );
  }

  const needsLocation = !streetName && !locating && inputMode === 'map';
  const mapOverlay = loading || locating || searching || !mapsApiKey;
  const busy = mapOverlay || routing;
  const canShowRoute = streetName && pinCoords && !showingRoute;

  return (
    <div className="space-y-3">
      <div className="flex rounded-xl border border-white/10 overflow-hidden text-sm font-semibold">
        <button
          type="button"
          onClick={() => setInputMode('map')}
          className={`flex-1 py-3 px-3 transition ${inputMode === 'map' ? 'bg-brand-500 text-ink-900' : 'bg-white/[0.03] text-white/60 hover:text-white/80'}`}
        >
          📍 Auf Karte wählen
        </button>
        <button
          type="button"
          onClick={() => setInputMode('search')}
          className={`flex-1 py-3 px-3 transition border-l border-white/10 ${inputMode === 'search' ? 'bg-brand-500 text-ink-900' : 'bg-white/[0.03] text-white/60 hover:text-white/80'}`}
        >
          ✏️ Adresse eingeben
        </button>
      </div>

      {inputMode === 'search' ? (
        <div ref={searchWrapRef} className="relative space-y-2">
          <p className="text-sm text-white/60">
            Straße und Hausnummer tippen – Vorschläge erscheinen automatisch. Die Karte springt zur gewählten Adresse.
          </p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={addressQuery}
              onChange={(e) => {
                setAddressQuery(e.target.value);
                setShowSuggestions(true);
                setMapError('');
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (suggestions.length === 1) selectSuggestion(suggestions[0]);
                  else geocodeManualAddress();
                }
              }}
              placeholder={`z. B. Hauptstraße 12, ${zone.postalCode}`}
              disabled={busy}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={geocodeManualAddress}
              disabled={busy || addressQuery.trim().length < 3}
              className="shrink-0 px-4 py-2 rounded-xl bg-brand-500/20 text-brand-300 font-bold hover:bg-brand-500/30 transition disabled:opacity-40"
            >
              {searching ? '…' : 'Suchen'}
            </button>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-[600] left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/15 bg-ink-900 shadow-xl">
              {suggestions.map((s) => (
                <li key={s.place_id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 text-sm text-white/90 hover:bg-brand-500/15 border-b border-white/5 last:border-0 transition"
                    onClick={() => selectSuggestion(s)}
                  >
                    {s.description}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          {needsLocation && (
            <button
              type="button"
              onClick={requestUserLocation}
              disabled={busy}
              className="w-full py-4 px-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-ink-900 font-bold text-base shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {locating ? 'Standort wird ermittelt…' : '📍 Standort erlauben – Straße automatisch finden'}
            </button>
          )}
          <p className="text-sm text-white/60">
            {needsLocation
              ? 'Standort erlauben oder auf der Karte tippen. Alternativ „Adresse eingeben“ nutzen.'
              : 'Pin auf der Karte anpassen oder unter „Adresse eingeben“ suchen.'}
          </p>
          {locationBlocked && !streetName && (
            <p className="text-sm text-yellow-300/90 bg-yellow-500/10 border border-yellow-500/25 rounded-lg px-3 py-2">
              GPS wurde blockiert. Tippe auf die Karte, suche die Adresse oder erlaube „Standort“ in den Browser-Einstellungen.
            </p>
          )}
        </>
      )}

      {streetName && (
        <div className="text-sm text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          Gewählte Straße: <strong>{streetName}</strong>
          <span className="text-white/50"> · {zone.postalCode}{zone.label ? ` – ${zone.label}` : ''}</span>
        </div>
      )}

      {canShowRoute && (
        <button
          type="button"
          onClick={showDeliveryRoute}
          disabled={busy}
          className="w-full py-4 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {routing ? 'Route wird berechnet…' : '🚗 Adresse bestätigen & Lieferroute anzeigen'}
        </button>
      )}

      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-ink-800">
        <div
          ref={mapRef}
          className="delivery-map h-72 sm:h-96 md:h-[28rem] w-full"
          style={{ minHeight: '18rem' }}
        />
        {inputMode === 'map' && (
          <button
            type="button"
            onClick={requestUserLocation}
            disabled={busy}
            className="absolute top-3 right-3 z-[500] px-3 py-2 rounded-lg bg-white/90 text-ink-900 text-xs font-bold shadow-lg hover:bg-white transition disabled:opacity-50"
          >
            {locating ? '…' : '📍 GPS'}
          </button>
        )}
        {showingRoute && routeInfo && (
          <div className="absolute bottom-4 left-4 z-[500] bg-white rounded-xl shadow-xl px-4 py-3 text-ink-900 max-w-[85%]">
            <div className="flex items-center gap-3">
              <span className="text-2xl shrink-0">🚗</span>
              <div>
                <div className="font-bold text-lg leading-tight">{routeInfo.durationText}</div>
                <div className="text-sm text-gray-600">{routeInfo.distanceText} · vom Restaurant</div>
              </div>
            </div>
          </div>
        )}
        {mapOverlay && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-sm text-white/80 z-[400] pointer-events-none">
            {!mapsApiKey ? 'Google Maps wird geladen…' : locating ? 'Standort wird ermittelt…' : searching ? 'Adresse wird gesucht…' : 'Wird geladen…'}
          </div>
        )}
      </div>

      {showingRoute && routeInfo && (
        <div className={`text-sm rounded-lg px-4 py-3 border ${routeInfo.tooFar ? 'text-red-300/90 bg-red-500/10 border-red-500/25' : 'text-blue-200/90 bg-blue-500/10 border-blue-500/25'}`}>
          <div className="font-bold text-base mb-1">
            Fahrzeit vom Restaurant: {routeInfo.durationText} ({routeInfo.distanceText})
          </div>
          {routeInfo.tooFar ? (
            <p>Diese Adresse liegt außerhalb unseres Liefergebiets (max. {routeInfo.maxMinutes ?? maxDeliveryMinutes} Min.). Bitte eine nähere Adresse wählen.</p>
          ) : (
            <p>Fahrzeit vom Restaurant zu deiner Adresse (Google Maps).</p>
          )}
          <button
            type="button"
            onClick={clearRoute}
            className="mt-2 text-xs underline text-white/60 hover:text-white/90 transition"
          >
            Route ausblenden & Adresse ändern
          </button>
        </div>
      )}

      {mapError && (
        <p className="text-sm text-red-400/90 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{mapError}</p>
      )}
    </div>
  );
}
