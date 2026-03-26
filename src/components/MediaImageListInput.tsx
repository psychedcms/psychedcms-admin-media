import { useInput, useDataProvider, useTranslate, useNotify } from 'react-admin';
import { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Button,
    IconButton,
    Typography,
    CircularProgress,
    ImageList,
    ImageListItem,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { MediaBrowser } from './MediaBrowser.tsx';
import { FileSizeWarningDialog } from './FileSizeWarningDialog.tsx';
import { useMediaUpload } from '../hooks/useMediaUpload.ts';
import { useUploadConfig } from '../hooks/useUploadConfig.ts';
import type { MediaRecord } from '../hooks/useMediaUpload.ts';
import { validateFileType, checkFileSize, getMaxSizeForFile, getMaxSizeForCategory, formatFileSize } from '../utils/validateFile.ts';
import type { InputResolverProps } from '@psychedcms/admin-core';

type MediaImageListInputProps = Pick<InputResolverProps, 'source' | 'label' | 'required' | 'helperText' | 'meta'>;

interface PreviewItem {
    iri: string;
    url?: string;
    thumbnailUrl?: string;
    originalFilename?: string;
}

export function MediaImageListInput({
    source,
    label,
    helperText,
    required,
    meta,
}: MediaImageListInputProps) {
    const {
        field,
        fieldState: { error },
    } = useInput({ source });

    const translate = useTranslate();
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const { upload, uploading } = useMediaUpload();
    const uploadConfig = useUploadConfig();

    const [browserOpen, setBrowserOpen] = useState(false);
    const [previews, setPreviews] = useState<PreviewItem[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [sizeWarningOpen, setSizeWarningOpen] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<{ valid: File[]; oversized: File[] }>({ valid: [], oversized: [] });

    const iris: string[] = Array.isArray(field.value) ? field.value : [];
    const maxReached = meta?.max != null && iris.length >= meta.max;

    useEffect(() => {
        if (loaded || iris.length === 0) return;

        dataProvider
            .getMany('media', { ids: iris })
            .then(({ data }) => {
                const items: PreviewItem[] = iris.map((iri) => {
                    const media = data.find((d: Record<string, unknown>) => d['@id'] === iri || d.id === iri);
                    return {
                        iri,
                        url: media?.url as string | undefined,
                        thumbnailUrl: media?.thumbnailUrl as string | undefined,
                        originalFilename: media?.originalFilename as string | undefined,
                    };
                });
                setPreviews(items);
                setLoaded(true);
            })
            .catch(() => {
                setLoaded(true);
            });
    }, [iris, loaded, dataProvider]);

    const updateField = useCallback(
        (newIris: string[], newPreviews: PreviewItem[]) => {
            field.onChange(newIris.length > 0 ? newIris : null);
            setPreviews(newPreviews);
        },
        [field],
    );

    const doUploadFiles = useCallback(
        async (files: File[], sizeOverride = false) => {
            const newIris = [...iris];
            const newPreviews = [...previews];

            for (const file of files) {
                if (meta?.max != null && newIris.length >= meta.max) break;
                try {
                    const media = await upload(file, { sizeOverride });
                    newIris.push(media['@id']);
                    newPreviews.push({
                        iri: media['@id'],
                        url: media.url,
                        thumbnailUrl: media.thumbnailUrl,
                        originalFilename: media.originalFilename,
                    });
                } catch {
                    // Error already notified
                }
            }

            updateField(newIris, newPreviews);
        },
        [iris, previews, upload, updateField, meta?.max],
    );

    const handleUpload = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (!files) return;

            const fileList = Array.from(files);
            const fieldAllowed = meta?.allowedTypes as string[] | undefined;
            const fieldMax = meta?.maxSize as number | undefined;
            const valid: File[] = [];
            const oversized: File[] = [];

            for (const file of fileList) {
                if (!validateFileType(file, uploadConfig.allowedTypes, fieldAllowed)) {
                    notify(translate('psyched.media.file_type_not_allowed'), { type: 'error' });
                    continue;
                }
                if (!checkFileSize(file, uploadConfig.maxSizes, fieldMax)) {
                    oversized.push(file);
                } else {
                    valid.push(file);
                }
            }

            if (valid.length > 0) {
                await doUploadFiles(valid);
            }

            if (oversized.length > 0) {
                setPendingFiles({ valid: [], oversized });
                setSizeWarningOpen(true);
            }
        },
        [uploadConfig, meta, notify, translate, doUploadFiles],
    );

    const handleSizeWarningConfirm = useCallback(() => {
        setSizeWarningOpen(false);
        doUploadFiles(pendingFiles.oversized, true);
        setPendingFiles({ valid: [], oversized: [] });
    }, [pendingFiles, doUploadFiles]);

    const handleSizeWarningCancel = useCallback(() => {
        setSizeWarningOpen(false);
        setPendingFiles({ valid: [], oversized: [] });
    }, []);

    const handleBrowseSelect = useCallback(
        (items: MediaRecord[]) => {
            const newIris = [...iris];
            const newPreviews = [...previews];

            for (const media of items) {
                if (meta?.max != null && newIris.length >= meta.max) break;
                if (newIris.includes(media['@id'])) continue;
                newIris.push(media['@id']);
                newPreviews.push({
                    iri: media['@id'],
                    url: media.url,
                    thumbnailUrl: media.thumbnailUrl,
                    originalFilename: media.originalFilename,
                });
            }

            updateField(newIris, newPreviews);
        },
        [iris, previews, updateField, meta?.max],
    );

    const handleRemove = useCallback(
        (index: number) => {
            const newIris = iris.filter((_, i) => i !== index);
            const newPreviews = previews.filter((_, i) => i !== index);
            updateField(newIris, newPreviews);
        },
        [iris, previews, updateField],
    );

    const handleMove = useCallback(
        (index: number, direction: -1 | 1) => {
            const target = index + direction;
            if (target < 0 || target >= iris.length) return;

            const newIris = [...iris];
            const newPreviews = [...previews];
            [newIris[index], newIris[target]] = [newIris[target], newIris[index]];
            [newPreviews[index], newPreviews[target]] = [newPreviews[target], newPreviews[index]];
            updateField(newIris, newPreviews);
        },
        [iris, previews, updateField],
    );

    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                {label ?? source}
                {required && ' *'}
                {meta?.max != null && ` (${iris.length}/${meta.max})`}
            </Typography>

            {previews.length > 0 && (
                <ImageList cols={4} rowHeight={120} gap={8} sx={{ mb: 1 }}>
                    {previews.map((item, index) => (
                        <ImageListItem
                            key={item.iri}
                            sx={{ position: 'relative', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}
                        >
                            <img
                                src={item.thumbnailUrl || item.url || ''}
                                alt={item.originalFilename ?? ''}
                                style={{ objectFit: 'contain', height: '100%', backgroundColor: '#f5f5f5' }}
                            />
                            <Box sx={{ position: 'absolute', top: 0, right: 0, display: 'flex', bgcolor: 'rgba(255,255,255,0.8)', borderRadius: '0 0 0 4px' }}>
                                {meta?.sortable && (
                                    <>
                                        <IconButton size="small" onClick={() => handleMove(index, -1)} disabled={index === 0}>
                                            <ArrowUpwardIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => handleMove(index, 1)} disabled={index === iris.length - 1}>
                                            <ArrowDownwardIcon fontSize="small" />
                                        </IconButton>
                                    </>
                                )}
                                <IconButton size="small" color="error" onClick={() => handleRemove(index)}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        </ImageListItem>
                    ))}
                </ImageList>
            )}

            {!maxReached && (
                <Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            component="label"
                            startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                            disabled={uploading}
                            size="small"
                        >
                            {translate('psyched.media.add_images')}
                            <input
                                type="file"
                                hidden
                                accept={(meta?.allowedTypes as string[] | undefined)?.join(',') || uploadConfig.allowedTypes.filter((t) => t.startsWith('image/')).join(',') || 'image/*'}
                                multiple
                                onChange={handleUpload}
                            />
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<PhotoLibraryIcon />}
                            onClick={() => setBrowserOpen(true)}
                            size="small"
                        >
                            {translate('psyched.media.browse')}
                        </Button>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {translate('psyched.media.max_size_hint', {
                            size: formatFileSize(getMaxSizeForCategory('image', uploadConfig.maxSizes, meta?.maxSize as number | undefined)),
                        })}
                    </Typography>
                </Box>
            )}

            {error && (
                <Typography variant="caption" color="error">
                    {error.message}
                </Typography>
            )}
            {helperText && !error && (
                <Typography variant="caption" color="textSecondary">
                    {helperText}
                </Typography>
            )}

            <MediaBrowser
                open={browserOpen}
                onClose={() => setBrowserOpen(false)}
                onSelect={() => {}}
                onSelectMultiple={handleBrowseSelect}
                mimeTypeFilter="image/"
                multiSelect
            />

            <FileSizeWarningDialog
                open={sizeWarningOpen}
                files={pendingFiles.oversized.map((f) => ({
                    name: f.name,
                    size: f.size,
                    maxSize: getMaxSizeForFile(f, uploadConfig.maxSizes, meta?.maxSize as number | undefined),
                }))}
                onConfirm={handleSizeWarningConfirm}
                onCancel={handleSizeWarningCancel}
            />
        </Box>
    );
}
