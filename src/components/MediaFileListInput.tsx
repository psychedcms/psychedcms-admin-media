import { useInput, useDataProvider, useTranslate, useNotify } from 'react-admin';
import { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Button,
    IconButton,
    Typography,
    CircularProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { MediaBrowser } from './MediaBrowser.tsx';
import { FileSizeWarningDialog } from './FileSizeWarningDialog.tsx';
import { useMediaUpload } from '../hooks/useMediaUpload.ts';
import { useUploadConfig } from '../hooks/useUploadConfig.ts';
import type { MediaRecord } from '../hooks/useMediaUpload.ts';
import { validateFileType, checkFileSize, getMaxSizeForFile, getMaxSizeForCategory, formatFileSize as formatSize } from '../utils/validateFile.ts';
import type { InputResolverProps } from '@psychedcms/admin-core';

type MediaFileListInputProps = Pick<InputResolverProps, 'source' | 'label' | 'required' | 'helperText' | 'meta'>;

interface PreviewItem {
    iri: string;
    originalFilename?: string;
    mimeType?: string;
    size?: number;
}

function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    return formatSize(bytes);
}

export function MediaFileListInput({
    source,
    label,
    helperText,
    required,
    meta,
}: MediaFileListInputProps) {
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
                        originalFilename: media?.originalFilename as string | undefined,
                        mimeType: media?.mimeType as string | undefined,
                        size: media?.size as number | undefined,
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
                        originalFilename: media.originalFilename,
                        mimeType: media.mimeType,
                        size: media.size,
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
                    originalFilename: media.originalFilename,
                    mimeType: media.mimeType,
                    size: media.size,
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
                <List dense sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                    {previews.map((item, index) => (
                        <ListItem
                            key={item.iri}
                            secondaryAction={
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                            }
                        >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                                <InsertDriveFileIcon />
                            </ListItemIcon>
                            <ListItemText
                                primary={item.originalFilename ?? 'Unknown file'}
                                secondary={[item.mimeType, formatFileSize(item.size)].filter(Boolean).join(' — ')}
                            />
                        </ListItem>
                    ))}
                </List>
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
                            {translate('psyched.media.add_files')}
                            <input
                                type="file"
                                hidden
                                multiple
                                accept={(meta?.allowedTypes as string[] | undefined)?.join(',') || uploadConfig.allowedTypes.join(',') || undefined}
                                onChange={handleUpload}
                            />
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<FolderOpenIcon />}
                            onClick={() => setBrowserOpen(true)}
                            size="small"
                        >
                            {translate('psyched.media.browse')}
                        </Button>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {translate('psyched.media.max_size_hint', {
                            size: formatSize(getMaxSizeForCategory('document', uploadConfig.maxSizes, meta?.maxSize as number | undefined)),
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
