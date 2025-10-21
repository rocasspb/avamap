// PixelData simple class constructor
(function(global){
    class PixelData {
        constructor(
            x, y,
            elev, slopeDeg, slopeCat, aspectDeg, aspectDir,
            lat, lng, regionInfo, avalancheInfo, dangerLevel, elevationRange, problems
        ) {
            // Pixel/tile indices
            this.x = x ?? null;                  // pixel x within tile
            this.y = y ?? null;                  // pixel y within tile

            // Elevation and gradients
            this.elev = elev ?? null;            // elevation at pixel (m)

            // Slope and aspect
            this.slopeDeg = slopeDeg ?? null;    // slope in degrees
            this.slopeCat = (slopeCat ?? 'FLAT');  // slope category
            this.aspectDeg = aspectDeg ?? null;  // aspect in degrees [0,360)
            this.aspectDir = aspectDir ?? null;  // cardinal direction (N, NE, ...)

            // Geo position
            this.lat = lat ?? null;              // latitude of pixel center
            this.lng = lng ?? null;              // longitude of pixel center

            // Avalanche meta
            this.regionInfo = regionInfo ?? null;      // region object for point
            this.avalancheInfo = avalancheInfo ?? null;// bulletin info for location
            this.dangerLevel = dangerLevel ?? null;    // e.g., LOW, MODERATE, ...
            this.elevationRange = elevationRange ?? null; // text description
            this.problems = problems ?? null;          // list of problems (possibly filtered)
        }
    }

    // Expose globally
    global.PixelData = PixelData;
})(typeof window !== 'undefined' ? window : globalThis);