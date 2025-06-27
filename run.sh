#!/bin/bash

echo "Starting Factory Management System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed"
  echo "Please install Node.js from https://nodejs.org/"
  read -p "Press Enter to exit..."
  exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo "Error: npm is not installed"
  echo "Please install Node.js from https://nodejs.org/"
  read -p "Press Enter to exit..."
  exit 1
fi

# Check if the application is built
if [ ! -f "dist/index.html" ]; then
  echo "Building application..."
  npm run build
  if [ $? -ne 0 ]; then
    echo "Error: Failed to build application"
    read -p "Press Enter to exit..."
    exit 1
  fi
fi

# Start the server
echo "Starting server..."
npm run server &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Open browser
echo "Opening browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  xdg-open http://localhost:3000 &> /dev/null || sensible-browser http://localhost:3000 &> /dev/null || x-www-browser http://localhost:3000 &> /dev/null || gnome-open http://localhost:3000 &> /dev/null
else
  # Windows with WSL or other
  start http://localhost:3000 &> /dev/null || echo "Please open http://localhost:3000 in your browser"
fi

echo "Factory Management System started successfully!"
echo "Default login credentials:"
echo "Username: admin"
echo "Password: admin123"
echo ""
echo "Press Ctrl+C to stop the server when done"

# Wait for server process
wait $SERVER_PID