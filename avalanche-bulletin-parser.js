/**
 * Avalanche Bulletin Parser for EUREGIO CAAML v6 Data
 * 
 * This module provides functionality to parse and work with avalanche bulletin data
 * from the EUREGIO avalanche reporting service.
 * 
 * Data source: https://static.avalanche.report/bulletins/latest/EUREGIO_en_CAAMLv6.json
 */

class AvalancheBulletinParser {
    constructor() {
        this.bulletins = [];
        this.regions = new Map();
        this.dangerLevels = ['low', 'moderate', 'considerable', 'high', 'extreme'];
    }

    /**
     * Fetch and parse avalanche bulletin data from the EUREGIO API
     * @param {string} url - The URL to fetch data from (defaults to EUREGIO API)
     * @returns {Promise<Object>} Parsed bulletin data
     */
    async fetchAndParse(url = 'https://static.avalanche.report/bulletins/latest/EUREGIO_en_CAAMLv6.json') {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return this.parse(data);
        } catch (error) {
            console.error('Error fetching avalanche data:', error);
            throw error;
        }
    }

    /**
     * Parse local JSON data into structured format
     * @param {Object} data - Raw JSON data
     * @returns {Object} Parsed and structured data
     */
    parse(data) {
        if (!data.bulletins || !Array.isArray(data.bulletins)) {
            throw new Error('Invalid data format: missing bulletins array');
        }

        this.bulletins = data.bulletins;
        this._buildRegionIndex();
        
        return {
            bulletins: this.bulletins,
            regions: this.regions,
            summary: this._generateSummary(),
            metadata: this._extractMetadata()
        };
    }

    /**
     * Build an index of regions for quick lookup
     * @private
     */
    _buildRegionIndex() {
        this.regions.clear();
        
        this.bulletins.forEach(bulletin => {
            if (bulletin.regions && Array.isArray(bulletin.regions)) {
                bulletin.regions.forEach(region => {
                    if (!this.regions.has(region.regionID)) {
                        this.regions.set(region.regionID, {
                            ...region,
                            bulletins: [],
                            dangerLevels: [],
                            problems: []
                        });
                    }
                    
                    const regionData = this.regions.get(region.regionID);
                    regionData.bulletins.push(bulletin.bulletinID);
                    
                    // Extract current danger rating
                    if (bulletin.dangerRatings && bulletin.dangerRatings.length > 0) {
                        regionData.dangerLevels.push(...bulletin.dangerRatings)
                    }
                    
                    // Extract avalanche problems
                    if (bulletin.avalancheProblems && bulletin.avalancheProblems.length > 0) {
                        regionData.problems.push(...bulletin.avalancheProblems);
                    }
                });
            }
        });
    }

    /**
     * Generate a summary of all bulletins
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
            if (bulletin.dangerRatings) {
                bulletin.dangerRatings.forEach(dr => {
                    const level = dr.mainValue;
                    summary.dangerLevels[level] = (summary.dangerLevels[level] || 0) + 1;
                });
            }

            // Count problem types
            if (bulletin.avalancheProblems) {
                bulletin.avalancheProblems.forEach(problem => {
                    const type = problem.problemType;
                    summary.problemTypes[type] = (summary.problemTypes[type] || 0) + 1;
                });
            }

            // Extract country codes from region IDs
            if (bulletin.regions) {
                bulletin.regions.forEach(region => {
                    const countryCode = region.regionID.split('-')[0];
                    summary.countries.add(countryCode);
                });
            }

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
     * Get bulletins by region ID
     * @param {string} regionId - The region ID to search for
     * @returns {Array} Array of bulletins for the specified region
     */
    getBulletinsByRegion(regionId) {
        return this.bulletins.filter(bulletin => 
            bulletin.regions && 
            bulletin.regions.some(region => region.regionID === regionId)
        );
    }

    /**
     * Get bulletins by danger level
     * @param {string} dangerLevel - The danger level to filter by
     * @returns {Array} Array of bulletins with the specified danger level
     */
    getBulletinsByDangerLevel(dangerLevel) {
        return this.bulletins.filter(bulletin => 
            bulletin.dangerRatings && 
            bulletin.dangerRatings.some(dr => dr.mainValue === dangerLevel)
        );
    }

    /**
     * Get bulletins by problem type
     * @param {string} problemType - The problem type to filter by
     * @returns {Array} Array of bulletins with the specified problem type
     */
    getBulletinsByProblemType(problemType) {
        return this.bulletins.filter(bulletin => 
            bulletin.avalancheProblems && 
            bulletin.avalancheProblems.some(problem => problem.problemType === problemType)
        );
    }

    /**
     * Get regions by country
     * @param {string} countryCode - The country code (e.g., 'IT', 'AT')
     * @returns {Array} Array of regions in the specified country
     */
    getRegionsByCountry(countryCode) {
        return Array.from(this.regions.values()).filter(region => 
            region.regionID.startsWith(countryCode)
        );
    }

    /**
     * Get current danger level for a specific region
     * @param {string} regionId - The region ID
     * @returns {[]|null} Current danger levels array or null if not found
     */
    getCurrentDangerLevel(regionId) {
        const region = this.regions.get(regionId);
        return region ? region.dangerLevels : null;
    }

    /**
     * Search bulletins by text content
     * @param {string} searchTerm - The text to search for
     * @returns {Array} Array of bulletins containing the search term
     */
    searchBulletins(searchTerm) {
        const term = searchTerm.toLowerCase();
        return this.bulletins.filter(bulletin => {
            // Search in highlights
            if (bulletin.avalancheActivity?.highlights?.toLowerCase().includes(term)) {
                return true;
            }
            
            // Search in comments
            if (bulletin.avalancheActivity?.comment?.toLowerCase().includes(term)) {
                return true;
            }
            
            // Search in snowpack structure
            if (bulletin.snowpackStructure?.comment?.toLowerCase().includes(term)) {
                return true;
            }
            
            // Search in region names
            if (bulletin.regions?.some(region => 
                region.name.toLowerCase().includes(term)
            )) {
                return true;
            }
            
            return false;
        });
    }

    /**
     * Get elevation-based danger ratings
     * @param {string} regionId - The region ID
     * @returns {Array} Array of danger ratings with elevation information
     */
    getElevationDangerRatings(regionId) {
        const bulletins = this.getBulletinsByRegion(regionId);
        const ratings = [];
        
        bulletins.forEach(bulletin => {
            if (bulletin.dangerRatings) {
                bulletin.dangerRatings.forEach(rating => {
                    if (rating.elevation) {
                        ratings.push({
                            ...rating,
                            bulletinId: bulletin.bulletinID,
                            regionId: regionId
                        });
                    }
                });
            }
        });
        
        return ratings;
    }

    /**
     * Export parsed data to JSON
     * @returns {string} JSON string representation
     */
    exportToJSON() {
        return JSON.stringify({
            bulletins: this.bulletins,
            regions: Array.from(this.regions.entries()),
            summary: this._generateSummary(),
            metadata: this._extractMetadata()
        }, null, 2);
    }

    /**
     * Get bulletin statistics
     * @returns {Object} Statistical information about the bulletins
     */
    getStatistics() {
        const stats = {
            totalBulletins: this.bulletins.length,
            totalRegions: this.regions.size,
            dangerLevelDistribution: {},
            problemTypeDistribution: {},
            countryDistribution: {},
            averageProblemsPerBulletin: 0,
            averageRegionsPerBulletin: 0
        };

        let totalProblems = 0;
        let totalRegions = 0;

        this.bulletins.forEach(bulletin => {
            // Count problems
            if (bulletin.avalancheProblems) {
                totalProblems += bulletin.avalancheProblems.length;
                bulletin.avalancheProblems.forEach(problem => {
                    stats.problemTypeDistribution[problem.problemType] = 
                        (stats.problemTypeDistribution[problem.problemType] || 0) + 1;
                });
            }

            // Count regions
            if (bulletin.regions) {
                totalRegions += bulletin.regions.length;
                bulletin.regions.forEach(region => {
                    const countryCode = region.regionID.split('-')[0];
                    stats.countryDistribution[countryCode] = 
                        (stats.countryDistribution[countryCode] || 0) + 1;
                });
            }

            // Count danger levels
            if (bulletin.dangerRatings) {
                bulletin.dangerRatings.forEach(rating => {
                    stats.dangerLevelDistribution[rating.mainValue] = 
                        (stats.dangerLevelDistribution[rating.mainValue] || 0) + 1;
                });
            }
        });

        stats.averageProblemsPerBulletin = totalProblems / stats.totalBulletins;
        stats.averageRegionsPerBulletin = totalRegions / stats.totalBulletins;

        return stats;
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AvalancheBulletinParser;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.AvalancheBulletinParser = AvalancheBulletinParser;
}
