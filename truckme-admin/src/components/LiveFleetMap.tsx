import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LiveFleetDriver } from '../types';

interface LiveFleetMapProps {
  fleet: LiveFleetDriver[];
}

export const LiveFleetMap: React.FC<LiveFleetMapProps> = ({ fleet }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([6.9271, 79.8612], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    }

    return () => {
      // Keep map alive for smooth tab switches
    };
  }, []);

  useEffect(() => {
    if (!markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    fleet.forEach((driver) => {
      const lat = driver.latitude || 6.9271;
      const lng = driver.longitude || 79.8612;

      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background:#F5A623; color:#1A2B4A; border:2px solid white; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">🚛</div>`,
        iconSize: [36, 36],
      });

      const popupContent = `
        <div style="font-family:'Plus Jakarta Sans', sans-serif; color:#1A2B4A; padding:4px;">
          <strong style="font-size:14px;">${driver.driverName}</strong><br/>
          <span style="color:#5A6B85; font-size:12px;">📞 ${driver.phone}</span><br/>
          <span style="color:#27AE60; font-weight:800; font-size:12px;">🚛 ${driver.vehicleType} (${driver.vehiclePlateNumber})</span><br/>
          <span style="font-size:11px; color:#F5A623;">⭐ ${(driver.ratingAverage || 4.9).toFixed(1)} Rating</span>
        </div>
      `;

      L.marker([lat, lng], { icon: customIcon })
        .addTo(markersGroupRef.current!)
        .bindPopup(popupContent);
    });
  }, [fleet]);

  return <div id="map-container" ref={mapContainerRef} style={{ height: '580px', width: '100%', borderRadius: '16px' }} />;
};
