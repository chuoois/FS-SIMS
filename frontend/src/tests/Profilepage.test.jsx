import { describe, it, expect } from 'vitest';
import { validateAvatarFile } from '../pages/public-pages/Profilepage';

describe('validateAvatarFile', () => {
  it('chấp nhận JPG hoặc PNG không vượt quá 2MB', () => {
    expect(validateAvatarFile({ type: 'image/jpeg', size: 2 * 1024 * 1024 })).toBe('');
    expect(validateAvatarFile({ type: 'image/png', size: 1024 })).toBe('');
  });

  it('từ chối định dạng khác JPG và PNG', () => {
    expect(validateAvatarFile({ type: 'image/webp', size: 1024 })).toBe('Chỉ hỗ trợ định dạng JPG hoặc PNG.');
  });

  it('từ chối ảnh vượt quá 2MB', () => {
    expect(validateAvatarFile({ type: 'image/png', size: 2 * 1024 * 1024 + 1 })).toBe('Ảnh tối đa 2MB.');
  });
});
