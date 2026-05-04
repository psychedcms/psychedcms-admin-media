import { useInput, useDataProvider, useTranslate, useNotify } from 'react-admin';
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
    Box,
    Button,
    IconButton,
    Typography,
    CircularProgress,
    Drawer,
    Chip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CollectionsIcon from '@mui/icons-material/Collections';
import StarIcon from '@mui/icons-material/Star';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MediaBrowser } from './MediaBrowser.tsx';
import { FileSizeWarningDialog } from './FileSizeWarningDialog.tsx';
import { useMediaUpload } from '../hooks/useMediaUpload.ts';
import { useUploadConfig } from '../hooks/useUploadConfig.ts';
import type { MediaRecord } from '../hooks/useMediaUpload.ts';
import { validateFileType, checkFileSize, getMaxSizeForFile, getMaxSizeForCategory, formatFileSize } from '../utils/validateFile.ts';
import type { InputResolverProps } from '@psychedcms/admin-core';

type MediaImageListInputProps = Pick<InputResolverProps, 'source' | 'label' | 'required' | 'helperText' | 'meta'> & {
    /** 'compact' (default): small thumbnails + "Manage gallery" button opening a drawer.
     *  'inline': full sortable list rendered directly (for use inside drawers/panels). */
    variant?: 'compact' | 'inline';
};

interface PreviewItem {
    iri: string;
    url?: string;
    thumbnailUrl?: string;
    originalFilename?: string;
}

// ============================================================================
// Sortable item for the drawer list
// ============================================================================

function SortablePhoto({
    item,
    index,
    onRemove,
}: {
    item: PreviewItem;
    index: number;
    onRemove: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.iri });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Box
            ref={setNodeRef}
            style={style}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1,
                borderRadius: 1,
                border: '1px solid',
                borderColor: isDragging ? 'primary.main' : 'divider',
                bgcolor: isDragging ? 'action.hover' : 'background.paper',
                '&:hover': { bgcolor: 'action.hover' },
            }}
        >
            <IconButton
                size="small"
                sx={{ cursor: 'grab', color: 'text.secondary', '&:active': { cursor: 'grabbing' } }}
                {...attributes}
                {...listeners}
            >
                <DragIndicatorIcon fontSize="small" />
            </IconButton>

            <Box
                sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 1,
                    overflow: 'hidden',
                    flexShrink: 0,
                    bgcolor: '#f5f5f5',
                    position: 'relative',
                }}
            >
                <img
                    src={item.thumbnailUrl || item.url || ''}
                    alt={item.originalFilename ?? ''}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {index === 0 && (
                    <StarIcon
                        sx={{
                            position: 'absolute',
                            bottom: 2,
                            left: 2,
                            fontSize: 16,
                            color: '#f59e0b',
                            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))',
                        }}
                    />
                )}
            </Box>

            <Typography
                variant="body2"
                sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
                {item.originalFilename ?? item.iri.split('/').pop()}
            </Typography>

            <IconButton size="small" color="error" onClick={onRemove}>
                <CloseIcon fontSize="small" />
            </IconButton>
        </Box>
    );
}

// ============================================================================
// Main component
// ============================================================================

export function MediaImageListInput({
    source,
    label,
    helperText,
    required,
    meta,
    variant = 'compact',
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

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [browserOpen, setBrowserOpen] = useState(false);
    const [previews, setPreviews] = useState<PreviewItem[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [sizeWarningOpen, setSizeWarningOpen] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<{ valid: File[]; oversized: File[] }>({ valid: [], oversized: [] });

    // field.value may contain:
    // - IRI strings ("/api/media/...") from media picker
    // - Media objects ({url, alt, storagePath, mimeType}) from API read
    const rawItems: unknown[] = Array.isArray(field.value) ? field.value : [];
    const iris: string[] = rawItems.filter((v): v is string => typeof v === 'string');
    const objectItems = useMemo(() => rawItems
        .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null && 'url' in v)
        .map((obj, i) => ({
            iri: (obj.url as string) ?? `object-${i}`,
            url: obj.url as string | undefined,
            thumbnailUrl: obj.url as string | undefined,
            originalFilename: (obj.alt as string) || (obj.storagePath as string)?.split('/').pop() || undefined,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [field.value]);
    const totalCount = iris.length + objectItems.length;
    const maxReached = meta?.max != null && totalCount >= meta.max;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    useEffect(() => {
        if (loaded) return;

        // Object items don't need fetching — set previews directly
        if (iris.length === 0) {
            if (objectItems.length > 0) setPreviews(objectItems);
            setLoaded(true);
            return;
        }

        dataProvider
            .getMany('media', { ids: iris })
            .then(({ data }) => {
                const iriPreviews: PreviewItem[] = iris.map((iri) => {
                    const media = data.find((d: Record<string, unknown>) => d['@id'] === iri || d.id === iri);
                    return {
                        iri,
                        url: media?.url as string | undefined,
                        thumbnailUrl: media?.thumbnailUrl as string | undefined,
                        originalFilename: media?.originalFilename as string | undefined,
                    };
                });
                setPreviews([...objectItems, ...iriPreviews]);
                setLoaded(true);
            })
            .catch(() => {
                setPreviews(objectItems);
                setLoaded(true);
            });
    }, [iris, objectItems, loaded, dataProvider]);

    const updateField = useCallback(
        (newIris: string[], newPreviews: PreviewItem[]) => {
            field.onChange(newIris.length > 0 ? newIris : null);
            setPreviews(newPreviews);
        },
        [field],
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;

            const oldIndex = previews.findIndex((p) => p.iri === active.id);
            const newIndex = previews.findIndex((p) => p.iri === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const newPreviews = arrayMove(previews, oldIndex, newIndex);
            // Rebuild field value from reordered previews
            const newValue = newPreviews.map((p) => {
                // IRI items: return the IRI string
                const iriMatch = iris.find((iri) => iri === p.iri);
                if (iriMatch) return iriMatch;
                // Object items: find matching object in rawItems
                return rawItems.find((raw) =>
                    typeof raw === 'object' && raw !== null && 'url' in raw && (raw as Record<string, unknown>).url === p.url
                ) ?? p.iri;
            });
            field.onChange(newValue.length > 0 ? newValue : null);
            setPreviews(newPreviews);
        },
        [previews, iris, rawItems, field],
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
            const newPreviews = previews.filter((_, i) => i !== index);
            const newRawItems = rawItems.filter((_, i) => i !== index);
            field.onChange(newRawItems.length > 0 ? newRawItems : null);
            setPreviews(newPreviews);
        },
        [iris, previews, updateField],
    );

    // Shared gallery content (used in both drawer and inline modes)
    const galleryContent = (
        <>
            {/* Action buttons */}
            {!maxReached && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                        disabled={uploading}
                        size="small"
                        fullWidth
                    >
                        {translate('psyched.media.upload')}
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
                        fullWidth
                    >
                        {translate('psyched.media.browse')}
                    </Button>
                </Box>
            )}

            {/* Sortable list */}
            {previews.length > 0 ? (
                <>
                    {previews.length > 1 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                            {translate('psyched.media.drag_to_reorder')}
                        </Typography>
                    )}
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={previews.map((p) => p.iri)} strategy={verticalListSortingStrategy}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {previews.map((item, index) => (
                                    <SortablePhoto
                                        key={item.iri}
                                        item={item}
                                        index={index}
                                        onRemove={() => handleRemove(index)}
                                    />
                                ))}
                            </Box>
                        </SortableContext>
                    </DndContext>
                    {previews.length > 1 && (
                        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                            <Typography variant="caption" color="text.secondary">
                                {translate('psyched.media.first_is_cover')}
                            </Typography>
                        </Box>
                    )}
                </>
            ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    {translate('psyched.media.no_images')}
                </Typography>
            )}
        </>
    );

    // Compact inline preview: carousel
    const [carouselIndex, setCarouselIndex] = useState(0);
    const safeIndex = Math.min(carouselIndex, Math.max(0, previews.length - 1));

    return (
        <Box sx={{ mb: 2 }}>
            {variant === 'inline' ? (
                /* ---- Inline: gallery rendered directly ---- */
                <>
                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                        {label ?? source}
                        {required && ' *'}
                        {iris.length > 0 && ` (${iris.length})`}
                    </Typography>
                    {galleryContent}
                </>
            ) : (
                /* ---- Compact: thumbnails + "Manage gallery" button ---- */
                <>
                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                        {label ?? source}
                        {required && ' *'}
                    </Typography>

                    {previews.length > 0 ? (
                        <Box>
                            <Box sx={{ position: 'relative', maxWidth: 400, aspectRatio: '3 / 2', borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider', bgcolor: 'grey.900', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img
                                    src={previews[safeIndex]?.thumbnailUrl || previews[safeIndex]?.url || ''}
                                    alt=""
                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', cursor: 'pointer' }}
                                    onClick={() => setDrawerOpen(true)}
                                />
                                {previews.length > 1 && (
                                    <>
                                        <IconButton
                                            size="small"
                                            disabled={safeIndex === 0}
                                            onClick={() => setCarouselIndex((i) => Math.max(0, i - 1))}
                                            sx={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, '&.Mui-disabled': { opacity: 0.3, color: '#fff' } }}
                                        >
                                            <ChevronLeftIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            disabled={safeIndex >= previews.length - 1}
                                            onClick={() => setCarouselIndex((i) => Math.min(previews.length - 1, i + 1))}
                                            sx={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, '&.Mui-disabled': { opacity: 0.3, color: '#fff' } }}
                                        >
                                            <ChevronRightIcon />
                                        </IconButton>
                                        <Typography
                                            variant="caption"
                                            sx={{ position: 'absolute', bottom: 4, right: 8, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', px: 1, py: 0.25, borderRadius: 1 }}
                                        >
                                            {safeIndex + 1} / {previews.length}
                                        </Typography>
                                    </>
                                )}
                            </Box>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<CollectionsIcon />}
                                onClick={() => setDrawerOpen(true)}
                                sx={{ mt: 1 }}
                            >
                                {translate('psyched.media.manage_gallery')}
                            </Button>
                        </Box>
                    ) : (
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<CollectionsIcon />}
                            onClick={() => setDrawerOpen(true)}
                        >
                            {translate('psyched.media.add_images')}
                        </Button>
                    )}

                    {/* Drawer: full gallery management */}
                    <Drawer
                        anchor="right"
                        open={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                        PaperProps={{ sx: { width: 380, maxWidth: '90vw' } }}
                    >
                        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    {label ?? source}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {iris.length} {iris.length === 1 ? 'image' : 'images'}
                                    {meta?.max != null && ` / ${meta.max} max`}
                                </Typography>
                            </Box>
                            <IconButton onClick={() => setDrawerOpen(false)} size="small">
                                <CloseIcon />
                            </IconButton>
                        </Box>
                        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                            {galleryContent}
                        </Box>
                    </Drawer>
                </>
            )}

            {error && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {error.message}
                </Typography>
            )}
            {helperText && !error && (
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
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
                alreadySelectedIris={iris}
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
