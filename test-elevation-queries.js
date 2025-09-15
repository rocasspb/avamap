/**
 * Simple test file demonstrating elevation-based danger level queries
 */

const { AvalancheData } = require('./avalanche-data-classes.js');

async function testElevationQueries() {
    console.log('🧪 Testing Elevation-Based Danger Level Queries\n');
    
    try {
        // Fetch data from API
        const response = await fetch('https://static.avalanche.report/bulletins/latest/EUREGIO_en_CAAMLv6.json');
        const data = await response.json();
        
        // Parse with new class structure
        const avalancheData = new AvalancheData();
        avalancheData.parse(data);
        
        console.log(`✅ Loaded ${avalancheData.summary.totalRegions} regions from ${avalancheData.summary.totalBulletins} bulletins\n`);
        
        // Test elevation queries for a specific region
        const regionId = 'IT-32-TN-01'; // Adamello - Presanella
        const region = avalancheData.getRegion(regionId);
        
        if (!region) {
            console.log('❌ Region not found');
            return;
        }
        
        console.log(`📍 Testing region: ${region.name} (${region.regionID})\n`);
        
        // Test different elevations
        const testElevations = [1500, 2000, 2200, 2500, 3000, 3500];
        
        console.log('🏔️  Danger Levels by Elevation:');
        console.log('Elevation | Danger Level | Range');
        console.log('----------|--------------|------------------');
        
        testElevations.forEach(elevation => {
            const danger = avalancheData.getDangerLevel(regionId, elevation);
            if (danger) {
                console.log(`${elevation.toString().padStart(8)}m | ${danger.mainValue.toUpperCase().padEnd(11)} | ${danger.elevation.getDescription()}`);
            } else {
                console.log(`${elevation.toString().padStart(8)}m | No rating    | -`);
            }
        });
        
        // Test getting all ratings for a specific elevation
        console.log('\n🔍 All ratings at 2200m:');
        const allRatings = avalancheData.getAllDangerLevels(regionId, 2200);
        allRatings.forEach(rating => {
            console.log(`  • ${rating.getDescription()}`);
        });
        
        // Test getting problems at a specific elevation
        console.log('\n⚠️  Avalanche problems at 2500m:');
        const problems = avalancheData.getProblems(regionId, 2500);
        if (problems.length > 0) {
            problems.forEach(problem => {
                console.log(`  • ${problem.getDescription()}`);
                console.log(`    Type: ${problem.problemType}`);
                console.log(`    Stability: ${problem.snowpackStability}`);
                console.log(`    Aspects: ${problem.aspects.join(', ')}`);
            });
        } else {
            console.log('  No problems at this elevation');
        }
        
        // Test elevation ranges
        console.log('\n📊 Elevation ranges and danger levels:');
        const elevationRanges = region.getDangerLevelsByElevation();
        Object.entries(elevationRanges).forEach(([elevationDesc, ratings]) => {
            const dangerLevels = ratings.map(r => r.mainValue).join(', ');
            console.log(`  ${elevationDesc}: ${dangerLevels}`);
        });
        
        // Test finding regions with specific danger levels at elevations
        console.log('\n🔍 Regions with moderate danger at 2500m:');
        const moderateAt2500 = avalancheData.getRegionsByDangerLevelAtElevation('moderate', 2500);
        moderateAt2500.slice(0, 5).forEach(region => {
            const danger = avalancheData.getDangerLevel(region.regionID, 2500);
            console.log(`  • ${region.name}: ${danger ? danger.getDescription() : 'Unknown'}`);
        });
        
        console.log('\n✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during testing:', error.message);
    }
}

// Run the test
testElevationQueries().catch(console.error);

