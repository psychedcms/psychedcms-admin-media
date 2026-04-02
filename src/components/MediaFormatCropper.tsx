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
    initialStep?: number;
}

export function MediaFormatCropper({
    open,
    onClose,
    imageUrl,
    dimensions,
    existingFormats,
    onComplete,
    initialStep = 0,
}: MediaFormatCropperProps) {
    const formatNames = Object.keys(dimensions);
    const [activeStep, setActiveStep] = useState(initialStep);
    const [crops, setCrops] = useState<Record<string, CropCoords>>({});
    const [currentCrop, setCurrentCrop] = useState<Crop | undefined>();
    const imgRef = useRef<HTMLImageElement | null>(null);
    const scaleRef = useRef(1);

    const currentFormat = formatNames[activeStep];
    const [targetW, targetH] = dimensions[currentFormat] || [0, 0];
    const aspectRatio = targetW / targetH;

    // Sync activeStep when dialog opens or initialStep changes
    useEffect(() => {
        if (open) {
            setActiveStep(initialStep);
        }
    }, [open, initialStep]);

    // Convert natural-space CropCoords to display-space Crop for react-image-crop
    const toDisplayCrop = useCallback((coords: CropCoords): Crop => {
        const s = scaleRef.current;
        return {
            unit: 'px',
            x: coords.cropX / s,
            y: coords.cropY / s,
            width: coords.cropW / s,
            height: coords.cropH / s,
        };
    }, []);

    // Convert display-space PixelCrop to natural-space CropCoords for storage
    const toNaturalCoords = useCallback((crop: PixelCrop): CropCoords => {
        const s = scaleRef.current;
        return {
            cropX: Math.round(crop.x * s),
            cropY: Math.round(crop.y * s),
            cropW: Math.round(crop.width * s),
            cropH: Math.round(crop.height * s),
        };
    }, []);

    // Initialize crop from existing data or compute centered default
    useEffect(() => {
        if (!open || !currentFormat) return;

        const existing = existingFormats?.[currentFormat] || crops[currentFormat];
        if (existing && imgRef.current) {
            setCurrentCrop(toDisplayCrop(existing));
        } else if (imgRef.current) {
            // Image already loaded, compute centered default for this format
            const { naturalWidth, naturalHeight } = imgRef.current;
            let cropW = naturalWidth;
            let cropH = cropW / aspectRatio;
            if (cropH > naturalHeight) {
                cropH = naturalHeight;
                cropW = cropH * aspectRatio;
            }
            const s = scaleRef.current;
            setCurrentCrop({
                unit: 'px',
                x: (naturalWidth - cropW) / 2 / s,
                y: (naturalHeight - cropH) / 2 / s,
                width: cropW / s,
                height: cropH / s,
            });
        } else {
            setCurrentCrop(undefined);
        }
    }, [activeStep, open, currentFormat, existingFormats, crops, toDisplayCrop, aspectRatio]);

    const handleImageLoad = useCallback(
        (e: React.SyntheticEvent<HTMLImageElement>) => {
            imgRef.current = e.currentTarget;
            const { naturalWidth, naturalHeight, width: displayWidth } = e.currentTarget;
            scaleRef.current = naturalWidth / displayWidth;

            const existing = existingFormats?.[currentFormat] || crops[currentFormat];
            if (existing) {
                setCurrentCrop(toDisplayCrop(existing));
            } else {
                // Calculate max crop that fits within image at the aspect ratio (in natural space)
                let cropW = naturalWidth;
                let cropH = cropW / aspectRatio;
                if (cropH > naturalHeight) {
                    cropH = naturalHeight;
                    cropW = cropH * aspectRatio;
                }
                // Convert to display space for react-image-crop
                const s = scaleRef.current;
                setCurrentCrop({
                    unit: 'px',
                    x: (naturalWidth - cropW) / 2 / s,
                    y: (naturalHeight - cropH) / 2 / s,
                    width: cropW / s,
                    height: cropH / s,
                });
            }
        },
        [currentFormat, aspectRatio, existingFormats, crops, toDisplayCrop],
    );

    const saveCurrent = useCallback(() => {
        if (!currentCrop || !currentFormat) return;

        const pixelCrop = currentCrop as PixelCrop;
        setCrops((prev) => ({
            ...prev,
            [currentFormat]: toNaturalCoords(pixelCrop),
        }));
    }, [currentCrop, currentFormat, toNaturalCoords]);

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
        const finalCrops = { ...crops };
        if (currentCrop && currentFormat) {
            const pixelCrop = currentCrop as PixelCrop;
            finalCrops[currentFormat] = toNaturalCoords(pixelCrop);
        }
        console.log('[Cropper] handleComplete', { finalCrops, crops, currentFormat, hasCurrentCrop: !!currentCrop, scale: scaleRef.current });
        onComplete(finalCrops);
        onClose();
    }, [saveCurrent, crops, currentCrop, currentFormat, onComplete, onClose, toNaturalCoords]);

    const handleClose = useCallback(() => {
        setActiveStep(initialStep);
        setCrops({});
        setCurrentCrop(undefined);
        onClose();
    }, [onClose, initialStep]);

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
