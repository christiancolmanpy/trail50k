// Plan 50K por Telegram, desde Google Apps Script.
// 1. script.google.com > Nuevo proyecto > pegar este archivo.
// 2. Configuración del proyecto (engranaje) > Propiedades del script:
//      TELEGRAM_TOKEN   = token del bot
//      TELEGRAM_CHAT_ID = 5578060330
// 3. Ejecutar una vez la función "probar" (autorizar cuando lo pida). Debe llegar el plan de hoy.
// 4. Ejecutar una vez "instalarDisparador": crea el disparador diario entre 5 y 6 de la mañana.

const PLAN_URL = "https://raw.githubusercontent.com/christiancolmanpy/trail50k/main/eventos_plan50k.json";
const APP_URL = "https://claude.ai/artifact/HBrKi65AhfwXYLFdzbKxHy";
const TZ = "America/Asuncion";
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const ZONAS = { Z1: "muy fácil", Z2: "cómodo, conversación", Z3: "frases cortas", Z4: "pocas palabras", Z5: "a tope" };

function enviarPlanDeHoy() { enviar(new Date()); }

function probar() { enviar(new Date()); }

function instalarDisparador() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === "enviarPlanDeHoy") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("enviarPlanDeHoy").timeBased().everyDays(1).atHour(5).inTimezone(TZ).create();
  Logger.log("Disparador creado: todos los días entre 5:00 y 6:00 (" + TZ + ")");
}

function enviar(fecha) {
  const hoy = Utilities.formatDate(fecha, TZ, "yyyy-MM-dd");
  const todos = JSON.parse(UrlFetchApp.fetch(PLAN_URL, { muteHttpExceptions: true }).getContentText());
  const eventos = todos.filter(e => e.start_date_local.startsWith(hoy));
  const msg = armarMensaje(eventos, fecha);
  Logger.log(msg);
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty("TELEGRAM_TOKEN"), chat = props.getProperty("TELEGRAM_CHAT_ID");
  if (!token || !chat) throw new Error("Faltan TELEGRAM_TOKEN o TELEGRAM_CHAT_ID en Propiedades del script");
  const url = "https://api.telegram.org/bot" + token + "/sendMessage";
  let r = UrlFetchApp.fetch(url, { method: "post", payload: { chat_id: chat, text: msg, parse_mode: "Markdown", disable_web_page_preview: "true" }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) {
    r = UrlFetchApp.fetch(url, { method: "post", payload: { chat_id: chat, text: msg.replace(/\*/g, "") }, muteHttpExceptions: true });
  }
  Logger.log("Telegram: " + r.getResponseCode());
}

function pasos(desc) {
  const out = []; let rep = null;
  (desc || "").split("\n").forEach(l => {
    l = l.trim();
    if (/^\d+x$/.test(l)) { rep = parseInt(l); out.push("  " + rep + "x:"); return; }
    if (l.startsWith("- ")) {
      const p = l.slice(2).split(" ");
      const dur = p[0].replace("m", " min").replace("s", " s");
      const zona = p[1] && p[1].startsWith("Z") ? p[1] : "";
      const resto = p.length > 2 ? p.slice(2).join(" ") : (ZONAS[zona] || "");
      out.push((rep ? "    " : "  ") + "• " + dur + " " + zona + " " + resto);
    } else if (l) out.push("  " + l);
  });
  return out;
}

function armarMensaje(eventos, fecha) {
  const d = new Date(Utilities.formatDate(fecha, TZ, "yyyy-MM-dd") + "T12:00:00");
  const semEv = eventos.find(e => /^S\d\d/.test(e.name));
  const semana = semEv ? parseInt(semEv.name.slice(1, 3)) : "?";
  const lineas = ["*Plan 50K · " + DIAS[d.getDay()] + " " + d.getDate() + " " + MESES[d.getMonth()] + "* (semana " + semana + ")", ""];
  const notas = eventos.filter(e => e.category === "NOTE");
  const sesiones = eventos.filter(e => e.category !== "NOTE");
  if (!sesiones.length) lineas.push("Día libre. Caminar, dormir, comer bien.");
  sesiones.forEach(e => {
    const nombre = e.name.split(" · ").slice(1).join(" · ");
    if (e.category === "RACE_A") lineas.push("🏁 *" + nombre + "*");
    else if (e.type === "WeightTraining") lineas.push("🏋️ *" + nombre + "* (~" + Math.round((e.moving_time || 3300) / 60) + " min)");
    else if (e.type === "Walk") lineas.push("🥾 *" + nombre + "*");
    else lineas.push("🏃 *" + nombre + "*");
    if (e.type === "WeightTraining") (e.description || "").replace(/ · /g, "\n").split("\n").forEach(x => { if (x.trim()) lineas.push("  " + x.trim()); });
    else lineas.push(...pasos(e.description));
    lineas.push("");
  });
  notas.forEach(n => lineas.push("📌 " + n.name.split(" · ").slice(1).join(" · ")));
  if (APP_URL) lineas.push("", APP_URL);
  return lineas.join("\n").trim();
}
