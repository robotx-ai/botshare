export type ServiceAreaOption = {
  value: string;
  label: string;
  flag: string;
  latlng: [number, number];
  region: string;
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
};

export const SOUTHERN_CALIFORNIA_LABEL = "Southern California";
export const FLORIDA_LABEL = "Florida";
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
  // --- Florida ---
  {
    value: "miami",
    label: "Miami",
    flag: "US",
    latlng: [25.7617, -80.1918],
    region: FLORIDA_LABEL,
    bbox: [-80.88, 25.14, -80.03, 26.00],
  },
  {
    value: "fort-lauderdale",
    label: "Fort Lauderdale",
    flag: "US",
    latlng: [26.1224, -80.1373],
    region: FLORIDA_LABEL,
    bbox: [-80.44, 25.96, -80.04, 26.39],
  },
  {
    value: "west-palm-beach",
    label: "West Palm Beach",
    flag: "US",
    latlng: [26.7153, -80.0534],
    region: FLORIDA_LABEL,
    bbox: [-80.69, 26.32, -80.03, 27.03],
  },
  {
    value: "orlando",
    label: "Orlando",
    flag: "US",
    latlng: [28.5383, -81.3792],
    region: FLORIDA_LABEL,
    bbox: [-81.86, 28.17, -80.82, 28.79],
  },
  {
    value: "tampa",
    label: "Tampa",
    flag: "US",
    latlng: [27.9506, -82.4572],
    region: FLORIDA_LABEL,
    bbox: [-82.83, 27.57, -82.05, 28.17],
  },
  {
    value: "jacksonville",
    label: "Jacksonville",
    flag: "US",
    latlng: [30.3322, -81.6557],
    region: FLORIDA_LABEL,
    bbox: [-82.05, 30.10, -81.31, 30.59],
  },
  {
    value: "naples",
    label: "Naples",
    flag: "US",
    latlng: [26.1420, -81.7948],
    region: FLORIDA_LABEL,
    bbox: [-82.03, 25.84, -81.18, 26.52],
  },
  {
    value: "fort-myers",
    label: "Fort Myers",
    flag: "US",
    latlng: [26.6406, -81.8723],
    region: FLORIDA_LABEL,
    bbox: [-82.27, 26.34, -81.56, 26.85],
  },
  {
    value: "st-petersburg",
    label: "St. Petersburg",
    flag: "US",
    latlng: [27.7676, -82.6403],
    region: FLORIDA_LABEL,
    bbox: [-82.85, 27.63, -82.53, 27.89],
  },
  {
    value: "tallahassee",
    label: "Tallahassee",
    flag: "US",
    latlng: [30.4383, -84.2807],
    region: FLORIDA_LABEL,
    bbox: [-84.68, 30.13, -83.82, 30.76],
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
