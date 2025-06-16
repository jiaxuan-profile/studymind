// src/utils/hashUtils.ts

import { createHash } from 'crypto';

// Function to generate a SHA-256 hash of the content
export function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
