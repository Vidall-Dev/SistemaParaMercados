import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityButtonProps {
  type: "plus" | "minus";
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
}

/**
 * Reusable + / – button for cart quantity control.
 */
const QuantityButton = ({
  type,
  onClick,
  disabled = false,
  className,
  size = "sm",
}: QuantityButtonProps) => {
  const Icon = type === "plus" ? Plus : Minus;
  return (
    <Button
      variant="outline"
      size={size}
      className={cn("h-8 w-8 p-0", className)}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
};

export default QuantityButton;
