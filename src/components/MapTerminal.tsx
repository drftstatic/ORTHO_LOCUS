
import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { initiateScan, generateLocationArtwork } from '../services/gemini';
import type { ArtworkStyle } from '../services/gemini';

const mapOptions = {
    center: { lat: 40.7128, lng: -74.0060 }, // NYC Default
    zoom: 18,
    mapTypeId: 'satellite',
    disableDefaultUI: true,
    tilt: 0, // Orthographic view
    heading: 0,
    gestureHandling: 'greedy', // Allow single finger pan
};

export const MapTerminal: React.FC = () => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
    const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
    const [isScanning, setIsScanning] = useState(false);
    const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
    const [artworkStyle, setArtworkStyle] = useState<ArtworkStyle>('PLANAR');
    const [isGeneratingArtwork, setIsGeneratingArtwork] = useState(false);

    useEffect(() => {
        setOptions({
            key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
            v: 'weekly',
        });

        importLibrary('maps').then(({ Map }) => {
            if (mapRef.current) {
                const map = new Map(mapRef.current, mapOptions);
                setMapInstance(map);

                map.addListener('center_changed', () => {
                    const center = map.getCenter();
                    if (center) {
                        setCoords({ lat: center.lat(), lng: center.lng() });
                    }
                });
            }
        });
    }, []);

    const handleScan = async () => {
        if (mapInstance && !isScanning) {
            setIsScanning(true);

            // Lock Map
            mapInstance.setOptions({ gestureHandling: 'none' });

            const center = mapInstance.getCenter();
            if (center) {
                const lat = center.lat();
                const lng = center.lng();

                // Generate Static Map URL for Snapshot
                const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=19&size=600x800&maptype=satellite&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
                setSnapshotUrl(staticMapUrl);

                // Simulate Handshake
                const result = await initiateScan(lat, lng, staticMapUrl);
                setScanResult(result);

                // We stay in isScanning state to show the report
            }
        }
    };

    const handleCloseReport = () => {
        setIsScanning(false);
        setScanResult(null);
        setSnapshotUrl(null);
        setArtworkUrl(null);
        if (mapInstance) {
            mapInstance.setOptions({ gestureHandling: 'greedy' });
        }
    };

    const handleGenerateArtwork = async (style: ArtworkStyle) => {
        if (isGeneratingArtwork) return;
        setIsGeneratingArtwork(true);
        setArtworkStyle(style);
        const center = mapInstance?.getCenter();
        if (center) {
            const url = await generateLocationArtwork(center.lat(), center.lng(), style);
            if (url) {
                setArtworkUrl(url);
            }
        }
        setIsGeneratingArtwork(false);
    };

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            {/* Map Container */}
            <div ref={mapRef} style={{ width: '100%', height: '100%', filter: isScanning ? 'grayscale(100%) contrast(1.2)' : 'none', transition: 'filter 0.5s ease' }}></div>

            {/* Overlay UI */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, pointerEvents: 'none' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>ORTHO_LOCUS // {isScanning ? 'SCANNING...' : 'TERMINAL_ACTIVE'}</div>
                <div style={{ fontSize: '18px', color: 'var(--color-accent)' }}>
                    COORDS: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                </div>
            </div>

            {/* Crosshair */}
            {!isScanning && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '40px',
                    height: '40px',
                    border: '2px solid var(--color-accent)',
                    borderRadius: '50%',
                    zIndex: 10,
                    pointerEvents: 'none',
                    boxShadow: '0 0 10px var(--color-accent)'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '4px',
                        height: '4px',
                        backgroundColor: 'var(--color-accent)',
                        borderRadius: '50%'
                    }}></div>
                </div>
            )}

            {/* Snapshot Overlay (The "Flash" & Report) */}
            {isScanning && snapshotUrl && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '80vw',
                    maxWidth: '800px',
                    height: '80vh',
                    maxHeight: '600px',
                    border: '2px solid var(--color-accent)',
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    zIndex: 20,
                    boxShadow: '0 0 50px rgba(255, 176, 0, 0.2)',
                    display: 'flex',
                    flexDirection: 'row',
                    overflow: 'hidden'
                }}>
                    {/* Left: Image */}
                    <div style={{
                        flex: 1,
                        backgroundImage: `url(${snapshotUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRight: '1px solid var(--color-accent)',
                        position: 'relative'
                    }}>
                        {!scanResult && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--color-accent)',
                                animation: 'pulse 1s infinite'
                            }}>
                                ANALYZING...
                            </div>
                        )}
                    </div>

                    {/* Right: Terminal Output */}
                    <div style={{
                        flex: 1,
                        padding: '20px',
                        fontFamily: 'monospace',
                        color: 'var(--color-accent)',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{ borderBottom: '1px solid var(--color-accent)', paddingBottom: '10px', marginBottom: '10px', fontWeight: 'bold' }}>
                            // ORBITAL_RECON_V1 // GEMINI-3.0-PRO
                        </div>

                        {scanResult ? (
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                {scanResult}
                            </div>
                        ) : (
                            <div>
                                &gt; ESTABLISHING UPLINK TO GEMINI-3.0-PRO...<br />
                                &gt; ACQUIRING SATELLITE FEED...<br />
                                &gt; AWAITING DEEP ANALYSIS...
                            </div>
                        )}

                        {scanResult && (
                            <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={handleCloseReport}
                                    style={{
                                        padding: '10px',
                                        background: 'var(--color-accent)',
                                        color: 'black',
                                        border: 'none',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        flex: 1
                                    }}
                                >
                                    [ CLOSE REPORT ]
                                </button>
                                <button
                                    onClick={() => handleGenerateArtwork('PLANAR')}
                                    disabled={isGeneratingArtwork || !!artworkUrl}
                                    style={{
                                        padding: '10px',
                                        background: 'transparent',
                                        color: 'var(--color-accent)',
                                        border: '1px solid var(--color-accent)',
                                        fontWeight: 'bold',
                                        cursor: isGeneratingArtwork || artworkUrl ? 'default' : 'pointer',
                                        flex: 1,
                                        opacity: isGeneratingArtwork || artworkUrl ? 0.5 : 1
                                    }}
                                >
                                    {isGeneratingArtwork && artworkStyle === 'PLANAR' ? 'GENERATING...' : '[ PLANAR VIEW ]'}
                                </button>
                                <button
                                    onClick={() => handleGenerateArtwork('PLEIN_AIR')}
                                    disabled={isGeneratingArtwork || !!artworkUrl}
                                    style={{
                                        padding: '10px',
                                        background: 'transparent',
                                        color: 'var(--color-accent)',
                                        border: '1px solid var(--color-accent)',
                                        fontWeight: 'bold',
                                        cursor: isGeneratingArtwork || artworkUrl ? 'default' : 'pointer',
                                        flex: 1,
                                        opacity: isGeneratingArtwork || artworkUrl ? 0.5 : 1
                                    }}
                                >
                                    {isGeneratingArtwork && artworkStyle === 'PLEIN_AIR' ? 'PAINTING...' : '[ PLEIN AIR ]'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Artwork Overlay */}
            {artworkUrl && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '90vw',
                    height: '90vh',
                    backgroundColor: artworkStyle === 'PLANAR' ? '#001a33' : '#1a1a1a',
                    backgroundImage: artworkStyle === 'PLANAR' ? `
                        linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
                    ` : 'none',
                    backgroundSize: '20px 20px',
                    zIndex: 30,
                    border: artworkStyle === 'PLANAR' ? '4px solid white' : '10px solid #2a2a2a',
                    boxShadow: '0 0 100px rgba(0,0,0,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '20px',
                    color: 'white',
                    fontFamily: artworkStyle === 'PLANAR' ? 'monospace' : 'sans-serif'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ margin: 0 }}>
                                {artworkStyle === 'PLANAR' ? 'PROJECT: NANO_BANANA_PRO // ARCHITECTURAL_PLAN' : 'PROJECT: NANO_BANANA_PRO // PLEIN_AIR_STUDY'}
                            </h2>
                            <div style={{ fontSize: '12px', opacity: 0.7 }}>COORDS: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</div>
                        </div>
                        <button
                            onClick={() => setArtworkUrl(null)}
                            style={{
                                background: 'white',
                                color: 'black',
                                border: 'none',
                                padding: '10px 20px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            CLOSE VIEW
                        </button>
                    </div>

                    <div style={{
                        flex: 1,
                        backgroundImage: `url(${artworkUrl})`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        border: artworkStyle === 'PLANAR' ? '2px solid rgba(255,255,255,0.3)' : 'none',
                        boxShadow: artworkStyle === 'PLEIN_AIR' ? 'inset 0 0 50px rgba(0,0,0,0.5)' : 'none'
                    }}></div>

                    <div style={{ marginTop: '10px', fontSize: '10px', textAlign: 'right', opacity: 0.5 }}>
                        GENERATED BY GEMINI 3.0 PRO IMAGE // GROUNDED
                    </div>
                </div>
            )}

            {/* Scan Button */}
            {!isScanning && (
                <button
                    onClick={handleScan}
                    style={{
                        position: 'absolute',
                        bottom: 40,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                        padding: '15px 40px',
                        backgroundColor: 'var(--color-accent)',
                        color: '#000',
                        border: 'none',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '2px'
                    }}
                >
                    Initiate Scan
                </button>
            )}
        </div>
    );
};
