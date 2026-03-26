import { useState, useEffect, useCallback } from 'react';
import { useNotify } from 'react-admin';
import { usePsychedSchemaContext } from '@psychedcms/admin-core';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    Typography,
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

interface StorageStats {
    totalSize: number;
    quota: number;
    byMimeGroup: Array<{ mimeGroup: string; totalSize: string; count: string }>;
    largestFiles: Array<{ id: string; originalFilename: string; size: number; mimeType: string }>;
    totalCount: number;
}

interface MediaStorageDashboardProps {
    collapsed: boolean;
    onToggle: () => void;
}

function formatFileSize(bytes?: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const MIME_GROUP_COLORS: Record<string, string> = {
    image: '#4caf50',
    audio: '#2196f3',
    video: '#ff9800',
    application: '#9c27b0',
    text: '#607d8b',
};

export function MediaStorageDashboard({ collapsed, onToggle }: MediaStorageDashboardProps) {
    const [stats, setStats] = useState<StorageStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [scanningOrphaned, setScanningOrphaned] = useState(false);

    const notify = useNotify();
    const { entrypoint } = usePsychedSchemaContext();

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        return {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }, []);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${entrypoint}/media/stats`, { headers: getAuthHeaders() });
            if (!response.ok) throw new Error(response.statusText);
            setStats(await response.json() as StorageStats);
        } catch (err) {
            notify(`Failed to load stats: ${err instanceof Error ? err.message : 'Unknown'}`, { type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [entrypoint, notify, getAuthHeaders]);

    useEffect(() => {
        if (!collapsed && !stats) {
            void fetchStats();
        }
    }, [collapsed, stats, fetchStats]);

    const handleScanOrphaned = useCallback(async () => {
        setScanningOrphaned(true);
        try {
            const response = await fetch(`${entrypoint}/media/orphaned`, { headers: getAuthHeaders() });
            if (!response.ok) throw new Error(response.statusText);
            const result = await response.json() as { orphanedFiles: string[] };
            notify(`Found ${result.orphanedFiles.length} orphaned file(s)`, { type: 'info' });
        } catch (err) {
            notify(`Scan failed: ${err instanceof Error ? err.message : 'Unknown'}`, { type: 'error' });
        } finally {
            setScanningOrphaned(false);
        }
    }, [entrypoint, notify, getAuthHeaders]);

    const usagePercent = stats?.quota && stats.totalSize
        ? Math.round((stats.totalSize / stats.quota) * 100)
        : null;

    const getProgressColor = (p: number): 'success' | 'warning' | 'error' => {
        if (p < 60) return 'success';
        if (p < 85) return 'warning';
        return 'error';
    };

    return (
        <Dialog open={!collapsed} onClose={onToggle} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StorageIcon color="primary" />
                        <Typography variant="h6">Storage</Typography>
                    </Box>
                    <IconButton size="small" onClick={onToggle}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {loading ? (
                        <LinearProgress sx={{ my: 2 }} />
                    ) : stats ? (
                        <Box>
                            {/* Usage */}
                            <Box sx={{ mb: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="body2" fontWeight={500}>
                                        Total: {formatFileSize(stats.totalSize)}
                                    </Typography>
                                    {stats.quota > 0 && (
                                        <Typography variant="body2" color="text.secondary">
                                            Quota: {formatFileSize(stats.quota)}
                                        </Typography>
                                    )}
                                </Box>
                                {usagePercent !== null && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.min(usagePercent, 100)}
                                            color={getProgressColor(usagePercent)}
                                            sx={{ flex: 1, height: 8, borderRadius: 4 }}
                                        />
                                        <Typography variant="caption" fontWeight={500}>{usagePercent}%</Typography>
                                    </Box>
                                )}
                                <Typography variant="caption" color="text.secondary">
                                    {stats.totalCount} file{stats.totalCount !== 1 ? 's' : ''}
                                </Typography>
                            </Box>

                            {/* By type */}
                            {stats.byMimeGroup.length > 0 && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>By type</Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                        {stats.byMimeGroup.map((group) => (
                                            <Chip
                                                key={group.mimeGroup}
                                                label={`${group.mimeGroup} (${group.count}) - ${formatFileSize(Number(group.totalSize))}`}
                                                size="small"
                                                sx={{
                                                    bgcolor: MIME_GROUP_COLORS[group.mimeGroup] ?? '#795548',
                                                    color: 'white',
                                                    fontWeight: 500,
                                                    fontSize: '0.75rem',
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {/* Largest files */}
                            {stats.largestFiles.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Largest files</Typography>
                                    <List dense disablePadding>
                                        {stats.largestFiles.map((file) => (
                                            <ListItem key={file.id} disablePadding sx={{ py: 0.25 }}>
                                                <ListItemText
                                                    primary={file.originalFilename}
                                                    secondary={`${file.mimeType} - ${formatFileSize(file.size)}`}
                                                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                                                    secondaryTypographyProps={{ variant: 'caption' }}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            )}
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button
                        size="small"
                        startIcon={<SearchIcon />}
                        onClick={handleScanOrphaned}
                        disabled={scanningOrphaned}
                        sx={{ textTransform: 'none' }}
                    >
                        {scanningOrphaned ? 'Scanning...' : 'Scan orphaned files'}
                    </Button>
                </DialogActions>
            </Dialog>
    );
}
