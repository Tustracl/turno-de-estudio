/* Turno de estudio — modo independiente (web y APK).
   Reemplaza la base de datos de Claude por el almacenamiento del dispositivo.
   Los datos de las semanas vienen de datos.js (window.TURNO_DATOS). */
(function(){
  var KEY = "turno-progreso-v1";
  var memoria = null; // respaldo si el navegador bloquea localStorage
  var D = window.TURNO_DATOS || { ramos: [], semanas: [] };
  var esApk = /TurnoDeEstudioApp/.test(navigator.userAgent);

  function leer(){
    try { var t = localStorage.getItem(KEY); return t ? JSON.parse(t) : memoria; }
    catch (e) { return memoria; }
  }
  function escribir(v){
    memoria = v;
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
  }
  function snap(v){ return { exists: v !== null && v !== undefined, data: function(){ return v; }, metadata: { hasPendingWrites: false } }; }

  var db = {
    doc: function(path){
      return {
        onSnapshot: function(cb){
          setTimeout(function(){
            if (path === "config/ramos") cb(snap({ ramos: D.ramos }));
            else cb(snap(leer()));
          }, 0);
          return function(){};
        },
        set: function(v){ escribir(v); return Promise.resolve(); }
      };
    },
    collection: function(){
      return {
        onSnapshot: function(cb){
          setTimeout(function(){ cb({ docs: D.semanas.map(function(s){ return { data: function(){ return s; } }; }) }); }, 0);
          return function(){};
        }
      };
    }
  };

  window.claude = {
    use: function(nombre){
      if (nombre === "db") return Promise.resolve(db);
      return Promise.reject({ code: "not_granted" });
    }
  };

  /* ---------- Respaldo del avance ---------- */
  function codificar(o){ return btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
  function decodificar(t){ return JSON.parse(decodeURIComponent(escape(atob(t.replace(/\s+/g, ""))))); }
  function copiarTexto(t){
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function(){ return true; }, function(){ return viejo(t); });
    return Promise.resolve(viejo(t));
    function viejo(x){ try { var a = document.createElement("textarea"); a.value = x; a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select(); var ok = document.execCommand("copy"); a.remove(); return ok; } catch (e) { return false; } }
  }

  function montarHerramientas(){
    var box = document.getElementById("local-tools");
    if (!box) return;
    var apk = window.TURNO_APK_URL;
    box.innerHTML =
      '<div class="tools">' +
        '<button class="btn ghost" id="lt-exp">Copiar respaldo</button>' +
        '<button class="btn ghost" id="lt-imp">Restaurar respaldo</button>' +
        (!esApk && apk ? '<a class="btn ghost" id="lt-apk" href="' + apk + '">Descargar app Android</a>' : '') +
      '</div>' +
      '<div id="lt-panel" hidden class="tq" style="margin-top:10px">' +
        '<label class="note" for="lt-txt">Pega aquí el código de respaldo</label>' +
        '<textarea id="lt-txt" style="min-height:90px"></textarea>' +
        '<div class="row"><button class="btn" id="lt-ok">Restaurar</button><span class="note" id="lt-msg"></span></div>' +
      '</div>' +
      '<p class="note" id="lt-out"></p>';
    var out = document.getElementById("lt-out");
    document.getElementById("lt-exp").onclick = function(){
      var p = leer();
      if (!p) { out.textContent = "Todavía no hay avance para respaldar."; return; }
      var c = codificar(p);
      copiarTexto(c).then(function(ok){
        out.textContent = ok ? "Código copiado. Guárdalo (por ejemplo, mándatelo por WhatsApp) y pégalo en el otro dispositivo con Restaurar respaldo." : "No se pudo copiar. Selecciona y copia este código: " + c;
      });
    };
    document.getElementById("lt-imp").onclick = function(){ var pn = document.getElementById("lt-panel"); pn.hidden = !pn.hidden; };
    document.getElementById("lt-ok").onclick = function(){
      var msg = document.getElementById("lt-msg");
      try {
        var p = decodificar(document.getElementById("lt-txt").value);
        if (!p || typeof p !== "object" || !("xp" in p)) throw new Error("formato");
        var actual = leer();
        if (actual && (actual.xp || 0) > (p.xp || 0) && !confirm("Este dispositivo tiene más puntos (" + actual.xp + ") que el respaldo (" + (p.xp || 0) + "). ¿Reemplazar igual?")) return;
        escribir(p);
        msg.textContent = "Listo. Recargando…";
        setTimeout(function(){ location.reload(); }, 600);
      } catch (e) { msg.textContent = "Ese código no es válido. Cópialo completo."; }
    };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montarHerramientas);
  else montarHerramientas();

  /* ---------- Uso sin conexión (solo web, no en la APK) ---------- */
  if (!esApk && "serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); });
  }
})();
