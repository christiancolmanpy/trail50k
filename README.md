# Plan 50K por Telegram, todos los días a las 5:30

## 1. Crear el bot (2 min)
1. En Telegram, abrir @BotFather y mandar `/newbot`. Poner un nombre (ej. "Plan 50K") y un usuario
   terminado en `bot` (ej. `plan50k_christian_bot`).
2. BotFather responde con el token: algo como `123456789:AAH...`. Guardarlo.
3. Abrir el chat con tu bot nuevo y mandarle cualquier mensaje (ej. "hola"). Sin esto el bot no te puede escribir.

## 2. Obtener tu chat id
Abrir en el navegador (reemplazando el token):
    https://api.telegram.org/bot<TOKEN>/getUpdates
En la respuesta buscar `"chat":{"id":123456789,...}`. Ese número es tu chat id.
(Si sale vacío, mandale otro mensaje al bot y recargar.)

## 3. Repo en GitHub
Crear un repo privado y subir: enviar_plan_telegram.py, eventos_plan50k.json, .github/workflows/plan-diario.yml

Settings > Secrets and variables > Actions:
- Secret  TELEGRAM_TOKEN   = el token del paso 1
- Secret  TELEGRAM_CHAT_ID = el número del paso 2

## 4. Probar
Actions > "Plan del día por Telegram" > Run workflow. Debe llegar el plan de hoy en menos de un minuto.

Desde ahí corre solo cada mañana. GitHub puede demorar los crons unos minutos.
Cuando cambie el plan, reemplazar eventos_plan50k.json en el repo.

Probar en local sin mandar nada:
    PLAN_FECHA=2027-02-11 python3 enviar_plan_telegram.py --dry-run

## Alternativa sin GitHub Actions: Google Apps Script
Si Actions no corre (cuenta bloqueada por facturación), usar apps_script/Code.gs:
1. script.google.com > Nuevo proyecto > pegar Code.gs.
2. Configuración del proyecto > Propiedades del script: TELEGRAM_TOKEN y TELEGRAM_CHAT_ID.
3. Ejecutar "probar" (autorizar) > debe llegar el plan de hoy.
4. Ejecutar "instalarDisparador" > queda diario entre 5 y 6 am.
El script lee eventos_plan50k.json de este repo, así que el plan se sigue actualizando acá.
