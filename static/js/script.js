    // Estado de la aplicación
    let selectedAirports = []; // Almacena los aeropuertos para la ruta actual
    let availableAirports = []; // Aeropuertos disponibles para el país actual
    let Coords = []; // Almacena todos los marcadores del mapa
    let rutaPolylineOriginal = null; // polyline de la ruta original
    let rutaPolylineOptima = null; // Almacena la polyline de la ruta optimizada

function initializeMap() {
    if (window._map) {
        window._map.invalidateSize();
        return;
    } 
    try {
        window._map = L.map("live-map").setView([20.0, 0.0], 2);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 10,
            minZoom: 2, 
            attribution: "© OpenStreetMap"
        }).addTo(window._map);
        setTimeout(() => {
            if (window._map) {
                window._map.invalidateSize(true);
            }
        }, 500);
    } catch (error) {
        console.error(error);
    }
}

function openTab(tabId, element) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => {
        content.classList.remove('active-content');
    });

    const tabs = document.querySelectorAll('.tab');

    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active-content');
    element.classList.add('active');
    
    if (tabId === 'select') {
        setTimeout(() => {
            initializeMap(); 

            if (window._map) {
                window._map.invalidateSize(true);
            }
        }, 100); 
    }

    if (tabId === 'opt') {
        setTimeout(() => {
            if (window._map) {
                window._map.invalidateSize(true);
            }
        }, 200);
    }
}

function sincronizarOptMap() {
    // Aseguramos que el mapa exista
    if (!optMap) initializeOptMap();
    if (!optMap) return;

    // 1. Limpiar el mapa (borrar marcadores y líneas viejas, dejar el mapa base)
    optMap.eachLayer(function (layer) {
        if (!layer._url) { // Si no es una capa de tiles (mapa base), la borramos
            optMap.removeLayer(layer);
        }
    });

    let boundsArr = [];


    selectedAirports.forEach((airport, index) => {
        if (airport.lat && airport.lon) {
            const markerNumber = index + 1;
         
            const customIcon = L.divIcon({
                html: `
                    <div style="background-color: red; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                        <div style="color: white; transform: rotate(45deg); font-weight: bold; font-size: 12px;">${markerNumber}</div>
                    </div>
                `,
                className: 'custom-airport-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            });

            L.marker([airport.lat, airport.lon], { icon: customIcon })
                .addTo(optMap)
                .bindPopup(`<b>${airport.name}</b><br>ID: ${airport.id}`);
            
            boundsArr.push([airport.lat, airport.lon]);
        }
    });

    if (rutaPolylineOriginal) {
        L.polyline(rutaPolylineOriginal.getLatLngs(), {
            color: '#adb5bd', // gris
            dashArray: '6,4', // punteado
            weight: 3
        }).addTo(optMap);
    }

    if (rutaPolylineOptima) {
        L.polyline(rutaPolylineOptima.getLatLngs(), {
            color: '#2ecc71', // verde brillante
            weight: 4
        }).addTo(optMap);
    }

    // 4. AJUSTAR VISTA (Zoom automático)
    if (rutaPolylineOptima || rutaPolylineOriginal) {
        let target = rutaPolylineOptima || rutaPolylineOriginal;
        optMap.fitBounds(target.getBounds().pad(0.1));
    } else if (boundsArr.length > 0) {
        optMap.fitBounds(L.latLngBounds(boundsArr).pad(0.1));
    }
    
    // Forzar un repintado final por si acaso
    optMap.invalidateSize();
}

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const selectPais = document.getElementById('select-pais');
    const selectAeropuerto = document.getElementById('select-aeropuerto');
    const btnOptimizar = document.querySelector('.btn-primary.full-width');
    const btnReset = document.querySelector('.btn-icon');
    const helperText = document.querySelector('.helper-text');
    const previewPanel = document.querySelector('.preview-panel .dashed-box');


    let currentCountry = selectPais.value;

    // --- Funciones de Ayuda ---
    
    // Habilita/Deshabilita botones según el número de aeropuertos
    function updateOptimizationButtons() {
        const count = selectedAirports.length;
        
        btnOptimizar.disabled = count < 2;
        btnReset.disabled = count === 0;

        // Actualiza el texto de ayuda
        if (count === 0) {
            helperText.textContent = "Selecciona al menos 2 aeropuertos para optimizar";
        } else if (count === 1) {
            helperText.textContent = `Añadido 1 aeropuerto. ¡Necesitas ${2 - count} más!`;
        } else {
            helperText.textContent = `Ruta configurada con ${count} aeropuertos. ¡Listo para optimizar!`;
        }
    }

    function mostrarRutasEnUI(result) {
        const boxOriginal = document.getElementById('ruta-original-box');
        const boxOptimizada = document.getElementById('ruta-optimizada-box');

        const original = result.ruta_original || [];
        const optimizada = result.ruta_optimizada || [];

        if (boxOriginal) {
            boxOriginal.innerHTML = `
                <p><strong>Secuencia de aeropuertos (ciclo):</strong></p>
                <p>${original.join(' → ')}</p>
            `;
        }

        if (boxOptimizada) {
            boxOptimizada.innerHTML = `
                <p><strong>Ruta óptima (ciclo):</strong></p>
                <p>${optimizada.join(' → ')}</p>
            `;
        }
    }

    function mostrarMetricasEnUI(result) {
    const metricsDiv = document.getElementById('metrics-content');

    if (!metricsDiv) return;

    const distOriginal = result.distancia_original_km;
    const distOptima   = result.distancia_optima_km;
    const mejora       = result.mejora_porcentual;

    // Evita divisiones raras
    let ratio = 1;
    if (distOriginal > 0) {
        ratio = distOptima / distOriginal;
    }
    const widthOptima = Math.max(5, Math.min(100, ratio * 100)); // entre 5% y 100%

    metricsDiv.classList.remove('empty-state');
    metricsDiv.innerHTML = `
        <p><strong>Distancia original:</strong> ${distOriginal} km</p>
        <p><strong>Distancia óptima:</strong> ${distOptima} km</p>
        <p><strong>Mejora:</strong> ${mejora} %</p>

        <div class="metrics-bars">
            <div class="bar-item">
                <span class="bar-label">Ruta original</span>
                <div class="bar-track">
                    <div class="bar-fill bar-original" style="width: 100%;"></div>
                </div>
            </div>
            <div class="bar-item">
                <span class="bar-label">Ruta óptima</span>
                <div class="bar-track">
                    <div class="bar-fill bar-optimizada" style="width: ${widthOptima}%;"></div>
                </div>
            </div>
        </div>
    `;
}

    async function dibujarRutasEnMapa(rutaOriginalIds, rutaOptimaIds) {
        // Asegura que el mapa exista
        if (!window._map) {
            initializeMap();
            if (!window._map) return;
        }

        // Borrar polylines anteriores si existen
        if (rutaPolylineOriginal) {
            window._map.removeLayer(rutaPolylineOriginal);
            rutaPolylineOriginal = null;
        }
        if (rutaPolylineOptima) {
            window._map.removeLayer(rutaPolylineOptima);
            rutaPolylineOptima = null;
        }

        // IDs únicos para no repetir llamadas
        const uniqueIds = [...new Set([...(rutaOriginalIds || []), ...(rutaOptimaIds || [])])];

        const idToLatLng = {};

        // Pedir coordenadas al backend para cada id
        await Promise.all(uniqueIds.map(async (id) => {
            try {
                const resp = await fetch(`/api/get_airport_coords?id=${id}`);
                const data = await resp.json();
                if (resp.ok && data.lat && data.lon) {
                    idToLatLng[id] = [data.lat, data.lon];
                }
            } catch (e) {
                console.error("Error obteniendo coords de", id, e);
            }
        }));

        function idsToLatLngs(ids) {
            const arr = [];
            (ids || []).forEach(id => {
                const ll = idToLatLng[id];
                if (ll) arr.push(ll);
            });
            return arr;
        }

        const latlngsOriginal = idsToLatLngs(rutaOriginalIds);
        const latlngsOptima   = idsToLatLngs(rutaOptimaIds);

        const allPoints = [];

        if (latlngsOriginal.length >= 2) {
            rutaPolylineOriginal = L.polyline(latlngsOriginal, {
                color: '#adb5bd',      // gris
                dashArray: '6,4',      // punteado
                weight: 3
            }).addTo(window._map);
            allPoints.push(...latlngsOriginal);
        }

        if (latlngsOptima.length >= 2) {
            rutaPolylineOptima = L.polyline(latlngsOptima, {
                color: '#2ecc71',      // verde
                weight: 4
            }).addTo(window._map);
            allPoints.push(...latlngsOptima);
        }

        if (allPoints.length > 0) {
            const bounds = L.latLngBounds(allPoints);
            window._map.fitBounds(bounds.pad(0.1));
        }
    }


    

    // para verificar conectividad y mostrar
async function checkConnectivityStatus(airports) {
    const routeIds = airports.map(a => a.id);
    const statusElement = document.getElementById('connectivity-status');
    
    if (routeIds.length <= 1) {
        statusElement.textContent = `Añade al menos 2 aeropuertos para verificar la conexión.`;
        statusElement.style.color = "gray";
        return;
    }

    statusElement.textContent = "Verificando conexión...";
    statusElement.style.color = "orange"; 

    try {
        const response = await fetch('/api/conectividad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ route_ids: routeIds })
        });

        const result = await response.json();

        if (response.ok && result.conectado === true) {
            statusElement.textContent = "La red de aeropuertos está alcanzable (Conexa).";
            statusElement.style.color = "green";

            // btnOptimizar.disabled = false; 
        } else {
            statusElement.textContent = "Advertencia: La red NO es completamente alcanzable (Hay islas o puntos sin salida).";
            statusElement.style.color = "red";

            // btnOptimizar.disabled = true; 
        }
    } catch (error) {
        console.error('Error al verificar la conexión con el servidor:', error);
        statusElement.textContent = "Error de red al verificar la conexión.";
        statusElement.style.color = "darkred";
        // btnOptimizar.disabled = true;
    }
}

function addAirportToMap(airport) {
    fetch(`/api/get_airport_coords?id=${airport.id}`)
        .then(response => response.json())
        .then(airportData => {
            if (!airportData || !airportData.lat || !airportData.lon) {
                return;
            }

            airport.lat = airportData.lat;
            airport.lon = airportData.lon;

            const markerNumber = selectedAirports.length;
            const customIcon = L.divIcon({
                html: `
                    <div style="
                        background-color: red; 
                        width: 30px; 
                        height: 30px; 
                        border-radius: 50% 50% 50% 0; 
                        transform: rotate(-45deg); 
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border: 2px solid white;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    ">
                        <div style="
                            color: white; 
                            transform: rotate(45deg); 
                            font-weight: bold;
                            font-size: 12px;
                        ">${markerNumber}</div>
                    </div>
                `,
                className: 'custom-airport-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            });

            const marker = L.marker([airportData.lat, airportData.lon], { 
                icon: customIcon 
            }).addTo(window._map);
            marker.bindPopup(`
                <div style="min-width: 200px;">
                    <h4 style="margin: 0 0 8px 0; color: #333;">${airport.name}</h4>
                    <p style="margin: 4px 0;"><strong>ID:</strong> ${airport.id}</p>
                    <p style="margin: 4px 0;"><strong>Orden:</strong> ${markerNumber}</p>
                    <p style="margin: 4px 0;"><strong>Coordenadas:</strong><br>
                    ${airportData.lat.toFixed(4)}, ${airportData.lon.toFixed(4)}</p>
                </div>
            `);
            Coords.push(marker);
            if (Coords.length > 0) {
                const group = new L.featureGroup(Coords);
                window._map.fitBounds(group.getBounds().pad(0.1));
            }
        })
        .catch(() => {});
}

function clearCoords() {
    Coords.forEach(marker => {
        window._map.removeLayer(marker);
    });
    Coords = [];
}
    
    function populateAirportSelect() {
        selectAeropuerto.innerHTML = ''; 
        
        const airportsToAdd = availableAirports.filter(
            airport => !selectedAirports.some(a => a.id == airport.id)
        );

        if (airportsToAdd.length === 0 && selectedAirports.length === 0) {
            selectAeropuerto.innerHTML = '<option value="" disabled selected>No se encontraron aeropuertos</option>';
        } else if (airportsToAdd.length === 0 && selectedAirports.length > 0) {
            selectAeropuerto.innerHTML = '<option value="" disabled selected>No quedan aeropuertos por añadir</option>';
        } else {
            selectAeropuerto.innerHTML += '<option value="" disabled selected>-- Añadir Aeropuerto a la ruta --</option>';
            airportsToAdd.forEach(airport => {
                const option = document.createElement('option');
                option.value = airport.id;
                option.textContent = airport.name;
                selectAeropuerto.appendChild(option);
            });
        }
        
        selectAeropuerto.disabled = (airportsToAdd.length === 0 && selectedAirports.length > 0) || (availableAirports.length === 0);
    }


    selectPais.addEventListener('change', async function() {
        const newCountry = this.value;

        currentCountry = newCountry; 
        

        updateOptimizationButtons();
        
        selectAeropuerto.innerHTML = '<option value="" disabled selected>Cargando aeropuertos...</option>';
        selectAeropuerto.disabled = true;

        if (!newCountry) {
            selectAeropuerto.innerHTML = '<option value="" disabled selected>-- Primero seleccione un país --</option>';
            return;
        }

        try {
            const response = await fetch(`/api/airports?country=${newCountry}`);
    
            if (response.status === 400) {
                throw new Error('Parámetro de país incorrecto.');
            }
            if (response.status === 500) {
                throw new Error('Error interno del servidor al consultar la base de datos.');
            }
            if (!response.ok) {
                throw new Error('Error desconocido en la conexión.');
            }
            
            availableAirports = await response.json();

            populateAirportSelect();
            
        } catch (error) {
            console.error('Fetch error:', error);
            selectAeropuerto.innerHTML = '<option value="" disabled selected>Error de carga. Intente de nuevo.</option>';
        }
    });

    selectAeropuerto.addEventListener('change', function() {
        const airportId = this.value;
        
        const airportToAdd = availableAirports.find(a => a.id == airportId);
        
        if (airportToAdd && !selectedAirports.some(a => a.id == airportId)) {
            
            selectedAirports.push(airportToAdd);
            
            this.value = ""; 
            
            populateAirportSelect(); 
            checkConnectivityStatus(selectedAirports);
    
            updateOptimizationButtons();  addAirportToMap(airportToAdd);
        }
    });
    
    
    btnReset.addEventListener('click', function() {

        selectedAirports = [];
        

        populateAirportSelect();
            
        document.getElementById('connectivity-status').textContent = "Esperando selección de aeropuertos...";
        document.getElementById('connectivity-status').style.color = "gray";


        updateOptimizationButtons(); clearCoords();
        alert(`Ruta de ${currentCountry} reseteada.`);
    });

    // D. Botón de Optimizar (Llamada a la función principal)
    btnOptimizar.addEventListener('click', async function() {

        const routeIds = selectedAirports.map(a => a.id);
        console.log("IDs seleccionados:", routeIds);
        
        if (routeIds.length < 2) {
            alert("Error: Debes seleccionar al menos 2 aeropuertos.");
            return;
        }

        try {

            const response = await fetch('/api/optimize_route', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({ route_ids: routeIds })
            });

            const result = await response.json();
            console.log("Resultado optimización:", result);

            if (!response.ok) {
                alert(result.error || "Error al optimizar la ruta");
                return;
            }

            mostrarRutasEnUI(result);

            mostrarMetricasEnUI(result);

            if (result.ruta_original && result.ruta_optimizada) {
                await dibujarRutasEnMapa(result.ruta_original, result.ruta_optimizada);
            }


    
            const optTab = document.querySelector('.tab:nth-child(3)');
            if (optTab) {
                openTab('opt', optTab);
            }

            setTimeout(() => {
            initializeOptMap();      
            if (optMap) optMap.invalidateSize(); 
            
            sincronizarOptMap();     
            
        }, 300); 

        } catch (error) {
            console.error('Error al enviar la ruta para optimizar:', error);
            alert('Falló la conexión con el servidor. Intente de nuevo.');
        }
    });

   
});

let optMap = null;
let optPolyline = null;

function initializeOptMap() {
    if (optMap) {
        optMap.invalidateSize();
        return;
    }

    try {
        optMap = L.map("opt-map").setView([20.0, 0.0], 2);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap"
        }).addTo(optMap);

        setTimeout(() => {
            if (optMap) optMap.invalidateSize(true);
        }, 500);

    } catch (error) {
        console.error("Error inicializando mapa de optimización:", error);
    }
}


function drawOptimizedRouteOnMap(coords) {
    if (!optMap) initializeOptMap();
    if (!coords || coords.length < 2) return;

    if (optPolyline) {
        optMap.removeLayer(optPolyline);
        optPolyline = null;
    }

    optPolyline = L.polyline(coords, {
        color: '#2ecc71', 
        weight: 4
    }).addTo(optMap);

    // Ajustar bounds para mostrar toda la ruta
    optMap.fitBounds(optPolyline.getBounds().pad(0.1));
}

document.querySelector(".tab[onclick=\"openTab('opt', this)\"]")
    .addEventListener("click", () => {
        setTimeout(() => {
            initializeOptMap();
        }, 150);
    });
