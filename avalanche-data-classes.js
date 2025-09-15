/**
 * Avalanche Data Classes
 * 
 * This module provides class structures to encapsulate parsed avalanche bulletin data
 * and provides methods for working with danger levels by elevation.
 */

/**
 * Represents an elevation range with optional bounds
 */
class ElevationRange {
    constructor(lowerBound = null, upperBound = null) {
        this.lowerBound = lowerBound ? parseInt(lowerBound) : null;
        this.upperBound = upperBound ? parseInt(upperBound) : null;
    }

    /**
     * Check if a given elevation is within this range
     * @param {number} elevation - The elevation in meters
     * @returns {boolean} True if the elevation is within range
     */
    contains(elevation) {
        if (this.lowerBound !== null && elevation < this.lowerBound) {
            return false;
        }
        if (this.upperBound !== null && elevation > this.upperBound) {
            return false;
        }
        return true;
    }

    /**
     * Get a human-readable description of the elevation range
     * @returns {string} Description of the elevation range
     */
    getDescription() {
        if (this.lowerBound !== null && this.upperBound !== null) {
            return `${this.lowerBound}m - ${this.upperBound}m`;
        } else if (this.upperBound !== null) {
            return `Below ${this.upperBound}m`;
        } else if (this.lowerBound !== null) {
            return `Above ${this.lowerBound}m`;
        } else {
            return 'All elevations';
        }
    }

    /**
     * Get the midpoint of the range (if both bounds exist)
     * @returns {number|null} Midpoint elevation or null if not applicable
     */
    getMidpoint() {
        if (this.lowerBound !== null && this.upperBound !== null) {
            return Math.round((this.lowerBound + this.upperBound) / 2);
        }
        return null;
    }

    /**
     * Check if this range overlaps with another range
     * @param {ElevationRange} other - Another elevation range
     * @returns {boolean} True if ranges overlap
     */
    overlaps(other) {
        if (this.upperBound !== null && other.lowerBound !== null && this.upperBound < other.lowerBound) {
            return false;
        }
        if (this.lowerBound !== null && other.upperBound !== null && this.lowerBound > other.upperBound) {
            return false;
        }
        return true;
    }
}

/**
 * Represents a danger rating with elevation information
 */
class DangerRating {
    constructor(data) {
        this.mainValue = data.mainValue; // 'low', 'moderate', 'considerable', 'high', 'extreme'
        this.elevation = data.elevation ? new ElevationRange(
            data.elevation.lowerBound,
            data.elevation.upperBound
        ) : new ElevationRange();
        this.validTimePeriod = data.validTimePeriod || 'all_day';
        this.customData = data.customData || {};
    }

    /**
     * Get the numeric value of the danger level
     * @returns {number} Numeric danger level (1-5)
     */
    getNumericValue() {
        const dangerMap = {
            'low': 1,
            'moderate': 2,
            'considerable': 3,
            'high': 4,
            'extreme': 5
        };
        return dangerMap[this.mainValue] || 0;
    }

    /**
     * Check if this rating applies to a given elevation
     * @param {number} elevation - The elevation in meters
     * @returns {boolean} True if the rating applies
     */
    appliesToElevation(elevation) {
        return this.elevation.contains(elevation);
    }

    /**
     * Get a human-readable description
     * @returns {string} Description of the danger rating
     */
    getDescription() {
        const elevationDesc = this.elevation.getDescription();
        return `${this.mainValue.toUpperCase()} at ${elevationDesc}`;
    }
}

/**
 * Represents an avalanche problem
 */
class AvalancheProblem {
    constructor(data) {
        this.problemType = data.problemType;
        this.elevation = data.elevation ? new ElevationRange(
            data.elevation.lowerBound,
            data.elevation.upperBound
        ) : new ElevationRange();
        this.validTimePeriod = data.validTimePeriod || 'all_day';
        this.snowpackStability = data.snowpackStability;
        this.frequency = data.frequency;
        this.avalancheSize = data.avalancheSize;
        this.aspects = data.aspects || [];
        this.customData = data.customData || {};
    }

    /**
     * Check if this problem applies to a given elevation
     * @param {number} elevation - The elevation in meters
     * @returns {boolean} True if the problem applies
     */
    appliesToElevation(elevation) {
        return this.elevation.contains(elevation);
    }

    /**
     * Get a human-readable description
     * @returns {string} Description of the avalanche problem
     */
    getDescription() {
        const elevationDesc = this.elevation.getDescription();
        const aspectDesc = this.aspects.length > 0 ? ` on ${this.aspects.join(', ')} aspects` : '';
        return `${this.problemType.replace('_', ' ')} at ${elevationDesc}${aspectDesc}`;
    }
}

/**
 * Represents a region with its associated data
 */
class AvalancheRegion {
    constructor(data) {
        this.regionID = data.regionID;
        this.name = data.name;
        this.bulletins = [];
        this.dangerRatings = [];
        this.problems = [];
        this.countryCode = this.regionID.split('-')[0];
    }

    /**
     * Add a bulletin to this region
     * @param {AvalancheBulletin} bulletin - The bulletin to add
     */
    addBulletin(bulletin) {
        this.bulletins.push(bulletin);
    }

    /**
     * Add danger ratings to this region
     * @param {Array} ratings - Array of danger rating data
     */
    addDangerRatings(ratings) {
        ratings.forEach(rating => {
            this.dangerRatings.push(new DangerRating(rating));
        });
    }

    /**
     * Add avalanche problems to this region
     * @param {Array} problems - Array of avalanche problem data
     */
    addProblems(problems) {
        problems.forEach(problem => {
            this.problems.push(new AvalancheProblem(problem));
        });
    }

    /**
     * Get the danger level for a specific elevation
     * @param {number} elevation - The elevation in meters
     * @returns {DangerRating|null} The applicable danger rating or null if none found
     */
    getDangerLevelAtElevation(elevation) {
        // Find the most specific danger rating for this elevation
        let applicableRating = null;
        let highestSpecificity = -1;

        for (const rating of this.dangerRatings) {
            if (rating.appliesToElevation(elevation)) {
                // Calculate specificity: more specific ranges (smaller ranges) have higher priority
                const specificity = this._calculateSpecificity(rating.elevation);
                if (specificity > highestSpecificity) {
                    highestSpecificity = specificity;
                    applicableRating = rating;
                }
            }
        }

        return applicableRating;
    }

    /**
     * Get all danger levels for a specific elevation
     * @param {number} elevation - The elevation in meters
     * @returns {Array<DangerRating>} Array of applicable danger ratings
     */
    getAllDangerLevelsAtElevation(elevation) {
        return this.dangerRatings.filter(rating => 
            rating.appliesToElevation(elevation)
        );
    }

    /**
     * Get avalanche problems for a specific elevation
     * @param {number} elevation - The elevation in meters
     * @returns {Array<AvalancheProblem>} Array of applicable avalanche problems
     */
    getProblemsAtElevation(elevation) {
        return this.problems.filter(problem => 
            problem.appliesToElevation(elevation)
        );
    }

    /**
     * Get the highest danger level for any elevation in this region
     * @returns {DangerRating|null} The highest danger rating or null if none found
     */
    getHighestDangerLevel() {
        if (this.dangerRatings.length === 0) return null;
        
        return this.dangerRatings.reduce((highest, current) => {
            return current.getNumericValue() > highest.getNumericValue() ? current : highest;
        });
    }

    /**
     * Get danger levels by elevation ranges
     * @returns {Object} Object mapping elevation descriptions to danger levels
     */
    getDangerLevelsByElevation() {
        const elevationMap = {};
        
        this.dangerRatings.forEach(rating => {
            const elevationDesc = rating.elevation.getDescription();
            if (!elevationMap[elevationDesc]) {
                elevationMap[elevationDesc] = [];
            }
            elevationMap[elevationDesc].push(rating);
        });

        return elevationMap;
    }

    /**
     * Calculate the specificity of an elevation range
     * @private
     * @param {ElevationRange} elevation - The elevation range
     * @returns {number} Specificity score (higher = more specific)
     */
    _calculateSpecificity(elevation) {
        if (elevation.lowerBound !== null && elevation.upperBound !== null) {
            // Bounded range: specificity based on range size
            return 1000 - (elevation.upperBound - elevation.lowerBound);
        } else if (elevation.lowerBound !== null || elevation.upperBound !== null) {
            // Single bound: medium specificity
            return 500;
        } else {
            // No bounds: lowest specificity
            return 0;
        }
    }

    /**
     * Get a summary of the region
     * @returns {Object} Summary information about the region
     */
    getSummary() {
        const highestDanger = this.getHighestDangerLevel();
        return {
            regionID: this.regionID,
            name: this.name,
            countryCode: this.countryCode,
            totalBulletins: this.bulletins.length,
            totalProblems: this.problems.length,
            highestDangerLevel: highestDanger ? highestDanger.mainValue : 'unknown',
            elevationRanges: this.getDangerLevelsByElevation()
        };
    }
}

/**
 * Represents a single avalanche bulletin
 */
class AvalancheBulletin {
    constructor(data) {
        this.bulletinID = data.bulletinID;
        this.publicationTime = data.publicationTime;
        this.validTime = data.validTime;
        this.lang = data.lang;
        this.regions = [];
        this.dangerRatings = [];
        this.avalancheProblems = [];
        this.avalancheActivity = data.avalancheActivity || {};
        this.snowpackStructure = data.snowpackStructure || {};
        this.tendency = data.tendency || [];
        this.customData = data.customData || {};
    }

    /**
     * Add regions to this bulletin
     * @param {Array} regions - Array of region data
     */
    addRegions(regions) {
        regions.forEach(region => {
            this.regions.push(new AvalancheRegion(region));
        });
    }

    /**
     * Add danger ratings to this bulletin
     * @param {Array} ratings - Array of danger rating data
     */
    addDangerRatings(ratings) {
        ratings.forEach(rating => {
            this.dangerRatings.push(new DangerRating(rating));
        });
    }

    /**
     * Add avalanche problems to this bulletin
     * @param {Array} problems - Array of avalanche problem data
     */
    addProblems(problems) {
        problems.forEach(problem => {
            this.avalancheProblems.push(new AvalancheProblem(problem));
        });
    }

    /**
     * Get danger levels for a specific region and elevation
     * @param {string} regionId - The region ID
     * @param {number} elevation - The elevation in meters
     * @returns {DangerRating|null} The applicable danger rating or null if none found
     */
    getDangerLevelForRegionAndElevation(regionId, elevation) {
        const region = this.regions.find(r => r.regionID === regionId);
        if (!region) return null;
        
        return region.getDangerLevelAtElevation(elevation);
    }

    /**
     * Get a summary of the bulletin
     * @returns {Object} Summary information about the bulletin
     */
    getSummary() {
        return {
            bulletinID: this.bulletinID,
            publicationTime: this.publicationTime,
            validTime: this.validTime,
            totalRegions: this.regions.length,
            totalProblems: this.avalancheProblems.length,
            dangerLevels: this.dangerRatings.map(r => r.mainValue),
            regions: this.regions.map(r => r.name)
        };
    }
}

/**
 * Main container class for all avalanche data
 */
class AvalancheData {
    constructor() {
        this.bulletins = [];
        this.regions = new Map();
        this.summary = null;
        this.metadata = null;
    }

    /**
     * Parse raw JSON data into structured class instances
     * @param {Object} data - Raw JSON data from the API
     * @returns {AvalancheData} This instance for chaining
     */
    parse(data) {
        if (!data.bulletins || !Array.isArray(data.bulletins)) {
            throw new Error('Invalid data format: missing bulletins array');
        }

        this.bulletins = [];
        this.regions.clear();

        // Parse each bulletin
        data.bulletins.forEach(bulletinData => {
            const bulletin = new AvalancheBulletin(bulletinData);
            
            // Add regions
            if (bulletinData.regions) {
                bulletin.addRegions(bulletinData.regions);
            }
            
            // Add danger ratings
            if (bulletinData.dangerRatings) {
                bulletin.addDangerRatings(bulletinData.dangerRatings);
            }
            
            // Add avalanche problems
            if (bulletinData.avalancheProblems) {
                bulletin.addProblems(bulletinData.avalancheProblems);
            }
            
            this.bulletins.push(bulletin);
        });

        // Build region index
        this._buildRegionIndex();
        
        // Generate summary and metadata
        this.summary = this._generateSummary();
        this.metadata = this._extractMetadata();

        return this;
    }

    /**
     * Build an index of regions for quick lookup
     * @private
     */
    _buildRegionIndex() {
        this.regions.clear();
        
        this.bulletins.forEach(bulletin => {
            bulletin.regions.forEach(region => {
                if (!this.regions.has(region.regionID)) {
                    this.regions.set(region.regionID, region);
                }
                
                const regionData = this.regions.get(region.regionID);
                regionData.addBulletin(bulletin);
                
                // Add danger ratings and problems from this bulletin
                if (bulletin.dangerRatings.length > 0) {
                    regionData.addDangerRatings(bulletin.dangerRatings);
                }
                
                if (bulletin.avalancheProblems.length > 0) {
                    regionData.addProblems(bulletin.avalancheProblems);
                }
            });
        });
    }

    /**
     * Get danger level for a specific region and elevation
     * @param {string} regionId - The region ID
     * @param {number} elevation - The elevation in meters
     * @returns {DangerRating|null} The applicable danger rating or null if none found
     */
    getDangerLevel(regionId, elevation) {
        const region = this.regions.get(regionId);
        if (!region) return null;
        
        return region.getDangerLevelAtElevation(elevation);
    }

    /**
     * Get all danger levels for a specific region and elevation
     * @param {string} regionId - The region ID
     * @param {number} elevation - The elevation in meters
     * @returns {Array<DangerRating>} Array of applicable danger ratings
     */
    getAllDangerLevels(regionId, elevation) {
        const region = this.regions.get(regionId);
        if (!region) return [];
        
        return region.getAllDangerLevelsAtElevation(elevation);
    }

    /**
     * Get avalanche problems for a specific region and elevation
     * @param {string} regionId - The region ID
     * @param {number} elevation - The elevation in meters
     * @returns {Array<AvalancheProblem>} Array of applicable avalanche problems
     */
    getProblems(regionId, elevation) {
        const region = this.regions.get(regionId);
        if (!region) return [];
        
        return region.getProblemsAtElevation(elevation);
    }

    /**
     * Get regions by country
     * @param {string} countryCode - The country code (e.g., 'IT', 'AT')
     * @returns {Array<AvalancheRegion>} Array of regions in the specified country
     */
    getRegionsByCountry(countryCode) {
        return Array.from(this.regions.values()).filter(region => 
            region.countryCode === countryCode
        );
    }

    /**
     * Get regions with a specific danger level at any elevation
     * @param {string} dangerLevel - The danger level to search for
     * @returns {Array<AvalancheRegion>} Array of regions with the specified danger level
     */
    getRegionsByDangerLevel(dangerLevel) {
        return Array.from(this.regions.values()).filter(region => 
            region.dangerRatings.some(rating => rating.mainValue === dangerLevel)
        );
    }

    /**
     * Get regions with a specific danger level at a specific elevation
     * @param {string} dangerLevel - The danger level to search for
     * @param {number} elevation - The elevation in meters
     * @returns {Array<AvalancheRegion>} Array of regions with the specified danger level at the elevation
     */
    getRegionsByDangerLevelAtElevation(dangerLevel, elevation) {
        return Array.from(this.regions.values()).filter(region => {
            const rating = region.getDangerLevelAtElevation(elevation);
            return rating && rating.mainValue === dangerLevel;
        });
    }

    /**
     * Search for regions by name
     * @param {string} searchTerm - The search term
     * @returns {Array<AvalancheRegion>} Array of matching regions
     */
    searchRegions(searchTerm) {
        const term = searchTerm.toLowerCase();
        return Array.from(this.regions.values()).filter(region => 
            region.name.toLowerCase().includes(term)
        );
    }

    /**
     * Get a region by ID
     * @param {string} regionId - The region ID
     * @returns {AvalancheRegion|null} The region or null if not found
     */
    getRegion(regionId) {
        return this.regions.get(regionId) || null;
    }

    /**
     * Get all regions
     * @returns {Array<AvalancheRegion>} Array of all regions
     */
    getAllRegions() {
        return Array.from(this.regions.values());
    }

    /**
     * Get all bulletins
     * @returns {Array<AvalancheBulletin>} Array of all bulletins
     */
    getAllBulletins() {
        return this.bulletins;
    }

    /**
     * Generate a summary of all data
     * @private
     * @returns {Object} Summary statistics
     */
    _generateSummary() {
        const summary = {
            totalBulletins: this.bulletins.length,
            totalRegions: this.regions.size,
            dangerLevels: {},
            problemTypes: {},
            countries: new Set(),
            publicationTime: null,
            validTime: null
        };

        // Count danger levels
        this.bulletins.forEach(bulletin => {
            bulletin.dangerRatings.forEach(dr => {
                const level = dr.mainValue;
                summary.dangerLevels[level] = (summary.dangerLevels[level] || 0) + 1;
            });

            // Count problem types
            bulletin.avalancheProblems.forEach(problem => {
                const type = problem.problemType;
                summary.problemTypes[type] = (summary.problemTypes[type] || 0) + 1;
            });

            // Extract country codes
            bulletin.regions.forEach(region => {
                summary.countries.add(region.countryCode);
            });

            // Track publication and valid times
            if (bulletin.publicationTime) {
                if (!summary.publicationTime || bulletin.publicationTime > summary.publicationTime) {
                    summary.publicationTime = bulletin.publicationTime;
                }
            }
            
            if (bulletin.validTime) {
                if (!summary.validTime || bulletin.validTime.endTime > summary.validTime.endTime) {
                    summary.validTime = bulletin.validTime;
                }
            }
        });

        summary.countries = Array.from(summary.countries);
        return summary;
    }

    /**
     * Extract metadata from bulletins
     * @private
     * @returns {Object} Metadata information
     */
    _extractMetadata() {
        const metadata = {
            languages: new Set(),
            customDataSources: new Set(),
            tendencyTypes: new Set()
        };

        this.bulletins.forEach(bulletin => {
            if (bulletin.lang) metadata.languages.add(bulletin.lang);
            
            if (bulletin.customData) {
                Object.keys(bulletin.customData).forEach(source => {
                    metadata.customDataSources.add(source);
                });
            }
            
            if (bulletin.tendency) {
                bulletin.tendency.forEach(t => {
                    if (t.tendencyType) metadata.tendencyTypes.add(t.tendencyType);
                });
            }
        });

        // Convert sets to arrays
        metadata.languages = Array.from(metadata.languages);
        metadata.customDataSources = Array.from(metadata.customDataSources);
        metadata.tendencyTypes = Array.from(metadata.tendencyTypes);

        return metadata;
    }

    /**
     * Export data to JSON
     * @returns {string} JSON string representation
     */
    exportToJSON() {
        return JSON.stringify({
            bulletins: this.bulletins.map(b => b.getSummary()),
            regions: Array.from(this.regions.entries()).map(([id, region]) => [id, region.getSummary()]),
            summary: this.summary,
            metadata: this.metadata
        }, null, 2);
    }
}

// Export classes for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AvalancheData,
        AvalancheBulletin,
        AvalancheRegion,
        DangerRating,
        AvalancheProblem,
        ElevationRange
    };
}

// Export for browser
if (typeof window !== 'undefined') {
    window.AvalancheData = AvalancheData;
    window.AvalancheBulletin = AvalancheBulletin;
    window.AvalancheRegion = AvalancheRegion;
    window.DangerRating = DangerRating;
    window.AvalancheProblem = AvalancheProblem;
    window.ElevationRange = ElevationRange;
}

