import fs from "fs";
import path from "path";
import sharp from "sharp";

const BANK_SVGS: Record<string, string> = {
  bca: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 314" width="1000" height="314">
    <path d="m 147.34669,237.88336 c 0,-12.4911 0.13562,-45.8787 -0.17228,-49.99236 0.26842,-49.68172 -35.85414,-84.72767 -58.674773,-81.99559 -15.79108,1.37038 -29.025179,7.8093 -36.131016,26.33267 -6.585974,17.26296 -0.697885,40.22487 21.198868,45.61295 23.413963,5.78646 37.086001,10.60092 46.980501,17.39303 12.12372,8.3152 22.02105,24.2022 22.28381,42.669" fill="#005BAA" />
    <path d="m 156.69305,313.40296 c -41.28452,0 -83.71334,-10.1684 -126.085648,-30.2796 l -1.039728,-0.5113 -0.497275,-1.0595 C 10.055561,241.41496 0,197.51416 0,154.56275 0,111.67615 9.6430481,69.654125 28.67202,29.570445 l 0.522703,-1.06518 1.05952,-0.53118 C 69.45081,9.4056654 111.61685,-4.4667969e-5 155.61942,-4.4667969e-5 c 40.99069,0 84.7672,10.470869667969 126.57727,30.333339667969 l 1.07365,0.47749 0.49444,1.08494 c 19.37931,40.87763 29.59874,84.767165 29.59874,127.006815 0,42.07562 -9.81258,84.13432 -29.2145,124.98642 l -0.51139,1.0737 -1.07929,0.4974 c -38.5976,18.2716 -82.12548,27.9429 -125.86529,27.9429 M 34.529044,277.61956 c 41.163036,19.3623 82.215886,29.1411 122.164006,29.1411 42.3582,0 84.4847,-9.259 121.98321,-26.8101 18.62776,-39.5866 28.07019,-80.3286 28.07019,-121.04802 0,-40.88347 -9.85493,-83.411095 -28.49683,-123.085165 -40.57537,-19.0742 -82.95049,-29.1890696 -122.6302,-29.1890696 -42.60116,0 -83.43363,9.0355796 -121.446374,26.8609396 C 15.926699,72.341065 6.6396702,113.05204 6.6396702,154.56275 c 0,41.58951 9.6515028,84.13431 27.8893738,123.05681" fill="#005BAA" />
    <path d="m 137.56237,237.90306 c 0.0763,-16.0114 -8.86041,-30.1694 -20.54055,-37.7782 -10.36068,-6.7244 -24.270055,-11.1434 -46.70926,-16.83366 -6.936336,-1.77427 -14.191926,-5.71569 -16.438108,-10.73929 -5.941786,5.98692 -7.021076,19.44705 -5.97569,27.31295 1.21493,9.1034 11.852506,24.1062 27.869603,24.694 9.781485,0.3926 22.148198,-2.1051 28.078685,-3.365 10.23073,-2.2096 26.41735,4.1984 28.9941,16.6895" fill="#005BAA" />
    <path d="m 155.61942,28.465705 c -27.15761,0 -50.61679,17.91012 -50.53203,48.90172 0.0848,26.061425 21.04348,40.013175 28.52227,49.978385 11.30153,15.01678 17.4185,32.79128 18.05421,59.98852 0.49444,21.64533 0.46901,43.01923 0.5792,50.59413 l 5.99548,0 c -0.10447,-7.9252 -0.37579,-30.6158 -0.0651,-51.26375 0.40685,-27.20571 6.7442,-44.30212 18.05139,-59.3189 7.54378,-9.96521 28.48553,-23.91696 28.53075,-49.978385 0.10171,-30.9916 -23.34334,-48.90172 -50.47836,-48.90172" fill="#005BAA" />
    <path d="m 162.51335,237.88336 c 0,-12.4911 -0.14134,-45.8787 0.16105,-49.99236 -0.26558,-49.68172 35.83437,-84.72767 58.67478,-81.99559 15.79108,1.37038 29.01106,7.8093 36.13669,26.33267 6.58032,17.26296 0.6583,40.22487 -21.213,45.61295 -23.42528,5.78646 -37.08037,10.60092 -47.00029,17.39303 -12.10961,8.3152 -21.31472,24.2022 -21.59725,42.669" fill="#005BAA" />
    <path d="m 172.29202,237.90306 c -0.0848,-16.0114 8.84911,-30.1694 20.49535,-37.7782 10.40306,-6.7244 24.32939,-11.1434 46.74882,-16.83366 6.95045,-1.77427 14.19756,-5.71569 16.40418,-10.73929 5.97006,5.98692 7.04653,19.44705 6.00112,27.31295 -1.24034,9.1034 -11.84967,24.1062 -27.83852,24.694 -9.77866,0.3926 -22.21035,-2.1051 -28.11541,-3.365 -10.19116,-2.2096 -26.423,4.1984 -29.01106,16.6895" fill="#005BAA" />
    <path d="m 829.5219,52.939205 -38.66259,70.174035 c -14.5931,-11.84967 -32.41283,-20.57163 -55.1487,-20.57163 -53.80382,0 -75.65817,40.10642 -75.65817,68.35745 0,20.97 13.73137,51.9107 61.60471,51.9107 20.09415,0 48.66161,-13.9799 56.88348,-20.3398 l -38.23876,81.4135 c -18.22657,3.6363 -24.21356,5.8909 -39.64298,6.3684 -85.68547,2.557 -120.31057,-50.0799 -120.28514,-103.86686 0.0566,-71.10373 63.27451,-157.577415 168.07371,-157.577415 6.42209,0 14.27667,2.22076 20.9926,4.68166 l 6.78658,-8.67958" fill="#005BAA" />
    <path d="M 989.05162,27.010645 1000,282.06386 l -81.47846,0 -0.0481,-43.7427 -55.55839,0 -18.28589,43.7427 -88.36393,0 92.38163,-182.129935 -20.83157,-0.13562 39.58083,-72.78766 z m -71.10645,78.025925 -31.41264,74.18607 32.35913,0" fill="#005BAA" />
    <path d="m 528.93477,27.010645 c 40.34935,0.22602 63.15021,22.12841 63.15021,53.76716 0,29.166455 -24.04686,54.984825 -50.44445,68.334775 27.1774,9.99042 29.52811,34.51491 29.52811,51.86558 0,41.9174 -42.06151,81.0857 -96.73556,81.0857 l -119.23691,0 46.51149,-179.59282 -19.10526,-0.11019 39.05531,-75.350205 c 0,0 74.46586,-0.22604 107.27706,0 M 489.3483,130.41969 c 8.3462,0 23.08339,-2.11332 26.7677,-18.26612 4.03747,-17.534195 -9.79278,-18.006105 -16.42679,-18.006105 l -23.70499,-0.10383 -8.26707,36.376905 z m -33.51472,45.07069 -10.91448,41.91738 27.91199,0 c 10.98228,0 25.94835,-5.4502 29.61569,-19.0911 3.62216,-13.68051 -6.84026,-22.82628 -17.78298,-22.82628" fill="#005BAA" />
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
