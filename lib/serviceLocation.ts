export type ServiceAreaOption = {
  value: string;
  label: string;
  flag: string;
  latlng: [number, number];
  region: string;
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
};

export const SOUTHERN_CALIFORNIA_LABEL = "Southern California";
export const DEFAULT_SERVICE_AREA_VALUE = "los-angeles";

export const SERVICE_AREAS: ServiceAreaOption[] = [
  {
    value: "los-angeles",
    label: "Los Angeles",
    flag: "US",
    latlng: [34.0522, -118.2437],
    region: SOUTHERN_CALIFORNIA_LABEL,
    bbox: [-119.00, 33.70, -117.65, 34.82],
  },
  {
    value: "orange-county",
    label: "Orange County",
    flag: "US",
    latlng: [33.7175, -117.8311],
    region: SOUTHERN_CALIFORNIA_LABEL,
    bbox: [-118.12, 33.38, -117.41, 33.95],
  },
  {
    value: "san-diego",
    label: "San Diego",
    flag: "US",
    latlng: [32.7157, -117.1611],
    region: SOUTHERN_CALIFORNIA_LABEL,
    bbox: [-117.60, 32.53, -116.08, 33.51],
  },
  {
    value: "san-bernardino",
    label: "San Bernardino",
    flag: "US",
    latlng: [34.1083, -117.2898],
    region: SOUTHERN_CALIFORNIA_LABEL,
    bbox: [-117.67, 33.60, -114.13, 35.81],
  },
  {
    value: "riverside",
    label: "Riverside",
    flag: "US",
    latlng: [33.9533, -117.3961],
    region: SOUTHERN_CALIFORNIA_LABEL,
    bbox: [-117.67, 33.25, -114.43, 34.07],
  },
  {
    value: "ventura-county",
    label: "Ventura County",
    flag: "US",
    latlng: [34.3705, -119.1391],
    region: SOUTHERN_CALIFORNIA_LABEL,
    bbox: [-119.64, 34.05, -118.63, 34.83],
  },
  {
    value: "imperial-county",
    label: "Imperial County",
    flag: "US",
    latlng: [32.8475, -115.5720],
    region: SOUTHERN_CALIFORNIA_LABEL,
    bbox: [-116.10, 32.50, -114.47, 33.51],
  },
];

const SERVICE_AREA_VALUES = new Set(SERVICE_AREAS.map((area) => area.value));

export const getServiceAreaByValue = (
  value: string
): ServiceAreaOption | undefined => {
  return SERVICE_AREAS.find((area) => area.value === value);
};

export const isServiceAreaValue = (value: string): boolean => {
  return SERVICE_AREA_VALUES.has(value);
};

export const getServiceAreaValues = (): string[] => {
  return Array.from(SERVICE_AREA_VALUES);
};
