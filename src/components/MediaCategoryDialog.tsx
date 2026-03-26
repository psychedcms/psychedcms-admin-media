import { useState, useEffect, useCallback } from 'react';
import { useDataProvider, useNotify, useRefresh } from 'react-admin';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
} from '@mui/material';

interface MediaCategory {
    id: string;
    name: string;
    slug: string;
    color?: string;
    icon?: string;
}

interface MediaCategoryDialogProps {
    open: boolean;
    onClose: () => void;
    category?: MediaCategory | null;
}

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export function MediaCategoryDialog({ open, onClose, category }: MediaCategoryDialogProps) {
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const refresh = useRefresh();

    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [color, setColor] = useState('');
    const [icon, setIcon] = useState('');
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [saving, setSaving] = useState(false);

    const isEditMode = Boolean(category);

    useEffect(() => {
        if (open) {
            if (category) {
                setName(category.name);
                setSlug(category.slug);
                setColor(category.color ?? '');
                setIcon(category.icon ?? '');
                setSlugManuallyEdited(true);
            } else {
                setName('');
                setSlug('');
                setColor('');
                setIcon('');
                setSlugManuallyEdited(false);
            }
        }
    }, [open, category]);

    const handleNameChange = useCallback(
        (value: string) => {
            setName(value);
            if (!slugManuallyEdited) {
                setSlug(generateSlug(value));
            }
        },
        [slugManuallyEdited],
    );

    const handleSlugChange = useCallback((value: string) => {
        setSlugManuallyEdited(true);
        setSlug(value);
    }, []);

    const handleSave = useCallback(async () => {
        if (!name.trim() || !slug.trim()) return;

        setSaving(true);
        try {
            const data: Record<string, string | undefined> = {
                name: name.trim(),
                slug: slug.trim(),
                color: color || undefined,
                icon: icon || undefined,
            };

            if (isEditMode && category) {
                await dataProvider.update('media_categories', {
                    id: category.id,
                    data,
                    previousData: category,
                });
            } else {
                await dataProvider.create('media_categories', { data });
            }

            notify('psyched.media.category_saved', { type: 'success' });
            refresh();
            onClose();
        } catch {
            notify('ra.notification.http_error', { type: 'error' });
        } finally {
            setSaving(false);
        }
    }, [name, slug, color, icon, isEditMode, category, dataProvider, notify, refresh, onClose]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {isEditMode ? 'Edit category' : 'Add category'}
            </DialogTitle>

            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="Name"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        required
                        fullWidth
                        size="small"
                        autoFocus
                    />

                    <TextField
                        label="Slug"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        required
                        fullWidth
                        size="small"
                        helperText="Auto-generated from name. You can edit it manually."
                    />

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField
                            label="Color"
                            type="color"
                            value={color || '#000000'}
                            onChange={(e) => setColor(e.target.value)}
                            size="small"
                            sx={{ width: 120 }}
                            slotProps={{
                                inputLabel: { shrink: true },
                            }}
                        />
                        {color && (
                            <Box
                                sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    bgcolor: color,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}
                            />
                        )}
                        {color && (
                            <Button
                                size="small"
                                onClick={() => setColor('')}
                            >
                                Clear color
                            </Button>
                        )}
                    </Box>

                    <TextField
                        label="Icon"
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        fullWidth
                        size="small"
                        helperText="Optional icon identifier"
                    />
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving || !name.trim() || !slug.trim()}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
