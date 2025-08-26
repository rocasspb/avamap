// --- Global Variables ---
let map;
let slopeLayer;
let regionLayer;
let MAPI_KEY = config.MAPTILER_API_KEY; // Get from config file
let currentMode = 'slope'; // 'slope', 'elevation', or 'aspect'
// In-memory avalanche regions store (loaded on page load)
let avalancheRegions = null;
let avalancheRegionsLoaded = false;
const AVALANCHE_REGIONS_BASE_URL = 'https://regions.avalanches.org';
const AVALANCHE_REGIONS_LIST = [
    'AT', // Austria
    'CH', // Switzerland
    'DE-BY', // Germany Bavaria
    'IT-32-BZ', // Italy South Tyrol
    'IT-32-TN', // Italy Trentino
    'FR', // France
    'NO', // Norway
    'SE', // Sweden
    'IS', // Iceland
    'CA', // Canada
    'US', // United States
    'NZ'  // New Zealand
];

async function fetchJsonWithCorsFallback(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        // Try a simple CORS proxy fallback
        try {
            const proxyUrl = `https://cors.isomorphic-git.org/${url}`;
            const res2 = await fetch(proxyUrl);
            if (!res2.ok) throw new Error(`Proxy HTTP ${res2.status}`);
            return await res2.json();
        } catch (proxyErr) {
            console.warn('CORS fallback failed for', url, proxyErr.message || proxyErr);
            throw err;
        }
    }
}

// --- Map Initialization ---
map = L.map('map').setView(config.DEFAULT_CENTER, config.DEFAULT_ZOOM);
const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// --- Core Functions ---
function getElevation(r, g, b) {
    return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
}

function getColorForSlope(slope) {
    if (slope > config.SLOPE_THRESHOLDS.EXTREME) return 'rgba(204, 50, 50, 0.7)';
    if (slope > config.SLOPE_THRESHOLDS.VERY_STEEP) return 'rgba(245, 141, 17, 0.7)';
    if (slope > config.SLOPE_THRESHOLDS.STEEP) return 'rgba(231, 180, 22, 0.7)';
    if (slope > config.SLOPE_THRESHOLDS.MODERATE) return 'rgba(153, 193, 64, 0.7)';
    if (slope > config.SLOPE_THRESHOLDS.FLAT)  return 'rgba(45, 201, 55, 0.7)';
    return 'rgba(0,0,0,0)';
}

function getColorForAspect(angle) {
    const north = [0, 0, 255], east = [255, 255, 0], south = [255, 0, 0], west = [0, 255, 0];
    let r, g, b;

    if (angle >= 0 && angle < 90) { // North to East
        const ratio = angle / 90;
        r = (1 - ratio) * north[0] + ratio * west[0];
        g = (1 - ratio) * north[1] + ratio * west[1];
        b = (1 - ratio) * north[2] + ratio * west[2];
    } else if (angle >= 90 && angle < 180) { // East to South
        const ratio = (angle - 90) / 90;
        r = (1 - ratio) * west[0] + ratio * south[0];
        g = (1 - ratio) * west[1] + ratio * south[1];
        b = (1 - ratio) * west[2] + ratio * south[2];
    } else if (angle >= 180 && angle < 270) { // South to West
        const ratio = (angle - 180) / 90;
        r = (1 - ratio) * south[0] + ratio * east[0];
        g = (1 - ratio) * south[1] + ratio * east[1];
        b = (1 - ratio) * south[2] + ratio * east[2];
    } else { // West to North
        const ratio = (angle - 270) / 90;
        r = (1 - ratio) * east[0] + ratio * north[0];
        g = (1 - ratio) * east[1] + ratio * north[1];
        b = (1 - ratio) * east[2] + ratio * north[2];
    }
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.7)`;
}

function getAspectDirection(degrees) {
    if (degrees > 337.5 || degrees <= 22.5) return 'N';
    if (degrees > 22.5 && degrees <= 67.5) return 'NE';
    if (degrees > 67.5 && degrees <= 112.5) return 'E';
    if (degrees > 112.5 && degrees <= 157.5) return 'SE';
    if (degrees > 157.5 && degrees <= 202.5) return 'S';
    if (degrees > 202.5 && degrees <= 247.5) return 'SW';
    if (degrees > 247.5 && degrees <= 292.5) return 'W';
    if (degrees > 292.5 && degrees <= 337.5) return 'NW';
    return '';
}

function initializeSlopeLayer() {
    if (slopeLayer) {
        map.removeLayer(slopeLayer);
    }

    const SlopeLayer = L.GridLayer.extend({
        createTile: function (coords, done) {
            const tile = L.DomUtil.create('canvas', 'leaflet-tile');
            const size = this.getTileSize();
            tile.width = size.x;
            tile.height = size.y;

            const ctx = tile.getContext('2d', { willReadFrequently: true });

            const elevationTile = new Image();
            elevationTile.crossOrigin = "Anonymous";
            elevationTile.src = `https://api.maptiler.com/tiles/terrain-rgb-v2/${coords.z}/${coords.x}/${coords.y}.png?key=${MAPI_KEY}`;

            elevationTile.onload = () => {
                try {
                    ctx.drawImage(elevationTile, 0, 0, size.x, size.y);
                    const imageData = ctx.getImageData(0, 0, size.x, size.y);
                    const data = imageData.data;
                    const outputImageData = ctx.createImageData(size.x, size.y);
                    const outputData = outputImageData.data;

                    if (currentMode === 'slope' || currentMode === 'aspect') {
                        for (let y = 0; y < size.y; y++) {
                            for (let x = 0; x < size.x; x++) {
                                const i = (y * size.x + x) * 4;
                                const i_dx = (y * size.x + Math.min(size.x - 1, x + 1)) * 4;
                                const i_dy = (Math.min(size.y - 1, y + 1) * size.x + x) * 4;
                                const elev_dx = getElevation(data[i_dx], data[i_dx+1], data[i_dx+2]);
                                const elev_dy = getElevation(data[i_dy], data[i_dy+1], data[i_dy+2]);
                                const elev = getElevation(data[i], data[i+1], data[i+2]);
                                const resolution = (40075016.7 / (config.TILE_SIZE * Math.pow(2, coords.z))) * Math.cos(map.getCenter().lat * Math.PI / 180);
                                const dz_dx = (elev_dx - elev);
                                const dz_dy = (elev_dy - elev);
                                
                                const slopeRad = Math.atan(Math.sqrt(dz_dx*dz_dx + dz_dy*dz_dy) / resolution);
                                const slopeDeg = slopeRad * (180 / Math.PI);

                                let color;
                                if (currentMode === 'slope') {
                                    color = getColorForSlope(slopeDeg);
                                } else { // aspect
                                    if (slopeDeg < 1) { // Use slope angle to determine if flat
                                        color = 'rgba(0,0,0,0)';
                                    } else {
                                        let aspectRad = Math.atan2(-dz_dx, -dz_dy);
                                        let aspectDeg = aspectRad * (180 / Math.PI);
                                        if (aspectDeg < 0) aspectDeg += 360;
                                        aspectDeg = (aspectDeg + 180) % 360;
                                        color = getColorForAspect(aspectDeg);
                                    }
                                }

                                const colorValues = color.match(/\d+/g).map(Number);
                                if(colorValues && colorValues.length >= 3) {
                                    outputData[i] = colorValues[0];
                                    outputData[i + 1] = colorValues[1];
                                    outputData[i + 2] = colorValues[2];
                                    outputData[i + 3] = 255;
                                }
                            }
                        }
                                                } else { // elevation
                                for (let i = 0; i < data.length; i += 4) {
                                    const elev = getElevation(data[i], data[i + 1], data[i + 2]);
                                    if (elev > config.ELEVATION_THRESHOLDS.HIGH) {
                                        outputData[i] = 204; outputData[i + 1] = 50; outputData[i + 2] = 50; outputData[i+3] = 255;
                                    } else if (elev > config.ELEVATION_THRESHOLDS.MEDIUM) {
                                        outputData[i] = 245; outputData[i + 1] = 141; outputData[i + 2] = 17; outputData[i+3] = 255;
                                    } else if (elev > config.ELEVATION_THRESHOLDS.LOW) {
                                        outputData[i] = 231; outputData[i + 1] = 180; outputData[i + 2] = 22; outputData[i+3] = 255;
                                    } else {
                                        outputData[i] = data[i]; outputData[i+1] = data[i+1]; outputData[i+2] = data[i+2]; outputData[i+3] = data[i+3];
                                    }
                                }
                            }
                    ctx.putImageData(outputImageData, 0, 0);
                    done(null, tile);
                } catch (e) {
                    console.error("Error processing tile:", e);
                    done(e, tile);
                }
            };
            
            elevationTile.onerror = () => {
                console.error(`Could not load elevation tile at: ${elevationTile.src}. Check API key and network.`);
                done(new Error('Tile load error'), tile);
            };

            return tile;
        }
    });

                slopeLayer = new SlopeLayer({ 
                maxNativeZoom: config.TERRAIN_MAX_ZOOM, 
                maxZoom: 18 
            });
            slopeLayer.setOpacity(document.getElementById('opacity').value || config.DEFAULT_OPACITY);
    if (currentMode !== 'region') {
        map.addLayer(slopeLayer);
    }

    document.getElementById('mode-selector').classList.remove('hidden');
    document.getElementById('opacity-control').classList.remove('hidden');
    updateLegend();
}

function updateLegend() {
    document.getElementById('slope-legend').classList.add('hidden');
    document.getElementById('elevation-legend').classList.add('hidden');
    document.getElementById('aspect-legend').classList.add('hidden');

    if (currentMode === 'slope') document.getElementById('slope-legend').classList.remove('hidden');
    if (currentMode === 'elevation') document.getElementById('elevation-legend').classList.remove('hidden');
    if (currentMode === 'aspect') document.getElementById('aspect-legend').classList.remove('hidden');
}

function handleMapClick(e) {
    if (!MAPI_KEY) return;
    const { lat, lng } = e.latlng;
    const zoom = 14; 
    const TILE_SIZE = config.TILE_SIZE;
    const popup = L.popup().setLatLng(e.latlng).setContent('Calculating...').openOn(map);
    const n = Math.pow(2, zoom);
    const tileX = Math.floor(n * ((lng + 180) / 360));
    const tileY = Math.floor(n * (1 - (Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI)) / 2);
    const worldPoint = map.project(e.latlng, zoom);
    const pixelX = Math.floor(worldPoint.x % TILE_SIZE);
    const pixelY = Math.floor(worldPoint.y % TILE_SIZE);
    const tileImage = new Image();
    tileImage.crossOrigin = "Anonymous";
    tileImage.src = `https://api.maptiler.com/tiles/terrain-rgb-v2/${zoom}/${tileX}/${tileY}.png?key=${MAPI_KEY}`;

    tileImage.onload = () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = TILE_SIZE;
            canvas.height = TILE_SIZE;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(tileImage, 0, 0);
            
            const pixelDataDx = ctx.getImageData(Math.min(TILE_SIZE - 1, pixelX + 1), pixelY, 1, 1).data;
            const elev_dx = getElevation(pixelDataDx[0], pixelDataDx[1], pixelDataDx[2]);
            const pixelDataDy = ctx.getImageData(pixelX, Math.min(TILE_SIZE - 1, pixelY + 1), 1, 1).data;
            const elev_dy = getElevation(pixelDataDy[0], pixelDataDy[1], pixelDataDy[2]);
            const pixelData = ctx.getImageData(pixelX, pixelY, 1, 1).data;
            const elev = getElevation(pixelData[0], pixelData[1], pixelData[2]);

            const resolution = (40075016.7 / (TILE_SIZE * Math.pow(2, zoom))) * Math.cos(lat * Math.PI / 180);
            const dz_dx = (elev_dx - elev);
            const dz_dy = (elev_dy - elev);

            const slopeRad = Math.atan(Math.sqrt(dz_dx*dz_dx + dz_dy*dz_dy) / resolution);
            const slopeDeg = slopeRad * (180 / Math.PI);

            let aspectDeg = 0;
            let aspectDir = 'Flat';
            if (slopeDeg > 1) { // Only calculate aspect for non-flat areas
                const aspectRad = Math.atan2(-dz_dx, -dz_dy);
                aspectDeg = aspectRad * (180 / Math.PI);
                if (aspectDeg < 0) aspectDeg += 360;
                aspectDeg = (aspectDeg + 180) % 360;
                aspectDir = getAspectDirection(aspectDeg);
            }

            // Determine avalanche region for the clicked point
            const regionInfo = findAvalancheRegionForPoint(lat, lng);
            const regionLine = regionInfo ? `<br><strong>Region:</strong> ${regionInfo}` : '';
            popup.setContent(`<strong>Slope:</strong> ${slopeDeg.toFixed(1)}°<br><strong>Aspect:</strong> ${aspectDeg.toFixed(0)}° (${aspectDir})${regionLine}`);
        } catch (err) {
            popup.setContent('Could not calculate data.');
            console.error("Error calculating data on click:", err);
        }
    };
    tileImage.onerror = () => popup.setContent('Failed to load elevation data.');
}

// --- Avalanche Regions (in-memory) ---
async function loadAvalancheRegionsIntoMemory() {
    if (avalancheRegionsLoaded) return avalancheRegions;
    try {
        const fetches = AVALANCHE_REGIONS_LIST.map(async (code) => {
            const url = `${AVALANCHE_REGIONS_BASE_URL}/micro-regions/${code}_micro-regions.geojson.json`;
            try {
                const fc = await fetchJsonWithCorsFallback(url);
                return { code, fc };
            } catch (err) {
                console.warn(`Failed to load regions for ${code}:`, err.message);
                return null;
            }
        });
        const results = await Promise.all(fetches);
        const allFeatures = [];
        for (const item of results) {
            if (item && item.fc && Array.isArray(item.fc.features)) {
                const code = item.code;
                for (const feature of item.fc.features) {
                    if (feature && feature.properties) {
                        feature.properties.region_code = feature.properties.region_code || code;
                        feature.properties.source = 'regions.avalanches.org';
                    }
                    allFeatures.push(feature);
                }
            }
        }
        avalancheRegions = { type: 'FeatureCollection', features: allFeatures };
        avalancheRegionsLoaded = true;
        console.log(`Loaded avalanche regions in memory: ${allFeatures.length} features`);
        if (!allFeatures.length) {
            console.warn('No avalanche region features were loaded. Check network/CORS.');
        }
        return avalancheRegions;
    } catch (err) {
        console.error('Error loading avalanche regions:', err);
        throw err;
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
    // Kick off background load of avalanche regions into memory
    loadAvalancheRegionsIntoMemory().catch(() => {});
    // Check if API key is available from config
    if (MAPI_KEY && MAPI_KEY !== 'YOUR_API_KEY_HERE') {
        // API key is available, hide the input section and initialize the layer
        const apiKeyInputWrapper = document.getElementById('apiKeyInputWrapper');
        const apiKeySection = document.getElementById('apiKeySection');
        
        apiKeyInputWrapper.style.display = 'none';
        
        // Create success message
        let successWrapper = apiKeySection.querySelector('.success-wrapper');
        if (!successWrapper) {
            successWrapper = document.createElement('div');
            successWrapper.className = 'success-wrapper';
            successWrapper.innerHTML = `
                <p class="text-sm text-green-600 font-semibold">API Key loaded from config. Applying overlay...</p>
                <button id="changeApiKey" class="mt-2 text-sm text-indigo-600 hover:underline focus:outline-none">Change Key</button>
            `;
            apiKeyInputWrapper.insertAdjacentElement('afterend', successWrapper);
            successWrapper.querySelector('#changeApiKey').addEventListener('click', () => {
                if (slopeLayer) map.removeLayer(slopeLayer);
                successWrapper.remove();
                apiKeyInputWrapper.style.display = 'block';
                document.getElementById('apiKey').value = '';
                document.getElementById('mode-selector').classList.add('hidden');
                document.getElementById('slope-legend').classList.add('hidden');
                document.getElementById('elevation-legend').classList.add('hidden');
                document.getElementById('aspect-legend').classList.add('hidden');
                document.getElementById('opacity-control').classList.add('hidden');
            });
        }
        
        // Initialize the slope layer automatically
        initializeSlopeLayer();
    } else {
        // No API key in config, show the input section
        document.getElementById('setApiKey').addEventListener('click', () => {
            const key = document.getElementById('apiKey').value;
            const errorEl = document.getElementById('apiKeyError');
            if (key && key.trim() !== '') {
                MAPI_KEY = key;
                errorEl.classList.add('hidden');
                const apiKeyInputWrapper = document.getElementById('apiKeyInputWrapper');
                apiKeyInputWrapper.style.display = 'none';
                const apiKeySection = document.getElementById('apiKeySection');
                let successWrapper = apiKeySection.querySelector('.success-wrapper');
                if (!successWrapper) {
                    successWrapper = document.createElement('div');
                    successWrapper.className = 'success-wrapper';
                    successWrapper.innerHTML = `
                        <p class="text-sm text-green-600 font-semibold">API Key set. Applying overlay...</p>
                        <button id="changeApiKey" class="mt-2 text-sm text-indigo-600 hover:underline focus:outline-none">Change Key</button>
                    `;
                    apiKeyInputWrapper.insertAdjacentElement('afterend', successWrapper);
                    successWrapper.querySelector('#changeApiKey').addEventListener('click', () => {
                        if (slopeLayer) map.removeLayer(slopeLayer);
                        successWrapper.remove();
                        apiKeyInputWrapper.style.display = 'block';
                        document.getElementById('apiKey').value = '';
                        errorEl.classList.add('hidden');
                        document.getElementById('mode-selector').classList.add('hidden');
                        document.getElementById('slope-legend').classList.add('hidden');
                        document.getElementById('elevation-legend').classList.add('hidden');
                        document.getElementById('aspect-legend').classList.add('hidden');
                        document.getElementById('opacity-control').classList.add('hidden');
                    });
                }
                initializeSlopeLayer();
            } else {
                errorEl.textContent = 'Please enter a valid MapTiler API key.';
                errorEl.classList.remove('hidden');
            }
        });
    }

    // Opacity control
    document.getElementById('opacity').addEventListener('input', (e) => {
        if (slopeLayer) slopeLayer.setOpacity(e.target.value);
    });

    // Mode selector buttons
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.id.split('-')[1];
            updateLegend();
            // Toggle layers based on mode
            if (currentMode === 'region') {
                if (slopeLayer && map.hasLayer(slopeLayer)) map.removeLayer(slopeLayer);
                ensureRegionLayer();
            } else {
                if (regionLayer && map.hasLayer(regionLayer)) map.removeLayer(regionLayer);
                if (slopeLayer && !map.hasLayer(slopeLayer)) map.addLayer(slopeLayer);
                if (slopeLayer) slopeLayer.redraw();
            }
        });
    });

    // Map click handler
    map.on('click', handleMapClick);
}); 

function ensureRegionLayer() {
    if (regionLayer && !map.hasLayer(regionLayer)) {
        map.addLayer(regionLayer);
        return;
    }
    if (!regionLayer) {
        // Ensure regions are loaded
        const useRegions = () => {
            if (!avalancheRegions || !Array.isArray(avalancheRegions.features)) return;
            regionLayer = L.geoJSON(avalancheRegions, {
                style: function () {
                    return {
                        color: '#ef4444', // red-500 for visibility
                        weight: 2,
                        opacity: 1,
                        fill: false
                    };
                },
            });
            map.addLayer(regionLayer);
            try { regionLayer.bringToFront && regionLayer.bringToFront(); } catch (_) {}
            if (!avalancheRegions.features.length) {
                console.warn('Region layer added but there are zero features to display.');
            }
        };
        if (avalancheRegionsLoaded) {
            useRegions();
        } else {
            loadAvalancheRegionsIntoMemory().then(useRegions).catch(() => {});
        }
    }
}

// --- Geo helpers: point-in-polygon for GeoJSON ---
function findAvalancheRegionForPoint(lat, lng) {
    try {
        if (!avalancheRegionsLoaded || !avalancheRegions || !Array.isArray(avalancheRegions.features)) return null;
        const point = [lng, lat]; // GeoJSON uses [lng, lat]
        for (let i = 0; i < avalancheRegions.features.length; i++) {
            const f = avalancheRegions.features[i];
            if (!f || !f.geometry) continue;
            const { type, coordinates } = f.geometry;
            if (type === 'Polygon') {
                if (polygonContainsPoint(point, coordinates)) {
                    return getRegionLabel(f);
                }
            } else if (type === 'MultiPolygon') {
                for (let p = 0; p < coordinates.length; p++) {
                    if (polygonContainsPoint(point, coordinates[p])) {
                        return getRegionLabel(f);
                    }
                }
            }
        }
        return null;
    } catch (err) {
        console.warn('Region lookup failed:', err.message || err);
        return null;
    }
}

function getRegionLabel(feature) {
    const props = feature && feature.properties ? feature.properties : {};
    return props.name || props.id || props.region_code || 'Region';
}

// coordinates: Polygon as array of linear rings [[ [lng,lat], ... ]]
function polygonContainsPoint(point, polygon) {
    if (!polygon || !polygon.length) return false;
    const outer = polygon[0];
    if (!ringContainsPoint(point, outer)) return false;
    // if inside outer, ensure not inside any hole
    for (let i = 1; i < polygon.length; i++) {
        if (ringContainsPoint(point, polygon[i])) return false;
    }
    return true;
}

// Classic ray casting on ring (array of [lng,lat])
function ringContainsPoint(point, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect = ((yi > point[1]) !== (yj > point[1])) &&
            (point[0] < (xj - xi) * (point[1] - yi) / ((yj - yi) || 1e-12) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}