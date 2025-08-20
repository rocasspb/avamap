#!/usr/bin/env node

/**
 * Avalanche Regions Data Parser
 * Downloads and processes avalanche region boundaries from regions.avalanches.org
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Base URL for the avalanche regions data
const BASE_URL = 'https://regions.avalanches.org';

// Countries/regions to download (based on the website structure)
const REGIONS = [
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

// Function to download a file
function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${url}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            
            file.on('error', (err) => {
                fs.unlink(filepath, () => {}); // Delete the file on error
                reject(err);
            });
        }).on('error', reject);
    });
}

// Function to download and process region data
async function downloadRegionData(regionCode) {
    console.log(`Downloading data for ${regionCode}...`);
    
    try {
        // Download micro-regions data
        const microRegionsUrl = `${BASE_URL}/micro-regions/${regionCode}_micro-regions.geojson.json`;
        const microRegionsPath = path.join('data', 'regions', `${regionCode}_micro-regions.json`);
        
        await downloadFile(microRegionsUrl, microRegionsPath);
        console.log(`✅ Downloaded micro-regions for ${regionCode}`);
        
        // Download elevation data if available
        try {
            const elevationUrl = `${BASE_URL}/micro-regions_elevation/${regionCode}_micro-regions_elevation.geojson.json`;
            const elevationPath = path.join('data', 'regions', `${regionCode}_elevation.json`);
            
            await downloadFile(elevationUrl, elevationPath);
            console.log(`✅ Downloaded elevation data for ${regionCode}`);
        } catch (elevationError) {
            console.log(`⚠️  No elevation data available for ${regionCode}`);
        }
        
        return true;
    } catch (error) {
        console.error(`❌ Failed to download data for ${regionCode}:`, error.message);
        return false;
    }
}

// Function to create a consolidated regions file
function createConsolidatedRegions() {
    console.log('Creating consolidated regions file...');
    
    const dataDir = path.join('data', 'regions');
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('_micro-regions.json'));
    
    const allRegions = {
        type: 'FeatureCollection',
        features: []
    };
    
    files.forEach(file => {
        try {
            const filePath = path.join(dataDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            
            if (data.features && Array.isArray(data.features)) {
                // Add region code to each feature for identification
                const regionCode = file.replace('_micro-regions.json', '');
                data.features.forEach(feature => {
                    feature.properties.region_code = regionCode;
                    feature.properties.source = 'regions.avalanches.org';
                });
                
                allRegions.features.push(...data.features);
                console.log(`✅ Added ${data.features.length} features from ${regionCode}`);
            }
        } catch (error) {
            console.error(`❌ Error processing ${file}:`, error.message);
        }
    });
    
    const consolidatedPath = path.join('data', 'avalanche-regions-consolidated.json');
    fs.writeFileSync(consolidatedPath, JSON.stringify(allRegions, null, 2));
    
    console.log(`✅ Created consolidated file with ${allRegions.features.length} total features`);
    return consolidatedPath;
}

// Function to create a simplified regions file for the map
function createSimplifiedRegions() {
    console.log('Creating simplified regions file for map overlay...');
    
    const consolidatedPath = path.join('data', 'avalanche-regions-consolidated.json');
    
    if (!fs.existsSync(consolidatedPath)) {
        console.error('❌ Consolidated regions file not found. Run download first.');
        return null;
    }
    
    const content = fs.readFileSync(consolidatedPath, 'utf8');
    const data = JSON.parse(content);
    
    // Simplify the data for map overlay use
    const simplified = {
        type: 'FeatureCollection',
        features: data.features.map(feature => ({
            type: 'Feature',
            geometry: feature.geometry,
            properties: {
                id: feature.properties.id || feature.properties.name || feature.properties.region_code,
                name: feature.properties.name || feature.properties.region_code,
                region_code: feature.properties.region_code,
                country: feature.properties.country || feature.properties.region_code.split('-')[0],
                source: 'regions.avalanches.org'
            }
        }))
    };
    
    const simplifiedPath = path.join('data', 'avalanche-regions-simplified.json');
    fs.writeFileSync(simplifiedPath, JSON.stringify(simplified, null, 2));
    
    console.log(`✅ Created simplified file with ${simplified.features.length} features`);
    return simplifiedPath;
}

// Main execution function
async function main() {
    console.log('🚀 Starting Avalanche Regions Data Download...\n');
    
    // Create data directories
    const dataDir = path.join('data', 'regions');
    if (!fs.existsSync('data')) fs.mkdirSync('data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    
    // Download data for all regions
    const results = await Promise.allSettled(
        REGIONS.map(region => downloadRegionData(region))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`\n📊 Download Summary: ${successful}/${REGIONS.length} regions downloaded successfully\n`);
    
    // Create consolidated and simplified files
    if (successful > 0) {
        createConsolidatedRegions();
        createSimplifiedRegions();
        
        console.log('\n🎯 Next steps:');
        console.log('1. The simplified regions file is ready for map overlay');
        console.log('2. Add the regions overlay to your map application');
        console.log('3. Use the regions data for avalanche risk visualization');
    } else {
        console.log('\n❌ No data was downloaded. Check your internet connection and try again.');
    }
}

// Run the script if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    downloadRegionData,
    createConsolidatedRegions,
    createSimplifiedRegions
}; 