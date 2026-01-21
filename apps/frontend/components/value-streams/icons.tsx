import { HandHeart } from "lucide-react";

type ValueStreamIconProps = {
  className?: string;
};

export function ValueStreamIcon({ className = "h-4 w-4" }: ValueStreamIconProps) {
  return <HandHeart className={className} />;
}
