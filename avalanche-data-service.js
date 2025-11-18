// Avalanche data service and region utilities
(function(global){
    const AVALANCHE_REGIONS_BASE_URL = 'https://regions.avalanches.org';
    const AVALANCHE_REGIONS_LIST = [
        'AD','AT-01','AT-02','AT-03','AT-04','AT-05','AT-06','AT-07','AT-08',
        'CH','CZ','DE-BY','ES-CT','ES-CT-L','ES','FI','FR','GB','IS','IT-21','IT-23','IT-25',
        'IT-32-BZ','IT-32-TN','IT-34','IT-36','IT-57','IT-MeteoMont','NO','PL','PL-12','RO','SE','SI','SK','UA','CA','US','NZ'
    ];

    let avalancheRegions = null;
    let avalancheRegionsLoaded = false;
    let avalancheData = null;
    let avalancheDataLoaded = false;

    async function fetchJsonWithCorsFallback(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
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

    async function loadAvalancheBulletins() {
        if (avalancheDataLoaded) return avalancheData;
        try {
            const response = await fetchJsonWithCorsFallback('https://static.avalanche.report/bulletins/latest/EUREGIO_de_CAAMLv6.json');
            avalancheData = new AvalancheData();
            avalancheData.parse(response);
            avalancheDataLoaded = true;
            return avalancheData;
        } catch (err) {
            console.error('Error loading avalanche bulletins:', err);
            avalancheDataLoaded = false;
            return null;
        }
    }

    function getAvalancheInfoForLocation(lat, lng) {
        if (!avalancheDataLoaded || !avalancheData) return null;
        try {
            const regionInfo = findAvalancheRegionForPoint(lat, lng);
            if (!regionInfo) return null;
            const regions = avalancheData.getAllRegions();
            return regions.find(region => region.regionID === regionInfo);
        } catch (err) {
            console.error('Error getting avalanche info:', err);
            return null;
        }
    }

    async function loadAvalancheRegionsIntoMemory() {
        if (avalancheRegionsLoaded && avalancheRegions) return avalancheRegions;
        try {
            const results = await Promise.allSettled(
                AVALANCHE_REGIONS_LIST.map(code => fetchJsonWithCorsFallback(`${AVALANCHE_REGIONS_BASE_URL}/micro-regions/${code}_micro-regions.geojson.json`))
            );
            const features = [];
            for (const r of results) {
                if (r.status === 'fulfilled' && r.value && Array.isArray(r.value.features)) {
                    features.push(...r.value.features);
                }
            }
            avalancheRegions = { type: 'FeatureCollection', features };
            avalancheRegionsLoaded = true;
            return avalancheRegions;
        } catch (err) {
            console.warn('Failed to load avalanche regions:', err.message || err);
            avalancheRegionsLoaded = false;
            return null;
        }
    }

    function getRegionLabel(feature) {
        const props = feature && feature.properties ? feature.properties : {};
        return props.id;
    }

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

    function polygonContainsPoint(point, polygon) {
        if (!polygon || !polygon.length) return false;
        const outer = polygon[0];
        if (!ringContainsPoint(point, outer)) return false;
        for (let i = 1; i < polygon.length; i++) {
            if (ringContainsPoint(point, polygon[i])) return false;
        }
        return true;
    }

    function findAvalancheRegionForPoint(lat, lng) {
        try {
            if (!avalancheRegionsLoaded || !avalancheRegions || !Array.isArray(avalancheRegions.features)) return null;
            const point = [lng, lat];
            for (let i = 0; i < avalancheRegions.features.length; i++) {
                const f = avalancheRegions.features[i];
                if (!f || !f.geometry) continue;
                const { type, coordinates } = f.geometry;
                if (type === 'Polygon') {
                    if (polygonContainsPoint(point, coordinates)) return getRegionLabel(f);
                } else if (type === 'MultiPolygon') {
                    for (let p = 0; p < coordinates.length; p++) {
                        if (polygonContainsPoint(point, coordinates[p])) return getRegionLabel(f);
                    }
                }
            }
            return null;
        } catch (err) {
            console.warn('Region lookup failed:', err.message || err);
            return null;
        }
    }

    // expose API
    global.AvalancheDataService = {
        fetchJsonWithCorsFallback,
        loadAvalancheBulletins,
        getAvalancheInfoForLocation,
        loadAvalancheRegionsIntoMemory,
        findAvalancheRegionForPoint,
        polygonContainsPoint,
        ringContainsPoint,
        get avalancheRegions(){ return avalancheRegions; },
        get avalancheRegionsLoaded(){ return avalancheRegionsLoaded; },
        get avalancheData(){ return avalancheData; },
        get avalancheDataLoaded(){ return avalancheDataLoaded; }
    };
})(typeof window !== 'undefined' ? window : globalThis);
