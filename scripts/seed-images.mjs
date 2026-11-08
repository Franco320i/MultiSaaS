#!/usr/bin/env node
/**
 * Sube fotos de muestra para las filas de catalog_product_images del seed
 * (supabase/seed.sql solo puede crear filas, no archivos de Storage).
 *
 * Solo para desarrollo local: inicia sesión con cada dueño de prueba y sube con SU
 * sesión, así pasa por las mismas políticas de Storage que el panel (sin clave secreta).
 * Se corre solo al final de `npm run db:reset`.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

function loadEnv(file) {
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
    }
  } catch {
    // sin archivo: se usan las variables del entorno
  }
}
loadEnv(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key || !/127\.0\.0\.1|localhost/.test(url)) {
  console.error("seed-images: solo corre contra Supabase local (revisá .env.local).");
  process.exit(1);
}

const PASSWORD = "Prueba-Local-2026";
const OWNERS = ["dueno.alfa@example.com", "dueno.beta@example.com", "dueno.gamma@example.com"];
const COLORS = ["#c2410c", "#0f766e", "#7c3aed", "#b45309", "#be123c", "#1d4ed8"];

function placeholderSvg(label, color) {
  const text = label.replace(/[<>&"]/g, "").slice(0, 22);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="960">
      <rect width="1280" height="960" fill="${color}"/>
      <text x="640" y="500" font-family="sans-serif" font-size="88" font-weight="700"
            fill="#ffffff" text-anchor="middle">${text}</text>
    </svg>`,
  );
}

let uploaded = 0;
for (const [i, email] of OWNERS.entries()) {
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (loginError) {
    console.error(`seed-images: no se pudo iniciar sesión como ${email}: ${loginError.message}`);
    process.exit(1);
  }

  const { data: images, error } = await supabase
    .from("catalog_product_images")
    .select("storage_path, catalog_products!inner (name)");
  if (error) throw error;

  for (const [j, image] of images.entries()) {
    const color = COLORS[(i * 2 + j) % COLORS.length];
    const source = await sharp(placeholderSvg(image.catalog_products.name, color)).png().toBuffer();
    for (const size of [480, 1280]) {
      const file = await sharp(source).resize({ width: size, height: size, fit: "inside" }).webp({ quality: 80 }).toBuffer();
      const { error: uploadError } = await supabase.storage
        .from("catalog-public")
        .upload(`${image.storage_path}-${size}.webp`, file, { contentType: "image/webp", upsert: true });
      if (uploadError) throw new Error(`${image.storage_path}: ${uploadError.message}`);
      uploaded++;
    }
  }
}
console.log(`seed-images: ${uploaded} archivos de muestra subidos.`);
