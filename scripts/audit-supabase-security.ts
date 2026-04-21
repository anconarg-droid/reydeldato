import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

const results = {
  usoDirectoEmprendedoresEnPublico: [] as string[],
  usoServiceRoleFueraDeApi: [] as string[],
  rutasApiConServiceRole: [] as string[],
};

function isIgnoredDirName(name: string) {
  return (
    name === "node_modules" ||
    name === ".next" ||
    name === ".git" ||
    name === "dist" ||
    name === "build"
  );
}

function isApiRouteFile(fullPath: string) {
  const normalized = fullPath.split(path.sep).join("/");
  return normalized.includes("/app/api/");
}

function isScriptsOrTools(fullPath: string) {
  const normalized = fullPath.split(path.sep).join("/");
  return (
    normalized.includes("/scripts/") ||
    normalized.includes("/lib/scripts/") ||
    normalized.endsWith("/scripts/audit-supabase-security.ts")
  );
}

function isPublicAppCode(fullPath: string) {
  const normalized = fullPath.split(path.sep).join("/");
  if (isApiRouteFile(fullPath)) return false;
  if (isScriptsOrTools(fullPath)) return false;
  // Admin/panel son backend/privado (aunque vivan en Next).
  if (normalized.includes("/app/admin/")) return false;
  if (normalized.includes("/app/panel/")) return false;
  return normalized.includes("/app/") || normalized.includes("/components/") || normalized.includes("/lib/");
}

function scanDir(dir: string) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (isIgnoredDirName(file)) continue;
      scanDir(fullPath);
      continue;
    }

    if (!EXTENSIONS.some((ext) => file.endsWith(ext))) continue;

    const content = fs.readFileSync(fullPath, "utf8");

    // 🚨 1. Uso directo de tabla emprendedores en código público (debería ser vista pública)
    if (
      isPublicAppCode(fullPath) &&
      (content.includes('.from("emprendedores")') || content.includes(".from('emprendedores')"))
    ) {
      results.usoDirectoEmprendedoresEnPublico.push(fullPath);
    }

    // 🚨 2. Uso de service role fuera de API (esto es crítico)
    if (
      content.includes("SUPABASE_SERVICE_ROLE_KEY") &&
      !isApiRouteFile(fullPath) &&
      !isScriptsOrTools(fullPath)
    ) {
      results.usoServiceRoleFueraDeApi.push(fullPath);
    }

    // ⚠️ 3. Uso de service role en API (válido pero conviene revisar)
    if (content.includes("SUPABASE_SERVICE_ROLE_KEY") && isApiRouteFile(fullPath)) {
      results.rutasApiConServiceRole.push(fullPath);
    }
  }
}

function printList(list: string[]) {
  if (list.length === 0) {
    console.log("✅ OK - No detectado\n");
    return;
  }
  for (const f of list) console.log("❌ " + f);
  console.log("");
}

function runAudit() {
  console.log("\n🔍 INICIANDO AUDITORÍA DE SEGURIDAD SUPABASE...\n");

  scanDir(ROOT);

  console.log("=====================================");
  console.log("🚨 USO DIRECTO DE '.from(\"emprendedores\")' (CÓDIGO PÚBLICO)");
  console.log("=====================================");
  printList(results.usoDirectoEmprendedoresEnPublico);

  console.log("=====================================");
  console.log("🚨 SERVICE ROLE FUERA DE app/api (CRÍTICO)");
  console.log("=====================================");
  printList(results.usoServiceRoleFueraDeApi);

  console.log("=====================================");
  console.log("⚠️ SERVICE ROLE EN app/api (REVISAR)");
  console.log("=====================================");
  if (results.rutasApiConServiceRole.length === 0) {
    console.log("⚠️ Ninguna detectada\n");
  } else {
    for (const f of results.rutasApiConServiceRole) console.log("⚠️ " + f);
    console.log("");
  }

  console.log("✅ Auditoría terminada\n");
}

runAudit();

