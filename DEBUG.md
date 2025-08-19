# Debugging Guide for Slope Map Generator

## Debug Features Added

The application now includes comprehensive debugging capabilities:

### 1. Debug Panel (Always Visible)
- **Status**: Shows current operation status
- **API Key**: Displays if API key is set
- **Map Center**: Shows current map coordinates
- **Zoom Level**: Displays current zoom level
- **Toggle Button**: Enable/disable debug logging

### 2. Console Logging
- All debug messages are prefixed with `[DEBUG]`
- Detailed information about tile loading, processing, and errors
- API key validation feedback

## Common Issues and Solutions

### Issue: "Could not load elevation tile"
**Symptoms**: Red error messages in console, no slope overlay
**Causes**:
- Invalid or missing MapTiler API key
- Network connectivity issues
- API key quota exceeded

**Solutions**:
1. Verify your MapTiler API key is correct
2. Check if you have internet connection
3. Visit [MapTiler.com](https://www.maptiler.com/) to verify your account status
4. Try refreshing the page

### Issue: Map loads but no slope colors appear
**Symptoms**: Base map visible, but no colored slope overlay
**Causes**:
- API key not set
- Slope calculation errors
- Browser compatibility issues

**Solutions**:
1. Ensure you've entered and applied your API key
2. Check browser console for JavaScript errors
3. Try a different browser (Chrome/Firefox recommended)
4. Verify the debug panel shows "API Key: Set"

### Issue: Performance issues or slow loading
**Symptoms**: Slow tile loading, laggy map interaction
**Causes**:
- Complex terrain calculations
- Large map area
- Browser performance limitations

**Solutions**:
1. Zoom in to smaller areas for faster processing
2. Close other browser tabs
3. Check if hardware acceleration is enabled
4. Use a more powerful device

## Debug Console Commands

You can also debug directly in the browser console:

```javascript
// Check if map is initialized
console.log(map);

// Check if slope layer exists
console.log(slopeLayer);

// Check API key
console.log(MAPI_KEY);

// Force debug mode on/off
DEBUG_MODE = true;  // or false

// Manually trigger slope layer
initializeSlopeLayer();
```

## Browser Developer Tools

### Chrome/Edge
- Press `F12` or `Ctrl+Shift+I`
- Go to Console tab for debug messages
- Go to Network tab to see API requests
- Go to Sources tab to set breakpoints

### Firefox
- Press `F12` or `Ctrl+Shift+I`
- Console tab shows debug output
- Network tab shows tile requests
- Debugger tab for step-by-step debugging

### Safari
- Enable Developer menu in Preferences → Advanced
- Press `Cmd+Option+I`
- Console tab for messages
- Network tab for requests

## Performance Monitoring

The debug panel shows real-time information:
- **Status**: Current operation (loading, processing, error)
- **Map Center**: Helps track where you're viewing
- **Zoom Level**: Affects tile resolution and processing time

## Getting Help

If you're still having issues:
1. Check the browser console for error messages
2. Verify your MapTiler API key is valid
3. Try in a different browser
4. Check the debug panel status
5. Look for network errors in the Network tab 