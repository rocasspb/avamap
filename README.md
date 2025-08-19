# Slope Map Generator

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

## How to Use

1. **Open the HTML file**: Simply open `avamap.html` in any modern web browser
2. **Get a MapTiler API key**: Visit [MapTiler.com](https://www.maptiler.com/) to get a free API key
3. **Enter your API key**: Paste the key into the input field and click "Apply Key"
4. **Explore the map**: Pan and zoom to see slope calculations in real-time

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

The application requires a MapTiler API key to access elevation data. You can get a free key by:
1. Going to [MapTiler.com](https://www.maptiler.com/)
2. Creating a free account
3. Generating an API key
4. Using the key in the application

The free tier provides sufficient elevation data for personal use and testing. 