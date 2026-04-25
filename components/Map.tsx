"use client";

import React, { useEffect, useRef, useState } from "react";
import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl/maplibre";
import type { MapRef, LayerProps } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import Flag from "react-world-flags";
import { getMetroBbox, type Metro } from "@/lib/metro";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const MAP_STYLE = `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_KEY}`;

const fillLayer: LayerProps = {
  id: "service-area-fill",
  type: "fill",
  paint: {
    "fill-color": "#000000",
    "fill-opacity": 0.06,
  },
};

const outlineLayer: LayerProps = {
  id: "service-area-outline",
  type: "line",
  paint: {
    "line-color": "#000000",
    "line-width": 1.5,
    "line-dasharray": [4, 3],
  },
};

type Props = {
  center?: number[];
  metro?: Metro;
  flagCode?: string;
  zoom?: number;
  zipCode?: string;
};

function MapComponent({ center, metro, flagCode, zoom, zipCode }: Props) {
  const [lat, lng] = center ?? [20, 0];
  const [zipBoundary, setZipBoundary] = useState<GeoJSON.Feature | null>(null);
  const mapRef = useRef<MapRef | null>(null);

  useEffect(() => {
    if (!zipCode) return;
    setZipBoundary(null);
    fetch(
      `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query?where=ZCTA5%3D%27${encodeURIComponent(zipCode)}%27&outFields=ZCTA5&outSR=4326&f=geojson`
    )
      .then((r) => r.json())
      .then((data) => {
        const feature = data.features?.[0];
        if (feature?.geometry?.type === "Polygon" || feature?.geometry?.type === "MultiPolygon") {
          setZipBoundary(feature);
          const rings: number[][][] =
            feature.geometry.type === "Polygon"
              ? feature.geometry.coordinates
              : feature.geometry.coordinates.flat(1);
          const allCoords = rings.flat();
          const lngs = allCoords.map((c: number[]) => c[0]);
          const lats = allCoords.map((c: number[]) => c[1]);
          const west = Math.min(...lngs);
          const east = Math.max(...lngs);
          const south = Math.min(...lats);
          const north = Math.max(...lats);
          mapRef.current?.fitBounds([[west, south], [east, north]], { padding: 40, duration: 800 });
        }
      })
      .catch(() => {});
  }, [zipCode]);

  const metroBbox = metro ? getMetroBbox(metro) : null;
  const bboxGeoJSON: GeoJSON.Feature<GeoJSON.Polygon> | null = metroBbox
    ? {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [metroBbox[0], metroBbox[1]],
            [metroBbox[2], metroBbox[1]],
            [metroBbox[2], metroBbox[3]],
            [metroBbox[0], metroBbox[3]],
            [metroBbox[0], metroBbox[1]],
          ]],
        },
        properties: {},
      }
    : null;

  const boundaryData = zipBoundary ?? bboxGeoJSON;

  return (
    <div className="h-[35vh] rounded-lg overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: lat,
          longitude: lng,
          zoom: zoom ?? (center ? 9 : 2),
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        scrollZoom={false}
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {boundaryData && (
          <Source id="service-area" type="geojson" data={boundaryData}>
            <Layer {...fillLayer} />
            <Layer {...outlineLayer} />
          </Source>
        )}
        {center && (
          <Marker latitude={lat} longitude={lng} anchor="bottom">
            <div className="flex flex-col items-center">
              <Flag
                code={flagCode ?? "US"}
                className="w-8 shadow-md rounded-sm"
              />
              <div className="w-3 h-3 bg-black rounded-full border-2 border-white shadow-lg" />
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}

export default MapComponent;
