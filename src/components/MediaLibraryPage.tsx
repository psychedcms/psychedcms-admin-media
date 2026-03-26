/**
 * MediaLibraryPage — Main media management interface.
 *
 * Layout:
 * - Title (bold, from PageHeader)
 * - Action bar: count + storage + upload (right-aligned)
 * - Two columns: main panel (filters + grid) | right sidebar (categories)
 */
import { useGetList, useUpdate, useDelete, useNotify, useRefresh, useTranslate } from 'react-admin';
import { useState, useCallback, useMemo } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    ImageList,
    ImageListItem,
    ImageListItemBar,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemButton,
    ToggleButtonGroup,
    ToggleButton,
    Pagination,
    CircularProgress,
    CardMedia,
    IconButton,
    Checkbox,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Collapse,
    Chip,
    InputAdornment,
    Paper,
    Divider,
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import { PageHeader } from '@psychedcms/admin-core';
import { useMediaUpload } from '../hooks/useMediaUpload.ts';
import { useUploadConfig } from '../hooks/useUploadConfig.ts';
import { validateFileType, checkFileSize, getMaxSizeForFile } from '../utils/validateFile.ts';
import { FileSizeWarningDialog } from './FileSizeWarningDialog.tsx';
import { MediaCategorySidebar } from './MediaCategorySidebar.tsx';
import { MediaCategoryDialog } from './MediaCategoryDialog.tsx';
import { MediaCategoryChip } from './MediaCategoryChip.tsx';
import { MediaImageEditorDialog } from './MediaImageEditorDialog.tsx';
import { MediaBulkActions } from './MediaBulkActions.tsx';
import { MediaBulkMetadataDialog } from './MediaBulkMetadataDialog.tsx';
import { MediaDropZone } from './MediaDropZone.tsx';
import { MediaStorageDashboard } from './MediaStorageDashboard.tsx';
import { MediaExifPanel } from './MediaExifPanel.tsx';

const PER_PAGE = 24;
const RIGHT_SIDEBAR_WIDTH = 220;
const DETAIL_WIDTH = 320;
const GRID_THUMB_HEIGHT = 160;
const GRID_COLS = 4;

function formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibraryPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [mimeFilter, setMimeFilter] = useState('');
    const [sortField, setSortField] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [imageEditorOpen, setImageEditorOpen] = useState(false);
    const [bulkMetadataOpen, setBulkMetadataOpen] = useState(false);
    const [showMoreFilters, setShowMoreFilters] = useState(false);
    const [dashboardCollapsed, setDashboardCollapsed] = useState(true);

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sizeMin, setSizeMin] = useState('');
    const [sizeMax, setSizeMax] = useState('');

    const { upload, uploading } = useMediaUpload();
    const uploadConfig = useUploadConfig();
    const notify = useNotify();
    const refresh = useRefresh();
    const t = useTranslate();
    const [updateOne] = useUpdate();
    const [deleteOne] = useDelete();

    const [sizeWarningOpen, setSizeWarningOpen] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);

    const filter: Record<string, any> = {};
    if (search) filter.originalFilename = search;
    if (mimeFilter) filter.mimeType = mimeFilter;
    if (dateFrom) filter['createdAt[after]'] = dateFrom;
    if (dateTo) filter['createdAt[before]'] = dateTo;
    if (sizeMin) filter['size[gte]'] = parseInt(sizeMin) * 1024;
    if (sizeMax) filter['size[lte]'] = parseInt(sizeMax) * 1024;

    const { data, total, isLoading } = useGetList('media', {
        pagination: { page, perPage: PER_PAGE },
        sort: { field: sortField, order: sortOrder },
        filter,
    });

    const totalPages = total ? Math.ceil(total / PER_PAGE) : 0;
    const selectedMedia = data?.find((m) => String(m.id) === String(selectedId));

    const doUploadFiles = useCallback(async (files: File[], sizeOverride = false) => {
        for (const file of files) { try { await upload(file, { sizeOverride }); } catch { /* */ } }
        refresh();
    }, [upload, refresh]);

    const processFiles = useCallback((fileList: File[]) => {
        const valid: File[] = [];
        const oversized: File[] = [];

        for (const file of fileList) {
            if (!validateFileType(file, uploadConfig.allowedTypes)) {
                notify(t('psyched.media.file_type_not_allowed'), { type: 'error' });
                continue;
            }
            if (!checkFileSize(file, uploadConfig.maxSizes)) {
                oversized.push(file);
            } else {
                valid.push(file);
            }
        }

        if (valid.length > 0) {
            doUploadFiles(valid);
        }

        if (oversized.length > 0) {
            setPendingFiles(oversized);
            setSizeWarningOpen(true);
        }
    }, [uploadConfig, notify, t, doUploadFiles]);

    const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;
        processFiles(Array.from(files));
    }, [processFiles]);

    const handleFilesDropped = useCallback(async (files: File[]) => {
        processFiles(files);
    }, [processFiles]);

    const handleSizeWarningConfirm = useCallback(() => {
        setSizeWarningOpen(false);
        doUploadFiles(pendingFiles, true);
        setPendingFiles([]);
    }, [pendingFiles, doUploadFiles]);

    const handleSizeWarningCancel = useCallback(() => {
        setSizeWarningOpen(false);
        setPendingFiles([]);
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        try {
            await deleteOne('media', { id, previousData: { id } });
            notify('Deleted', { type: 'success' });
            if (selectedId === id) setSelectedId(null);
            refresh();
        } catch { notify('Delete failed', { type: 'error' }); }
    }, [deleteOne, notify, refresh, selectedId]);

    const handleMetadataUpdate = useCallback(async (fieldName: string, value: string) => {
        if (!selectedId) return;
        try { await updateOne('media', { id: selectedId, data: { [fieldName]: value }, previousData: selectedMedia }); }
        catch { /* */ }
    }, [selectedId, selectedMedia, updateOne]);

    const toggleChecked = useCallback((id: string) => {
        setCheckedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    }, []);

    const isImage = (mimeType?: string) => mimeType?.startsWith('image/');
    const hasActiveFilters = !!(dateFrom || dateTo || sizeMin || sizeMax);
    const clearFilters = useCallback(() => {
        setSearch(''); setMimeFilter(''); setDateFrom(''); setDateTo('');
        setSizeMin(''); setSizeMax(''); setSelectedCategoryId(null); setPage(1);
    }, []);
    const checkedIdsArray = useMemo(() => Array.from(checkedIds), [checkedIds]);

    return (
        <MediaDropZone onFilesDropped={handleFilesDropped}>
            {/* Title */}
            <PageHeader title={t('psyched.media.library_title')} />

            {/* Two columns: main panel | right sidebar */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>

                {/* ── Main panel ── */}
                <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: 2 }}>

                    {/* Action bar: count + storage + upload */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        {total !== undefined && (
                            <Chip
                                label={t('psyched.media.files_count', { count: total })}
                                size="small"
                                variant="outlined"
                                onClick={() => setDashboardCollapsed((p) => !p)}
                                sx={{ cursor: 'pointer' }}
                            />
                        )}
                        <Button variant="contained" component="label"
                            startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <CloudUploadIcon />}
                            disabled={uploading}>
                            {t('psyched.media.upload')}
                            <input type="file" hidden multiple onChange={handleUpload} />
                        </Button>
                    </Box>
                    <MediaStorageDashboard collapsed={dashboardCollapsed}
                        onToggle={() => setDashboardCollapsed((p) => !p)} />

                    {/* Filters row */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
                        <TextField placeholder={t('psyched.media.search_placeholder')} value={search} hiddenLabel variant="filled"
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            sx={{ width: 220 }}
                            slotProps={{ input: { startAdornment: (
                                <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'action.active' }} /></InputAdornment>
                            ) } }}
                        />
                        <FormControl sx={{ width: 120 }}>
                            <InputLabel>{t('psyched.media.type')}</InputLabel>
                            <Select value={mimeFilter} label={t('psyched.media.type')}
                                onChange={(e) => { setMimeFilter(e.target.value); setPage(1); }}>
                                <MenuItem value="">{t('psyched.media.filter_all')}</MenuItem>
                                <MenuItem value="image/">{t('psyched.media.filter_images')}</MenuItem>
                                <MenuItem value="application/pdf">{t('psyched.media.filter_pdf')}</MenuItem>
                                <MenuItem value="audio/">{t('psyched.media.filter_audio')}</MenuItem>
                                <MenuItem value="video/">{t('psyched.media.filter_video')}</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl sx={{ width: 120 }}>
                            <InputLabel>{t('ra.action.sort')}</InputLabel>
                            <Select value={`${sortField}:${sortOrder}`} label={t('ra.action.sort')}
                                onChange={(e) => { const [f,o] = e.target.value.split(':'); setSortField(f); setSortOrder(o as 'ASC'|'DESC'); setPage(1); }}>
                                <MenuItem value="createdAt:DESC">{t('psyched.media.sort_newest')}</MenuItem>
                                <MenuItem value="createdAt:ASC">{t('psyched.media.sort_oldest')}</MenuItem>
                                <MenuItem value="originalFilename:ASC">{t('psyched.media.sort_name_asc')}</MenuItem>
                                <MenuItem value="originalFilename:DESC">{t('psyched.media.sort_name_desc')}</MenuItem>
                                <MenuItem value="size:DESC">{t('psyched.media.sort_size_desc')}</MenuItem>
                                <MenuItem value="size:ASC">{t('psyched.media.sort_size_asc')}</MenuItem>
                            </Select>
                        </FormControl>
                        <Box sx={{ flex: 1 }} />
                        <IconButton onClick={() => setShowMoreFilters((p) => !p)}
                            color={hasActiveFilters ? 'primary' : 'default'}>
                            <FilterListIcon fontSize="small" />
                        </IconButton>
                        <ToggleButtonGroup value={viewMode} exclusive size="small"
                            onChange={(_, v) => v && setViewMode(v)}>
                            <ToggleButton value="grid"><ViewModuleIcon fontSize="small" /></ToggleButton>
                            <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    {/* Advanced filters */}
                    <Collapse in={showMoreFilters}>
                        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
                            <TextField type="date" label={t('psyched.media.date_from')} value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                                slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150 }} />
                            <TextField type="date" label={t('psyched.media.date_to')} value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                                slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150 }} />
                            <TextField type="number" label={t('psyched.media.size_min')} value={sizeMin}
                                onChange={(e) => { setSizeMin(e.target.value); setPage(1); }} sx={{ width: 130 }} />
                            <TextField type="number" label={t('psyched.media.size_max')} value={sizeMax}
                                onChange={(e) => { setSizeMax(e.target.value); setPage(1); }} sx={{ width: 130 }} />
                            {hasActiveFilters && <Button size="small" onClick={clearFilters}>{t('psyched.media.clear_filters')}</Button>}
                        </Box>
                    </Collapse>
                    {hasActiveFilters && (
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
                            {dateFrom && <Chip size="small" label={`From: ${dateFrom}`} onDelete={() => setDateFrom('')} />}
                            {dateTo && <Chip size="small" label={`To: ${dateTo}`} onDelete={() => setDateTo('')} />}
                            {sizeMin && <Chip size="small" label={`>${sizeMin}KB`} onDelete={() => setSizeMin('')} />}
                            {sizeMax && <Chip size="small" label={`<${sizeMax}KB`} onDelete={() => setSizeMax('')} />}
                        </Box>
                    )}

                    {/* Bulk actions */}
                    {checkedIds.size > 0 && (
                        <Box sx={{ mb: 1.5 }}>
                            <MediaBulkActions selectedIds={checkedIdsArray}
                                onClearSelection={() => setCheckedIds(new Set())} onRefresh={refresh} />
                        </Box>
                    )}

                    {/* Media grid / list — dashed border as drop hint */}
                    <Box sx={{
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1.5,
                        minHeight: 200,
                    }}>
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : !data || data.length === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
                            <CloudUploadIcon sx={{ fontSize: 40, color: 'action.active', mb: 1.5 }} />
                            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>{t('psyched.media.drag_drop_upload')}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, textAlign: 'center' }}>
                                {t('psyched.media.no_media')}
                            </Typography>
                            <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
                                {t('psyched.media.browse')}
                                <input type="file" hidden multiple onChange={handleUpload} />
                            </Button>
                        </Box>
                    ) : viewMode === 'grid' ? (
                        <ImageList cols={GRID_COLS} rowHeight={GRID_THUMB_HEIGHT} gap={12} sx={{ m: 0 }}>
                            {data.map((media) => (
                                <ImageListItem key={media.id} sx={{
                                    cursor: 'pointer', borderRadius: 1, overflow: 'hidden', position: 'relative',
                                    outline: selectedId === media.id ? 2 : 0, outlineColor: 'primary.main', outlineStyle: 'solid',
                                    transition: 'box-shadow 0.15s', boxShadow: 1, '&:hover': { boxShadow: 3 },
                                }} onClick={() => setSelectedId(media.id)}>
                                    <Checkbox checked={checkedIds.has(media.id)}
                                        onChange={() => toggleChecked(media.id)} onClick={(e) => e.stopPropagation()}
                                        sx={{ position: 'absolute', top: 4, left: 4, zIndex: 1, bgcolor: 'rgba(0,0,0,0.4)',
                                            borderRadius: 0.5, p: 0.25, color: 'white', '&.Mui-checked': { color: 'primary.light' } }}
                                        size="small" />
                                    {isImage(media.mimeType) ? (
                                        <img src={media.thumbnailUrl || media.url}
                                            alt={media.altText ?? media.originalFilename ?? ''}
                                            style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                                    ) : (
                                        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
                                            <InsertDriveFileIcon sx={{ fontSize: 36, color: 'action.active' }} />
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                                {media.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}
                                            </Typography>
                                        </Box>
                                    )}
                                    <ImageListItemBar title={media.originalFilename} subtitle={formatFileSize(media.size)}
                                        sx={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                                            '& .MuiImageListItemBar-title': { fontSize: '0.75rem', lineHeight: 1.3 },
                                            '& .MuiImageListItemBar-subtitle': { fontSize: '0.6875rem' } }} />
                                </ImageListItem>
                            ))}
                        </ImageList>
                    ) : (
                        <List disablePadding>
                            {data.map((media) => (
                                <ListItem key={media.id} disablePadding sx={{ mb: 0.5 }}>
                                    <Checkbox checked={checkedIds.has(media.id)}
                                        onChange={() => toggleChecked(media.id)} size="small" sx={{ mx: 0.5 }} />
                                    <ListItemButton selected={selectedId === media.id}
                                        onClick={() => setSelectedId(media.id)} sx={{ py: 0.75 }}>
                                        <ListItemIcon sx={{ minWidth: 48 }}>
                                            {isImage(media.mimeType) ? (
                                                <Box component="img" src={media.thumbnailUrl || media.url} alt=""
                                                    sx={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 0.5 }} />
                                            ) : <InsertDriveFileIcon />}
                                        </ListItemIcon>
                                        <ListItemText primary={media.originalFilename}
                                            secondary={`${media.mimeType} — ${formatFileSize(media.size)}`} />
                                        {media.categories?.length > 0 && (
                                            <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                                                {media.categories.map((cat: any) => (
                                                    <MediaCategoryChip key={cat.slug || cat['@id']}
                                                        name={cat.name} color={cat.color} size="small" />
                                                ))}
                                            </Box>
                                        )}
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}

                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
                        </Box>
                    )}
                    </Box>{/* end dropzone area */}
                </Paper>

                {/* ── Right sidebar: categories + detail ── */}
                <Box sx={{ width: RIGHT_SIDEBAR_WIDTH, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>

                    {/* Categories */}
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('psyched.media.categories')}</Typography>
                        <MediaCategorySidebar
                            selectedCategoryId={selectedCategoryId}
                            onSelectCategory={(id) => { setSelectedCategoryId(id); setPage(1); }}
                            onManageCategories={() => { setEditingCategory(null); setCategoryDialogOpen(true); }}
                        />
                    </Paper>

                    {/* Detail panel (when media selected) */}
                    {selectedMedia && (
                        <Paper variant="outlined">
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, pb: 0 }}>
                                <Typography variant="subtitle2" sx={{ pl: 1 }}>{t('psyched.media.details')}</Typography>
                                <IconButton onClick={() => setSelectedId(null)}>
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </Box>
                            {isImage(selectedMedia.mimeType) ? (
                                <Box sx={{ mx: 1.5, borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}>
                                    <CardMedia component="img" image={selectedMedia.url}
                                        alt={selectedMedia.altText ?? ''} sx={{ height: 160, objectFit: 'contain' }} />
                                </Box>
                            ) : (
                                <Box sx={{ mx: 1.5, height: 80, borderRadius: 1, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
                                    <InsertDriveFileIcon sx={{ fontSize: 40, color: 'action.active' }} />
                                </Box>
                            )}
                            <Box sx={{ p: 1.5 }}>
                                <Typography variant="subtitle2" noWrap sx={{ mb: 0.25 }}>
                                    {selectedMedia.originalFilename}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                                    {selectedMedia.mimeType} — {formatFileSize(selectedMedia.size)}
                                    {selectedMedia.width && selectedMedia.height && ` — ${selectedMedia.width}x${selectedMedia.height}`}
                                </Typography>
                                {selectedMedia.categories?.length > 0 && (
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                                        {selectedMedia.categories.map((cat: any) => (
                                            <MediaCategoryChip key={cat.slug || cat['@id']} name={cat.name} color={cat.color} />
                                        ))}
                                    </Box>
                                )}
                                {isImage(selectedMedia.mimeType) && selectedMedia.mimeType !== 'image/svg+xml' && (
                                    <Button variant="outlined" startIcon={<EditIcon />} size="small"
                                        onClick={() => setImageEditorOpen(true)} fullWidth sx={{ mb: 1.5 }}>
                                        {t('psyched.media.edit_image')}
                                    </Button>
                                )}
                                <Divider sx={{ mb: 1.5 }} />
                                {isImage(selectedMedia.mimeType) && (
                                    <TextField label={t('psyched.media.alt_text')} defaultValue={selectedMedia.altText ?? ''}
                                        onBlur={(e) => handleMetadataUpdate('altText', e.target.value)} sx={{ mb: 1 }} />
                                )}
                                <TextField label={t('psyched.media.title')} defaultValue={selectedMedia.title ?? ''}
                                    onBlur={(e) => handleMetadataUpdate('title', e.target.value)} sx={{ mb: 1 }} />
                                <TextField label={t('psyched.media.description')} defaultValue={selectedMedia.description ?? ''}
                                    onBlur={(e) => handleMetadataUpdate('description', e.target.value)}
                                    multiline minRows={2} sx={{ mb: 1.5 }} />
                                <MediaExifPanel exifData={selectedMedia.exifData} />
                                <Button variant="outlined" color="error" startIcon={<DeleteIcon />} size="small"
                                    onClick={() => handleDelete(selectedId!)} fullWidth sx={{ mt: 2 }}>
                                    {t('psyched.media.delete')}
                                </Button>
                            </Box>
                        </Paper>
                    )}
                </Box>
            </Box>

            {/* Dialogs */}
            <MediaCategoryDialog open={categoryDialogOpen}
                onClose={() => setCategoryDialogOpen(false)} category={editingCategory} />
            {selectedMedia && isImage(selectedMedia.mimeType) && (
                <MediaImageEditorDialog open={imageEditorOpen} onClose={() => setImageEditorOpen(false)}
                    mediaId={String(selectedMedia.id)} imageUrl={selectedMedia.url}
                    originalFilename={selectedMedia.originalFilename} />
            )}
            <MediaBulkMetadataDialog open={bulkMetadataOpen} onClose={() => setBulkMetadataOpen(false)}
                selectedIds={checkedIdsArray}
                onComplete={() => { setBulkMetadataOpen(false); setCheckedIds(new Set()); refresh(); }} />

            <FileSizeWarningDialog
                open={sizeWarningOpen}
                files={pendingFiles.map((f) => ({
                    name: f.name,
                    size: f.size,
                    maxSize: getMaxSizeForFile(f, uploadConfig.maxSizes),
                }))}
                onConfirm={handleSizeWarningConfirm}
                onCancel={handleSizeWarningCancel}
            />
        </MediaDropZone>
    );
}
