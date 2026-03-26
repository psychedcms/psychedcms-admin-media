import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { useTranslate } from 'react-admin';
import { formatFileSize } from '../utils/validateFile.ts';

interface FileSizeWarningDialogProps {
    open: boolean;
    files: { name: string; size: number; maxSize: number }[];
    onConfirm: () => void;
    onCancel: () => void;
}

export function FileSizeWarningDialog({ open, files, onConfirm, onCancel }: FileSizeWarningDialogProps) {
    const translate = useTranslate();

    return (
        <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
            <DialogTitle>{translate('psyched.media.file_size_warning_title')}</DialogTitle>
            <DialogContent>
                {files.map((f, i) => (
                    <Typography key={i} variant="body2" sx={{ mb: 1 }}>
                        <strong>{f.name}</strong> — {formatFileSize(f.size)}{' '}
                        {translate('psyched.media.file_size_warning_message', {
                            maxSize: formatFileSize(f.maxSize),
                        })}
                    </Typography>
                ))}
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>{translate('psyched.media.cancel')}</Button>
                <Button variant="contained" onClick={onConfirm}>
                    {translate('psyched.media.upload_anyway')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
