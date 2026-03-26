import { Chip } from '@mui/material';

interface MediaCategoryChipProps {
    name: string;
    color?: string | null;
    size?: 'small' | 'medium';
    onDelete?: () => void;
    onClick?: () => void;
}

export function MediaCategoryChip({ name, color, size = 'small', onDelete, onClick }: MediaCategoryChipProps) {
    return (
        <Chip
            label={name}
            size={size}
            onClick={onClick}
            onDelete={onDelete}
            sx={{
                ...(color ? {
                    bgcolor: color,
                    color: 'white',
                    '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)' },
                } : {}),
            }}
        />
    );
}
