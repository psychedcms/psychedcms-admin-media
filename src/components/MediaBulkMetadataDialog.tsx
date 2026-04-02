import { useState, useCallback } from 'react';
import { useNotify } from 'react-admin';
import { usePsychedSchemaContext } from '@psychedcms/admin-core';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControlLabel,
    Checkbox,
    Box,
} from '@mui/material';

interface MediaBulkMetadataDialogProps {
    open: boolean;
    onClose: () => void;
    selectedIds: string[];
    onComplete: () => void;
}

export function MediaBulkMetadataDialog({
    open,
    onClose,
    selectedIds,
    onComplete,
}: MediaBulkMetadataDialogProps) {
    const [altText, setAltText] = useState('');
    const [applyAltText, setApplyAltText] = useState(false);
    const [title, setTitle] = useState('');
    const [applyTitle, setApplyTitle] = useState(false);
    const [description, setDescription] = useState('');
    const [applyDescription, setApplyDescription] = useState(false);
    const [saving, setSaving] = useState(false);

    const notify = useNotify();
    const { entrypoint } = usePsychedSchemaContext();

    const handleSave = useCallback(async () => {
        const data: Record<string, string> = {};
        if (applyAltText) data.altText = altText;
        if (applyTitle) data.title = title;
        if (applyDescription) data.description = description;

        if (Object.keys(data).length === 0) {
            notify('No fields selected to update', { type: 'warning' });
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${entrypoint}/media/bulk-update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/ld+json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ ids: selectedIds.map((id) => id.replace(/^\/api\/media\//, '')), ...data }),
            });

            if (!response.ok) {
                throw new Error(`Update failed: ${response.statusText}`);
            }

            notify(`Updated ${selectedIds.length} items`, { type: 'success' });
            onComplete();
            handleClose();
        } catch (err) {
            notify(
                `Update failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
                { type: 'error' },
            );
        } finally {
            setSaving(false);
        }
    }, [
        applyAltText, altText,
        applyTitle, title,
        applyDescription, description,
        selectedIds, entrypoint, notify, onComplete,
    ]);

    const handleClose = useCallback(() => {
        setAltText('');
        setApplyAltText(false);
        setTitle('');
        setApplyTitle(false);
        setDescription('');
        setApplyDescription(false);
        onClose();
    }, [onClose]);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Edit metadata ({selectedIds.length} items)</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <Box>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={applyAltText}
                                    onChange={(e) => setApplyAltText(e.target.checked)}
                                    size="small"
                                />
                            }
                            label="Apply to all selected"
                        />
                        <TextField
                            fullWidth
                            size="small"
                            label="Alt text"
                            value={altText}
                            onChange={(e) => setAltText(e.target.value)}
                            disabled={!applyAltText}
                        />
                    </Box>
                    <Box>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={applyTitle}
                                    onChange={(e) => setApplyTitle(e.target.checked)}
                                    size="small"
                                />
                            }
                            label="Apply to all selected"
                        />
                        <TextField
                            fullWidth
                            size="small"
                            label="Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={!applyTitle}
                        />
                    </Box>
                    <Box>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={applyDescription}
                                    onChange={(e) => setApplyDescription(e.target.checked)}
                                    size="small"
                                />
                            }
                            label="Apply to all selected"
                        />
                        <TextField
                            fullWidth
                            size="small"
                            label="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={!applyDescription}
                            multiline
                            minRows={2}
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving || (!applyAltText && !applyTitle && !applyDescription)}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
