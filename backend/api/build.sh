#!/bin/bash
set -e

# Set version tag using date and time
VERSION=$(date '+%Y%m%d_%H%M%S')

# Generate proto files using buf
echo "Generating proto files..."
buf generate

# Build the Go binary
echo "Building Go binary..."
go build -o bin/api main.go

# Build Docker image
echo "Building Docker image..."
docker build -t informed-citizenry-api .

# Tag the image for your registry with specific version
echo "Tagging Docker image with version: $VERSION"
docker tag informed-citizenry-api docker.mau.guru/informed-citizenry-api:$VERSION

# Push the image to the registry
echo "Pushing Docker image..."
docker push docker.mau.guru/informed-citizenry-api:$VERSION

echo "Build and push completed successfully! Version: $VERSION" 