import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isPersistibleFotoUrl } from "@/lib/isPersistibleFotoUrl";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

function parseBase64(input: string): { buffer: Buffer; contentType: string } {
  const trimmed = input.trim();
  const dataUrl = /^data:([^;]+);base64,(.+)$/is.exec(trimmed);
  if (dataUrl) {
    const contentType = dataUrl[1] || "application/octet-stream";
    const b64 = dataUrl[2].replace(/\s/g, "");
    const buffer = Buffer.from(b64, "base64");
    return { buffer, contentType };
  }
  const b64 = trimmed.replace(/^data:[^;]+;base64,/i, "").replace(/\s/g, "");
  const buffer = Buffer.from(b64, "base64");
  return { buffer, contentType: "image/jpeg" };
}

function guessContentType(filename: string, fromPayload: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (fromPayload.startsWith("image/")) return fromPayload;
  return "image/jpeg";
}

function extFromMime(mime: string): string {
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  return ".jpg";
}

function safeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() || "file";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "file";
}

/** Asegura URL usable en <img src> del navegador (evita paths relativos sueltos). */
function toAbsolutePublicUrl(url: string, req: Request): string {
  const u = url.trim();
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) return `https:${u}`;
  try {
    const origin = new URL(req.url).origin;
    if (u.startsWith("/")) return `${origin}${u}`;
  } catch {
    /* ignore */
  }
  return u;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body?.base64) {
      return NextResponse.json({ ok: false, error: "No base64" }, { status: 400 });
    }

    const filename =
      typeof body.filename === "string" ? body.filename : "upload.bin";
    const folderRaw = typeof body.folder === "string" ? body.folder : "uploads";
    const folder = folderRaw
      .replace(/^\/+|\/+$/g, "")
      .replace(/\.\./g, "")
      .replace(/[^a-zA-Z0-9/_-]/g, "_")
      .slice(0, 200) || "uploads";

    let buffer: Buffer;
    let contentType: string;
    try {
      const parsed = parseBase64(String(body.base64));
      buffer = parsed.buffer;
      contentType = guessContentType(filename, parsed.contentType);
    } catch {
      return NextResponse.json({ ok: false, error: "Base64 inválido" }, { status: 400 });
    }

    if (!buffer.length) {
      return NextResponse.json({ ok: false, error: "Archivo vacío" }, { status: 400 });
    }
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Archivo demasiado grande" },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = getSupabaseAdmin({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      });
    } catch (e) {
      console.error("[upload-base64] Supabase admin no disponible:", e);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Almacenamiento no configurado: faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 503 }
      );
    }

    // Bucket público en Supabase donde viven las fotos de fichas (debe existir en el proyecto).
    const bucket =
      process.env.SUPABASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
      "emprendedores";

    const safeName = safeFilename(filename);
    const extFromName = safeName.match(/(\.[a-zA-Z0-9]{1,8})$/i)?.[1];
    const ext = extFromName || extFromMime(contentType);
    const objectPath = `${folder}/${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(objectPath, buffer, {
        contentType,
        upsert: false,
      });

    if (upErr) {
      console.error("[upload-base64] Error de Storage:", upErr.message, upErr);
      return NextResponse.json(
        {
          ok: false,
          error:
            upErr.message ||
            "No se pudo subir el archivo. ¿Existe el bucket y las políticas permiten insert?",
          bucket,
        },
        { status: 500 }
      );
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    const publicUrl = toAbsolutePublicUrl(pub.publicUrl, req);

    console.log(
      "[upload-base64] OK — URL pública final:",
      publicUrl,
      "| bucket:",
      bucket,
      "| path:",
      objectPath
    );

    if (!isPersistibleFotoUrl(publicUrl)) {
      console.error(
        "[upload-base64] URL generada no es persistible (revisar Storage/config):",
        publicUrl
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            "La URL de la imagen no es válida para guardar (placeholder o inválida).",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      publicUrl,
      bucket,
      path: objectPath,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}
