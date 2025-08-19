# Avalanche Map Generator

A web-based tool that generates slope maps by analyzing elevation data and calculating terrain steepness in real-time.

## Features

- Interactive map visualization using Leaflet
- Real-time slope calculation based on elevation data
- Color-coded slope representation:
  - Green (0-10°): Flat terrain
  - Light Green (10-20°): Moderate slopes
  - Yellow (20-30°): Steep terrain
  - Orange (30-45°): Very steep terrain
  - Red (>45°): Extreme slopes
- Adjustable overlay opacity
- Responsive design with Tailwind CSS

## Configuration

This project uses an external configuration file to manage API keys and settings. The actual configuration file (`config.js`) is excluded from git to keep your API keys private.

### Setup Instructions

1. **Copy the template configuration file:**
   ```bash
   cp config.template.js config.js
   ```

2. **Edit `config.js` and add your MapTiler API key:**
   ```javascript
   MAPTILER_API_KEY: 'YOUR_ACTUAL_API_KEY_HERE'
   ```

3. **Get a free API key from [MapTiler.com](https://maptiler.com)**

### Configuration Options

The configuration file includes:
- **API Keys**: MapTiler API key for terrain data
- **Map Settings**: Default center coordinates and zoom level
- **Terrain Settings**: Zoom level limits for terrain data
- **Thresholds**: Elevation and slope thresholds for coloring
- **Display Settings**: Default opacity and tile sizes

### Security Note

- `config.js` is excluded from git (see `.gitignore`)
- `config.template.js` is included as a reference
- Never commit your actual API keys to version control

## How to Use

1. **Setup configuration**: Copy and configure `config.template.js` as described above
2. **Open the HTML file**: Simply open `avamap.html` in any modern web browser
3. **Explore the map**: Pan and zoom to see slope calculations in real-time

## Technical Details

- **Frontend**: Pure HTML, CSS, and JavaScript
- **Mapping**: Leaflet.js for interactive maps
- **Styling**: Tailwind CSS for modern UI
- **Elevation Data**: MapTiler Terrain-RGB tiles
- **Slope Calculation**: Real-time pixel analysis of elevation data

## Requirements

- Modern web browser with JavaScript enabled
- Internet connection for loading map tiles and elevation data
- MapTiler API key (free tier available)

## Launch

Simply open `avamap.html` in your web browser. No server setup required - this is a client-side application.

## API Key

The application requires a MapTiler API key to access elevation data. This is now configured in the `config.js` file. You can get a free key by:
1. Going to [MapTiler.com](https://www.maptiler.com/)
2. Creating a free account
3. Generating an API key
4. Adding the key to your `config.js` file

The free tier provides sufficient elevation data for personal use and testing. 