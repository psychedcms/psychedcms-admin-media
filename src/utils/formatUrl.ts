export interface CropCoords {
    cropX: number;
    cropY: number;
    cropW: number;
    cropH: number;
}

export interface ImageFieldValue {
    '@id': string;
    formats?: Record<string, CropCoords>;
}

/**
 * Build an imgproxy URL with crop applied.
 * imgproxy URL format: /{processing_options}/{source_url}
 * Crop option: /crop:{width}:{height}:{gravity_x}:{gravity_y}/
 * Resize option: /resize:{type}:{width}:{height}/
 */
export function buildCroppedUrl(
    baseUrl: string,
    crop: CropCoords,
    targetWidth: number,
    targetHeight: number,
): string {
    // If the baseUrl already contains imgproxy processing, insert crop before the source path
    // For simplicity, append crop parameters as query parameters
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}crop=${crop.cropW}:${crop.cropH}:${crop.cropX}:${crop.cropY}&resize=${targetWidth}:${targetHeight}`;
}

/**
 * Parse a field value that may be a simple IRI string or an object with formats.
 */
export function parseImageFieldValue(value: unknown): { iri: string | undefined; formats?: Record<string, CropCoords> } | null {
    if (!value) return null;

    if (typeof value === 'string') {
        return { iri: value };
    }

    if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        const iri = (obj['@id'] as string) || undefined;
        const formats = obj.formats as Record<string, CropCoords> | undefined;
        if (iri || formats) {
            return { iri, formats };
        }
    }

    return null;
}

/**
 * Build a field value from IRI and optional format crops.
 */
export function buildImageFieldValue(
    iri: string,
    formats?: Record<string, CropCoords>,
): string | ImageFieldValue {
    if (!formats || Object.keys(formats).length === 0) {
        return iri;
    }

    return { '@id': iri, formats };
}
