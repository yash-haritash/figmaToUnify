

# Run figma.js to fetch Figma data
node figma.js

# Check if figma.json was created successfully
if [ -f "figma.json" ]; then
  echo "figma.json created successfully, running conversion..."
  # Run index.js to convert figma.json to unify.json
  node index.js
else
  echo "Error: figma.json was not created."
  exit 1
fi