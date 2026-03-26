import { useState, useCallback } from 'react';
import { useNotify } from 'react-admin';
import { usePsychedSchemaContext } from '@psychedcms/admin-core';
import type { MediaRecord } from './useMediaUpload.ts';

export function useMediaReplace() {
    const [replacing, setReplacing] = useState(false);
    const notify = useNotify();
    const { entrypoint } = usePsychedSchemaContext();

    const replace = useCallback(
        async (mediaId: string, file: File, options?: { sizeOverride?: boolean }): Promise<MediaRecord> => {
            setReplacing(true);
            try {
                const token = localStorage.getItem('token');
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(`${entrypoint}/media/${mediaId}/replace`, {
                    method: 'POST',
                    headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        Accept: 'application/ld+json',
                        ...(options?.sizeOverride ? { 'X-Size-Override': 'acknowledged' } : {}),
                    },
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`Replace failed: ${response.statusText}`);
                }

                const media = await response.json();
                notify('psyched.media.upload_success', { type: 'success' });
                return media as MediaRecord;
            } catch (err) {
                notify(
                    `Replace failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
                    { type: 'error' },
                );
                throw err;
            } finally {
                setReplacing(false);
            }
        },
        [notify, entrypoint],
    );

    return { replace, replacing };
}
