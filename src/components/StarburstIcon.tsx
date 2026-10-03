import React from "react";
import { motion } from "framer-motion";
import { CLAUDE_SPARK_PATH } from "./ClaudeLogo";

interface StarburstIconProps {
  className?: string;
  size?: number | string;
  fillColor?: string;
  animated?: boolean;
  speed?: "normal" | "fast";
}

export { CLAUDE_SPARK_PATH };

export const StarburstIcon: React.FC<StarburstIconProps> = React.memo(({
  className = "w-6 h-6",
  size,
  fillColor = "#CC5A36",
  animated = false,
  speed = "normal",
}) => {
  const duration = speed === "fast" ? 9 : 22;

  const svg = (
    <svg
      viewBox="0 0 16 16"
      className={className}
      style={{
        width: size,
        height: size,
        fill: fillColor,
        display: "block",
      }}
    >
      <path d={CLAUDE_SPARK_PATH} fill="currentColor" />
    </svg>
  );

  if (animated) {
    return (
      <motion.div
        animate={{
          y: [0, -3.5, 0],
          scale: [1, 1.035, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: 3.6,
          ease: "easeInOut",
        }}
        className="shrink-0 flex items-center justify-center select-none"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration, ease: "linear" }}
          className="shrink-0 flex items-center justify-center select-none"
          style={{ color: fillColor }}
        >
          {svg}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="shrink-0 flex items-center justify-center select-none" style={{ color: fillColor }}>
      {svg}
    </div>
  );
});

export default StarburstIcon;
