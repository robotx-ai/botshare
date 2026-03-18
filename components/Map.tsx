"use client";

import React from "react";
import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl/maplibre";
import type { FillLayer, LineLayer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import Flag from "react-world-flags";
import { getServiceAreaByValue } from "@/lib/serviceLocation";

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const MAP_STYLE = `https://api.maptiler.com/maps/dataviz/style.json?key=${MAPTILER_KEY}`;

const fillLayer: FillLayer = {
  id: "service-area-fill",
  type: "fill",
  paint: {
    "fill-color": "#000000",
    "fill-opacity": 0.06,
  },
};

const outlineLayer: LineLayer = {
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
  locationValue?: string;
  flagCode?: string;
  zoom?: number;
};

function MapComponent({ center, locationValue, flagCode, zoom }: Props) {
  const [lat, lng] = center ?? [20, 0];

  const serviceArea = locationValue ? getServiceAreaByValue(locationValue) : undefined;
  const bboxGeoJSON: GeoJSON.Feature<GeoJSON.Polygon> | null = serviceArea?.bbox
    ? {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [[
            [serviceArea.bbox[0], serviceArea.bbox[1]],
            [serviceArea.bbox[2], serviceArea.bbox[1]],
            [serviceArea.bbox[2], serviceArea.bbox[3]],
            [serviceArea.bbox[0], serviceArea.bbox[3]],
            [serviceArea.bbox[0], serviceArea.bbox[1]],
          ]],
        },
        properties: {},
      }
    : null;

  return (
    <div className="h-[35vh] rounded-lg overflow-hidden">
      <Map
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
        {bboxGeoJSON && (
          <Source id="service-area" type="geojson" data={bboxGeoJSON}>
            <Layer {...fillLayer} />
            <Layer {...outlineLayer} />
          </Source>
        )}
        {center && (
          <Marker latitude={lat} longitude={lng} anchor="bottom">
            <div className="flex flex-col items-center">
              {locationValue && (
                <Flag
                  code={flagCode ?? "US"}
                  className="w-8 shadow-md rounded-sm"
                />
              )}
              <div className="w-3 h-3 bg-black rounded-full border-2 border-white shadow-lg" />
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}

export default MapComponent;
