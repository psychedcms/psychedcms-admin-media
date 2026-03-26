import { useInput, useDataProvider, useTranslate, useNotify } from 'react-admin';
import { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Button,
    TextField,
    IconButton,
    Card,
    CardContent,
    CardActions,
    Typography,
    CircularProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { MediaBrowser } from './MediaBrowser.tsx';
import { FileSizeWarningDialog } from './FileSizeWarningDialog.tsx';
import { useMediaUpload } from '../hooks/useMediaUpload.ts';
import { useUploadConfig } from '../hooks/useUploadConfig.ts';
import type { MediaRecord } from '../hooks/useMediaUpload.ts';
import { validateFileType, checkFileSize, getMaxSizeForFile, getMaxSizeForCategory, formatFileSize as formatSize } from '../utils/validateFile.ts';
import type { InputResolverProps } from '@psychedcms/admin-core';

type MediaFileInputProps = Pick<InputResolverProps, 'source' | 'label' | 'required' | 'helperText' | 'meta'>;

function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    return formatSize(bytes);
}

export function MediaFileInput({
    source,
    label,
    helperText,
    required,
    meta,
}: MediaFileInputProps) {
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
    const [sizeWarningOpen, setSizeWarningOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<{
        originalFilename?: string;
        mimeType?: string;
        size?: number;
        title?: string;
        description?: string;
    } | null>(null);

    useEffect(() => {
        if (preview) return;

        const value = field.value;
        if (!value) return;

        if (typeof value === 'object' && value['@id']) {
            setPreview({
                originalFilename: value.originalFilename,
                mimeType: value.mimeType,
                size: value.size,
                title: value.title,
                description: value.description,
            });
            return;
        }

        if (typeof value === 'string' && value.startsWith('/api/media/')) {
            dataProvider
                .getOne('media', { id: value })
                .then(({ data }) => {
                    setPreview({
                        originalFilename: data.originalFilename,
                        mimeType: data.mimeType,
                        size: data.size,
                        title: data.title,
                        description: data.description,
                    });
                })
                .catch(() => {});
        }
    }, [field.value, preview, dataProvider]);

    const doUpload = useCallback(
        async (file: File, sizeOverride = false) => {
            try {
                const media = await upload(file, { sizeOverride });
                field.onChange(media['@id']);
                setPreview({
                    originalFilename: media.originalFilename,
                    mimeType: media.mimeType,
                    size: media.size,
                    title: media.title,
                    description: media.description,
                });
            } catch {
                // Error already notified
            }
        },
        [field, upload],
    );

    const handleUpload = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const fieldAllowed = meta?.allowedTypes as string[] | undefined;
            if (!validateFileType(file, uploadConfig.allowedTypes, fieldAllowed)) {
                notify(translate('psyched.media.file_type_not_allowed'), { type: 'error' });
                return;
            }

            const fieldMax = meta?.maxSize as number | undefined;
            if (!checkFileSize(file, uploadConfig.maxSizes, fieldMax)) {
                setPendingFile(file);
                setSizeWarningOpen(true);
                return;
            }

            await doUpload(file);
        },
        [upload, uploadConfig, meta, notify, translate, doUpload],
    );

    const handleSizeWarningConfirm = useCallback(() => {
        setSizeWarningOpen(false);
        if (pendingFile) {
            doUpload(pendingFile, true);
            setPendingFile(null);
        }
    }, [pendingFile, doUpload]);

    const handleSizeWarningCancel = useCallback(() => {
        setSizeWarningOpen(false);
        setPendingFile(null);
    }, []);

    const handleBrowseSelect = useCallback(
        (media: MediaRecord) => {
            field.onChange(media['@id']);
            setPreview({
                originalFilename: media.originalFilename,
                mimeType: media.mimeType,
                size: media.size,
                title: media.title,
                description: media.description,
            });
            setBrowserOpen(false);
        },
        [field],
    );

    const handleRemove = useCallback(() => {
        field.onChange(null);
        setPreview(null);
    }, [field]);

    const handleMetadataChange = useCallback(
        async (fieldName: 'title' | 'description', value: string) => {
            setPreview((prev) => (prev ? { ...prev, [fieldName]: value } : null));

            if (field.value) {
                try {
                    const iri = typeof field.value === 'string' ? field.value : field.value['@id'];
                    const id = iri?.split('/').pop();
                    await dataProvider.update('media', {
                        id: iri,
                        data: { [fieldName]: value },
                        previousData: { id },
                    });
                } catch {
                    // Silent fail
                }
            }
        },
        [field.value, dataProvider],
    );

    const hasValue = field.value != null && field.value !== '';
    const accept = meta?.allowedTypes?.join(',');

    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                {label ?? source}
                {required && ' *'}
            </Typography>

            {hasValue && preview ? (
                <Card variant="outlined" sx={{ maxWidth: 400 }}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
                        <InsertDriveFileIcon sx={{ fontSize: 40, color: 'grey.500' }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap>
                                {preview.originalFilename ?? 'Unknown file'}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                {[preview.mimeType, formatFileSize(preview.size)].filter(Boolean).join(' — ')}
                            </Typography>
                        </Box>
                    </CardContent>
                    <Box sx={{ px: 2, pb: 1 }}>
                        <TextField
                            size="small"
                            fullWidth
                            label={translate('psyched.media.title')}
                            value={preview.title ?? ''}
                            onChange={(e) => handleMetadataChange('title', e.target.value)}
                            variant="outlined"
                            sx={{ mb: 1 }}
                        />
                        <TextField
                            size="small"
                            fullWidth
                            label={translate('psyched.media.description')}
                            value={preview.description ?? ''}
                            onChange={(e) => handleMetadataChange('description', e.target.value)}
                            variant="outlined"
                            multiline
                            minRows={2}
                        />
                    </Box>
                    <CardActions>
                        <Button
                            size="small"
                            startIcon={<FolderOpenIcon />}
                            onClick={() => setBrowserOpen(true)}
                        >
                            {translate('psyched.media.replace')}
                        </Button>
                        <IconButton size="small" color="error" onClick={handleRemove}>
                            <DeleteIcon />
                        </IconButton>
                    </CardActions>
                </Card>
            ) : (
                <Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            component="label"
                            startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                            disabled={uploading}
                        >
                            {translate('psyched.media.upload')}
                            <input
                                type="file"
                                hidden
                                accept={accept}
                                onChange={handleUpload}
                            />
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<FolderOpenIcon />}
                            onClick={() => setBrowserOpen(true)}
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
                onSelect={handleBrowseSelect}
            />

            <FileSizeWarningDialog
                open={sizeWarningOpen}
                files={pendingFile ? [{
                    name: pendingFile.name,
                    size: pendingFile.size,
                    maxSize: getMaxSizeForFile(pendingFile, uploadConfig.maxSizes, meta?.maxSize as number | undefined),
                }] : []}
                onConfirm={handleSizeWarningConfirm}
                onCancel={handleSizeWarningCancel}
            />
        </Box>
    );
}
