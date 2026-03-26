import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Box,
    Link,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface MediaExifPanelProps {
    exifData: Record<string, unknown> | null | undefined;
}

interface GpsData {
    latitude?: number;
    longitude?: number;
    altitude?: number;
}

function ExifField({ label, value }: { label: string; value: unknown }) {
    if (value === null || value === undefined || value === '') return null;
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
            <Typography variant="caption" color="textSecondary">
                {label}
            </Typography>
            <Typography variant="caption">{String(value)}</Typography>
        </Box>
    );
}

function ExifSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" fontWeight="bold" sx={{ display: 'block', mb: 0.5 }}>
                {title}
            </Typography>
            {children}
        </Box>
    );
}

export function MediaExifPanel({ exifData }: MediaExifPanelProps) {
    if (!exifData) return null;

    const gps = exifData.gps as GpsData | undefined;

    const hasCameraData = !!(exifData.cameraMake || exifData.cameraModel || exifData.software);
    const hasExposureData = !!(
        exifData.exposureTime ||
        exifData.fNumber ||
        exifData.iso ||
        exifData.focalLength ||
        exifData.flash
    );
    const hasGpsData = gps?.latitude !== undefined && gps?.longitude !== undefined;
    const hasDate = !!exifData.dateTimeOriginal;

    if (!hasCameraData && !hasExposureData && !hasGpsData && !hasDate) return null;

    return (
        <Accordion variant="outlined" disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">EXIF Info</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
                {hasCameraData && (
                    <ExifSection title="Camera">
                        <ExifField label="Make" value={exifData.cameraMake} />
                        <ExifField label="Model" value={exifData.cameraModel} />
                        <ExifField label="Software" value={exifData.software} />
                    </ExifSection>
                )}

                {hasExposureData && (
                    <ExifSection title="Exposure">
                        <ExifField label="Exposure time" value={exifData.exposureTime} />
                        <ExifField label="F-number" value={exifData.fNumber} />
                        <ExifField label="ISO" value={exifData.iso} />
                        <ExifField label="Focal length" value={exifData.focalLength} />
                        <ExifField label="Flash" value={exifData.flash} />
                    </ExifSection>
                )}

                {hasGpsData && (
                    <ExifSection title="GPS">
                        <ExifField label="Latitude" value={gps.latitude} />
                        <ExifField label="Longitude" value={gps.longitude} />
                        {gps.altitude !== undefined && (
                            <ExifField label="Altitude" value={`${gps.altitude} m`} />
                        )}
                        <Box sx={{ mt: 0.5 }}>
                            <Link
                                href={`https://www.openstreetmap.org/?mlat=${gps.latitude}&mlon=${gps.longitude}#map=16/${gps.latitude}/${gps.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="caption"
                            >
                                View on OpenStreetMap
                            </Link>
                        </Box>
                    </ExifSection>
                )}

                {hasDate && (
                    <ExifSection title="Date">
                        <ExifField label="Date taken" value={exifData.dateTimeOriginal} />
                    </ExifSection>
                )}
            </AccordionDetails>
        </Accordion>
    );
}
