import { useGetList, useNotify, useTranslate } from 'react-admin';
import { useState, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    TextField,
    ImageList,
    ImageListItem,
    ImageListItemBar,
    Typography,
    ToggleButtonGroup,
    ToggleButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemButton,
    Pagination,
    CircularProgress,
    Checkbox,
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useMediaUpload } from '../hooks/useMediaUpload.ts';
import { useUploadConfig } from '../hooks/useUploadConfig.ts';
import type { MediaRecord } from '../hooks/useMediaUpload.ts';
import { validateFileType, checkFileSize, getMaxSizeForFile, getAcceptFromAllowedTypes } from '../utils/validateFile.ts';
import { FileSizeWarningDialog } from './FileSizeWarningDialog.tsx';

interface MediaBrowserProps {
    open: boolean;
    onClose: () => void;
    onSelect: (media: MediaRecord) => void;
    onSelectMultiple?: (media: MediaRecord[]) => void;
    mimeTypeFilter?: string;
    multiSelect?: boolean;
    storage?: string;
    directory?: string;
    /** IRIs of already-selected items (shown as pre-checked in multi-select mode) */
    alreadySelectedIris?: string[];
}

const PER_PAGE = 24;

export function MediaBrowser({
    open,
    onClose,
    onSelect,
    onSelectMultiple,
    mimeTypeFilter,
    multiSelect = false,
    storage,
    directory,
    alreadySelectedIris,
}: MediaBrowserProps) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selected, setSelected] = useState<Map<string, MediaRecord>>(new Map());

    const isAlreadyPicked = (media: MediaRecord) =>
        alreadySelectedIris?.includes(media['@id']) ?? false;
    const [sizeWarningOpen, setSizeWarningOpen] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const { upload, uploading } = useMediaUpload();
    const uploadConfig = useUploadConfig();
    const notify = useNotify();
    const translate = useTranslate();

    const filter: Record<string, string> = {};
    if (search) {
        filter.originalFilename = search;
    }
    if (mimeTypeFilter) {
        filter.mimeType = mimeTypeFilter;
    }
    filter.storage = storage ?? 'content';
    if (directory) {
        filter.storagePath = directory;
    }

    const { data, total, isLoading } = useGetList('media', {
        pagination: { page, perPage: PER_PAGE },
        sort: { field: 'createdAt', order: 'DESC' },
        filter,
    });

    const totalPages = total ? Math.ceil(total / PER_PAGE) : 0;

    const doUploadFiles = useCallback(
        async (files: File[], sizeOverride = false) => {
            for (const file of files) {
                try {
                    const media = await upload(file, { storage, directory, sizeOverride });
                    if (!multiSelect) {
                        onSelect(media);
                        return;
                    }
                    setSelected((prev) => new Map(prev).set(media['@id'], media));
                } catch {
                    // Error already notified by useMediaUpload
                }
            }
        },
        [upload, onSelect, multiSelect, storage, directory],
    );

    const handleUpload = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            const fileList = Array.from(files);
            const valid: File[] = [];
            const oversized: File[] = [];

            for (const file of fileList) {
                if (!validateFileType(file, uploadConfig.allowedTypes)) {
                    notify(translate('psyched.media.file_type_not_allowed'), { type: 'error' });
                    continue;
                }
                if (!checkFileSize(file, uploadConfig.maxSizes)) {
                    oversized.push(file);
                } else {
                    valid.push(file);
                }
            }

            if (valid.length > 0) {
                await doUploadFiles(valid);
            }

            if (oversized.length > 0) {
                setPendingFiles(oversized);
                setSizeWarningOpen(true);
            }
        },
        [uploadConfig, notify, translate, doUploadFiles],
    );

    const handleSizeWarningConfirm = useCallback(() => {
        setSizeWarningOpen(false);
        doUploadFiles(pendingFiles, true);
        setPendingFiles([]);
    }, [pendingFiles, doUploadFiles]);

    const handleSizeWarningCancel = useCallback(() => {
        setSizeWarningOpen(false);
        setPendingFiles([]);
    }, []);

    const handleItemClick = useCallback(
        (media: MediaRecord) => {
            if (!multiSelect) {
                onSelect(media);
                return;
            }
            setSelected((prev) => {
                const next = new Map(prev);
                if (next.has(media['@id'])) {
                    next.delete(media['@id']);
                } else {
                    next.set(media['@id'], media);
                }
                return next;
            });
        },
        [multiSelect, onSelect],
    );

    const handleConfirm = useCallback(() => {
        if (onSelectMultiple) {
            onSelectMultiple(Array.from(selected.values()));
        }
        setSelected(new Map());
        onClose();
    }, [selected, onSelectMultiple, onClose]);

    const handleClose = useCallback(() => {
        setSelected(new Map());
        onClose();
    }, [onClose]);

    const isImage = (mimeType?: string) => mimeType?.startsWith('image/');
    const isSelected = (media: MediaRecord) => selected.has(media['@id']);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Media Library</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button
                            variant="outlined"
                            size="small"
                            component="label"
                            startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                            disabled={uploading}
                        >
                            Upload
                            <input
                                type="file"
                                hidden
                                accept={getAcceptFromAllowedTypes(uploadConfig.allowedTypes, mimeTypeFilter)}
                                multiple={multiSelect}
                                onChange={handleUpload}
                            />
                        </Button>
                        <ToggleButtonGroup
                            value={viewMode}
                            exclusive
                            onChange={(_, v) => v && setViewMode(v)}
                            size="small"
                        >
                            <ToggleButton value="grid"><ViewModuleIcon /></ToggleButton>
                            <ToggleButton value="list"><ViewListIcon /></ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent>
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Search by filename..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    sx={{ mb: 2 }}
                />

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : !data || data.length === 0 ? (
                    <Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                        No media found.
                    </Typography>
                ) : viewMode === 'grid' ? (
                    <ImageList cols={4} rowHeight={140} gap={8}>
                        {data.map((media) => {
                            const picked = isAlreadyPicked(media as MediaRecord);
                            const checked = isSelected(media as MediaRecord);
                            return (
                            <ImageListItem
                                key={media.id}
                                sx={{
                                    cursor: picked ? 'default' : 'pointer',
                                    opacity: picked ? 0.5 : 1,
                                    '&:hover': { opacity: picked ? 0.5 : 0.8 },
                                    border: (checked || picked) ? '2px solid' : '2px solid transparent',
                                    borderColor: picked ? 'success.main' : checked ? 'primary.main' : 'transparent',
                                    borderRadius: 1,
                                    position: 'relative',
                                }}
                                onClick={() => !picked && handleItemClick(media as MediaRecord)}
                            >
                                {multiSelect && (
                                    <Checkbox
                                        checked={checked || picked}
                                        disabled={picked}
                                        sx={{ position: 'absolute', top: 0, left: 0, zIndex: 1, bgcolor: 'rgba(255,255,255,0.7)' }}
                                        size="small"
                                    />
                                )}
                                {isImage(media.mimeType) ? (
                                    <img
                                        src={media.thumbnailUrl || media.url}
                                        alt={media.altText ?? media.originalFilename ?? ''}
                                        style={{ objectFit: 'contain', height: '100%', backgroundColor: '#f5f5f5' }}
                                    />
                                ) : (
                                    <Box
                                        sx={{
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: 'grey.100',
                                        }}
                                    >
                                        <InsertDriveFileIcon sx={{ fontSize: 48, color: 'grey.500' }} />
                                    </Box>
                                )}
                                <ImageListItemBar
                                    title={media.originalFilename}
                                    subtitle={media.mimeType}
                                    sx={{ '& .MuiImageListItemBar-title': { fontSize: '0.75rem' } }}
                                />
                            </ImageListItem>
                            );
                        })}
                    </ImageList>
                ) : (
                    <List>
                        {data.map((media) => {
                            const picked = isAlreadyPicked(media as MediaRecord);
                            const checked = isSelected(media as MediaRecord);
                            return (
                            <ListItem key={media.id} disablePadding sx={{ opacity: picked ? 0.5 : 1 }}>
                                <ListItemButton
                                    onClick={() => !picked && handleItemClick(media as MediaRecord)}
                                    disabled={picked}
                                >
                                    {multiSelect && (
                                        <Checkbox
                                            checked={checked || picked}
                                            disabled={picked}
                                            sx={{ mr: 1 }}
                                            size="small"
                                        />
                                    )}
                                    <ListItemIcon>
                                        {isImage(media.mimeType) ? (
                                            <Box
                                                component="img"
                                                src={media.thumbnailUrl || media.url}
                                                alt=""
                                                sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 0.5 }}
                                            />
                                        ) : (
                                            <InsertDriveFileIcon />
                                        )}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={media.originalFilename}
                                        secondary={media.mimeType}
                                    />
                                </ListItemButton>
                            </ListItem>
                            );
                        })}
                    </List>
                )}

                {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Pagination
                            count={totalPages}
                            page={page}
                            onChange={(_, p) => setPage(p)}
                        />
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                {multiSelect && (
                    <Button
                        variant="contained"
                        onClick={handleConfirm}
                        disabled={selected.size === 0}
                    >
                        Confirm ({selected.size})
                    </Button>
                )}
            </DialogActions>

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
        </Dialog>
    );
}
