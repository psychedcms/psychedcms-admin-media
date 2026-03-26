import { useState, useCallback, useRef } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface MediaDropZoneProps {
    onFilesDropped: (files: File[]) => void;
    children: ReactNode;
}

export function MediaDropZone({ onFilesDropped, children }: MediaDropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);

    const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current += 1;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current -= 1;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter.current = 0;
            setIsDragging(false);

            const fileList = e.dataTransfer.files;
            const files: File[] = [];
            for (let i = 0; i < fileList.length; i++) {
                files.push(fileList[i]);
            }
            if (files.length > 0) {
                onFilesDropped(files);
            }
        },
        [onFilesDropped],
    );

    return (
        <Box
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            sx={{ position: 'relative' }}
        >
            {children}
            {isDragging && (
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(25, 118, 210, 0.08)',
                        border: '3px dashed',
                        borderColor: 'primary.main',
                        borderRadius: 2,
                        zIndex: 10,
                        pointerEvents: 'none',
                    }}
                >
                    <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6" color="primary">
                        Drop files to upload
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
