#!/usr/bin/env python3
"""
Manda por Telegram el plan de entrenamiento del día.

Variables de entorno:
    TELEGRAM_TOKEN    token del bot (lo da @BotFather)
    TELEGRAM_CHAT_ID  tu chat id (ver README)
    PLAN_JSON         ruta al JSON de eventos (default: eventos_plan50k.json)
    PLAN_FECHA        opcional, YYYY-MM-DD para probar otro día
    APP_URL           opcional, link a la app para agregar al final

Uso: python3 enviar_plan_telegram.py            # manda
     python3 enviar_plan_telegram.py --dry-run  # solo imprime
"""
import json
import os
import sys
import urllib.parse
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta

TZ = timezone(timedelta(hours=-3))  # America/Asuncion (sin horario de verano desde 2024)
DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
ZONAS = {"Z1": "muy fácil", "Z2": "cómodo, conversación", "Z3": "frases cortas", "Z4": "pocas palabras", "Z5": "a tope"}


def hoy():
    f = os.environ.get("PLAN_FECHA")
    return datetime.strptime(f, "%Y-%m-%d").date() if f else datetime.now(TZ).date()


def pasos(desc):
    out, rep = [], None
    for l in desc.splitlines():
        l = l.strip()
        if l.endswith("x") and l[:-1].isdigit():
            rep = int(l[:-1]); out.append(f"  {rep}x:"); continue
        if l.startswith("- "):
            partes = l[2:].split(" ", 2)
            dur = partes[0].replace("m", " min").replace("s", " s") if len(partes) > 1 else partes[0]
            zona = partes[1] if len(partes) > 1 and partes[1].startswith("Z") else ""
            resto = partes[2] if len(partes) > 2 else ZONAS.get(zona, "")
            pref = "    " if rep else "  "
            out.append(f"{pref}• {dur} {zona} {resto}".rstrip())
        elif l:
            out.append(f"  {l}")
    return out


def armar_mensaje(eventos, fecha):
    semana = next((e["name"][1:3] for e in eventos if e["name"].startswith("S")), "")
    cab = f"*Plan 50K · {DIAS[fecha.weekday()]} {fecha.day} {MESES[fecha.month - 1]}* (semana {int(semana) if semana else '?'})"
    notas = [e for e in eventos if e.get("category") == "NOTE"]
    sesiones = [e for e in eventos if e.get("category") != "NOTE"]
    lineas = [cab, ""]
    if not sesiones:
        lineas.append("Día libre. Caminar, dormir, comer bien.")
    for e in sesiones:
        nombre = e["name"].split(" · ", 1)[-1]
        if e.get("category") == "RACE_A":
            lineas.append(f"🏁 *{nombre}*")
        elif e.get("type") == "WeightTraining":
            lineas.append(f"🏋️ *{nombre}* (~{e.get('moving_time', 3300) // 60} min)")
        elif e.get("type") == "Walk":
            lineas.append(f"🥾 *{nombre}*")
        else:
            lineas.append(f"🏃 *{nombre}*")
        d = e.get("description", "")
        if e.get("type") == "WeightTraining":
            lineas += ["  " + x.strip() for x in d.replace(" · ", "\n").splitlines() if x.strip()]
        else:
            lineas += pasos(d)
        lineas.append("")
    for n in notas:
        lineas.append("📌 " + n["name"].split(" · ", 1)[-1])
    url = os.environ.get("APP_URL")
    if url:
        lineas += ["", url]
    return "\n".join(lineas).strip()


def main():
    ruta = os.environ.get("PLAN_JSON", "eventos_plan50k.json")
    with open(ruta, encoding="utf-8") as f:
        todos = json.load(f)
    fecha = hoy()
    eventos = [e for e in todos if e["start_date_local"].startswith(fecha.isoformat())]
    msg = armar_mensaje(eventos, fecha)
    print(msg)
    if "--dry-run" in sys.argv:
        return
    token, chat = os.environ.get("TELEGRAM_TOKEN"), os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat:
        sys.exit("Faltan TELEGRAM_TOKEN o TELEGRAM_CHAT_ID")
    datos = urllib.parse.urlencode({"chat_id": chat, "text": msg, "parse_mode": "Markdown",
                                    "disable_web_page_preview": "true"}).encode()
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=datos)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print("Telegram:", r.status)
    except urllib.error.HTTPError as e:
        # Si el Markdown falla por algún carácter, reintenta en texto plano
        datos = urllib.parse.urlencode({"chat_id": chat, "text": msg.replace("*", "")}).encode()
        with urllib.request.urlopen(urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=datos), timeout=30) as r:
            print("Telegram (texto plano):", r.status, "| error previo:", e.code)


if __name__ == "__main__":
    main()
