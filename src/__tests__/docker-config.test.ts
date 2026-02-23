import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Docker Configuration', () => {
  const projectRoot = process.cwd();

  describe('Dockerfile', () => {
    it('should exist', () => {
      const dockerfilePath = path.join(projectRoot, 'Dockerfile');
      expect(fs.existsSync(dockerfilePath)).toBe(true);
    });

    it('should use node:20-alpine as base image', () => {
      const dockerfilePath = path.join(projectRoot, 'Dockerfile');
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('node:20-alpine');
    });

    it('should have a multi-stage build with deps, builder, and runner stages', () => {
      const dockerfilePath = path.join(projectRoot, 'Dockerfile');
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('AS deps');
      expect(content).toContain('AS builder');
      expect(content).toContain('AS runner');
    });

    it('should set NEXT_TELEMETRY_DISABLED=1', () => {
      const dockerfilePath = path.join(projectRoot, 'Dockerfile');
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('NEXT_TELEMETRY_DISABLED=1');
    });

    it('should expose port 3000', () => {
      const dockerfilePath = path.join(projectRoot, 'Dockerfile');
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('EXPOSE 3000');
    });

    it('should copy standalone output', () => {
      const dockerfilePath = path.join(projectRoot, 'Dockerfile');
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('.next/standalone');
    });

    it('should run as non-root user', () => {
      const dockerfilePath = path.join(projectRoot, 'Dockerfile');
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toContain('USER nextjs');
      expect(content).toContain('adduser');
    });
  });

  describe('docker-compose.yml', () => {
    it('should exist', () => {
      const composePath = path.join(projectRoot, 'docker-compose.yml');
      expect(fs.existsSync(composePath)).toBe(true);
    });

    it('should reference the correct Dockerfile', () => {
      const composePath = path.join(projectRoot, 'docker-compose.yml');
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toContain('dockerfile: Dockerfile');
    });

    it('should map port 3000', () => {
      const composePath = path.join(projectRoot, 'docker-compose.yml');
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toContain('"3000:3000"');
    });

    it('should use .env.local for environment variables', () => {
      const composePath = path.join(projectRoot, 'docker-compose.yml');
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toContain('.env.local');
    });

    it('should have restart policy', () => {
      const composePath = path.join(projectRoot, 'docker-compose.yml');
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toContain('restart:');
    });
  });

  describe('.env.example', () => {
    it('should exist', () => {
      const envExamplePath = path.join(projectRoot, '.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);
    });

    it('should contain all required environment variables', () => {
      const envExamplePath = path.join(projectRoot, '.env.example');
      const content = fs.readFileSync(envExamplePath, 'utf-8');
      
      // Core required variables
      expect(content).toContain('DATABASE_URL');
      expect(content).toContain('AUTH_SECRET');
      expect(content).toContain('NEXT_PUBLIC_APP_URL');
    });

    it('should have documentation for each variable', () => {
      const envExamplePath = path.join(projectRoot, '.env.example');
      const content = fs.readFileSync(envExamplePath, 'utf-8');
      
      // Check for comments explaining variables
      const lines = content.split('\n');
      const commentLines = lines.filter(line => line.startsWith('#'));
      expect(commentLines.length).toBeGreaterThan(0);
    });
  });

  describe('.dockerignore', () => {
    it('should exist', () => {
      const dockerignorePath = path.join(projectRoot, '.dockerignore');
      expect(fs.existsSync(dockerignorePath)).toBe(true);
    });

    it('should ignore node_modules', () => {
      const dockerignorePath = path.join(projectRoot, '.dockerignore');
      const content = fs.readFileSync(dockerignorePath, 'utf-8');
      expect(content).toContain('node_modules');
    });

    it('should ignore .next directory', () => {
      const dockerignorePath = path.join(projectRoot, '.dockerignore');
      const content = fs.readFileSync(dockerignorePath, 'utf-8');
      expect(content).toContain('.next');
    });
  });

  describe('next.config.ts', () => {
    it('should have output set to standalone', () => {
      const nextConfigPath = path.join(projectRoot, 'next.config.ts');
      expect(fs.existsSync(nextConfigPath)).toBe(true);
      
      const content = fs.readFileSync(nextConfigPath, 'utf-8');
      expect(content).toContain('output: "standalone"');
    });
  });
});
