import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  DesignGallery,
  isOwnerDesignImage,
  isOwnerDesignImg,
  isPdfDesignUrl,
  isPdfUrl,
  normalizeImage,
  normalizeImg,
} from '../components/common/DesignGallery';

describe('DesignGallery and Image Utilities', () => {
  describe('normalizeImage / normalizeImg', () => {
    it('normalizes string URL to object with imageUrl property', () => {
      const url = 'https://res.cloudinary.com/fssims/image/upload/v123/sample.jpg';
      const normalized = normalizeImg(url);
      expect(normalized).toEqual({ imageUrl: url });
      expect(normalizeImage(url)).toEqual({ imageUrl: url });
    });

    it('handles image object preserving existing properties', () => {
      const obj = {
        imageId: 12,
        imageUrl: 'https://res.cloudinary.com/sample.png',
        imageType: 'OWNER_DESIGN',
      };
      const normalized = normalizeImg(obj);
      expect(normalized.imageUrl).toBe(obj.imageUrl);
      expect(normalized.imageType).toBe('OWNER_DESIGN');
    });

    it('falls back gracefully on url property if imageUrl is missing', () => {
      const obj = { url: 'https://res.cloudinary.com/sample.png' };
      const normalized = normalizeImg(obj);
      expect(normalized.imageUrl).toBe('https://res.cloudinary.com/sample.png');
    });

    it('handles null, undefined or empty safely', () => {
      expect(normalizeImg(null)).toEqual({ imageUrl: '' });
      expect(normalizeImg(undefined)).toEqual({ imageUrl: '' });
      expect(normalizeImg('')).toEqual({ imageUrl: '' });
    });
  });

  describe('isOwnerDesignImage / isOwnerDesignImg', () => {
    it('identifies owner design by imageType OWNER_DESIGN', () => {
      expect(isOwnerDesignImg({ imageType: 'OWNER_DESIGN' })).toBe(true);
    });

    it('identifies owner design by isOwnerDesign flag', () => {
      expect(isOwnerDesignImg({ isOwnerDesign: true })).toBe(true);
    });

    it('identifies owner design by createdBy string containing OWNER', () => {
      expect(isOwnerDesignImg({ createdBy: 'OWNER_1' })).toBe(true);
    });

    it('identifies owner design by URL containing design_files', () => {
      expect(isOwnerDesignImg({ imageUrl: 'https://cdn.example.com/design_files/1.jpg' })).toBe(true);
      expect(isOwnerDesignImg('https://cdn.example.com/design_files/1.jpg')).toBe(true);
    });

    it('returns false for customer images or empty input', () => {
      expect(isOwnerDesignImg({ imageType: 'CUSTOMER' })).toBe(false);
      expect(isOwnerDesignImg(null)).toBe(false);
      expect(isOwnerDesignImg(undefined)).toBe(false);
    });
  });

  describe('isPdfDesignUrl / isPdfUrl', () => {
    it('detects .pdf URLs and Cloudinary raw uploads', () => {
      expect(isPdfUrl('https://example.com/drawing.pdf')).toBe(true);
      expect(isPdfUrl('https://example.com/drawing.PDF')).toBe(true);
      expect(isPdfUrl('https://res.cloudinary.com/demo/raw/upload/drawing')).toBe(true);
    });

    it('returns false for standard image URLs and non-strings', () => {
      expect(isPdfUrl('https://example.com/photo.jpg')).toBe(false);
      expect(isPdfUrl(null)).toBe(false);
      expect(isPdfUrl('')).toBe(false);
    });
  });

  describe('DesignGallery Component', () => {
    it('renders emptyText when no images are provided', () => {
      render(<DesignGallery images={[]} emptyText="Chưa có bản vẽ nào" emptyClassName="empty-note" />);
      expect(screen.getByText('Chưa có bản vẽ nào')).toBeInTheDocument();
    });

    it('renders image thumbnails with badge', () => {
      const imgs = [
        'https://example.com/img1.jpg',
        { imageUrl: 'https://example.com/img2.jpg', imageId: 99 },
      ];
      render(
        <DesignGallery
          images={imgs}
          badgeText="Bản vẽ"
          badgeClassName="bg-amber-800"
          borderClassName="border-amber-200"
        />
      );
      const badges = screen.getAllByText('Bản vẽ');
      expect(badges).toHaveLength(2);
    });
  });
});
