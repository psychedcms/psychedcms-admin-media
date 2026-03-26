import { useGetList, useTranslate } from 'react-admin';
import {
    Box,
    Button,
    CircularProgress,
    List,
    ListItemButton,
    ListItemText,
    Typography,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import AddIcon from '@mui/icons-material/Add';

interface MediaCategorySidebarProps {
    selectedCategoryId: string | null;
    onSelectCategory: (id: string | null) => void;
    onManageCategories: () => void;
}

export function MediaCategorySidebar({
    selectedCategoryId,
    onSelectCategory,
    onManageCategories,
}: MediaCategorySidebarProps) {
    const t = useTranslate();
    const { data: categories, isLoading } = useGetList('media_categories', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'name', order: 'ASC' },
    });

    return (
        <Box>
            <List dense disablePadding>
                <ListItemButton
                    selected={selectedCategoryId === null}
                    onClick={() => onSelectCategory(null)}
                    sx={{ borderRadius: 1, mb: 0.25 }}
                >
                    <FolderIcon sx={{ mr: 1, fontSize: 18, color: 'action.active' }} />
                    <ListItemText primary={t('psyched.media.all_media')} primaryTypographyProps={{ variant: 'body2' }} />
                </ListItemButton>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                        <CircularProgress size={16} />
                    </Box>
                ) : (
                    categories?.map((cat) => (
                        <ListItemButton
                            key={cat.id}
                            selected={selectedCategoryId === cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            sx={{ borderRadius: 1, mb: 0.25 }}
                        >
                            <Box sx={{
                                width: 10, height: 10, borderRadius: '50%',
                                bgcolor: cat.color || 'grey.500', mr: 1, flexShrink: 0,
                            }} />
                            <ListItemText
                                primary={cat.name}
                                primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                            />
                        </ListItemButton>
                    ))
                )}
            </List>

            <Button size="small" startIcon={<AddIcon />} onClick={onManageCategories}
                sx={{ mt: 1, justifyContent: 'flex-start' }} fullWidth>
                {t('psyched.media.manage_categories')}
            </Button>
        </Box>
    );
}
