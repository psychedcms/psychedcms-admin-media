import { useState, useCallback, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Stepper,
    Step,
    StepLabel,
} from '@mui/material';
import ReactCrop from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import type { CropCoords } from '../utils/formatUrl.ts';

interface MediaFormatCropperProps {
    open: boolean;
    onClose: () => void;
    imageUrl: string;
    dimensions: Record<string, [number, number]>;
    existingFormats?: Record<string, CropCoords>;
    onComplete: (formats: Record<string, CropCoords>) => void;
}

export function MediaFormatCropper({
    open,
    onClose,
    imageUrl,
    dimensions,
    existingFormats,
    onComplete,
}: MediaFormatCropperProps) {
    const formatNames = Object.keys(dimensions);
    const [activeStep, setActiveStep] = useState(0);
    const [crops, setCrops] = useState<Record<string, CropCoords>>({});
    const [currentCrop, setCurrentCrop] = useState<Crop | undefined>();
    const imgRef = useRef<HTMLImageElement | null>(null);

    const currentFormat = formatNames[activeStep];
    const [targetW, targetH] = dimensions[currentFormat] || [0, 0];
    const aspectRatio = targetW / targetH;

    // Initialize crop from existing data or center crop
    useEffect(() => {
        if (!open || !currentFormat) return;

        const existing = existingFormats?.[currentFormat] || crops[currentFormat];
        if (existing && imgRef.current) {
            setCurrentCrop({
                unit: 'px',
                x: existing.cropX,
                y: existing.cropY,
                width: existing.cropW,
                height: existing.cropH,
            });
        } else {
            // Reset to let react-image-crop calculate a centered default
            setCurrentCrop(undefined);
        }
    }, [activeStep, open, currentFormat, existingFormats, crops]);

    const handleImageLoad = useCallback(
        (e: React.SyntheticEvent<HTMLImageElement>) => {
            imgRef.current = e.currentTarget;
            const { naturalWidth, naturalHeight } = e.currentTarget;

            // Set initial centered crop
            const existing = existingFormats?.[currentFormat] || crops[currentFormat];
            if (existing) {
                setCurrentCrop({
                    unit: 'px',
                    x: existing.cropX,
                    y: existing.cropY,
                    width: existing.cropW,
                    height: existing.cropH,
                });
            } else {
                // Calculate max crop that fits within image at the aspect ratio
                let cropW = naturalWidth;
                let cropH = cropW / aspectRatio;
                if (cropH > naturalHeight) {
                    cropH = naturalHeight;
                    cropW = cropH * aspectRatio;
                }
                setCurrentCrop({
                    unit: 'px',
                    x: (naturalWidth - cropW) / 2,
                    y: (naturalHeight - cropH) / 2,
                    width: cropW,
                    height: cropH,
                });
            }
        },
        [currentFormat, aspectRatio, existingFormats, crops],
    );

    const saveCurrent = useCallback(() => {
        if (!currentCrop || !currentFormat) return;

        const pixelCrop: PixelCrop = currentCrop as PixelCrop;
        setCrops((prev) => ({
            ...prev,
            [currentFormat]: {
                cropX: Math.round(pixelCrop.x),
                cropY: Math.round(pixelCrop.y),
                cropW: Math.round(pixelCrop.width),
                cropH: Math.round(pixelCrop.height),
            },
        }));
    }, [currentCrop, currentFormat]);

    const handleNext = useCallback(() => {
        saveCurrent();
        if (activeStep < formatNames.length - 1) {
            setActiveStep((prev) => prev + 1);
        }
    }, [saveCurrent, activeStep, formatNames.length]);

    const handlePrev = useCallback(() => {
        saveCurrent();
        if (activeStep > 0) {
            setActiveStep((prev) => prev - 1);
        }
    }, [saveCurrent, activeStep]);

    const handleComplete = useCallback(() => {
        saveCurrent();
        // Merge the current crop into the final result
        const finalCrops = { ...crops };
        if (currentCrop && currentFormat) {
            const pixelCrop = currentCrop as PixelCrop;
            finalCrops[currentFormat] = {
                cropX: Math.round(pixelCrop.x),
                cropY: Math.round(pixelCrop.y),
                cropW: Math.round(pixelCrop.width),
                cropH: Math.round(pixelCrop.height),
            };
        }
        onComplete(finalCrops);
        onClose();
    }, [saveCurrent, crops, currentCrop, currentFormat, onComplete, onClose]);

    const handleClose = useCallback(() => {
        setActiveStep(0);
        setCrops({});
        setCurrentCrop(undefined);
        onClose();
    }, [onClose]);

    if (!open || formatNames.length === 0) return null;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Crop for format: {currentFormat} ({targetW}x{targetH})
            </DialogTitle>
            <DialogContent>
                {formatNames.length > 1 && (
                    <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
                        {formatNames.map((name) => (
                            <Step key={name}>
                                <StepLabel>{name}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                )}

                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    Target: {targetW} x {targetH}px (ratio {aspectRatio.toFixed(2)})
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <ReactCrop
                        crop={currentCrop}
                        onChange={(c) => setCurrentCrop(c)}
                        aspect={aspectRatio}
                        keepSelection
                    >
                        <img
                            src={imageUrl}
                            alt="Crop preview"
                            onLoad={handleImageLoad}
                            style={{ maxHeight: '60vh', maxWidth: '100%' }}
                        />
                    </ReactCrop>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                {activeStep > 0 && (
                    <Button onClick={handlePrev}>Previous</Button>
                )}
                {activeStep < formatNames.length - 1 ? (
                    <Button variant="contained" onClick={handleNext}>
                        Next format
                    </Button>
                ) : (
                    <Button variant="contained" onClick={handleComplete}>
                        Validate all crops
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
