import { useState, useRef, useEffect } from 'react';
import { Box, Tabs, Tab, Typography, IconButton } from '@mui/material';
import CropIcon from '@mui/icons-material/Crop';
import { useTranslate } from 'react-admin';
import type { CropCoords } from '../utils/formatUrl.ts';

interface FormatPreviewTabsProps {
    dimensions: Record<string, [number, number]>;
    formats?: Record<string, CropCoords>;
    imageUrl: string;
    onRecropFormat: (formatIndex: number) => void;
}

/**
 * Draw the cropped region of the source image onto the canvas.
 * Crop coordinates are in the image's natural pixel space.
 */
function drawCrop(
    canvas: HTMLCanvasElement,
    img: HTMLImageElement,
    crop: CropCoords,
    displayW: number,
    displayH: number,
) {
    canvas.width = displayW;
    canvas.height = displayH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(
        img,
        crop.cropX, crop.cropY, crop.cropW, crop.cropH,
        0, 0, displayW, displayH,
    );
}

export function FormatPreviewTabs({
    dimensions,
    formats,
    imageUrl,
    onRecropFormat,
}: FormatPreviewTabsProps) {
    const translate = useTranslate();
    const formatEntries = Object.entries(dimensions);
    const [activeTab, setActiveTab] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgCacheRef = useRef<HTMLImageElement | null>(null);

    const [currentName, [targetW, targetH]] = formatEntries[activeTab] || ['', [0, 0]];
    const crop = formats?.[currentName];
    const hasSingleFormat = formatEntries.length === 1;

    // Load the image once and redraw canvas when crop/tab changes
    useEffect(() => {
        if (!crop || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ratio = targetW / targetH;

        const draw = () => {
            const maxW = Math.min(400, 300 * ratio);
            let displayW = Math.min(maxW, canvas.parentElement?.clientWidth ?? 0);
            if (displayW === 0) {
                requestAnimationFrame(draw);
                return;
            }
            const displayH = displayW / ratio;

            if (imgCacheRef.current?.complete && imgCacheRef.current.src === imageUrl) {
                drawCrop(canvas, imgCacheRef.current, crop, displayW, displayH);
            } else {
                const img = new Image();
                img.onload = () => {
                    imgCacheRef.current = img;
                    drawCrop(canvas, img, crop, displayW, displayH);
                };
                img.src = imageUrl;
            }
        };

        draw();
    }, [crop, imageUrl, targetW, targetH, activeTab, currentName]);

    return (
        <Box sx={{ px: 1, pb: 1 }}>
            {!hasSingleFormat ? (
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ minHeight: 36, mb: 1 }}
                >
                    {formatEntries.map(([name, [w, h]]) => (
                        <Tab
                            key={name}
                            label={`${name} (${w}x${h})`}
                            sx={{ minHeight: 36, py: 0.5, textTransform: 'none', fontSize: '0.8125rem' }}
                        />
                    ))}
                </Tabs>
            ) : (
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                    {currentName} ({targetW}x{targetH})
                </Typography>
            )}

            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: Math.min(400, 300 * (targetW / targetH)),
                    aspectRatio: `${targetW} / ${targetH}`,
                    overflow: 'hidden',
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    border: crop ? undefined : '2px dashed',
                    borderColor: crop ? undefined : 'grey.400',
                }}
            >
                {crop ? (
                    <canvas
                        ref={canvasRef}
                        style={{ maxWidth: '100%', display: 'block' }}
                    />
                ) : (
                    <>
                        <img
                            src={imageUrl}
                            alt={currentName}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'rgba(0,0,0,0.4)',
                            }}
                        >
                            <Typography variant="caption" sx={{ color: 'white' }}>
                                {translate('psyched.media.no_crop_defined')}
                            </Typography>
                        </Box>
                    </>
                )}

                <IconButton
                    size="small"
                    onClick={() => onRecropFormat(activeTab)}
                    title={translate('psyched.media.recrop_format')}
                    sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: 'rgba(255,255,255,0.85)',
                        '&:hover': { bgcolor: 'white' },
                    }}
                >
                    <CropIcon fontSize="small" />
                </IconButton>
            </Box>
        </Box>
    );
}
