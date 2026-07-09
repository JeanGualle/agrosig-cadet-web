const map = L.map('map').setView([-0.22, -78.38], 16);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 22,
  attribution: '© OpenStreetMap'
});

const satelite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { attribution: '© Esri' }
);

osm.addTo(map);

L.control.layers({
  "🗺 Normal": osm,
  "🛰 Satélite": satelite
}, null, {
  position: "topright",
  collapsed: false
}).addTo(map);

const layers = {};
const marcadoresMonitoreo = L.layerGroup().addTo(map);

let puntoSeleccionado = null;
let marcadorTemporal = null;
let registrosGlobales = [];

// ===============================
// SELECCIÓN DE PUNTO EN MAPA
// ===============================

function seleccionarPuntoMonitoreo(latlng) {
  puntoSeleccionado = {
    lat: latlng.lat,
    lng: latlng.lng
  };

  if (marcadorTemporal) {
    map.removeLayer(marcadorTemporal);
  }

  marcadorTemporal = L.circleMarker(latlng, {
    radius: 8,
    color: "#ffffff",
    weight: 3,
    fillColor: "#1976d2",
    fillOpacity: 1
  }).addTo(map);

  marcadorTemporal.bindPopup("📍 Punto seleccionado para monitoreo").openPopup();
}

map.on("click", function(e) {
  seleccionarPuntoMonitoreo(e.latlng);
});

// ===============================
// FUNCIONES DE RIESGO
// ===============================

function colorRiesgo(valor) {
  const r = Number(valor);
  if (r >= 5) return '#d7191c';
  if (r === 4) return '#fdae61';
  if (r === 3) return '#ffe34d';
  return '#2ca25f';
}

function textoRiesgo(valor) {
  const r = Number(valor);
  if (r >= 5) return 'Muy alto';
  if (r === 4) return 'Alto';
  if (r === 3) return 'Medio';
  return 'Bajo';
}

function obtenerNombre(properties) {
  if (properties.Cultivos) return properties.Cultivos;
  if (properties.Bosque) return 'Bosque';
  if (properties.Pastos) return 'Pastos';
  if (properties.Invernaderos) return properties.Invernaderos;
  if (properties.CADET) return 'Área del CADET';
  if (properties.Nombre) return properties.Nombre;
  if (properties.name) return properties.name;
  if (properties.id) return 'Elemento ' + properties.id;
  if (properties.fid) return 'Elemento SIG ' + properties.fid;
  return 'Elemento SIG';
}

// ===============================
// INFORMACIÓN DE CAPAS
// ===============================

function mostrarInfo(titulo, props, riesgo) {
  const riesgoHTML = riesgo
    ? `<p><strong>Riesgo:</strong> <span class="risk-pill" style="background:${colorRiesgo(riesgo)}">${textoRiesgo(riesgo)}</span></p>`
    : '';

  let detalles = '';

  Object.keys(props).forEach(key => {
    if (props[key] !== null && props[key] !== '' && key !== 'geometry') {
      detalles += `<p><strong>${key}:</strong> ${props[key]}</p>`;
    }
  });

  const infoDiv = document.getElementById('info');

if (infoDiv) {
  infoDiv.innerHTML = `
    <h3>${titulo}</h3>
    ${riesgoHTML}
    ${detalles}
  `;
}

document.getElementById('area').value = titulo;


}

function popupFromProps(title, props, riesgo) {
  let html = `<strong>${title}</strong><br>`;

  if (riesgo) html += `Riesgo: ${textoRiesgo(riesgo)}<br>`;

  Object.keys(props).slice(0, 5).forEach(key => {
    if (props[key] !== null && props[key] !== '') {
      html += `${key}: ${props[key]}<br>`;
    }
  });

  return html;
}

// ===============================
// CARGA DE CAPAS GEOJSON
// ===============================

function cargarCapa(nombre, archivo, estiloFn) {
  return fetch(`data/${archivo}`)
    .then(response => response.json())
    .then(data => {
      layers[nombre] = L.geoJSON(data, {
        style: estiloFn,
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          const titulo = obtenerNombre(props);
          const riesgo = props.riesgo_hosp || props.riesgo || props['riesgo '] || null;

          layer.bindPopup(popupFromProps(titulo, props, riesgo));

          layer.on('click', (e) => {
  mostrarInfo(titulo, props, riesgo);
  seleccionarPuntoMonitoreo(e.latlng);
});
        }
      }).addTo(map);

      return layers[nombre];
    })
    .catch(error => console.warn(`No se pudo cargar ${archivo}`, error));
}

Promise.all([
  cargarCapa('borde', 'borde.geojson', () => ({
    color: '#111',
    weight: 3,
    fillOpacity: 0
  })),

  cargarCapa('cultivos', 'cultivos.geojson', feature => {
    const riesgo = feature.properties.riesgo_hosp || feature.properties.riesgo || 3;
    return {
      color: '#222',
      weight: 1,
      fillColor: colorRiesgo(riesgo),
      fillOpacity: 0.68
    };
  }),

  cargarCapa('invernaderos', 'invernaderos.geojson', () => ({
    color: '#7f0000',
    weight: 1,
    fillColor: '#d7191c',
    fillOpacity: 0.75
  })),

  cargarCapa('bosque', 'bosque.geojson', () => ({
    color: '#003d00',
    weight: 1,
    fillColor: '#006400',
    fillOpacity: 0.65
  })),

  cargarCapa('pastos', 'pastos.geojson', () => ({
    color: '#3b7d3b',
    weight: 1,
    fillColor: '#90ee90',
    fillOpacity: 0.65
  })),

  cargarCapa('pasoAgua', 'paso_agua.geojson', () => ({
    color: '#008cff',
    weight: 4,
    fillColor: '#8fd3ff',
    fillOpacity: 0.35
  }))
]).then(() => {
  const boundsLayers = Object.values(layers).filter(Boolean);

  if (boundsLayers.length > 0) {
    const group = L.featureGroup(boundsLayers);
    map.fitBounds(group.getBounds(), { padding: [20, 20] });
  }
});

// ===============================
// ACTIVAR / DESACTIVAR CAPAS
// ===============================

document.querySelectorAll('.layer-toggle').forEach(input => {
  input.addEventListener('change', event => {
    const layerName = event.target.dataset.layer;
    const layer = layers[layerName];

    if (!layer) return;

    if (event.target.checked) {
      map.addLayer(layer);
    } else {
      map.removeLayer(layer);
    }
  });
});

// ===============================
// DASHBOARD
// ===============================

function actualizarDashboard(historial) {
  document.getElementById("totalRegistros").textContent = historial.length;

  const areas = new Set(
    historial
      .map(reg => reg.area)
      .filter(area => area && area !== "Sin área seleccionada")
  );

  document.getElementById("totalAreas").textContent = areas.size;

  const conteoPlagas = {};

  historial.forEach(reg => {
    const plaga = reg.plaga || "Sin dato";
    conteoPlagas[plaga] = (conteoPlagas[plaga] || 0) + 1;
  });

  let plagaPrincipal = "-";
  let mayor = 0;

  Object.keys(conteoPlagas).forEach(plaga => {
    if (conteoPlagas[plaga] > mayor && plaga !== "Sin dato") {
      mayor = conteoPlagas[plaga];
      plagaPrincipal = plaga;
    }
  });

  document.getElementById("plagaPrincipal").textContent = plagaPrincipal;

  const riesgoAlto = historial.filter(reg =>
    reg.riesgo === "Alto" || reg.riesgo === "Muy alto"
  ).length;

  document.getElementById("riesgoAlto").textContent = riesgoAlto;
}

// ===============================
// MARCADORES DE MONITOREO
// ===============================

function colorMarcador(riesgo) {
  if (riesgo === "Muy alto") return "#d7191c";
  if (riesgo === "Alto") return "#f57c00";
  if (riesgo === "Medio") return "#fbc02d";
  return "#2ca25f";
}

function renderizarMarcadores(historial) {
  marcadoresMonitoreo.clearLayers();

  historial.forEach(reg => {
    if (
      reg.lat === null ||
      reg.lng === null ||
      reg.lat === undefined ||
      reg.lng === undefined
    ) {
      return;
    }

    const lat = Number(reg.lat);
    const lng = Number(reg.lng);

    if (isNaN(lat) || isNaN(lng)) return;

    const color = colorMarcador(reg.riesgo);

    const icono = L.divIcon({
      className: "marcador-riesgo",
      html: `<span style="background:${color};"></span>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marcador = L.marker([lat, lng], { icon: icono });

    marcador.bindPopup(`
      <div class="popup-monitoreo">
        <strong>📍 Registro de monitoreo</strong><br><br>
        <strong>🌱 Área:</strong> ${reg.area || "Sin área"}<br>
        <strong>🐛 Plaga:</strong> ${reg.plaga || "Sin dato"}<br>
        <strong>⚠️ Riesgo:</strong> ${reg.riesgo || "Sin dato"}<br>
        <strong>💊 Tratamiento:</strong> ${reg.tratamiento || "Sin dato"}<br>
        <strong>📝 Observaciones:</strong> ${reg.observaciones || "Sin observaciones"}<br>
        <strong>📅 Fecha:</strong> ${reg.fecha || "Sin fecha"}<br>
        <strong>📌 Coordenadas:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}
        ${
          reg.foto
            ? `<br><img src="${reg.foto}" style="width:160px;max-height:120px;object-fit:cover;border-radius:8px;margin-top:8px;">`
            : ""
        }
      </div>
    `);

    marcador.addTo(marcadoresMonitoreo);
  });
}

// ===============================
// HISTORIAL
// ===============================

function renderizarHistorial(historial) {
  registrosGlobales = historial;

  const contenedor = document.getElementById("historial");
  contenedor.innerHTML = "";

  actualizarDashboard(historial);
  renderizarMarcadores(historial);

  if (historial.length === 0) {
    contenedor.innerHTML = "<p>Todavía no hay registros.</p>";
    return;
  }

  historial.forEach(reg => {
    const div = document.createElement("div");
    div.className = "record";

    div.innerHTML = `
      <div class="registro-resumen">
        <strong>📅 ${reg.fecha || "Sin fecha"}</strong><br>
        <span>🌱 ${reg.area || "Sin área"}</span><br>
        <span>🐛 ${reg.plaga || "Sin plaga"} | ⚠ ${reg.riesgo || "Sin riesgo"}</span>
      </div>

      <button class="btn-detalles">Ver detalles</button>
      <button class="btn-eliminar" data-id="${reg.id}">🗑️ Eliminar</button>

      <div class="registro-detalle" style="display:none;">
        <hr>
        <strong>💊 Tratamiento:</strong> ${reg.tratamiento || "Sin dato"}<br>
        <strong>📝 Observaciones:</strong> ${reg.observaciones || "Sin observaciones"}<br>
        <strong>📍 Coordenadas:</strong>
        ${
          reg.lat && reg.lng
            ? `${Number(reg.lat).toFixed(6)}, ${Number(reg.lng).toFixed(6)}`
            : "Sin coordenadas"
        }<br>

        ${
          reg.foto
            ? `<img src="${reg.foto}" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;margin-top:8px;">`
            : ""
        }
      </div>
    `;

    contenedor.appendChild(div);

    const btnDetalles = div.querySelector(".btn-detalles");
    const detalle = div.querySelector(".registro-detalle");

    btnDetalles.addEventListener("click", () => {
      const abierto = detalle.style.display === "block";
      detalle.style.display = abierto ? "none" : "block";
      btnDetalles.textContent = abierto ? "Ver detalles" : "Ocultar detalles";
    });

    const btnEliminar = div.querySelector(".btn-eliminar");

    btnEliminar.addEventListener("click", async () => {
      if (!confirm("¿Deseas eliminar este registro?")) return;

      const id = btnEliminar.dataset.id;

      if (window.eliminarRegistroFirebase) {
        await window.eliminarRegistroFirebase(id);
      }
    });
  });
}

function cargarHistorial() {
  const contenedor = document.getElementById("historial");
  contenedor.innerHTML = "<p>Cargando registros...</p>";

  if (window.escucharRegistrosFirebase) {
    window.escucharRegistrosFirebase((registros) => {
      renderizarHistorial(registros);
    });
  } else {
    const historialLocal = JSON.parse(
      localStorage.getItem("registrosAgroSIG") || "[]"
    ).reverse();

    renderizarHistorial(historialLocal);
  }
}

// ===============================
// GUARDAR REGISTRO
// ===============================

document.getElementById("guardar").addEventListener("click", () => {
  const archivoFoto = document.getElementById("foto").files[0];

  const guardarRegistro = (fotoBase64 = "") => {
    const registro = {
      fecha: new Date().toLocaleString(),
      area: document.getElementById("area").value || "Sin área seleccionada",
      plaga: document.getElementById("plaga").value || "Sin dato",
      riesgo: document.getElementById("riesgo").value,
      tratamiento: document.getElementById("tratamiento").value || "Sin dato",
      observaciones: document.getElementById("observaciones").value || "Sin observaciones",
      foto: fotoBase64,
      lat: puntoSeleccionado ? puntoSeleccionado.lat : null,
      lng: puntoSeleccionado ? puntoSeleccionado.lng : null
    };

    console.log("Registro a guardar:", registro);

    if (window.guardarRegistroFirebase) {
      window.guardarRegistroFirebase(registro)
        .then(() => {
          console.log("Registro enviado a Firebase.");
        })
        .catch((error) => {
          console.error(error);

          const historial = JSON.parse(
            localStorage.getItem("registrosAgroSIG") || "[]"
          );

          historial.push(registro);

          localStorage.setItem(
            "registrosAgroSIG",
            JSON.stringify(historial)
          );
        });
    } else {
      const historial = JSON.parse(
        localStorage.getItem("registrosAgroSIG") || "[]"
      );

      historial.push(registro);

      localStorage.setItem(
        "registrosAgroSIG",
        JSON.stringify(historial)
      );
    }

    document.getElementById("plaga").value = "";
    document.getElementById("tratamiento").value = "";
    document.getElementById("observaciones").value = "";
    document.getElementById("foto").value = "";

    if (marcadorTemporal) {
      map.removeLayer(marcadorTemporal);
      marcadorTemporal = null;
    }

    puntoSeleccionado = null;

    alert("Registro guardado correctamente.");
  };

  if (archivoFoto) {
    const lector = new FileReader();

    lector.onload = (evento) => {
      guardarRegistro(evento.target.result);
    };

    lector.readAsDataURL(archivoFoto);
  } else {
    guardarRegistro();
  }
});

// ===============================
// VARIABLES MICROCLIMÁTICAS
// ===============================

let datosClima = {};

fetch("data/clima.json")
  .then(res => res.json())
  .then(data => {
    datosClima = data;
    actualizarClima();
  });

function actualizarClima() {
  const anio = document.getElementById("anioClima").value;
  const mes = document.getElementById("mesClima").value;

  if (!datosClima[anio]) return;
  if (!datosClima[anio][mes]) return;

  const d = datosClima[anio][mes];

  document.getElementById("datosClima").innerHTML = `
    <p>🌡 <strong>Temperatura:</strong> ${d.temperatura} °C</p>
    <p>💧 <strong>Humedad:</strong> ${d.humedad} %</p>
    <p>🌧 <strong>Precipitación:</strong> ${d.precipitacion} mm</p>
    <p>💦 <strong>Evaporación:</strong> ${d.evaporacion} mm</p>
    <p>☀ <strong>Heliofanía:</strong> ${d.heliofania} h</p>
    <p>💨 <strong>Viento:</strong> ${d.viento} m/s</p>
    <p>☁ <strong>Nubosidad:</strong> ${d.nubosidad} octas</p>
  `;

  let riesgo = "🟢 Bajo";

  if (d.humedad >= 80 && d.precipitacion >= 150) {
    riesgo = "🔴 Alto";
  } else if (d.humedad >= 75) {
    riesgo = "🟡 Medio";
  }

  document.getElementById("riesgoClimatico").innerHTML =
    `<h3>Riesgo climático</h3><h2>${riesgo}</h2>`;
}

document.getElementById("anioClima").addEventListener("change", actualizarClima);
document.getElementById("mesClima").addEventListener("change", actualizarClima);

// ===============================
// EXPORTAR PDF
// ===============================

const botonPDF = document.getElementById("exportarPDF");

if (botonPDF) {
  botonPDF.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    const fecha = new Date().toLocaleString();

    pdf.setFontSize(16);
    pdf.text("AgroSIG CADET - La Morita", 20, 20);

    pdf.setFontSize(11);
    pdf.text("Universidad Central del Ecuador", 20, 28);
    pdf.text("Facultad de Ciencias Agrícolas", 20, 35);
    pdf.text(`Fecha de generación: ${fecha}`, 20, 43);

    pdf.setFontSize(13);
    pdf.text("Resumen del monitoreo", 20, 55);

    pdf.setFontSize(11);
    pdf.text(`Registros: ${document.getElementById("totalRegistros").textContent}`, 20, 65);
    pdf.text(`Áreas: ${document.getElementById("totalAreas").textContent}`, 20, 73);
    pdf.text(`Plaga principal: ${document.getElementById("plagaPrincipal").textContent}`, 20, 81);
    pdf.text(`Riesgos altos: ${document.getElementById("riesgoAlto").textContent}`, 20, 89);

    pdf.setFontSize(13);
    pdf.text("Observación", 20, 105);

    pdf.setFontSize(10);
    pdf.text(
      "El presente reporte resume los registros de monitoreo fitosanitario realizados en el visor AgroSIG CADET - La Morita.",
      20,
      114,
      { maxWidth: 170 }
    );

    pdf.save("reporte-agrosig-cadet.pdf");
  });
}

// ===============================
// ASISTENTE CLIMÁTICO AGROSIG
// ===============================

const botonIA = document.getElementById("generarIA");

if (botonIA) {
  botonIA.addEventListener("click", () => {
    const climaTexto = document.getElementById("datosClima").innerText;
    const riesgoClimatico = document.getElementById("riesgoClimatico").innerText || "Sin dato";

    let diagnostico = "";
    let recomendaciones = [];

    if (climaTexto.includes("Humedad")) {
      diagnostico += "Las variables microclimáticas registradas permiten estimar condiciones favorables o desfavorables para el desarrollo de plagas. ";
    }

    if (riesgoClimatico.includes("Alto")) {
      diagnostico += "El riesgo climático actual es alto, por lo que se recomienda priorizar el monitoreo de los cultivos más sensibles. ";
      recomendaciones.push("Incrementar la frecuencia de monitoreo.");
      recomendaciones.push("Revisar zonas húmedas, bordes de cultivo e invernaderos.");
      recomendaciones.push("Registrar nuevas observaciones cada 48 horas.");
    } else if (riesgoClimatico.includes("Medio")) {
      diagnostico += "El riesgo climático es medio. Las condiciones no son extremas, pero pueden favorecer el incremento de algunas plagas si existe alta humedad o presencia previa en campo. ";
      recomendaciones.push("Mantener monitoreo preventivo.");
      recomendaciones.push("Revisar brotes tiernos y envés de hojas.");
      recomendaciones.push("Comparar los registros con las variables climáticas mensuales.");
    } else {
      diagnostico += "El riesgo climático es bajo. No obstante, se recomienda mantener vigilancia periódica para detectar focos tempranos. ";
      recomendaciones.push("Realizar inspecciones de rutina.");
      recomendaciones.push("Registrar cualquier cambio visible en el cultivo.");
      recomendaciones.push("Actualizar la base de monitoreos semanalmente.");
    }

    document.getElementById("resultadoIA").innerHTML = `
      <strong>🤖 Asistente climático AgroSIG</strong><br><br>

      <strong>Riesgo climático evaluado:</strong><br>
      ${riesgoClimatico}<br><br>

      <strong>Diagnóstico:</strong><br>
      ${diagnostico}<br><br>

      <strong>Recomendaciones:</strong><br>
      ${recomendaciones.map(r => "✔ " + r).join("<br>")}
    `;
  });
}

// ===============================
// INICIAR HISTORIAL
// ===============================

if (window.escucharRegistrosFirebase) {
  cargarHistorial();
} else {
  window.addEventListener("firebaseListo", cargarHistorial);
}