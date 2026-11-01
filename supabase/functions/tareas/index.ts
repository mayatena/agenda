// Acceso a las tareas y a las notas de la agenda. Se autentica con una clave propia (cabecera x-clave),
// por eso el despliegue no exige JWT. La tabla no tiene acceso público: solo esta función
// (con la clave de servicio) puede leer y escribir.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-clave",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const KINDS = new Set(["org", "open", "personal"]);
const COLORS = new Set(["", "verde", "azul", "lila", "amarillo", "rosa", "naranja", "turquesa", "gris"]);
const MAX_BODY = 100_000;
const MAX_BATCH = 50;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function digest(text: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

// Comparación en tiempo constante sobre los hashes de ambas claves.
async function claveCorrecta(recibida: string, esperada: string) {
  const a = await digest(recibida);
  const b = await digest(esperada);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function texto(v: unknown, max: number, nombre: string, obligatorio = false): string {
  if (v === undefined || v === null || v === "") {
    if (obligatorio) throw new Error(`Falta ${nombre}`);
    return "";
  }
  if (typeof v !== "string") throw new Error(`${nombre} no es válido`);
  const t = v.trim();
  if (obligatorio && !t) throw new Error(`Falta ${nombre}`);
  if (t.length > max) throw new Error(`${nombre} es demasiado largo`);
  return t;
}

function hora(v: unknown, nombre: string): string {
  const t = texto(v, 5, nombre);
  if (t && !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) throw new Error(`${nombre} no es válida`);
  return t;
}

function validar(raw: any) {
  if (!raw || typeof raw !== "object") throw new Error("Tarea no válida");
  const id = texto(raw.id, 64, "id", true);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("id no válido");
  if (!KINDS.has(raw.kind)) throw new Error("Tipo de tarea no válido");
  const fecha = texto(raw.date, 10, "fecha");
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error("fecha no válida");
  if (!fecha && raw.kind !== "personal") throw new Error("Falta la fecha");
  const subject = texto(raw.subject, 20, "asignatura");
  if (subject && !/^[a-z]+$/.test(subject)) throw new Error("asignatura no válida");
  const color = texto(raw.color, 20, "color");
  if (!COLORS.has(color)) throw new Error("color no válido");
  const created = Number(raw.created);
  return {
    id,
    kind: raw.kind,
    title: texto(raw.title, 300, "título", true),
    date: fecha || null,
    subject,
    color,
    type: texto(raw.type, 30, "tipo"),
    start_time: hora(raw.start, "hora de inicio"),
    end_time: hora(raw.end, "hora de fin"),
    done: raw.done === true,
    created: Number.isFinite(created) && created >= 0 ? Math.floor(created) : 0,
  };
}

function numero(v: unknown, nombre: string): number {
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : NaN;
  if (!Number.isFinite(n)) throw new Error(`${nombre} no es válido`);
  return n;
}

function validarNota(raw: any) {
  if (!raw || typeof raw !== "object") throw new Error("Nota no válida");
  const id = texto(raw.id, 64, "id", true);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("id no válido");
  const subject = texto(raw.subject, 20, "asignatura", true);
  if (!/^[a-z]+$/.test(subject)) throw new Error("asignatura no válida");
  // La nota puede faltar: examen hecho pero todavía sin calificación.
  const pendiente = raw.score === undefined || raw.score === null || raw.score === "";
  const score = pendiente ? null : numero(raw.score, "nota");
  if (score !== null && (score < 0 || score > 10)) throw new Error("nota no válida");
  const weight = numero(raw.weight, "porcentaje");
  if (!(weight > 0 && weight <= 100)) throw new Error("porcentaje no válido");
  const created = Number(raw.created);
  return {
    id,
    subject,
    name: texto(raw.name, 60, "nombre") || "Nota",
    score: score === null ? null : Math.round(score * 100) / 100,
    weight: Math.round(weight * 100) / 100,
    created: Number.isFinite(created) && created >= 0 ? Math.floor(created) : 0,
  };
}

function notaAApp(f: any) {
  return { id: f.id, subject: f.subject, name: f.name, score: f.score === null || f.score === undefined ? null : Number(f.score), weight: Number(f.weight), created: Number(f.created) };
}

function aApp(f: any) {
  return {
    id: f.id,
    kind: f.kind,
    title: f.title,
    date: f.date ?? "",
    subject: f.subject,
    color: f.color,
    type: f.type,
    start: f.start_time,
    end: f.end_time,
    done: f.done,
    created: Number(f.created),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const esperada = Deno.env.get("AGENDA_CLAVE");
  if (!esperada) return json({ error: "El servidor no tiene clave configurada" }, 500);

  const recibida = req.headers.get("x-clave") ?? "";
  if (!(await claveCorrecta(recibida, esperada))) {
    await new Promise((r) => setTimeout(r, 800));
    return json({ error: "Clave incorrecta" }, 401);
  }

  const crudo = await req.text();
  if (crudo.length > MAX_BODY) return json({ error: "Petición demasiado grande" }, 413);
  let cuerpo: any;
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return json({ error: "JSON no válido" }, 400);
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  try {
    switch (cuerpo?.op) {
      case "list": {
        const { data, error } = await db.from("tareas").select("*").order("created", { ascending: true }).limit(5000);
        if (error) throw error;
        return json({ tareas: (data ?? []).map(aApp) });
      }
      case "upsert": {
        const lista = Array.isArray(cuerpo.tareas) ? cuerpo.tareas : [];
        if (lista.length < 1 || lista.length > MAX_BATCH) return json({ error: "Número de tareas no válido" }, 400);
        const filas = lista.map(validar);
        const { error } = await db.from("tareas").upsert(filas, { onConflict: "id" });
        if (error) throw error;
        return json({ ok: true, guardadas: filas.length });
      }
      case "delete": {
        const id = texto(cuerpo.id, 64, "id", true);
        const { error } = await db.from("tareas").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      case "notas_list": {
        const { data, error } = await db.from("notas").select("*").order("created", { ascending: true }).limit(2000);
        if (error) throw error;
        return json({ notas: (data ?? []).map(notaAApp) });
      }
      case "notas_upsert": {
        const lista = Array.isArray(cuerpo.notas) ? cuerpo.notas : [];
        if (lista.length < 1 || lista.length > MAX_BATCH) return json({ error: "Número de notas no válido" }, 400);
        const filas = lista.map(validarNota);
        const { error } = await db.from("notas").upsert(filas, { onConflict: "id" });
        if (error) throw error;
        return json({ ok: true, guardadas: filas.length });
      }
      case "notas_delete": {
        const id = texto(cuerpo.id, 64, "id", true);
        const { error } = await db.from("notas").delete().eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
      default:
        return json({ error: "Operación no válida" }, 400);
    }
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Error";
    // Errores de validación (los lanzamos nosotros) se devuelven; los de base de datos se ocultan.
    const esValidacion = /^(Falta|Tarea|Nota|Tipo|id |fecha|asignatura|color|título|hora|tipo|nota|porcentaje|nombre)/.test(mensaje) ||
      /no es válid|no válid|demasiado largo/.test(mensaje);
    if (esValidacion) return json({ error: mensaje }, 400);
    console.error("Error en la función tareas:", e);
    return json({ error: "Error del servidor" }, 500);
  }
});
