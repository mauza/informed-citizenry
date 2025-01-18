#!/bin/bash
set -e

# Change to the app directory
cd "$(dirname "$0")"

# Set version tag using date and time
VERSION=$(date '+%Y%m%d_%H%M%S')

# Build the Flutter web app
echo "Building Flutter web app..."
flutter build web --release

# Build the Docker image
echo "Building Docker image..."
docker build -t informed-citizenry-web .

# Tag the image for your registry with specific version
echo "Tagging Docker image with version: $VERSION"
docker tag informed-citizenry-web docker.mau.guru/informed-citizenry-web:$VERSION

# Push the image to the registry
echo "Pushing Docker image..."
docker push docker.mau.guru/informed-citizenry-web:$VERSION

echo "Build and push completed successfully! Version: $VERSION"
