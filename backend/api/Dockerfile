FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN go build -o bin/api main.go

# Final stage
FROM alpine:latest

WORKDIR /app

# Create PocketBase data directory
RUN mkdir -p /data

# Copy the binary from builder
COPY --from=builder /app/bin/api .

# PocketBase HTTP (admin UI + REST API), gRPC-Gateway, gRPC
EXPOSE 8090 8080 50051

ENV POCKETBASE_DATA_DIR=/data

CMD ["./api", "serve", "--http=0.0.0.0:8090"]
