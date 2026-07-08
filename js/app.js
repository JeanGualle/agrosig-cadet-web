const map = L.map('map').setView([-0.22, -78.38], 16);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 22,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const layers = {};

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

function mostrarInfo(titulo, props, riesgo) {
  const riesgoHTML = riesgo ? `<p><strong>Riesgo:</strong> <span class="risk-pill" style="background:${colorRiesgo(riesgo)}">${textoRiesgo(riesgo)}</span></p>` : '';

  let detalles = '';
  Object.keys(props).forEach(key => {
    if (props[key] !== null && props[key] !== '' && key !== 'geometry') {
      detalles += `<p><strong>${key}:</strong> ${props[key]}</p>`;
    }
  });

  document.getElementById('info').innerHTML = `
    <h3>${titulo}</h3>
    ${riesgoHTML}
    ${detalles}
  `;

  document.getElementById('area').value = titulo;
}

function popupFromProps(title, props, riesgo) {
  let html = `<strong>${title}</strong><br>`;
  if (riesgo) html += `Riesgo: ${textoRiesgo(riesgo)}<br>`;
  Object.keys(props).slice(0, 5).forEach(key => {
    if (props[key] !== null && props[key] !== '') html += `${key}: ${props[key]}<br>`;
  });
  return html;
}

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

          layer.on('click', () => {
            mostrarInfo(titulo, props, riesgo);
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

async function cargarHistorial() {

    const contenedor = document.getElementById("historial");
    contenedor.innerHTML = "<p>Cargando...</p>";

    let historial = [];

    if (window.leerRegistrosFirebase) {

        historial = await window.leerRegistrosFirebase();

    }

    if (historial.length === 0) {

        historial = JSON.parse(
            localStorage.getItem("registrosAgroSIG") || "[]"
        ).reverse();

    }

    contenedor.innerHTML = "";

    if (historial.length === 0) {

        contenedor.innerHTML = "<p>Todavía no hay registros.</p>";
        return;

    }

    historial.forEach(reg => {

        const div = document.createElement("div");
        div.className = "record";

        div.innerHTML = `
            <strong>${reg.fecha || ""}</strong><br>

            <strong>Área:</strong> ${reg.area || ""}<br>

            <strong>Plaga:</strong> ${reg.plaga || ""}<br>

            <strong>Riesgo:</strong> ${reg.riesgo || ""}<br>

            <strong>Tratamiento:</strong> ${reg.tratamiento || ""}<br>

            <strong>Observaciones:</strong> ${reg.observaciones || ""}<br>

            ${
                reg.foto
                ? `<img src="${reg.foto}" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;">`
                : ""
            }

        `;

        contenedor.appendChild(div);

    });

}

document.getElementById('guardar').addEventListener('click', () => {
  const archivoFoto = document.getElementById('foto').files[0];

  const guardarRegistro = (fotoBase64 = '') => {
    const registro = {
      fecha: new Date().toLocaleString(),
      area: document.getElementById('area').value || 'Sin área seleccionada',
      plaga: document.getElementById('plaga').value || 'Sin dato',
      riesgo: document.getElementById('riesgo').value,
      tratamiento: document.getElementById('tratamiento').value || 'Sin dato',
      observaciones: document.getElementById('observaciones').value || 'Sin observaciones',
      foto: fotoBase64
    };

    if (window.guardarRegistroFirebase) {
    window.guardarRegistroFirebase(registro)
        .then(() => {
            console.log("Registro enviado a Firebase.");
        })
        .catch(() => {
            console.warn("No se pudo guardar en Firebase. Se guardará localmente.");
        });
}

const historial = JSON.parse(localStorage.getItem('registrosAgroSIG') || '[]');
historial.push(registro);
localStorage.setItem('registrosAgroSIG', JSON.stringify(historial));

    document.getElementById('plaga').value = '';
    document.getElementById('tratamiento').value = '';
    document.getElementById('observaciones').value = '';
    document.getElementById('foto').value = '';

    cargarHistorial();
    alert('Registro guardado correctamente.');
  };

  if (archivoFoto) {
    const lector = new FileReader();
    lector.onload = function(evento) {
      guardarRegistro(evento.target.result);
    };
    lector.readAsDataURL(archivoFoto);
  } else {
    guardarRegistro();
  }
});

cargarHistorial();
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

  if (d.humedad >= 80 && d.precipitacion >= 150)
      riesgo = "🔴 Alto";

  else if (d.humedad >= 75)
      riesgo = "🟡 Medio";

  document.getElementById("riesgoClimatico").innerHTML =
      `<h3>Riesgo climático</h3><h2>${riesgo}</h2>`;
}

document.getElementById("anioClima")
.addEventListener("change", actualizarClima);

document.getElementById("mesClima")
.addEventListener("change", actualizarClima);
