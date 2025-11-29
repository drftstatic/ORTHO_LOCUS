import { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { initiateScan, generateLocationArtwork, getStaticMapUrl } from '../services/gemini';
import type { ArtworkStyle } from '../services/gemini';

const mapOptions: google.maps.MapOptions = {
  center: { lat: 40.7128, lng: -74.006 },
  zoom: 18,
  mapTypeId: 'satellite',
  disableDefaultUI: true,
  tilt: 0,
  heading: 0,
  gestureHandling: 'greedy',
  backgroundColor: '#08080c',
  styles: [
    {
      featureType: 'all',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'poi',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

type ViewState = 'explore' | 'scanning' | 'generating' | 'artwork';

export const MapTerminal: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [coords, setCoords] = useState({ lat: 40.7128, lng: -74.006 });
  const [viewState, setViewState] = useState<ViewState>('explore');
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [artworkStyle, setArtworkStyle] = useState<ArtworkStyle>('PLANAR');
  const [searchQuery, setSearchQuery] = useState('');
  const [PlaceClass, setPlaceClass] = useState<typeof google.maps.places.Place | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize map
  useEffect(() => {
    setOptions({
      key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
      v: 'weekly',
    });

    Promise.all([importLibrary('maps'), importLibrary('places')]).then(
      ([mapsLib, placesLib]) => {
        const { Map } = mapsLib;
        const { Place } = placesLib as google.maps.PlacesLibrary;

        if (mapRef.current) {
          const map = new Map(mapRef.current, mapOptions);
          setMapInstance(map);
          setPlaceClass(() => Place);

          map.addListener('center_changed', () => {
            const center = map.getCenter();
            if (center) {
              setCoords({ lat: center.lat(), lng: center.lng() });
            }
          });
        }
      }
    );
  }, []);

  // Search handler
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !PlaceClass || !mapInstance) return;

    try {
      const { places } = await PlaceClass.searchByText({
        textQuery: searchQuery,
        fields: ['location', 'displayName'],
        maxResultCount: 1,
      });

      if (places?.[0]?.location) {
        mapInstance.panTo(places[0].location);
        mapInstance.setZoom(18);
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [searchQuery, PlaceClass, mapInstance]);

  // Initiate scan
  const handleScan = useCallback(async () => {
    if (!mapInstance || viewState !== 'explore') return;

    setViewState('scanning');
    mapInstance.setOptions({ gestureHandling: 'none' });

    const center = mapInstance.getCenter();
    if (center) {
      const lat = center.lat();
      const lng = center.lng();

      // Use server-side proxy for static map (hides API key)
      setSnapshotUrl(getStaticMapUrl(lat, lng));

      const result = await initiateScan(lat, lng);
      setScanResult(result);
    }
  }, [mapInstance, viewState]);

  // Generate artwork
  const handleGenerateArtwork = useCallback(
    async (style: ArtworkStyle) => {
      if (viewState === 'generating') return;

      setViewState('generating');
      setArtworkStyle(style);

      const url = await generateLocationArtwork(coords.lat, coords.lng, style);
      if (url) {
        setArtworkUrl(url);
        setViewState('artwork');
      } else {
        setViewState('scanning');
      }
    },
    [viewState, coords]
  );

  // Close and reset completely
  const handleClose = useCallback(() => {
    setViewState('explore');
    setScanResult(null);
    setSnapshotUrl(null);
    setArtworkUrl(null);
    mapInstance?.setOptions({ gestureHandling: 'greedy' });
  }, [mapInstance]);

  // Go back to analysis (keep scan result)
  const handleBackToAnalysis = useCallback(() => {
    setViewState('scanning');
    setArtworkUrl(null);
  }, []);

  // Download artwork
  const handleDownload = useCallback(() => {
    if (!artworkUrl) return;

    const link = document.createElement('a');
    link.href = artworkUrl;
    const timestamp = new Date().toISOString().slice(0, 10);
    const styleName = artworkStyle === 'PLANAR' ? 'planar' : 'plein_air';
    link.download = `ortho_locus_${styleName}_${coords.lat.toFixed(4)}_${coords.lng.toFixed(4)}_${timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [artworkUrl, artworkStyle, coords]);

  // Derive CSS class from state
  const canvasClass = [
    'canvas',
    viewState === 'scanning' && 'canvas--scanning',
    (viewState === 'artwork' || viewState === 'generating') && 'canvas--artwork',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={canvasClass}>
      {/* The Map */}
      <div ref={mapRef} className="canvas__map" />

      {/* Reticle */}
      {viewState === 'explore' && (
        <div className="reticle reticle--active">
          <div className="reticle__ring" />
          <div className="reticle__dot" />
        </div>
      )}

      {/* Whisper UI - Title */}
      <div className="whisper whisper--title">Ortho Locus</div>

      {/* Whisper UI - Coordinates */}
      <div className="whisper whisper--coords">
        {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
      </div>

      {/* Search */}
      {viewState === 'explore' && (
        <div className="search">
          <input
            ref={searchInputRef}
            type="text"
            className="search__input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search location..."
          />
          <svg className="search__icon" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
      )}

      {/* Invoke Button */}
      {viewState === 'explore' && (
        <button className="invoke" onClick={handleScan}>
          Invoke
        </button>
      )}

      {/* Analysis Panel */}
      <div className="analysis">
        <div
          className="analysis__image"
          style={{ backgroundImage: snapshotUrl ? `url(${snapshotUrl})` : 'none' }}
        />
        <div className="analysis__content">
          <div className="analysis__header">Orbital Analysis</div>

          {scanResult ? (
            <div className="analysis__text">{scanResult}</div>
          ) : (
            <div className="analysis__text analysis__loading">
              Establishing uplink...
              {'\n'}Acquiring satellite feed...
              {'\n'}Awaiting deep analysis...
            </div>
          )}

          {scanResult && (
            <div className="analysis__actions">
              <button className="analysis__btn analysis__btn--close" onClick={handleClose}>
                Return
              </button>
              <button
                className="analysis__btn"
                onClick={() => handleGenerateArtwork('PLANAR')}
                disabled={viewState === 'generating'}
              >
                Planar View
              </button>
              <button
                className="analysis__btn"
                onClick={() => handleGenerateArtwork('PLEIN_AIR')}
                disabled={viewState === 'generating'}
              >
                Plein Air
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Generating State */}
      <div className={`generating ${viewState === 'generating' ? 'generating--active' : ''}`}>
        <div className="generating__content">
          <div className="generating__spinner" />
          <div className="generating__text">
            {artworkStyle === 'PLANAR' ? 'Rendering Blueprint' : 'Painting Canvas'}
          </div>
        </div>
      </div>

      {/* Gallery - Artwork Display */}
      <div
        className={`gallery ${viewState === 'artwork' ? 'gallery--visible' : ''} ${
          artworkStyle === 'PLANAR' ? 'gallery--planar' : 'gallery--plein'
        }`}
      >
        <div className="gallery__frame">
          {artworkUrl && <img src={artworkUrl} alt="Generated artwork" className="gallery__artwork" />}
          <div className="gallery__meta">
            <span>
              {artworkStyle === 'PLANAR' ? 'Architectural Study' : 'Plein Air Study'}
            </span>
            <span>
              {coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}°
            </span>
          </div>
        </div>

        <div className="gallery__controls">
          <button className="gallery__btn" onClick={handleBackToAnalysis}>
            Back
          </button>
          <button className="gallery__btn" onClick={handleDownload}>
            Download
          </button>
          <button className="gallery__btn" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
