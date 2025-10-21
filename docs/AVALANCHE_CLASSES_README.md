# Avalanche Data Classes

This module provides a structured, object-oriented approach to working with avalanche bulletin data from the EUREGIO avalanche reporting service. Instead of working with untyped data sets, you now have strongly-typed classes that encapsulate the logic for working with danger levels by elevation.

## Overview

The new class structure consists of several key classes:

- **`AvalancheData`** - Main container class that manages all parsed data
- **`AvalancheBulletin`** - Represents a single avalanche bulletin
- **`AvalancheRegion`** - Represents a region with its associated data
- **`DangerRating`** - Represents a danger rating with elevation information
- **`AvalancheProblem`** - Represents an avalanche problem
- **`ElevationRange`** - Represents an elevation range with optional bounds

## Key Features

### 1. Elevation-Based Danger Level Queries

The primary feature of this class structure is the ability to get danger levels for specific elevations:

```javascript
// Get danger level for a specific region and elevation
const danger = avalancheData.getDangerLevel('IT-32-TN-01', 2500);
if (danger) {
    console.log(`Danger level at 2500m: ${danger.mainValue.toUpperCase()}`);
    console.log(`Elevation range: ${danger.elevation.getDescription()}`);
}
```

### 2. Smart Elevation Range Handling

The `ElevationRange` class handles various elevation range formats:
- Bounded ranges: "2200m - 3200m"
- Single upper bound: "Below 2200m"
- Single lower bound: "Above 2200m"
- No bounds: "All elevations"

### 3. Specificity-Based Rating Selection

When multiple danger ratings apply to the same elevation, the system automatically selects the most specific one:

```javascript
// If you have ratings for "Below 3000m" and "2200m - 2800m" at 2500m,
// the system will choose the more specific "2200m - 2800m" rating
```

## Usage Examples

### Basic Setup

```javascript
const { AvalancheData } = require('./avalanche-data-classes.js');

// Create a new instance
const avalancheData = new AvalancheData();

// Parse data from API or local file
const response = await fetch('https://static.avalanche.report/bulletins/latest/EUREGIO_en_CAAMLv6.json');
const data = await response.json();
avalancheData.parse(data);
```

### Getting Danger Levels by Elevation

```javascript
// Get danger level for a specific region and elevation
const regionId = 'IT-32-TN-01';
const elevation = 2500;

const danger = avalancheData.getDangerLevel(regionId, elevation);
if (danger) {
    console.log(`Danger: ${danger.mainValue.toUpperCase()}`);
    console.log(`Range: ${danger.elevation.getDescription()}`);
    console.log(`Numeric value: ${danger.getNumericValue()}`);
}

// Get all applicable danger ratings for an elevation
const allRatings = avalancheData.getAllDangerLevels(regionId, elevation);
allRatings.forEach(rating => {
    console.log(rating.getDescription());
});
```

### Working with Regions

```javascript
// Get regions by country
const italianRegions = avalancheData.getRegionsByCountry('IT');
const austrianRegions = avalancheData.getRegionsByCountry('AT');

// Search for regions by name
const brentaRegions = avalancheData.searchRegions('Brenta');

// Get a specific region
const region = avalancheData.getRegion('IT-32-TN-01');
if (region) {
    console.log(`Region: ${region.name}`);
    console.log(`Highest danger: ${region.getHighestDangerLevel()?.mainValue}`);
    
    // Get danger levels by elevation ranges
    const elevationRanges = region.getDangerLevelsByElevation();
    Object.entries(elevationRanges).forEach(([elevationDesc, ratings]) => {
        console.log(`${elevationDesc}: ${ratings.map(r => r.mainValue).join(', ')}`);
    });
}
```

### Working with Avalanche Problems

```javascript
// Get avalanche problems for a specific region and elevation
const problems = avalancheData.getProblems(regionId, elevation);
problems.forEach(problem => {
    console.log(`Problem: ${problem.getDescription()}`);
    console.log(`Type: ${problem.problemType}`);
    console.log(`Stability: ${problem.snowpackStability}`);
    console.log(`Aspects: ${problem.aspects.join(', ')}`);
});
```

### Advanced Queries

```javascript
// Find regions with a specific danger level at a specific elevation
const moderateAt2500 = avalancheData.getRegionsByDangerLevelAtElevation('moderate', 2500);

// Find regions with any specific danger level
const highDangerRegions = avalancheData.getRegionsByDangerLevel('high');
```

## Class Methods Reference

### AvalancheData

- `parse(data)` - Parse raw JSON data into class instances
- `getDangerLevel(regionId, elevation)` - Get danger level for region and elevation
- `getAllDangerLevels(regionId, elevation)` - Get all applicable danger ratings
- `getProblems(regionId, elevation)` - Get avalanche problems for region and elevation
- `getRegionsByCountry(countryCode)` - Get regions by country
- `getRegionsByDangerLevel(dangerLevel)` - Get regions with specific danger level
- `getRegionsByDangerLevelAtElevation(dangerLevel, elevation)` - Get regions with specific danger level at elevation
- `searchRegions(searchTerm)` - Search regions by name
- `getRegion(regionId)` - Get specific region by ID
- `getAllRegions()` - Get all regions
- `getAllBulletins()` - Get all bulletins
- `exportToJSON()` - Export data to JSON

### AvalancheRegion

- `getDangerLevelAtElevation(elevation)` - Get danger level at specific elevation
- `getAllDangerLevelsAtElevation(elevation)` - Get all danger levels at elevation
- `getProblemsAtElevation(elevation)` - Get problems at specific elevation
- `getHighestDangerLevel()` - Get highest danger level in region
- `getDangerLevelsByElevation()` - Get danger levels organized by elevation ranges
- `getSummary()` - Get summary information about the region

### DangerRating

- `appliesToElevation(elevation)` - Check if rating applies to elevation
- `getNumericValue()` - Get numeric danger level (1-5)
- `getDescription()` - Get human-readable description

### ElevationRange

- `contains(elevation)` - Check if elevation is within range
- `getDescription()` - Get human-readable description
- `getMidpoint()` - Get midpoint of bounded range
- `overlaps(other)` - Check if ranges overlap

## Migration from Old Parser

If you're currently using the old `AvalancheBulletinParser`, here's how to migrate:

### Old Way
```javascript
const parser = new AvalancheBulletinParser();
const data = await parser.fetchAndParse();
const dangerLevels = parser.getElevationDangerRatings('IT-32-TN-01');
```

### New Way
```javascript
const { AvalancheData } = require('./avalanche-data-classes.js');
const avalancheData = new AvalancheData();

// Fetch and parse
const response = await fetch('https://static.avalanche.report/bulletins/latest/EUREGIO_en_CAAMLv6.json');
const data = await response.json();
avalancheData.parse(data);

// Get danger level for specific elevation
const danger = avalancheData.getDangerLevel('IT-32-TN-01', 2500);
```

## Benefits of the New Structure

1. **Type Safety** - Strongly-typed classes instead of untyped objects
2. **Encapsulation** - Logic for elevation queries is encapsulated within classes
3. **Maintainability** - Easier to modify and extend functionality
4. **Performance** - Better data indexing and lookup performance
5. **API Consistency** - Consistent method signatures across all classes
6. **Error Handling** - Better error handling and validation
7. **Extensibility** - Easy to add new features and methods

## Browser Usage

For browser usage, include the script tag and access classes from the global scope:

```html

<script src="../avalanche-data-classes.js"></script>
<script>
    const avalancheData = new AvalancheData();
    // ... rest of your code
</script>
```

## Node.js Usage

For Node.js usage, use require:

```javascript
const { AvalancheData, AvalancheRegion, DangerRating } = require('./avalanche-data-classes.js');
```

## Testing

Run the example file to test the new class structure:

```bash
node avalanche-parser-example-with-classes.js
```

Or open `avalanche-parser-example-with-classes.js` in a browser to test the browser version.

