import React, { useState } from "react";

interface ClaudeLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  textPosition?: "bottom" | "right";
  animated?: boolean;
  speed?: "normal" | "fast";
}

export const CLAUDE_GIF_URL = "/claude.gif?v=3";
export const CLAUDE_TENOR_GIF_URL = "https://media1.tenor.com/m/zimAk6gPNIAAAAAC/claude.gif";

export const ClaudeLogo: React.FC<ClaudeLogoProps> = React.memo(({
  className = "w-5 h-5",
  size,
  showText = false,
  textPosition = "right",
}) => {
  const [src, setSrc] = useState(CLAUDE_GIF_URL);

  const styleProps: React.CSSProperties = {
    mixBlendMode: "multiply",
    transform: "translateZ(0)",
    willChange: "transform",
    ...(size ? { width: size, height: size } : {}),
  };

  const icon = (
    <img
      src={src}
      alt="Claude AI"
      onError={() => {
        if (src !== CLAUDE_TENOR_GIF_URL) {
          setSrc(CLAUDE_TENOR_GIF_URL);
        }
      }}
      referrerPolicy="no-referrer"
      className={`${className} object-contain select-none shrink-0 pointer-events-none`}
      style={styleProps}
    />
  );

  if (!showText) {
    return icon;
  }

  // Exact 1:1 layout matching reference image with serif "Claude Mythos" typography and freely floating icon
  if (textPosition === "bottom") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 select-none">
        {icon}
        <span className="font-serif text-slate-900 tracking-tight text-xl sm:text-2xl font-medium leading-none">
          Claude Mythos
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 select-none">
      {icon}
      <span className="font-serif text-slate-900 tracking-tight text-sm sm:text-base font-medium leading-none">
        Claude Mythos
      </span>
    </div>
  );
});

export default ClaudeLogo;
