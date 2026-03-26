import { useState, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    ToggleButtonGroup,
    ToggleButton,
    Typography,
    CircularProgress,
} from '@mui/material';
import { useNotify, useRefresh } from 'react-admin';
import { MediaImageEditor } from './MediaImageEditor.tsx';
import { useMediaUpload } from '../hooks/useMediaUpload.ts';
import { useMediaReplace } from '../hooks/useMediaReplace.ts';

interface MediaImageEditorDialogProps {
    open: boolean;
    onClose: () => void;
    mediaId: string;
    imageUrl: string;
    originalFilename?: string;
}

export function MediaImageEditorDialog({
    open,
    onClose,
    mediaId,
    imageUrl,
    originalFilename,
}: MediaImageEditorDialogProps) {
    const [saveMode, setSaveMode] = useState<'new' | 'replace'>('new');
    const [saving, setSaving] = useState(false);
    const { upload } = useMediaUpload();
    const { replace } = useMediaReplace();
    const notify = useNotify();
    const refresh = useRefresh();

    const handleSave = useCallback(
        async (blob: Blob, fileName: string) => {
            setSaving(true);
            try {
                const file = new File([blob], fileName || originalFilename || 'edited.png', {
                    type: blob.type,
                });

                if (saveMode === 'replace') {
                    await replace(mediaId, file);
                    notify('Image replaced', { type: 'success' });
                } else {
                    await upload(file);
                    notify('Saved as new image', { type: 'success' });
                }

                refresh();
                onClose();
            } catch {
                // Error already notified
            } finally {
                setSaving(false);
            }
        },
        [saveMode, mediaId, originalFilename, upload, replace, notify, refresh, onClose],
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Edit Image</Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {saving && <CircularProgress size={20} />}
                        <ToggleButtonGroup
                            value={saveMode}
                            exclusive
                            onChange={(_, v) => v && setSaveMode(v)}
                            size="small"
                        >
                            <ToggleButton value="new">Save as new</ToggleButton>
                            <ToggleButton value="replace">Replace original</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ height: '70vh', p: 0 }}>
                {open && (
                    <MediaImageEditor
                        imageUrl={imageUrl}
                        onSave={handleSave}
                        onClose={onClose}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
