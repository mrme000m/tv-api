#!/bin/bash

# Setup script for TradingView API Client using mise and pnpm

echo "Setting up TradingView API Client with mise and pnpm..."

# Check if mise is installed
if ! command -v mise &> /dev/null; then
    echo "mise is not installed. Installing mise..."
    curl https://mise.run | sh
    # Reload shell configuration
    export PATH="$HOME/.local/bin:$PATH"
fi

echo "Installing Node.js and pnpm versions specified in .tool-versions..."
mise install

echo "Installing project dependencies with pnpm..."
pnpm install

echo "Setup complete! You can now run:"
echo "  pnpm test          # Run tests"
echo "  pnpm example       # Run examples"
echo "  pnpm example:dev   # Run examples in development mode"