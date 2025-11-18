// --- Global Variables ---
let map;
let slopeLayer;
let regionLayer;
let MAPI_KEY = config.MAPTILER_API_KEY; // Get from config file
let currentMode = 'slope'; // 'slope', 'elevation', 'aspect', or 'custom'
// Custom mode state
let customMinElev = 0;
let customMaxElev = 4000;
let customAspects = new Set(['N','NE','E','SE','S','SW','W','NW']);
let customSlopeCats = new Set(['FLAT','MODERATE','STEEP','VERY_STEEP','EXTREME']);
let customRespectForecast = false;

// --- Map Initialization ---
map = L.map('map').setView(config.DEFAULT_CENTER, config.DEFAULT_ZOOM);
const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// --- Core Functions ---
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
        r = (1 - ratio) * north[0] + ratio * east[0];
        g = (1 - ratio) * north[1] + ratio * east[1];
        b = (1 - ratio) * north[2] + ratio * east[2];
    } else if (angle >= 90 && angle < 180) { // East to South
        const ratio = (angle - 90) / 90;
        r = (1 - ratio) * east[0] + ratio * south[0];
        g = (1 - ratio) * east[1] + ratio * south[1];
        b = (1 - ratio) * east[2] + ratio * south[2];
    } else if (angle >= 180 && angle < 270) { // South to West
        const ratio = (angle - 180) / 90;
        r = (1 - ratio) * south[0] + ratio * west[0];
        g = (1 - ratio) * south[1] + ratio * west[1];
        b = (1 - ratio) * south[2] + ratio * west[2];
    } else { // West to North
        const ratio = (angle - 270) / 90;
        r = (1 - ratio) * west[0] + ratio * north[0];
        g = (1 - ratio) * west[1] + ratio * north[1];
        b = (1 - ratio) * west[2] + ratio * north[2];
    }
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.7)`;
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

                    if (currentMode === 'slope' || currentMode === 'aspect' || currentMode === 'elevation' || currentMode === 'custom') {
                        const midPixelData = calculatePixelData(size.y * size.x * 2 + size.x * 2 , size.x, size.y, data, coords);
                        let avaInfo = AvalancheDataService.getAvalancheInfoForLocation(midPixelData.lat, midPixelData.lng);
                        for (let y = 0; y < size.y; y++) {
                            for (let x = 0; x < size.x; x++) {
                                const i = (y * size.x + x) * 4;
                                const pixelData = calculatePixelData(i, size.x, size.y, data, coords);

                                switch (currentMode) {
                                    case 'custom': {
                                        // If respecting forecast, override custom filters with forecast-based coloring
                                        if (customRespectForecast) {
                                            let forecastMatch = false;
                                            if (avaInfo && avaInfo.problems.length > 0) {
                                                const asp = (pixelData.aspectDir || '').toUpperCase();
                                                // Match if any problem mentions this aspect AND elevation range contains this pixel elevation
                                                for (let pIdx = 0; pIdx < avaInfo.problems.length; pIdx++) {
                                                    const p = avaInfo.problems[pIdx];
                                                    if (p.aspects.length === 0) continue; // require aspect to be mentioned
                                                        const aspectsUpper = p.aspects.map(a => String(a).toUpperCase());
                                                    if (asp && aspectsUpper.includes(asp) && p.appliesToElevation(pixelData.elev)) {
                                                        forecastMatch = true;
                                                        break;
                                                    }
                                                }
                                            }

                                            if (forecastMatch) {
                                                // Color based on danger level at this elevation (fallback to highest)
                                                const rating = avaInfo.getDangerLevelAtElevation(pixelData.elev);
                                                const rgba = getRGBAForDangerLevel(rating.mainValue);
                                                outputData[i] = rgba[0]; outputData[i+1] = rgba[1]; outputData[i+2] = rgba[2]; outputData[i+3] = rgba[3];
                                            } else {
                                                // Transparent if not covered by any mentioned problem
                                                outputData[i] = 0; outputData[i+1] = 0; outputData[i+2] = 0; outputData[i+3] = 0;
                                            }
                                        } else {
                                            // Original custom filter behavior
                                            let match = false;
                                            // Require selected slope category first
                                            if (customSlopeCats.has(pixelData.slopeCat)) {
                                                // Elevation must be within range
                                                if (pixelData.elev >= customMinElev && pixelData.elev <= customMaxElev) {
                                                    if (pixelData.slopeCat === 'FLAT') {
                                                        // No aspect on flat terrain; accept based on elevation and slope alone
                                                        match = true;
                                                    } else {
                                                        // Non-flat: also require selected aspect direction
                                                        if (customAspects.has(pixelData.aspectDir)) match = true;
                                                    }
                                                }
                                            }

                                            if (match) {
                                                // Orange
                                                outputData[i] = 255; outputData[i+1] = 165; outputData[i+2] = 0; outputData[i+3] = 255;
                                            } else {
                                                // Transparent
                                                outputData[i] = 0; outputData[i+1] = 0; outputData[i+2] = 0; outputData[i+3] = 0;
                                            }
                                        }
                                        break;
                                    }
                                    case 'slope': {
                                        const color = getColorForSlope(pixelData.slopeDeg);
                                        const colorValues = color.match(/\d+/g).map(Number);
                                        if(colorValues && colorValues.length >= 3) {
                                            outputData[i] = colorValues[0];
                                            outputData[i + 1] = colorValues[1];
                                            outputData[i + 2] = colorValues[2];
                                            outputData[i + 3] = 255;
                                        }
                                        break;
                                    }
                                    case 'aspect': {
                                        let color;
                                        if (pixelData.slopeDeg < 1) { // Use slope angle to determine if flat
                                            color = 'rgba(0,0,0,0)';
                                        } else {
                                            color = getColorForAspect(pixelData.aspectDeg);
                                        }
                                        const colorValues = color.match(/\d+/g).map(Number);
                                        if(colorValues && colorValues.length >= 3) {
                                            outputData[i] = colorValues[0];
                                            outputData[i + 1] = colorValues[1];
                                            outputData[i + 2] = colorValues[2];
                                            outputData[i + 3] = 255;
                                        }
                                        break;
                                    }
                                    case 'elevation': {
                                        const elev = pixelData.elev;
                                        if (elev > config.ELEVATION_THRESHOLDS.HIGH) {
                                            outputData[i] = 204; outputData[i + 1] = 50; outputData[i + 2] = 50; outputData[i+3] = 255;
                                        } else if (elev > config.ELEVATION_THRESHOLDS.MEDIUM) {
                                            outputData[i] = 245; outputData[i + 1] = 141; outputData[i + 2] = 17; outputData[i+3] = 255;
                                        } else if (elev > config.ELEVATION_THRESHOLDS.LOW) {
                                            outputData[i] = 231; outputData[i + 1] = 180; outputData[i + 2] = 22; outputData[i+3] = 255;
                                        } else {
                                            outputData[i] = data[i]; outputData[i+1] = data[i+1]; outputData[i+2] = data[i+2]; outputData[i+3] = data[i+3];
                                        }
                                        break;
                                    }
                                    default:
                                        break;
                                }
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
    const customControls = document.getElementById('custom-controls');
    if (customControls) customControls.classList.add('hidden');

    if (currentMode === 'slope') document.getElementById('slope-legend').classList.remove('hidden');
    if (currentMode === 'elevation') document.getElementById('elevation-legend').classList.remove('hidden');
    if (currentMode === 'aspect') document.getElementById('aspect-legend').classList.remove('hidden');
    if (currentMode === 'custom' && customControls) customControls.classList.remove('hidden');
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

            const pixelData = calculatePixelData((pixelX + (pixelY * TILE_SIZE)) * 4, TILE_SIZE, TILE_SIZE, ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data, { x: tileX, y: tileY, z: zoom });

            // Get avalanche data for this location and elevation
            const avalancheRegion = AvalancheDataService.getAvalancheInfoForLocation(lat, lng);
            const regionLine = avalancheRegion && avalancheRegion.regionID ? `<br><strong>Region:</strong> ${(avalancheRegion.regionID)}` : '';
            
            let avalancheContent = '';
            if (avalancheRegion ) {
                const dangerLevel = avalancheRegion.getHighestDangerLevel()
                const dangerEmoji = getDangerLevelEmoji(dangerLevel.mainValue);
                const elevationRange = dangerLevel.elevation.getDescription();
                const problems = formatAvalancheProblems(avalancheRegion.problems, pixelData.aspectDir);
                
                avalancheContent = `
                    <br><br><strong>🚨 Avalanche Information:</strong>
                    <br><strong>Danger Level:</strong> ${dangerEmoji} ${dangerLevel.mainValue} (${elevationRange})
                    <br><strong>Elevation:</strong> ${pixelData.elev.toFixed(0)}m
                    <br><strong>Problems:</strong><br>${problems}
                `;
            } else {
                avalancheContent = `<br><br><strong>🚨 Avalanche Information:</strong><br><em>No current bulletin data available for this region</em>`;
            }
            
            popup.setContent(`<strong>Slope:</strong> ${pixelData.slopeDeg.toFixed(1)}°<br><strong>Aspect:</strong> ${pixelData.aspectDeg.toFixed(0)}° (${pixelData.aspectDir})${regionLine}${avalancheContent}`);
        } catch (err) {
            popup.setContent('Could not calculate data.');
            console.error("Error calculating data on click:", err);
        }
    };
    tileImage.onerror = () => popup.setContent('Failed to load elevation data.');
}

// --- Avalanche Bulletin Data: delegated to AvalancheDataService ---

function formatAvalancheProblems(problems, currentAspect = null) {
    if (!problems || problems.length === 0) {
        return '<em>No specific problems reported</em>';
    }

    // If an aspect is provided, filter problems to those that include this aspect
    let filtered = problems;
    if (currentAspect && typeof currentAspect === 'string') {
        const asp = currentAspect.toUpperCase();
        filtered = problems.filter(p => Array.isArray(p.aspects) && p.aspects.map(a => String(a).toUpperCase()).includes(asp));
    }

    if (currentAspect && filtered.length === 0) {
        return `<em>No specific problems reported for ${currentAspect} aspects</em>`;
    }
    
    return filtered.map(problem => {
        const problemType = problem.problemType.replace(/_/g, ' ').toLowerCase();
        const elevationDesc = problem.elevation.getDescription();
        const aspects = problem.aspects && problem.aspects.length > 0 ? 
            ` (${problem.aspects.join(', ')})` : '';
        return `<strong>${problemType}</strong> at ${elevationDesc}${aspects}`;
    }).join('<br>');
}

function getDangerLevelEmoji(level) {
    const emojiMap = {
        'low': '🟢',
        'moderate': '🟡', 
        'considerable': '🟠',
        'high': '🔴',
        'extreme': '⚫'
    };
    return emojiMap[level] || '❓';
}

// Map avalanche danger levels to RGBA color [r,g,b,a]
function getRGBAForDangerLevel(level) {
    // Accept string level or numeric (1-5)
    let key = level;
    if (typeof level === 'number') {
        const mapNumToStr = { 1: 'low', 2: 'moderate', 3: 'considerable', 4: 'high', 5: 'extreme' };
        key = mapNumToStr[level] || null;
    }
    if (typeof key === 'string') key = key.toLowerCase();
    switch (key) {
        case 'low': return [45, 201, 55, 255];          // green
        case 'moderate': return [231, 180, 22, 255];    // yellow-ish (consistent with slope palette)
        case 'considerable': return [245, 141, 17, 255];// orange
        case 'high': return [204, 50, 50, 255];         // red
        case 'extreme': return [0, 0, 0, 255];          // black
        default: return [0, 0, 0, 0];                   // transparent if unknown
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
    // Kick off background load of avalanche regions and bulletins into memory
    AvalancheDataService.loadAvalancheRegionsIntoMemory().catch(() => {});
    AvalancheDataService.loadAvalancheBulletins().catch(() => {});
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
                const cc1 = document.getElementById('custom-controls'); if (cc1) cc1.classList.add('hidden');
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
                        const cc2 = document.getElementById('custom-controls'); if (cc2) cc2.classList.add('hidden');
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

    // Custom controls listeners
    const minInput = document.getElementById('custom-min-elev');
    const maxInput = document.getElementById('custom-max-elev');
    const aspectCheckboxes = document.querySelectorAll('.aspect-checkbox');
    const slopeCheckboxes = document.querySelectorAll('.slope-checkbox');
    const respectForecastCb = document.getElementById('custom-respect-forecast');
    function applyCustomStateFromInputs() {
        const minVal = parseFloat(minInput && minInput.value || '0');
        const maxVal = parseFloat(maxInput && maxInput.value || '0');
        if (!isNaN(minVal)) customMinElev = minVal;
        if (!isNaN(maxVal)) customMaxElev = maxVal;
        // Ensure range order
        if (customMinElev > customMaxElev) {
            const tmp = customMinElev; customMinElev = customMaxElev; customMaxElev = tmp;
            if (minInput) minInput.value = customMinElev;
            if (maxInput) maxInput.value = customMaxElev;
        }
        customAspects = new Set();
        aspectCheckboxes.forEach(cb => { if (cb.checked) customAspects.add(cb.value); });
        customSlopeCats = new Set();
        if (slopeCheckboxes && slopeCheckboxes.length) {
            slopeCheckboxes.forEach(cb => { if (cb.checked) customSlopeCats.add(cb.value); });
        }
        if (respectForecastCb) {
            customRespectForecast = !!respectForecastCb.checked;
        }
    }
    function triggerRedrawIfCustom() { if (currentMode === 'custom' && slopeLayer) slopeLayer.redraw(); }
    if (minInput) {
        minInput.addEventListener('change', () => { applyCustomStateFromInputs(); triggerRedrawIfCustom(); });
        minInput.addEventListener('input', () => { applyCustomStateFromInputs(); triggerRedrawIfCustom(); });
    }
    if (maxInput) {
        maxInput.addEventListener('change', () => { applyCustomStateFromInputs(); triggerRedrawIfCustom(); });
        maxInput.addEventListener('input', () => { applyCustomStateFromInputs(); triggerRedrawIfCustom(); });
    }
    if (aspectCheckboxes && aspectCheckboxes.length) {
        aspectCheckboxes.forEach(cb => cb.addEventListener('change', () => { applyCustomStateFromInputs(); triggerRedrawIfCustom(); }));
    }
    if (slopeCheckboxes && slopeCheckboxes.length) {
        slopeCheckboxes.forEach(cb => cb.addEventListener('change', () => { applyCustomStateFromInputs(); triggerRedrawIfCustom(); }));
    }
    if (respectForecastCb) {
        respectForecastCb.addEventListener('change', () => { applyCustomStateFromInputs(); triggerRedrawIfCustom(); });
    }
    // Initialize from defaults
    if (respectForecastCb) respectForecastCb.checked = !!customRespectForecast;
    applyCustomStateFromInputs();

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
            const regions = AvalancheDataService.avalancheRegions;
            if (!regions || !Array.isArray(regions.features)) return;
            regionLayer = L.geoJSON(regions, {
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
            if (!regions.features.length) {
                console.warn('Region layer added but there are zero features to display.');
            }
        };
        if (AvalancheDataService.avalancheRegionsLoaded) {
            useRegions();
        } else {
            AvalancheDataService.loadAvalancheRegionsIntoMemory().then(useRegions).catch(() => {});
        }
    }
}
