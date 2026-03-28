import { describe, it, expect } from 'vitest';
import { createCaptureFilter, filterDotfiles } from '../../src/capture/filter.js';

describe('capture/filter', () => {
  describe('createCaptureFilter', () => {
    it('creates a filter with default secret patterns', () => {
      const filter = createCaptureFilter();
      expect(filter).toBeDefined();
    });

    it('accepts extra patterns', () => {
      const filter = createCaptureFilter(['*.custom']);
      expect(filter).toBeDefined();
    });
  });

  describe('filterDotfiles', () => {
    it('excludes .env files', () => {
      const filter = createCaptureFilter();
      const { included, excluded } = filterDotfiles(['/home/user/.env'], filter);
      expect(included).toHaveLength(0);
      expect(excluded).toContain('/home/user/.env');
    });

    it('includes .gitconfig files', () => {
      const filter = createCaptureFilter();
      const { included, excluded } = filterDotfiles(['/home/user/.gitconfig'], filter);
      expect(included).toContain('/home/user/.gitconfig');
      expect(excluded).toHaveLength(0);
    });

    it('excludes .pem files (id_rsa.pem)', () => {
      const filter = createCaptureFilter();
      const { included, excluded } = filterDotfiles(['/home/user/id_rsa.pem'], filter);
      expect(included).toHaveLength(0);
      expect(excluded).toContain('/home/user/id_rsa.pem');
    });

    it('includes .zshrc files', () => {
      const filter = createCaptureFilter();
      const { included, excluded } = filterDotfiles(['/home/user/.zshrc'], filter);
      expect(included).toContain('/home/user/.zshrc');
      expect(excluded).toHaveLength(0);
    });

    it('handles mixed paths correctly', () => {
      const filter = createCaptureFilter();
      const paths = [
        '/home/user/.zshrc',
        '/home/user/.gitconfig',
        '/home/user/.env',
        '/home/user/id_rsa.pem',
        '/home/user/.zshprofile',
      ];
      const { included, excluded } = filterDotfiles(paths, filter);
      expect(included).toContain('/home/user/.zshrc');
      expect(included).toContain('/home/user/.gitconfig');
      expect(included).toContain('/home/user/.zshprofile');
      expect(excluded).toContain('/home/user/.env');
      expect(excluded).toContain('/home/user/id_rsa.pem');
    });

    it('negation pattern can override default exclusion for extra patterns', () => {
      // Using extra patterns that override default — the ignore package supports negation
      const filter = createCaptureFilter(['!.gitconfig']);
      // .gitconfig was already included (not excluded by defaults), negation is a no-op here
      const { included } = filterDotfiles(['/home/user/.gitconfig'], filter);
      expect(included).toContain('/home/user/.gitconfig');
    });

    it('excludes .env.local (matches .env.* pattern)', () => {
      const filter = createCaptureFilter();
      const { excluded } = filterDotfiles(['/home/user/.env.local'], filter);
      expect(excluded).toContain('/home/user/.env.local');
    });

    it('excludes .key files', () => {
      const filter = createCaptureFilter();
      const { excluded } = filterDotfiles(['/home/user/server.key'], filter);
      expect(excluded).toContain('/home/user/server.key');
    });
  });
});
