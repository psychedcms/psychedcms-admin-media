import { useInput, useDataProvider, useTranslate, useNotify } from 'react-admin';
import { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Button,
    TextField,
    IconButton,
    Card,
    CardMedia,
    CardActions,
    Typography,
    CircularProgress,
    Dialog,
    DialogContent,
    Divider,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import DeleteIcon from '@mui/icons-material/Delete';
import CropIcon from '@mui/icons-material/Crop';
import EditIcon from '@mui/icons-material/Edit';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { MediaBrowser } from './MediaBrowser.tsx';
import { MediaFormatCropper } from './MediaFormatCropper.tsx';
import { FormatPreviewTabs } from './FormatPreviewTabs.tsx';
import { MediaImageEditorDialog } from './MediaImageEditorDialog.tsx';
import { FileSizeWarningDialog } from './FileSizeWarningDialog.tsx';
import { useMediaUpload } from '../hooks/useMediaUpload.ts';
import { useUploadConfig } from '../hooks/useUploadConfig.ts';
import type { MediaRecord } from '../hooks/useMediaUpload.ts';
import { parseImageFieldValue, buildImageFieldValue } from '../utils/formatUrl.ts';
import type { CropCoords } from '../utils/formatUrl.ts';
import { validateFileType, checkFileSize, getMaxSizeForFile, getMaxSizeForCategory, formatFileSize } from '../utils/validateFile.ts';
import type { InputResolverProps } from '@psychedcms/admin-core';

type MediaImageInputProps = Pick<InputResolverProps, 'source' | 'label' | 'required' | 'helperText' | 'meta'>;

export function MediaImageInput({
    source,
    label,
    helperText,
    required,
    meta,
}: MediaImageInputProps) {
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
    const [cropperOpen, setCropperOpen] = useState(false);
    const [cropInitialStep, setCropInitialStep] = useState(0);
    const [editorOpen, setEditorOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [sizeWarningOpen, setSizeWarningOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [cropFormats, setCropFormats] = useState<Record<string, CropCoords> | undefined>();
    const [preview, setPreview] = useState<{
        url?: string;
        thumbnailUrl?: string;
        altText?: string;
        originalFilename?: string;
    } | null>(null);

    const dimensions = meta?.dimensions as Record<string, [number, number]> | undefined;
    const hasDimensions = dimensions && Object.keys(dimensions).length > 0;
    const fieldStorage = meta?.storage as string | undefined;
    const fieldDirectory = meta?.directory as string | undefined;

    // Parse current field value
    const parsed = parseImageFieldValue(field.value);

    // Sync cropFormats from parsed value when loading existing data
    useEffect(() => {
        if (parsed?.formats && !cropFormats) {
            setCropFormats(parsed.formats);
        }
    }, [parsed?.formats, cropFormats]);

    useEffect(() => {
        if (preview) return;

        const value = field.value;
        if (!value) return;

        // Handle object form
        if (typeof value === 'object' && (value['@id'] || value.url)) {
            const iri = value['@id'] || '';
            if (value.url) {
                setPreview({
                    url: value.url,
                    thumbnailUrl: value.thumbnailUrl,
                    altText: value.altText,
                    originalFilename: value.originalFilename,
                });
                return;
            }
            // Fetch media data from IRI
            if (iri.startsWith('/api/media/')) {
                dataProvider
                    .getOne('media', { id: iri })
                    .then(({ data }) => {
                        setPreview({
                            url: data.url,
                            thumbnailUrl: data.thumbnailUrl,
                            altText: data.altText,
                            originalFilename: data.originalFilename,
                        });
                    })
                    .catch(() => {});
            }
            return;
        }

        if (typeof value === 'string' && value.startsWith('/api/media/')) {
            dataProvider
                .getOne('media', { id: value })
                .then(({ data }) => {
                    setPreview({
                        url: data.url,
                        thumbnailUrl: data.thumbnailUrl,
                        altText: data.altText,
                        originalFilename: data.originalFilename,
                    });
                })
                .catch(() => {});
        }
    }, [field.value, preview, dataProvider]);

    const doUpload = useCallback(
        async (file: File, sizeOverride = false) => {
            try {
                const media = await upload(file, { storage: fieldStorage, directory: fieldDirectory, sizeOverride });
                setPreview({
                    url: media.url,
                    thumbnailUrl: media.thumbnailUrl,
                    altText: media.altText,
                    originalFilename: media.originalFilename,
                });

                if (hasDimensions) {
                    field.onChange(media['@id']);
                    setCropperOpen(true);
                } else {
                    field.onChange(media['@id']);
                }
            } catch {
                // Error already notified
            }
        },
        [field, upload, hasDimensions, fieldStorage, fieldDirectory],
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
            setPreview({
                url: media.url,
                thumbnailUrl: media.thumbnailUrl,
                altText: media.altText,
                originalFilename: media.originalFilename,
            });
            setBrowserOpen(false);

            if (hasDimensions) {
                field.onChange(media['@id']);
                setCropperOpen(true);
            } else {
                field.onChange(media['@id']);
            }
        },
        [field, hasDimensions],
    );

    const handleCropComplete = useCallback(
        (formats: Record<string, CropCoords>) => {
            const iri = parsed?.iri || (typeof field.value === 'string' ? field.value : field.value?.['@id']);
            if (iri) {
                field.onChange(buildImageFieldValue(iri, formats));
            } else if (typeof field.value === 'object' && field.value != null) {
                field.onChange({ ...field.value, formats });
            }
            setCropFormats(formats);
        },
        [field, parsed],
    );

    const handleRemove = useCallback(() => {
        field.onChange(null);
        setPreview(null);
        setCropFormats(undefined);
    }, [field]);

    const hasValue = field.value != null && field.value !== '';
    const fieldAllowedTypes = meta?.allowedTypes as string[] | undefined;
    const acceptAttr = fieldAllowedTypes?.length
        ? fieldAllowedTypes.join(',')
        : uploadConfig.allowedTypes.filter((t) => t.startsWith('image/')).join(',') || 'image/*';

    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                {label ?? source}
                {required && ' *'}
            </Typography>

            {hasValue && preview ? (
                <Card variant="outlined" sx={{ maxWidth: 400 }}>
                    {/* Compact header: thumbnail + filename + info */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
                        <Box
                            component="img"
                            src={preview.thumbnailUrl || preview.url}
                            alt={preview.altText ?? ''}
                            sx={{ width: 40, height: 40, borderRadius: 0.5, objectFit: 'cover', flexShrink: 0, cursor: 'pointer' }}
                            onClick={() => setDetailOpen(true)}
                        />
                        <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>
                            {preview.originalFilename || translate('psyched.media.details')}
                        </Typography>
                        <IconButton size="small" onClick={() => setDetailOpen(true)} title={translate('psyched.media.details')}>
                            <InfoOutlinedIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    {/* Format previews */}
                    {hasDimensions && preview?.url && (
                        <FormatPreviewTabs
                            dimensions={dimensions!}
                            formats={cropFormats ?? parsed?.formats}
                            imageUrl={preview.url}
                            onRecropFormat={(step) => {
                                setCropInitialStep(step);
                                setCropperOpen(true);
                            }}
                        />
                    )}

                    <Box sx={{ px: 1, pb: 1 }}>
                        <TextField
                            size="small"
                            fullWidth
                            label={translate('psyched.media.alt_text')}
                            placeholder={preview.altText || ''}
                            value={
                                (typeof field.value === 'object' && field.value?.alt) || ''
                            }
                            onChange={(e) => {
                                const newAlt = e.target.value;
                                if (typeof field.value === 'object' && field.value != null) {
                                    field.onChange({ ...field.value, alt: newAlt || undefined });
                                }
                            }}
                            variant="outlined"
                        />
                    </Box>

                    <CardActions>
                        <Button
                            size="small"
                            startIcon={<PhotoLibraryIcon />}
                            onClick={() => setBrowserOpen(true)}
                        >
                            {translate('psyched.media.replace')}
                        </Button>
                        {hasDimensions && (
                            <Button
                                size="small"
                                startIcon={<CropIcon />}
                                onClick={() => {
                                    setCropInitialStep(0);
                                    setCropperOpen(true);
                                }}
                            >
                                {translate('psyched.media.recrop')}
                            </Button>
                        )}
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
                                accept={acceptAttr}
                                onChange={handleUpload}
                            />
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<PhotoLibraryIcon />}
                            onClick={() => setBrowserOpen(true)}
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
                onSelect={handleBrowseSelect}
                mimeTypeFilter="image/"
                storage={fieldStorage}
                directory={fieldDirectory}
            />

            {hasDimensions && preview?.url && (
                <MediaFormatCropper
                    open={cropperOpen}
                    onClose={() => setCropperOpen(false)}
                    imageUrl={preview.url}
                    dimensions={dimensions!}
                    existingFormats={parsed?.formats}
                    onComplete={handleCropComplete}
                    initialStep={cropInitialStep}
                />
            )}

            {preview?.url && parsed?.iri && (
                <MediaImageEditorDialog
                    open={editorOpen}
                    onClose={() => setEditorOpen(false)}
                    mediaId={parsed.iri.split('/').pop() || ''}
                    imageUrl={preview.url}
                    originalFilename={preview.originalFilename}
                />
            )}

            {/* Media detail dialog */}
            {preview && (
                <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="xs" fullWidth>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, pt: 1.5 }}>
                        <Typography variant="subtitle2">{translate('psyched.media.details')}</Typography>
                        <IconButton size="small" onClick={() => setDetailOpen(false)}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>
                    <DialogContent sx={{ pt: 1 }}>
                        <Box sx={{ borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover', mb: 1.5 }}>
                            <CardMedia
                                component="img"
                                image={preview.url}
                                alt={preview.altText ?? ''}
                                sx={{ maxHeight: 300, objectFit: 'contain' }}
                            />
                        </Box>
                        {preview.originalFilename && (
                            <Typography variant="subtitle2" noWrap sx={{ mb: 0.25 }}>
                                {preview.originalFilename}
                            </Typography>
                        )}
                        {preview.url && parsed?.iri && (
                            <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                size="small"
                                onClick={() => { setDetailOpen(false); setEditorOpen(true); }}
                                fullWidth
                                sx={{ my: 1.5 }}
                            >
                                {translate('psyched.media.edit_image')}
                            </Button>
                        )}
                        <Divider sx={{ mb: 1.5 }} />
                        <Typography variant="caption" color="textSecondary">
                            {translate('psyched.media.alt_text')}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            {preview.altText || '—'}
                        </Typography>
                    </DialogContent>
                </Dialog>
            )}

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
