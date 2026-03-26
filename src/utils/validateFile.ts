export type MediaCategory = 'image' | 'video' | 'audio' | 'document';

export function getMediaCategory(mimeType: string): MediaCategory {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
}

export function validateFileType(file: File, globalAllowed: string[], fieldAllowed?: string[]): boolean {
    const allowed = fieldAllowed && fieldAllowed.length > 0 ? fieldAllowed : globalAllowed;
    if (allowed.length === 0) return true;
    return allowed.includes(file.type);
}

export function getMaxSizeForFile(
    file: File,
    maxSizes: Record<MediaCategory, number>,
    fieldMax?: number,
): number {
    if (fieldMax != null && fieldMax > 0) return fieldMax;
    return maxSizes[getMediaCategory(file.type)];
}

export function checkFileSize(
    file: File,
    maxSizes: Record<MediaCategory, number>,
    fieldMax?: number,
): boolean {
    return file.size <= getMaxSizeForFile(file, maxSizes, fieldMax);
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getMaxSizeForCategory(
    category: MediaCategory,
    maxSizes: Record<MediaCategory, number>,
    fieldMax?: number,
): number {
    if (fieldMax != null && fieldMax > 0) return fieldMax;
    return maxSizes[category];
}

export function getAcceptFromAllowedTypes(
    allowedTypes: string[],
    mimePrefix?: string,
): string | undefined {
    if (allowedTypes.length === 0) return undefined;
    if (mimePrefix) {
        const filtered = allowedTypes.filter((t) => t.startsWith(mimePrefix));
        return filtered.length > 0 ? filtered.join(',') : undefined;
    }
    return allowedTypes.join(',');
}
