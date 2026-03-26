import { useState, useCallback, useRef } from 'react';
import { usePsychedSchemaContext } from '@psychedcms/admin-core';
import type { MediaRecord } from './useMediaUpload.ts';

export interface UploadProgress {
    file: File;
    status: 'pending' | 'uploading' | 'done' | 'error';
    progress: number;
    media?: MediaRecord;
    error?: string;
}

export interface UseMultiUploadReturn {
    uploads: UploadProgress[];
    addFiles: (files: File[]) => void;
    isUploading: boolean;
    totalProgress: number;
    clearCompleted: () => void;
}

const MAX_CONCURRENT = 3;

export function useMultiUpload(options?: { sizeOverride?: boolean }): UseMultiUploadReturn {
    const [uploads, setUploads] = useState<UploadProgress[]>([]);
    const { entrypoint } = usePsychedSchemaContext();
    const activeCount = useRef(0);
    const queueRef = useRef<UploadProgress[]>([]);

    const processQueue = useCallback(() => {
        while (activeCount.current < MAX_CONCURRENT && queueRef.current.length > 0) {
            const entry = queueRef.current.shift();
            if (!entry) break;

            activeCount.current += 1;

            const updateEntry = (patch: Partial<UploadProgress>) => {
                setUploads((prev) =>
                    prev.map((u) => (u.file === entry.file ? { ...u, ...patch } : u)),
                );
            };

            updateEntry({ status: 'uploading' });

            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', entry.file);

            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    updateEntry({ progress });
                }
            });

            xhr.addEventListener('load', () => {
                activeCount.current -= 1;
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const media = JSON.parse(xhr.responseText) as MediaRecord;
                        updateEntry({ status: 'done', progress: 100, media });
                    } catch {
                        updateEntry({ status: 'error', error: 'Failed to parse response' });
                    }
                } else {
                    updateEntry({ status: 'error', error: `Upload failed: ${xhr.statusText}` });
                }
                processQueue();
            });

            xhr.addEventListener('error', () => {
                activeCount.current -= 1;
                updateEntry({ status: 'error', error: 'Network error' });
                processQueue();
            });

            xhr.addEventListener('abort', () => {
                activeCount.current -= 1;
                updateEntry({ status: 'error', error: 'Upload aborted' });
                processQueue();
            });

            xhr.open('POST', `${entrypoint}/media`);
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            xhr.setRequestHeader('Accept', 'application/ld+json');
            if (options?.sizeOverride) {
                xhr.setRequestHeader('X-Size-Override', 'acknowledged');
            }
            xhr.send(formData);
        }
    }, [entrypoint]);

    const addFiles = useCallback(
        (files: File[]) => {
            const newEntries: UploadProgress[] = files.map((file) => ({
                file,
                status: 'pending' as const,
                progress: 0,
            }));

            setUploads((prev) => [...prev, ...newEntries]);
            queueRef.current.push(...newEntries);
            processQueue();
        },
        [processQueue],
    );

    const clearCompleted = useCallback(() => {
        setUploads((prev) => prev.filter((u) => u.status !== 'done' && u.status !== 'error'));
    }, []);

    const isUploading = uploads.some((u) => u.status === 'uploading' || u.status === 'pending');

    const totalProgress =
        uploads.length === 0
            ? 0
            : Math.round(uploads.reduce((sum, u) => sum + u.progress, 0) / uploads.length);

    return { uploads, addFiles, isUploading, totalProgress, clearCompleted };
}
