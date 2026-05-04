import { useState, useCallback } from 'react';
import { useNotify } from 'react-admin';
import { usePsychedSchemaContext } from '@psychedcms/admin-core';

export interface MediaRecord {
    '@id': string;
    id: string;
    url: string;
    thumbnailUrl?: string;
    altText?: string;
    credits?: string;
    title?: string;
    description?: string;
    originalFilename?: string;
    mimeType?: string;
    size?: number;
}

export function useMediaUpload() {
    const [uploading, setUploading] = useState(false);
    const notify = useNotify();
    const { entrypoint } = usePsychedSchemaContext();

    const upload = useCallback(
        async (file: File, options?: { storage?: string; directory?: string; sizeOverride?: boolean }): Promise<MediaRecord> => {
            setUploading(true);
            try {
                const token = localStorage.getItem('token');
                const formData = new FormData();
                formData.append('file', file);
                if (options?.storage) {
                    formData.append('storage', options.storage);
                }
                if (options?.directory) {
                    formData.append('directory', options.directory);
                }

                const response = await fetch(`${entrypoint}/media`, {
                    method: 'POST',
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        Accept: 'application/ld+json',
                        ...(options?.sizeOverride ? { 'X-Size-Override': 'acknowledged' } : {}),
                    },
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`Upload failed: ${response.statusText}`);
                }

                const media = await response.json();
                notify('psyched.media.upload_success', { type: 'success' });
                return media as MediaRecord;
            } catch (err) {
                notify(
                    `Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
                    { type: 'error' },
                );
                throw err;
            } finally {
                setUploading(false);
            }
        },
        [notify, entrypoint],
    );

    return { upload, uploading };
}
