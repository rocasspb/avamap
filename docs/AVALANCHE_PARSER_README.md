# 🚨 Avalanche Bulletin Parser

A comprehensive JavaScript library for parsing and analyzing avalanche bulletin data from the EUREGIO avalanche reporting service. This parser transforms raw CAAML v6 JSON data into a structured, queryable format with powerful analysis capabilities.

## 🌍 Data Source

The parser works with data from the [EUREGIO Avalanche Report](https://static.avalanche.report/bulletins/latest/EUREGIO_en_CAAMLv6.json), which provides avalanche bulletins for the European Alps region, covering areas in Italy, Austria, and other Alpine countries.

## ✨ Features

- **📡 Live Data Fetching**: Fetch latest bulletins directly from the EUREGIO API
- **🔍 Advanced Queries**: Search bulletins by region, danger level, problem type, and text content
- **📊 Statistical Analysis**: Comprehensive statistics and data summaries
- **🗺️ Region Management**: Organized region indexing with country-based grouping
- **⏰ Time-based Analysis**: Publication and validity time tracking
- **🏔️ Problem Classification**: Avalanche problem type analysis and categorization
- **💾 Data Export**: Export parsed data to JSON format
- **🌐 Cross-platform**: Works in both Node.js and browser environments

## 📦 Installation

### Browser Usage

Include the parser script directly in your HTML:

```html

<script src="../avalanche-bulletin-parser.js"></script>
```

### Node.js Usage

```bash
# Copy the parser file to your project
cp avalanche-bulletin-parser.js ./your-project/
```

Then import it:

```javascript
const AvalancheBulletinParser = require('./avalanche-bulletin-parser.js');
```

## 🚀 Quick Start

### Basic Usage

```javascript
// Create a new parser instance
const parser = new AvalancheBulletinParser();

// Fetch and parse data from the EUREGIO API
async function getAvalancheData() {
    try {
        const data = await parser.fetchAndParse();
        console.log(`Loaded ${data.summary.totalBulletins} bulletins`);
        console.log(`Covering ${data.summary.totalRegions} regions`);
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}
```

### Parse Local Data

```javascript
// If you have local JSON data
const localData = {
    bulletins: [/* your bulletin data */]
};

const parsedData = parser.parse(localData);
```

## 🔧 API Reference

### Constructor

```javascript
const parser = new AvalancheBulletinParser();
```

### Core Methods

#### `fetchAndParse(url?)`
Fetches and parses data from the EUREGIO API.

- **Parameters**: `url` (optional) - Custom URL to fetch from
- **Returns**: Promise that resolves to parsed data object
- **Default URL**: `https://static.avalanche.report/bulletins/latest/EUREGIO_en_CAAMLv6.json`

```javascript
const data = await parser.fetchAndParse();
```

#### `parse(data)`
Parses local JSON data into structured format.

- **Parameters**: `data` - Raw JSON data object
- **Returns**: Parsed data object with summary and metadata

```javascript
const parsedData = parser.parse(myJsonData);
```

### Query Methods

#### `getBulletinsByRegion(regionId)`
Get all bulletins for a specific region.

```javascript
const regionBulletins = parser.getBulletinsByRegion('IT-32-TN-01');
```

#### `getBulletinsByDangerLevel(dangerLevel)`
Get bulletins with a specific danger level.

```javascript
const moderateBulletins = parser.getBulletinsByDangerLevel('moderate');
```

#### `getBulletinsByProblemType(problemType)`
Get bulletins with a specific avalanche problem type.

```javascript
const wetSnowBulletins = parser.getBulletinsByProblemType('wet_snow');
```

#### `getRegionsByCountry(countryCode)`
Get all regions in a specific country.

```javascript
const italianRegions = parser.getRegionsByCountry('IT');
const austrianRegions = parser.getRegionsByCountry('AT');
```

#### `getCurrentDangerLevel(regionId)`
Get the current danger level for a specific region.

```javascript
const dangerLevel = parser.getCurrentDangerLevel('IT-32-TN-01');
// Returns: 'moderate', 'low', 'considerable', etc.
```

#### `getRegionsByDangerLevel(dangerLevel)`
Get all regions with a specific danger level.

```javascript
const moderateDangerRegions = parser.getRegionsByDangerLevel('moderate');
```

#### `searchBulletins(searchTerm)`
Search bulletins by text content.

```javascript
const wetSnowResults = parser.searchBulletins('wet snow');
const windSlabResults = parser.searchBulletins('wind slab');
```

#### `getElevationDangerRatings(regionId)`
Get elevation-based danger ratings for a region.

```javascript
const elevationRatings = parser.getElevationDangerRatings('IT-32-TN-01');
```

### Analysis Methods

#### `getStatistics()`
Get comprehensive statistical information.

```javascript
const stats = parser.getStatistics();
console.log(`Average problems per bulletin: ${stats.averageProblemsPerBulletin}`);
console.log(`Country distribution:`, stats.countryDistribution);
```

#### `exportToJSON()`
Export parsed data to JSON string.

```javascript
const jsonData = parser.exportToJSON();
// Save to file or send to server
```

## 📊 Data Structure

### Parsed Data Object

```javascript
{
    bulletins: [...],           // Array of bulletin objects
    regions: Map,               // Map of regionID -> region data
    summary: {                  // Summary statistics
        totalBulletins: 15,
        totalRegions: 45,
        dangerLevels: { low: 8, moderate: 5, considerable: 2 },
        problemTypes: { wet_snow: 12, wind_slab: 3 },
        countries: ['IT', 'AT'],
        publicationTime: '2025-04-30T15:00:00Z',
        validTime: { startTime: '...', endTime: '...' }
    },
    metadata: {                 // Metadata information
        languages: ['en'],
        customDataSources: ['ALBINA', 'LWD_Tyrol'],
        tendencyTypes: ['steady', 'decreasing']
    }
}
```

### Region Object

```javascript
{
    name: 'Southern Adamello',
    regionID: 'IT-32-TN-02',
    bulletins: ['bulletin-id-1', 'bulletin-id-2'],
    currentDanger: 'moderate',
    problems: [/* avalanche problem objects */]
}
```

### Bulletin Object

```javascript
{
    bulletinID: 'c174da4d-f507-45b3-bb6d-aebf4d69eb50',
    publicationTime: '2025-04-30T15:00:00Z',
    validTime: { startTime: '...', endTime: '...' },
    regions: [/* region objects */],
    dangerRatings: [/* danger rating objects */],
    avalancheProblems: [/* problem objects */],
    avalancheActivity: { highlights: '...', comment: '...' },
    snowpackStructure: { comment: '...' },
    tendency: [/* tendency objects */],
    customData: { /* custom data */ }
}
```

## 🎯 Use Cases

### 1. Safety Applications
- Real-time avalanche danger monitoring
- Region-specific risk assessment
- Historical trend analysis

### 2. Tourism & Recreation
- Ski resort safety information
- Backcountry touring planning
- Mountain guide services

### 3. Research & Analysis
- Avalanche pattern studies
- Climate impact research
- Regional comparison studies

### 4. Emergency Services
- Risk assessment for rescue operations
- Public safety communications
- Emergency planning

## 🌐 Browser Demo

Open `avalanche-parser-demo.html` in your browser to see a live demonstration of the parser's capabilities. The demo includes:

- Live data fetching from the EUREGIO API
- Interactive statistics display
- Region search and filtering
- Data export functionality
- Beautiful, responsive UI

## 🔒 Error Handling

The parser includes comprehensive error handling:

```javascript
try {
    const data = await parser.fetchAndParse();
    // Process data
} catch (error) {
    if (error.message.includes('HTTP error')) {
        console.error('Network error - check your connection');
    } else if (error.message.includes('Invalid data format')) {
        console.error('Data format error - check the source');
    } else {
        console.error('Unexpected error:', error.message);
    }
}
```

## 📝 Examples

### Complete Working Example

```javascript
async function analyzeAvalancheData() {
    const parser = new AvalancheBulletinParser();
    
    try {
        // Fetch latest data
        const data = await parser.fetchAndParse();
        
        // Get summary
        console.log(`Loaded ${data.summary.totalBulletins} bulletins`);
        
        // Find high-risk regions
        const highDangerRegions = parser.getRegionsByDangerLevel('high');
        console.log(`High danger regions: ${highDangerRegions.length}`);
        
        // Search for specific conditions
        const wetSnowBulletins = parser.searchBulletins('wet snow');
        console.log(`Wet snow conditions mentioned in ${wetSnowBulletins.length} bulletins`);
        
        // Get country-specific data
        const italianRegions = parser.getRegionsByCountry('IT');
        console.log(`Italian regions covered: ${italianRegions.length}`);
        
        // Export for further analysis
        const jsonExport = parser.exportToJSON();
        console.log(`Exported ${(jsonExport.length / 1024).toFixed(2)} KB of data`);
        
    } catch (error) {
        console.error('Analysis failed:', error.message);
    }
}
```

### Node.js File Processing

```javascript
const fs = require('fs');
const AvalancheBulletinParser = require('./avalanche-bulletin-parser.js');

async function processLocalFile() {
    const parser = new AvalancheBulletinParser();
    
    try {
        // Read local file
        const data = fs.readFileSync('./data/EUREGIO_en_CAAMLv6.json', 'utf8');
        const jsonData = JSON.parse(data);
        
        // Parse with the parser
        const parsedData = parser.parse(jsonData);
        
        // Generate report
        const stats = parser.getStatistics();
        console.log('Avalanche Bulletin Report:');
        console.log(`- Total Bulletins: ${stats.totalBulletins}`);
        console.log(`- Total Regions: ${stats.totalRegions}`);
        console.log(`- Countries: ${parsedData.summary.countries.join(', ')}`);
        
        // Save processed data
        const processedData = parser.exportToJSON();
        fs.writeFileSync('./processed-avalanche-data.json', processedData);
        
    } catch (error) {
        console.error('File processing failed:', error.message);
    }
}
```

## 🤝 Contributing

This parser is designed to be extensible. You can:

1. Add new query methods for specific use cases
2. Implement additional data validation
3. Add support for other CAAML versions
4. Create visualization components
5. Add caching mechanisms for better performance

## 📄 License

This project is open source and available under the MIT License.

## 🔗 Links

- [EUREGIO Avalanche Report](https://static.avalanche.report/bulletins/latest/EUREGIO_en_CAAMLv6.json)
- [CAAML (Canadian Avalanche Association Markup Language)](https://caaml.org/)
- [Avalanche Safety Information](https://www.avalanche.org/)

## 🆘 Support

For issues, questions, or contributions:

1. Check the examples and documentation
2. Review the error handling section
3. Test with the provided demo HTML file
4. Ensure your data source is accessible

---

**⚠️ Safety Notice**: This parser is a tool for data analysis and should not be used as the sole source for avalanche safety decisions. Always consult official avalanche services and exercise proper judgment when in avalanche terrain.
