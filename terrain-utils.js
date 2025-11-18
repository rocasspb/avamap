// Terrain and pixel computation utilities
(function(global){
    function getElevation(r, g, b) {
        return -10000 + ((r * 256 * 256 + g * 256 + b) * 0.1);
    }

    function getAspectDirection(degrees) {
        if (degrees > 337.5 || degrees <= 22.5) return 'N';
        if (degrees > 22.5 && degrees <= 67.5) return 'NW';
        if (degrees > 67.5 && degrees <= 112.5) return 'W';
        if (degrees > 112.5 && degrees <= 157.5) return 'SW';
        if (degrees > 157.5 && degrees <= 202.5) return 'S';
        if (degrees > 202.5 && degrees <= 247.5) return 'SE';
        if (degrees > 247.5 && degrees <= 292.5) return 'E';
        if (degrees > 292.5 && degrees <= 337.5) return 'NE';
        return '';
    }

    function computeAspectDegrees(dz_dx, dz_dy) {
        const aspectRad = Math.atan2(-dz_dx, -dz_dy);
        let aspectDeg = aspectRad * (180 / Math.PI);
        if (aspectDeg < 0) aspectDeg += 360;
        aspectDeg = (aspectDeg + 180) % 360;
        return aspectDeg;
    }

    function calculatePixelData(i, size_x, size_y, data, coords) {
        const x = (i / 4) % size_x;
        const y = Math.floor((i / 4) / size_x);
        const i_dx = (y * size_x + Math.min(size_x - 1, x + 1)) * 4;
        const i_dy = (Math.min(size_y - 1, y + 1) * size_x + x) * 4;

        const elev = getElevation(data[i], data[i+1], data[i+2]);
        const elev_dx = getElevation(data[i_dx], data[i_dx+1], data[i_dx+2]);
        const elev_dy = getElevation(data[i_dy], data[i_dy+1], data[i_dy+2]);

        const mapCenterLat = (typeof map !== 'undefined' && map && map.getCenter) ? map.getCenter().lat : 0;
        const resolution = (40075016.7 / (config.TILE_SIZE * Math.pow(2, coords.z))) * Math.cos(mapCenterLat * Math.PI / 180);
        const dz_dx = (elev_dx - elev);
        const dz_dy = (elev_dy - elev);

        const slopeRad = resolution ? Math.atan(Math.sqrt(dz_dx*dz_dx + dz_dy*dz_dy) / resolution) : null;
        const slopeDeg = slopeRad !== null ? (slopeRad * (180 / Math.PI)) : null;

        let slopeCat = 'FLAT';
        if (slopeDeg !== null) {
            if (slopeDeg > config.SLOPE_THRESHOLDS.EXTREME) slopeCat = 'EXTREME';
            else if (slopeDeg > config.SLOPE_THRESHOLDS.VERY_STEEP) slopeCat = 'VERY_STEEP';
            else if (slopeDeg > config.SLOPE_THRESHOLDS.STEEP) slopeCat = 'STEEP';
            else if (slopeDeg > config.SLOPE_THRESHOLDS.MODERATE) slopeCat = 'MODERATE';
        }

        const aspectDeg = computeAspectDegrees(dz_dx, dz_dy);
        const aspectDir = aspectDeg !== null ? getAspectDirection(aspectDeg) : null;

        let lat = null, lng = null;
        if (coords) {
            const n = Math.pow(2, coords.z);
            lng = ((coords.x + (x / size_x)) / n) * 360 - 180;
            const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * ((coords.y + (y / size_y)) / n))));
            lat = (latRad * 180) / Math.PI;
        }

        return new PixelData(
            x, y,
            elev,
            slopeDeg, slopeCat,
            aspectDeg, aspectDir,
            lat, lng,
        );
    }

    // expose
    global.getElevation = getElevation;
    global.getAspectDirection = getAspectDirection;
    global.computeAspectDegrees = computeAspectDegrees;
    global.calculatePixelData = calculatePixelData;
})(typeof window !== 'undefined' ? window : globalThis);
