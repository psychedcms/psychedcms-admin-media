import { useState, useEffect } from 'react';
import { usePsychedSchemaContext } from '@psychedcms/admin-core';

export interface UploadConfig {
    allowedTypes: string[];
    maxSizes: { image: number; video: number; audio: number; document: number };
}

const defaultConfig: UploadConfig = {
    allowedTypes: [],
    maxSizes: { image: 10485760, video: 209715200, audio: 52428800, document: 20971520 },
};

let cachedConfig: UploadConfig | null = null;
let fetchPromise: Promise<UploadConfig> | null = null;

export function useUploadConfig(): UploadConfig {
    const { entrypoint } = usePsychedSchemaContext();
    const [config, setConfig] = useState<UploadConfig>(cachedConfig ?? defaultConfig);

    useEffect(() => {
        if (cachedConfig) return;

        if (!fetchPromise) {
            const token = localStorage.getItem('token');
            fetchPromise = fetch(`${entrypoint}/media/config`, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    Accept: 'application/json',
                },
            })
                .then((res) => (res.ok ? res.json() : defaultConfig))
                .then((data: UploadConfig) => {
                    cachedConfig = data;
                    return data;
                })
                .catch(() => defaultConfig);
        }

        fetchPromise.then((data) => setConfig(data));
    }, [entrypoint]);

    return config;
}
