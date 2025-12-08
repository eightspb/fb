import React from "react";
import { cn } from "@/lib/utils";

interface GridPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  squares?: Array<[x: number, y: number]>;
  strokeDasharray?: string;
  className?: string;
  [key: string]: unknown;
}

export function GridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = "0",
  squares,
  className,
  ...props
}: GridPatternProps) {
  const id = React.useId();

  // Generate a stable ID for the pattern
  const patternId = `grid-pattern-${id}`;
  
  // Generate stable square positions
  const renderSquares = React.useMemo(() => {
    if (!squares) return null;
    return squares.map(([xPos, yPos], index) => ({
      id: `${patternId}-${xPos}-${yPos}-${index}`,
      x: xPos * width + 1,
      y: yPos * height + 1,
    }));
  }, [squares, width, height, patternId]);

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30",
        className,
      )}
      {...props}
    >
      <defs>
        <pattern
          id={patternId}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
      {renderSquares && (
        <svg x={x} y={y} className="overflow-visible">
          {renderSquares.map((square) => (
            <rect
              key={square.id}
              strokeWidth="0"
              width={width - 1}
              height={height - 1}
              x={square.x}
              y={square.y}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}
