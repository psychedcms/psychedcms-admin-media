import { useState, useCallback } from 'react';
import {
    Box,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    ToggleButtonGroup,
    ToggleButton,
    Button,
    Chip,
    Collapse,
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

export interface MediaFilters {
    search: string;
    mimeType: string;
    categoryId: string | null;
    dateFrom: string;
    dateTo: string;
    sizeMin: string;
    sizeMax: string;
    sortField: string;
    sortOrder: 'ASC' | 'DESC';
}

export const defaultFilters: MediaFilters = {
    search: '',
    mimeType: '',
    categoryId: null,
    dateFrom: '',
    dateTo: '',
    sizeMin: '',
    sizeMax: '',
    sortField: 'createdAt',
    sortOrder: 'DESC',
};

interface MediaAdvancedFiltersProps {
    filters: MediaFilters;
    onFiltersChange: (filters: MediaFilters) => void;
    viewMode?: 'grid' | 'list';
    onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export function MediaAdvancedFilters({
    filters,
    onFiltersChange,
    viewMode = 'grid',
    onViewModeChange,
}: MediaAdvancedFiltersProps) {
    const [expanded, setExpanded] = useState(false);

    const updateFilter = useCallback(
        <K extends keyof MediaFilters>(key: K, value: MediaFilters[K]) => {
            onFiltersChange({ ...filters, [key]: value });
        },
        [filters, onFiltersChange],
    );

    const handleSortChange = useCallback(
        (combined: string) => {
            const [field, order] = combined.split(':');
            onFiltersChange({ ...filters, sortField: field, sortOrder: order as 'ASC' | 'DESC' });
        },
        [filters, onFiltersChange],
    );

    const clearFilters = useCallback(() => {
        onFiltersChange({ ...defaultFilters });
    }, [onFiltersChange]);

    const activeFilterChips: { key: string; label: string }[] = [];

    if (filters.mimeType) {
        const mimeLabels: Record<string, string> = {
            'image/': 'Images',
            'application/pdf': 'PDF',
            'audio/': 'Audio',
            'video/': 'Video',
        };
        activeFilterChips.push({ key: 'mimeType', label: `Type: ${mimeLabels[filters.mimeType] ?? filters.mimeType}` });
    }
    if (filters.dateFrom) {
        activeFilterChips.push({ key: 'dateFrom', label: `From: ${filters.dateFrom}` });
    }
    if (filters.dateTo) {
        activeFilterChips.push({ key: 'dateTo', label: `To: ${filters.dateTo}` });
    }
    if (filters.sizeMin) {
        activeFilterChips.push({ key: 'sizeMin', label: `Min: ${filters.sizeMin} KB` });
    }
    if (filters.sizeMax) {
        activeFilterChips.push({ key: 'sizeMax', label: `Max: ${filters.sizeMax} KB` });
    }

    const handleChipDelete = useCallback(
        (key: string) => {
            onFiltersChange({ ...filters, [key]: key === 'categoryId' ? null : '' });
        },
        [filters, onFiltersChange],
    );

    return (
        <Box sx={{ mb: 2 }}>
            {/* Top row: search, MIME filter, sort, view toggle */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                <TextField
                    size="small"
                    placeholder="Search by filename..."
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    sx={{ flex: 1 }}
                />

                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                        value={filters.mimeType}
                        label="Type"
                        onChange={(e) => updateFilter('mimeType', e.target.value)}
                    >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="image/">Images</MenuItem>
                        <MenuItem value="application/pdf">PDF</MenuItem>
                        <MenuItem value="audio/">Audio</MenuItem>
                        <MenuItem value="video/">Video</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Sort by</InputLabel>
                    <Select
                        value={`${filters.sortField}:${filters.sortOrder}`}
                        label="Sort by"
                        onChange={(e) => handleSortChange(e.target.value)}
                    >
                        <MenuItem value="createdAt:DESC">Newest first</MenuItem>
                        <MenuItem value="createdAt:ASC">Oldest first</MenuItem>
                        <MenuItem value="originalFilename:ASC">Name A-Z</MenuItem>
                        <MenuItem value="originalFilename:DESC">Name Z-A</MenuItem>
                        <MenuItem value="size:DESC">Largest first</MenuItem>
                        <MenuItem value="size:ASC">Smallest first</MenuItem>
                    </Select>
                </FormControl>

                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, v) => v && onViewModeChange?.(v)}
                    size="small"
                >
                    <ToggleButton value="grid"><ViewModuleIcon /></ToggleButton>
                    <ToggleButton value="list"><ViewListIcon /></ToggleButton>
                </ToggleButtonGroup>

                <Button
                    size="small"
                    onClick={() => setExpanded(!expanded)}
                    endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                >
                    More filters
                </Button>
            </Box>

            {/* Collapsible advanced filters */}
            <Collapse in={expanded}>
                <Box
                    sx={{
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        p: 2,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        mb: 1,
                    }}
                >
                    <TextField
                        size="small"
                        label="From date"
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => updateFilter('dateFrom', e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ width: 170 }}
                    />
                    <TextField
                        size="small"
                        label="To date"
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => updateFilter('dateTo', e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ width: 170 }}
                    />
                    <TextField
                        size="small"
                        label="Min size (KB)"
                        type="number"
                        value={filters.sizeMin}
                        onChange={(e) => updateFilter('sizeMin', e.target.value)}
                        sx={{ width: 130 }}
                        slotProps={{ htmlInput: { min: 0 } }}
                    />
                    <TextField
                        size="small"
                        label="Max size (KB)"
                        type="number"
                        value={filters.sizeMax}
                        onChange={(e) => updateFilter('sizeMax', e.target.value)}
                        sx={{ width: 130 }}
                        slotProps={{ htmlInput: { min: 0 } }}
                    />
                </Box>
            </Collapse>

            {/* Active filter chips */}
            {activeFilterChips.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    {activeFilterChips.map((chip) => (
                        <Chip
                            key={chip.key}
                            label={chip.label}
                            size="small"
                            onDelete={() => handleChipDelete(chip.key)}
                        />
                    ))}
                    <Button size="small" onClick={clearFilters}>
                        Clear filters
                    </Button>
                </Box>
            )}
        </Box>
    );
}
