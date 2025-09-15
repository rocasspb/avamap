/**
 * Example usage of the AvalancheBulletinParser
 * 
 * This file demonstrates how to use the parser to work with avalanche bulletin data
 * from both local files and the EUREGIO API.
 */

// Import the parser (for Node.js)
const AvalancheBulletinParser = require('./avalanche-bulletin-parser.js');

// For browser usage, the parser should be loaded via script tag first

async function demonstrateParser() {
    console.log('🚨 Avalanche Bulletin Parser Demo\n');
    
    // Create a new parser instance
    const parser = new AvalancheBulletinParser();
    
    try {
        // Option 1: Fetch data from the EUREGIO API
        console.log('📡 Fetching data from EUREGIO API...');
        const apiData = await parser.fetchAndParse();
        console.log('✅ Successfully fetched and parsed data from API');
        
        // Display summary
        const summary = apiData.summary;
        console.log(`\n📊 Summary:`);
        console.log(`   Total Bulletins: ${summary.totalBulletins}`);
        console.log(`   Total Regions: ${summary.totalRegions}`);
        console.log(`   Countries: ${summary.countries.join(', ')}`);
        console.log(`   Latest Publication: ${new Date(summary.publicationTime).toLocaleString()}`);
        console.log(`   Valid Until: ${new Date(summary.validTime.endTime).toLocaleString()}`);
        
        // Display danger level distribution
        console.log(`\n⚠️  Danger Level Distribution:`);
        Object.entries(summary.dangerLevels).forEach(([level, count]) => {
            console.log(`   ${level.toUpperCase()}: ${count}`);
        });
        
        // Display problem types
        console.log(`\n🏔️  Problem Types:`);
        Object.entries(summary.problemTypes).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });
        
        // Example queries
        console.log(`\n🔍 Example Queries:`);
        
        // Get regions by country
        const italianRegions = parser.getRegionsByCountry('IT');
        console.log(`   Italian regions: ${italianRegions.length}`);
        
        const austrianRegions = parser.getRegionsByCountry('AT');
        console.log(`   Austrian regions: ${austrianRegions.length}`);
        
        // Get regions with moderate danger
        const moderateDangerRegions = parser.getRegionsByDangerLevel('moderate');
        console.log(`   Regions with moderate danger: ${moderateDangerRegions.length}`);
        
        // Search for specific terms
        const wetSnowBulletins = parser.searchBulletins('wet snow');
        console.log(`   Bulletins mentioning "wet snow": ${wetSnowBulletins.length}`);
        
        // Get statistics
        const stats = parser.getStatistics();
        console.log(`\n📈 Statistics:`);
        console.log(`   Average problems per bulletin: ${stats.averageProblemsPerBulletin.toFixed(2)}`);
        console.log(`   Average regions per bulletin: ${stats.averageRegionsPerBulletin.toFixed(2)}`);
        
        // Example: Get detailed info for a specific region
        if (italianRegions.length > 0) {
            const sampleRegion = italianRegions[0];
            console.log(`\n📍 Sample Region: ${sampleRegion.name} (${sampleRegion.regionID})`);
            console.log(`   Current Danger: ${sampleRegion.currentDanger || 'Unknown'}`);
            console.log(`   Associated Bulletins: ${sampleRegion.bulletins.length}`);
            console.log(`   Avalanche Problems: ${sampleRegion.problems.length}`);
            
            // Get elevation-based danger ratings
            const elevationRatings = parser.getElevationDangerRatings(sampleRegion.regionID);
            if (elevationRatings.length > 0) {
                console.log(`   Elevation-based ratings: ${elevationRatings.length}`);
                elevationRatings.forEach(rating => {
                    const elevation = rating.elevation;
                    const elevationText = elevation.lowerBound && elevation.upperBound 
                        ? `${elevation.lowerBound}m - ${elevation.upperBound}m`
                        : elevation.upperBound 
                            ? `Below ${elevation.upperBound}m`
                            : elevation.lowerBound 
                                ? `Above ${elevation.lowerBound}m`
                                : 'All elevations';
                    console.log(`     ${rating.mainValue.toUpperCase()} at ${elevationText}`);
                });
            }
        }
        
        // Export to JSON (for debugging or further processing)
        const jsonExport = parser.exportToJSON();
        console.log(`\n💾 Data exported to JSON (${(jsonExport.length / 1024).toFixed(2)} KB)`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        // Fallback: Try to parse local data if available
        console.log('\n🔄 Trying to parse local data...');
        try {
            // This would work if you have the local JSON file
            // const localData = await fetch('./data/EUREGIO_en_CAAMLv6.json');
            // const localJson = await localData.json();
            // const parsedData = parser.parse(localJson);
            // console.log('✅ Successfully parsed local data');
            
            console.log('💡 To use local data, ensure the JSON file is accessible');
        } catch (localError) {
            console.error('❌ Local data parsing also failed:', localError.message);
        }
    }
}

// Example: Parse local data from file system (Node.js)
async function parseLocalData() {
    const fs = require('fs');
    const parser = new AvalancheBulletinParser();
    
    try {
        console.log('📁 Reading local data file...');
        const data = fs.readFileSync('./data/EUREGIO_en_CAAMLv6.json', 'utf8');
        const jsonData = JSON.parse(data);
        
        const parsedData = parser.parse(jsonData);
        console.log('✅ Successfully parsed local data');
        
        // Display basic info
        console.log(`\n📊 Local Data Summary:`);
        console.log(`   Bulletins: ${parsedData.summary.totalBulletins}`);
        console.log(`   Regions: ${parsedData.summary.totalRegions}`);
        
        return parsedData;
    } catch (error) {
        console.error('❌ Error reading local file:', error.message);
        return null;
    }
}

// Example: Browser usage
function setupBrowserExample() {
    // Create a simple UI for testing
    const container = document.createElement('div');
    container.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h2>🚨 Avalanche Bulletin Parser Demo</h2>
            <button id="fetchData">📡 Fetch from API</button>
            <button id="showStats">📊 Show Statistics</button>
            <button id="searchRegions">🔍 Search Regions</button>
            <div id="output" style="margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px;"></div>
        </div>
    `;
    
    document.body.appendChild(container);
    
    // Add event listeners
    document.getElementById('fetchData').addEventListener('click', async () => {
        const output = document.getElementById('output');
        output.innerHTML = 'Loading...';
        
        try {
            const parser = new AvalancheBulletinParser();
            const data = await parser.fetchAndParse();
            output.innerHTML = `<pre>${JSON.stringify(data.summary, null, 2)}</pre>`;
        } catch (error) {
            output.innerHTML = `Error: ${error.message}`;
        }
    });
    
    document.getElementById('showStats').addEventListener('click', () => {
        const output = document.getElementById('output');
        if (window.currentParser) {
            const stats = window.currentParser.getStatistics();
            output.innerHTML = `<pre>${JSON.stringify(stats, null, 2)}</pre>`;
        } else {
            output.innerHTML = 'Please fetch data first';
        }
    });
    
    document.getElementById('searchRegions').addEventListener('click', () => {
        const output = document.getElementById('output');
        if (window.currentParser) {
            const italianRegions = window.currentParser.getRegionsByCountry('IT');
            output.innerHTML = `<h3>Italian Regions (${italianRegions.length})</h3><pre>${JSON.stringify(italianRegions.slice(0, 5), null, 2)}</pre>`;
        } else {
            output.innerHTML = 'Please fetch data first';
        }
    });
}

// Run the demo
if (typeof window !== 'undefined') {
    // Browser environment
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupBrowserExample);
    } else {
        setupBrowserExample();
    }
} else {
    // Node.js environment
    demonstrateParser().catch(console.error);
    
    // Uncomment to test with local data
    // parseLocalData().then(data => {
    //     if (data) {
    //         console.log('Local data parsed successfully');
    //     }
    // });
}
