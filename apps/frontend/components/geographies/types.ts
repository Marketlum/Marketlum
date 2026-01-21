export type GeographyLevel =
  | "Planet"
  | "Continent"
  | "Continental Section"
  | "Country"
  | "Region"
  | "City";

export type Geography = {
  id: string;
  name: string;
  code: string;
  level: GeographyLevel;
  children?: Geography[];
};

export const GEOGRAPHY_LEVELS: GeographyLevel[] = [
  "Planet",
  "Continent",
  "Continental Section",
  "Country",
  "Region",
  "City",
];

// Valid parent levels for each child level
export const VALID_PARENT_LEVELS: Record<GeographyLevel, GeographyLevel[]> = {
  "Planet": [],
  "Continent": ["Planet"],
  "Continental Section": ["Continent"],
  "Country": ["Continent", "Continental Section"],
  "Region": ["Country"],
  "City": ["Country", "Region"],
};

// Get the next logical level for a given parent level
export function getNextLevel(parentLevel: GeographyLevel): GeographyLevel | null {
  switch (parentLevel) {
    case "Planet": return "Continent";
    case "Continent": return "Country";
    case "Continental Section": return "Country";
    case "Country": return "Region";
    case "Region": return "City";
    case "City": return null;
  }
}

// Get valid child levels for a given parent level
export function getValidChildLevels(parentLevel: GeographyLevel): GeographyLevel[] {
  return GEOGRAPHY_LEVELS.filter(level =>
    VALID_PARENT_LEVELS[level].includes(parentLevel)
  );
}
