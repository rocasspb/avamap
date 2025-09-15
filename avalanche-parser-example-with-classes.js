/**
 * Example usage of the new Avalanche Data Classes
 * 
 * This file demonstrates how to use the new class structure to work with 
 * avalanche bulletin data and get danger levels by elevation.
 */

// Import the new classes (for Node.js)
const { AvalancheData, AvalancheRegion, DangerRating } = require('./avalanche-data-classes.js');

// For browser usage, the classes should be loaded via script tag first

async function demonstrateClassStructure() {
    console.log('🚨 Avalanche Data Classes Demo\n');
    
    // Create a new AvalancheData instance
    const avalancheData = new AvalancheData();
    
    try {
        // Option 1: Fetch data from the EUREGIO API
        console.log('📡 Fetching data from EUREGIO API...');
        const response = await fetch('https://static.avalanche.report/bulletins/latest/EUREGIO_en_CAAMLv6.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const apiData = await response.json();
        
        // Parse the data using our new class structure
        avalancheData.parse(apiData);
        console.log('✅ Successfully parsed data using new class structure');
        
        // Display summary
        const summary = avalancheData.summary;
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
        
        // Example queries using the new class structure
        console.log(`\n🔍 Example Queries with New Classes:`);
        
        // Get regions by country
        const italianRegions = avalancheData.getRegionsByCountry('IT');
        console.log(`   Italian regions: ${italianRegions.length}`);
        
        const austrianRegions = avalancheData.getRegionsByCountry('AT');
        console.log(`   Austrian regions: ${austrianRegions.length}`);
        
        // Demonstrate elevation-based danger level queries
        if (italianRegions.length > 0) {
            const sampleRegion = italianRegions[0];
            console.log(`\n📍 Sample Region: ${sampleRegion.name} (${sampleRegion.regionID})`);
            
            // Get danger levels at different elevations
            const elevations = [1500, 2200, 2800, 3500];
            console.log(`   Danger Levels by Elevation:`);
            
            elevations.forEach(elevation => {
                const dangerRating = avalancheData.getDangerLevel(sampleRegion.regionID, elevation);
                if (dangerRating) {
                    console.log(`     ${elevation}m: ${dangerRating.mainValue.toUpperCase()} (${dangerRating.elevation.getDescription()})`);
                } else {
                    console.log(`     ${elevation}m: No specific rating`);
                }
            });
            
            // Get all danger levels for a specific elevation
            const elevation2200 = 2200;
            const allRatings = avalancheData.getAllDangerLevels(sampleRegion.regionID, elevation2200);
            console.log(`\n   All ratings at ${elevation2200}m:`);
            allRatings.forEach(rating => {
                console.log(`     ${rating.getDescription()}`);
            });
            
            // Get avalanche problems at a specific elevation
            const problems = avalancheData.getProblems(sampleRegion.regionID, elevation2200);
            console.log(`\n   Avalanche problems at ${elevation2200}m:`);
            problems.forEach(problem => {
                console.log(`     ${problem.getDescription()}`);
            });
            
            // Show elevation ranges for this region
            console.log(`\n   Elevation ranges and danger levels:`);
            const elevationRanges = sampleRegion.getDangerLevelsByElevation();
            Object.entries(elevationRanges).forEach(([elevationDesc, ratings]) => {
                console.log(`     ${elevationDesc}: ${ratings.map(r => r.mainValue).join(', ')}`);
            });
        }
        
        // Demonstrate searching for regions with specific danger levels at elevations
        console.log(`\n🔍 Regions with moderate danger at 2500m:`);
        const moderateAt2500 = avalancheData.getRegionsByDangerLevelAtElevation('moderate', 2500);
        moderateAt2500.slice(0, 5).forEach(region => {
            const danger = avalancheData.getDangerLevel(region.regionID, 2500);
            console.log(`   ${region.name}: ${danger ? danger.getDescription() : 'Unknown'}`);
        });
        
        // Search for regions by name
        console.log(`\n🔍 Searching for regions containing "Brenta":`);
        const brentaRegions = avalancheData.searchRegions('Brenta');
        brentaRegions.slice(0, 3).forEach(region => {
            console.log(`   ${region.name} (${region.regionID})`);
        });
        
        // Get statistics for a specific region
        if (italianRegions.length > 0) {
            const regionStats = italianRegions[0].getSummary();
            console.log(`\n📈 Region Statistics:`);
            console.log(`   Name: ${regionStats.name}`);
            console.log(`   Country: ${regionStats.countryCode}`);
            console.log(`   Total Bulletins: ${regionStats.totalBulletins}`);
            console.log(`   Total Problems: ${regionStats.totalProblems}`);
            console.log(`   Highest Danger Level: ${regionStats.highestDangerLevel}`);
        }
        
        // Export to JSON (for debugging or further processing)
        const jsonExport = avalancheData.exportToJSON();
        console.log(`\n💾 Data exported to JSON (${(jsonExport.length / 1024).toFixed(2)} KB)`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        // Fallback: Try to parse local data if available
        console.log('\n🔄 Trying to parse local data...');
        try {
            // This would work if you have the local JSON file
            // const localData = await fetch('./data/EUREGIO_en_CAAMLv6.json');
            // const localJson = await localData.json();
            // avalancheData.parse(localJson);
            // console.log('✅ Successfully parsed local data');
            
            console.log('💡 To use local data, ensure the JSON file is accessible');
        } catch (localError) {
            console.error('❌ Local data parsing also failed:', localError.message);
        }
    }
}

// Example: Parse local data from file system (Node.js)
async function parseLocalDataWithClasses() {
    const fs = require('fs');
    const { AvalancheData } = require('./avalanche-data-classes.js');
    
    try {
        console.log('📁 Reading local data file...');
        const data = fs.readFileSync('./data/EUREGIO_en_CAAMLv6.json', 'utf8');
        const jsonData = JSON.parse(data);
        
        const avalancheData = new AvalancheData();
        avalancheData.parse(jsonData);
        console.log('✅ Successfully parsed local data with new classes');
        
        // Display basic info
        console.log(`\n📊 Local Data Summary:`);
        console.log(`   Bulletins: ${avalancheData.summary.totalBulletins}`);
        console.log(`   Regions: ${avalancheData.summary.totalRegions}`);
        
        // Demonstrate elevation queries
        const regions = avalancheData.getAllRegions();
        if (regions.length > 0) {
            const sampleRegion = regions[0];
            console.log(`\n📍 Sample Region: ${sampleRegion.name}`);
            
            // Test elevation queries
            const testElevations = [1000, 2000, 3000];
            testElevations.forEach(elevation => {
                const danger = avalancheData.getDangerLevel(sampleRegion.regionID, elevation);
                if (danger) {
                    console.log(`   ${elevation}m: ${danger.mainValue.toUpperCase()}`);
                }
            });
        }
        
        return avalancheData;
    } catch (error) {
        console.error('❌ Error reading local file:', error.message);
        return null;
    }
}

// Example: Browser usage with new classes
function setupBrowserExampleWithClasses() {
    // Create a simple UI for testing
    const container = document.createElement('div');
    container.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h2>🚨 Avalanche Data Classes Demo</h2>
            <button id="fetchData">📡 Fetch from API</button>
            <button id="showElevationQuery">🏔️ Test Elevation Query</button>
            <button id="showRegionInfo">📍 Show Region Info</button>
            <div id="output" style="margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; max-height: 400px; overflow-y: auto;"></div>
        </div>
    `;
    
    document.body.appendChild(container);
    
    let currentData = null;
    
    // Add event listeners
    document.getElementById('fetchData').addEventListener('click', async () => {
        const output = document.getElementById('output');
        output.innerHTML = 'Loading...';
        
        try {
            const response = await fetch('https://static.avalanche.report/bulletins/latest/EUREGIO_en_CAAMLv6.json');
            const data = await response.json();
            
            currentData = new AvalancheData();
            currentData.parse(data);
            
            output.innerHTML = `
                <h3>✅ Data Loaded Successfully</h3>
                <p><strong>Total Bulletins:</strong> ${currentData.summary.totalBulletins}</p>
                <p><strong>Total Regions:</strong> ${currentData.summary.totalRegions}</p>
                <p><strong>Countries:</strong> ${currentData.summary.countries.join(', ')}</p>
            `;
        } catch (error) {
            output.innerHTML = `Error: ${error.message}`;
        }
    });
    
    document.getElementById('showElevationQuery').addEventListener('click', () => {
        const output = document.getElementById('output');
        if (!currentData) {
            output.innerHTML = 'Please fetch data first';
            return;
        }
        
        const regions = currentData.getAllRegions();
        if (regions.length === 0) {
            output.innerHTML = 'No regions available';
            return;
        }
        
        const sampleRegion = regions[0];
        const elevations = [1500, 2000, 2500, 3000];
        
        let html = `<h3>🏔️ Elevation Queries for ${sampleRegion.name}</h3>`;
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += '<tr><th style="border: 1px solid #ddd; padding: 8px;">Elevation</th><th style="border: 1px solid #ddd; padding: 8px;">Danger Level</th><th style="border: 1px solid #ddd; padding: 8px;">Range</th></tr>';
        
        elevations.forEach(elevation => {
            const danger = currentData.getDangerLevel(sampleRegion.regionID, elevation);
            if (danger) {
                html += `<tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${elevation}m</td>
                    <td style="border: 1px solid #ddd; padding: 8px;"><strong>${danger.mainValue.toUpperCase()}</strong></td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${danger.elevation.getDescription()}</td>
                </tr>`;
            } else {
                html += `<tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${elevation}m</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">No rating</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">-</td>
                </tr>`;
            }
        });
        
        html += '</table>';
        output.innerHTML = html;
    });
    
    document.getElementById('showRegionInfo').addEventListener('click', () => {
        const output = document.getElementById('output');
        if (!currentData) {
            output.innerHTML = 'Please fetch data first';
            return;
        }
        
        const italianRegions = currentData.getRegionsByCountry('IT');
        if (italianRegions.length === 0) {
            output.innerHTML = 'No Italian regions available';
            return;
        }
        
        let html = '<h3>📍 Italian Regions</h3>';
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">';
        
        italianRegions.slice(0, 6).forEach(region => {
            const summary = region.getSummary();
            html += `
                <div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
                    <h4>${region.name}</h4>
                    <p><strong>ID:</strong> ${region.regionID}</p>
                    <p><strong>Bulletins:</strong> ${summary.totalBulletins}</p>
                    <p><strong>Problems:</strong> ${summary.totalProblems}</p>
                    <p><strong>Highest Danger:</strong> ${summary.highestDangerLevel}</p>
                </div>
            `;
        });
        
        html += '</div>';
        output.innerHTML = html;
    });
}

// Run the demo
if (typeof window !== 'undefined') {
    // Browser environment
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupBrowserExampleWithClasses);
    } else {
        setupBrowserExampleWithClasses();
    }
} else {
    // Node.js environment
    demonstrateClassStructure().catch(console.error);
    
    // Uncomment to test with local data
    // parseLocalDataWithClasses().then(data => {
    //     if (data) {
    //         console.log('Local data parsed successfully with new classes');
    //     }
    // });
}

