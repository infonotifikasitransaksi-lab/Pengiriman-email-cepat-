import fs from "fs";
import path from "path";
import sharp from "sharp";

const BANK_SVGS: Record<string, string> = {
  bca: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 90" width="360" height="90">
    <rect width="360" height="90" fill="transparent"/>
    <g transform="translate(10, 10)">
      <circle cx="35" cy="35" r="35" fill="#005BAA"/>
      <path d="M22 35 C22 26 28 20 37 20 C32.5 24.5 31 29 31 35 C31 41 32.5 45.5 37 50 C28 50 22 44 22 35 Z" fill="#FFFFFF"/>
      <path d="M48 35 C48 44 42 50 33 50 C37.5 45.5 39 41 39 35 C39 29 37.5 24.5 33 20 C42 20 48 26 48 35 Z" fill="#FFFFFF"/>
      <text x="85" y="47" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="42" fill="#005BAA" letter-spacing="1.5">BCA</text>
    </g>
  </svg>`,

  mandiri: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 90" width="360" height="90">
    <rect width="360" height="90" fill="transparent"/>
    <g transform="translate(15, 12)">
      <path d="M150 14 C170 8 196 16 210 10 C192 20 170 18 150 14 Z" fill="#F2A900"/>
      <text x="5" y="48" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="800" font-size="42" fill="#003D79" letter-spacing="-0.5">mandırı</text>
    </g>
  </svg>`,

  bri: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 90" width="360" height="90">
    <rect width="360" height="90" fill="transparent"/>
    <g transform="translate(10, 10)">
      <rect x="0" y="5" width="60" height="60" rx="12" fill="#00529C"/>
      <text x="8" y="46" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="28" fill="#FFFFFF" letter-spacing="1">BRI</text>
      <text x="75" y="34" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="800" font-size="24" fill="#00529C">BANK BRI</text>
      <text x="75" y="56" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="600" font-size="14" fill="#F37021" letter-spacing="0.5">Melayani Setulus Hati</text>
    </g>
  </svg>`,

  bni: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 90" width="360" height="90">
    <rect width="360" height="90" fill="transparent"/>
    <g transform="translate(15, 10)">
      <text x="5" y="54" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="52" fill="#005E6A" letter-spacing="1.5">BNI</text>
      <circle cx="130" cy="28" r="9" fill="#F37021"/>
      <text x="146" y="52" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="800" font-size="30" fill="#F37021">46</text>
    </g>
  </svg>`,

  cimb: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 90" width="360" height="90">
    <rect width="360" height="90" fill="transparent"/>
    <g transform="translate(10, 10)">
      <polygon points="5,15 40,15 54,35 40,55 5,55 19,35" fill="#8B0000"/>
      <polygon points="17,21 35,21 46,35 35,49 17,49 27,35" fill="#EC1B24"/>
      <text x="68" y="44" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="30" fill="#8B0000" letter-spacing="0.5">CIMB NIAGA</text>
    </g>
  </svg>`,

  uob: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 90" width="360" height="90">
    <rect width="360" height="90" fill="transparent"/>
    <g transform="translate(10, 10)">
      <rect x="5" y="15" width="8" height="42" fill="#ED1C24"/>
      <rect x="19" y="15" width="8" height="42" fill="#ED1C24"/>
      <rect x="33" y="15" width="8" height="42" fill="#ED1C24"/>
      <rect x="47" y="15" width="8" height="42" fill="#ED1C24"/>
      <text x="70" y="52" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" font-weight="900" font-size="44" fill="#00205B" letter-spacing="1.5">UOB</text>
    </g>
  </svg>`
};

async function run() {
  const outDir = path.join(process.cwd(), "public", "bank-logos");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const base64Map: Record<string, string> = {};

  for (const [key, svg] of Object.entries(BANK_SVGS)) {
    const pngBuffer = await sharp(Buffer.from(svg), { density: 300 })
      .png({ quality: 100 })
      .toBuffer();

    const pngPath = path.join(outDir, `${key}.png`);
    fs.writeFileSync(pngPath, pngBuffer);
    console.log(`Generated: ${pngPath} (${pngBuffer.length} bytes)`);

    base64Map[key] = `data:image/png;base64,${pngBuffer.toString("base64")}`;
  }

  // Also write out a TS file with base64 PNGs for ultra-fast embedding
  const tsContent = `// Pre-rendered high-definition PNG Base64 and SVG definitions
export const BANK_PNG_BASE64: Record<string, string> = ${JSON.stringify(base64Map, null, 2)};
`;
  fs.writeFileSync(path.join(process.cwd(), "src", "utils", "bankPngAssets.ts"), tsContent, "utf8");
  console.log("Successfully generated bankPngAssets.ts!");
}

run().catch(console.error);
