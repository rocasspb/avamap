#!/bin/bash

# Launch the Slope Map Generator in the default browser
echo "Launching Slope Map Generator..."

# Check if we're on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    open avamap.html
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open avamap.html
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    start avamap.html
else
    echo "Please open avamap.html in your web browser manually."
    echo "File location: $(pwd)/avamap.html"
fi

echo "If the browser didn't open automatically, please open avamap.html manually." 