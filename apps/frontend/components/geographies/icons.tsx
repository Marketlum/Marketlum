import { Globe, Map, Layers, Flag, Landmark, Building2, LucideIcon } from "lucide-react";
import { GeographyLevel } from "./types";

export const LEVEL_ICONS: Record<GeographyLevel, LucideIcon> = {
  "Planet": Globe,
  "Continent": Map,
  "Continental Section": Layers,
  "Country": Flag,
  "Region": Landmark,
  "City": Building2,
};

type LevelIconProps = {
  level: GeographyLevel;
  className?: string;
};

export function LevelIcon({ level, className = "h-4 w-4" }: LevelIconProps) {
  const Icon = LEVEL_ICONS[level];
  return <Icon className={className} />;
}
