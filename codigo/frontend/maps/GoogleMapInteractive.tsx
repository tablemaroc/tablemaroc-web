'use client';
import { useEffect, useRef } from 'react';
import type { MapControls } from './MapFallback';

/**
 * Mapa interactivo de Google. Solo lo monta MapFallback al llegar a la sección (estado `loading`), y este archivo
 * se descarga aparte (next/dynamic), así que ni el SDK ni este código entran en el render inicial (docs/11).
 * Sin clave (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) o si el SDK falla → onError → fallback inmediato.
 */
declare global {
  interface Window { google?: any; __tablemarocMapsReady?: () => void }
}

let sdk: Promise<void> | null = null;

function loadSdk(apiKey: string): Promise<void> {
  if (window.google?.maps?.Map) return Promise.resolve();
  sdk ??= new Promise<void>((resolve, reject) => {
    window.__tablemarocMapsReady = () => resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=__tablemarocMapsReady`;
    script.async = true;
    script.onerror = () => { sdk = null; reject(new Error('Google Maps no ha cargado')); };
    document.head.appendChild(script);
  });
  return sdk;
}

export default function GoogleMapInteractive({ lat, lng, name, onReady, onError }: MapControls & { lat: number; lng: number; name: string }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) { onError(); return; }
    let cancelled = false;
    loadSdk(apiKey).then(() => {
      if (cancelled || !el.current) return;
      const { maps } = window.google;
      const map = new maps.Map(el.current, { center: { lat, lng }, zoom: 16, disableDefaultUI: true, zoomControl: true, gestureHandling: 'cooperative' });
      new maps.Marker({ position: { lat, lng }, map, title: name });
      maps.event.addListenerOnce(map, 'tilesloaded', () => { if (!cancelled) onReady(); });
    }).catch(() => { if (!cancelled) onError(); });
    return () => { cancelled = true; };
  }, [lat, lng, name, onReady, onError]);

  return <div ref={el} style={{ width: '100%', height: '100%' }} />;
}
