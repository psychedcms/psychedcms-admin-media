import { useState, useCallback } from 'react';
import { useNotify } from 'react-admin';
import { usePsychedSchemaContext } from '@psychedcms/admin-core';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Typography,
    Toolbar,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CategoryIcon from '@mui/icons-material/Category';
import EditIcon from '@mui/icons-material/Edit';

interface MediaBulkActionsProps {
    selectedIds: string[];
    onClearSelection: () => void;
    onRefresh: () => void;
    onBulkEditMetadata?: () => void;
}

export function MediaBulkActions({
    selectedIds,
    onClearSelection,
    onRefresh,
    onBulkEditMetadata,
}: MediaBulkActionsProps) {
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const [categoryId, setCategoryId] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [categorizing, setCategorizing] = useState(false);

    const notify = useNotify();
    const { entrypoint } = usePsychedSchemaContext();

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            Accept: 'application/ld+json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }, []);

    const handleBulkDelete = useCallback(async () => {
        setDeleting(true);
        try {
            const response = await fetch(`${entrypoint}/media/bulk-delete`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ids: selectedIds.map((id) => id.replace(/^\/api\/media\//, '')) }),
            });

            if (!response.ok) {
                throw new Error(`Delete failed: ${response.statusText}`);
            }

            notify(`Deleted ${selectedIds.length} items`, { type: 'success' });
            onClearSelection();
            onRefresh();
        } catch (err) {
            notify(
                `Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
                { type: 'error' },
            );
        } finally {
            setDeleting(false);
        }
    }, [entrypoint, selectedIds, notify, onClearSelection, onRefresh, getAuthHeaders]);

    const handleAddToCategory = useCallback(async () => {
        if (!categoryId.trim()) return;
        setCategorizing(true);
        try {
            const response = await fetch(`${entrypoint}/media/bulk-categorize`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    mediaIds: selectedIds,
                    categoryIds: [categoryId.trim()],
                    action: 'add',
                }),
            });

            if (!response.ok) {
                throw new Error(`Categorize failed: ${response.statusText}`);
            }

            notify('Added to category', { type: 'success' });
            setCategoryDialogOpen(false);
            setCategoryId('');
            onRefresh();
        } catch (err) {
            notify(
                `Categorize failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
                { type: 'error' },
            );
        } finally {
            setCategorizing(false);
        }
    }, [entrypoint, selectedIds, categoryId, notify, onRefresh, getAuthHeaders]);

    if (selectedIds.length === 0) return null;

    return (
        <>
            <Toolbar
                variant="dense"
                sx={{
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                    borderRadius: 1,
                    mb: 2,
                    gap: 1,
                    flexWrap: 'wrap',
                }}
            >
                <Typography variant="body2" sx={{ mr: 2 }}>
                    {selectedIds.length} selected
                </Typography>
                <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleBulkDelete}
                    disabled={deleting}
                >
                    Delete
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<CategoryIcon />}
                    onClick={() => setCategoryDialogOpen(true)}
                >
                    Add to category
                </Button>
                {onBulkEditMetadata && (
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={onBulkEditMetadata}
                    >
                        Edit metadata
                    </Button>
                )}
                <Button size="small" onClick={onClearSelection} sx={{ ml: 'auto', color: 'inherit' }}>
                    Clear
                </Button>
            </Toolbar>

            <Dialog
                open={categoryDialogOpen}
                onClose={() => setCategoryDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Add to category</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        size="small"
                        label="Category ID"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleAddToCategory}
                        disabled={!categoryId.trim() || categorizing}
                    >
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
