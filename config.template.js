// Configuration template for Avalanche Map Generator
// Copy this file to config.js and fill in your actual API key

const config = {
    // MapTiler API Key - Get a free key from https://maptiler.com
    MAPTILER_API_KEY: 'YOUR_API_KEY_HERE',
    
    // Map settings
    DEFAULT_CENTER: [47.2692, 11.4041], // Innsbruck, Austria
    DEFAULT_ZOOM: 12,
    
    // Terrain tile settings
    TERRAIN_MIN_ZOOM: 10,
    TERRAIN_MAX_ZOOM: 15,
    
    // Default opacity for overlays
    DEFAULT_OPACITY: 0.7,
    
    // Tile size for calculations
    TILE_SIZE: 256,
    
    // Elevation thresholds for coloring (in meters)
    ELEVATION_THRESHOLDS: {
        HIGH: 3000,
        MEDIUM: 2500,
        LOW: 2000
    },
    
    // Slope thresholds for coloring (in degrees)
    SLOPE_THRESHOLDS: {
        EXTREME: 45,
        VERY_STEEP: 30,
        STEEP: 20,
        MODERATE: 10,
        FLAT: 0
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
} else {
    // Browser environment
    window.config = config;
} 