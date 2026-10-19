#!/usr/bin/env python3
"""Genera tareas.json y TAREAS.md a partir de un volcado de las tareas de la agenda.

Uso:
    python3 scripts/sincronizar_tareas.py CARPETA_CON_JSON [RAIZ_DEL_REPO]

CARPETA_CON_JSON contiene un archivo <id>.json por tarea (el nombre es el id).
Si las tareas no han cambiado respecto a tareas.json, no escribe nada y
termina con código 0 imprimiendo "SIN_CAMBIOS".
"""
import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ASIGNATURAS = {
    "micro": "Microbiología",
    "farma": "Farmacología",
    "fisio": "Fisiopatología",
    "epi": "Epidemiología",
    "ap": "Anatomía Patológica",
    "holo": "Holocausto",
}
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
CAMPOS = ["id", "kind", "title", "date", "subject", "color", "type", "start", "end", "done", "created"]


def cargar(carpeta: Path) -> list[dict]:
    tareas = []
    for ruta in sorted(carpeta.glob("*.json")):
        try:
            datos = json.loads(ruta.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(datos, dict) or datos.get("kind") not in ("org", "open", "personal"):
            continue
        tarea = {campo: datos.get(campo, "") for campo in CAMPOS}
        tarea["id"] = ruta.stem
        tarea["done"] = bool(datos.get("done"))
        tarea["created"] = int(datos.get("created") or 0)
        tareas.append(tarea)
    tareas.sort(key=lambda t: (t["date"] or "9999", t["start"] or "99:99", t["created"], t["id"]))
    return tareas


def fecha_larga(clave: str) -> str:
    d = datetime.strptime(clave, "%Y-%m-%d")
    return f"{DIAS[d.weekday()].capitalize()} {d.day} de {MESES[d.month - 1]} de {d.year}"


def nombre_asig(t: dict) -> str:
    return ASIGNATURAS.get(t["subject"], "")


def linea_abierta(t: dict) -> str:
    marca = "x" if t["done"] else " "
    asig = nombre_asig(t)
    return f"- [{marca}] {t['title']}" + (f" · _{asig}_" if asig else "")


def linea_agenda(t: dict) -> str:
    horas = t["start"] + (f"–{t['end']}" if t["end"] else "")
    asig = nombre_asig(t)
    detalle = " · ".join(x for x in (t["type"], asig) if x)
    return f"- **{horas}** {t['title']}" + (f" _({detalle})_" if detalle else "")


def generar_md(tareas: list[dict], ahora: datetime) -> str:
    abiertas = [t for t in tareas if t["kind"] == "open"]
    personales = [t for t in tareas if t["kind"] == "personal"]
    total = len(abiertas) + len(personales)
    hechas = sum(1 for t in abiertas + personales if t["done"])

    out = ["# Tareas", ""]
    out.append(f"_Actualizado el {ahora:%d/%m/%Y a las %H:%M} (hora de Madrid)._")
    out.append("")
    out.append(f"**{hechas} de {total} tareas hechas** · {total - hechas} pendientes")
    out.append("")

    dias = sorted({t["date"] for t in tareas if t["kind"] in ("org", "open") and t["date"]})
    for dia in dias:
        del_dia = [t for t in tareas if t["date"] == dia and t["kind"] in ("org", "open")]
        agenda = [t for t in del_dia if t["kind"] == "org"]
        lista = [t for t in del_dia if t["kind"] == "open"]
        out.append(f"## {fecha_larga(dia)}")
        out.append("")
        if agenda:
            out.append("**Agenda**")
            out.append("")
            out.extend(linea_agenda(t) for t in agenda)
            out.append("")
        if lista:
            out.append("**Por hacer**")
            out.append("")
            out.extend(linea_abierta(t) for t in lista)
            out.append("")

    if personales:
        out.append("## Personal")
        out.append("")
        ordenadas = sorted(personales, key=lambda t: (t["done"], t["date"] or "9999", t["created"]))
        for t in ordenadas:
            extra = f" · _{t['date']}_" if t["date"] else ""
            out.append(f"- [{'x' if t['done'] else ' '}] {t['title']}{extra}")
        out.append("")

    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    carpeta = Path(sys.argv[1])
    raiz = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent
    if not carpeta.is_dir():
        print(f"No existe la carpeta {carpeta}", file=sys.stderr)
        return 2

    tareas = cargar(carpeta)
    if not tareas:
        print("El volcado no contiene tareas; no se escribe nada para no borrar datos.", file=sys.stderr)
        return 1

    destino_json = raiz / "tareas.json"
    nuevo_json = json.dumps(tareas, ensure_ascii=False, indent=2) + "\n"
    if destino_json.exists() and destino_json.read_text(encoding="utf-8") == nuevo_json:
        print("SIN_CAMBIOS")
        return 0

    ahora = datetime.now(ZoneInfo("Europe/Madrid"))
    destino_json.write_text(nuevo_json, encoding="utf-8")
    (raiz / "TAREAS.md").write_text(generar_md(tareas, ahora), encoding="utf-8")
    print(f"ACTUALIZADO: {len(tareas)} tareas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
