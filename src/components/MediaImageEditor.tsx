import { useCallback } from 'react';
import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor';

interface MediaImageEditorProps {
    imageUrl: string;
    onSave: (editedImageBlob: Blob, fileName: string) => void;
    onClose: () => void;
}

export function MediaImageEditor({ imageUrl, onSave, onClose }: MediaImageEditorProps) {
    const handleSave = useCallback(
        (editedImageObject: { imageBase64?: string; fullName?: string }) => {
            if (!editedImageObject.imageBase64) return;

            // Convert base64 to blob
            const byteString = atob(editedImageObject.imageBase64.split(',')[1] || editedImageObject.imageBase64);
            const mimeMatch = editedImageObject.imageBase64.match(/^data:([^;]+);/);
            const mimeType = mimeMatch?.[1] || 'image/png';
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeType });

            onSave(blob, editedImageObject.fullName || 'edited-image.png');
        },
        [onSave],
    );

    return (
        <FilerobotImageEditor
            source={imageUrl}
            onSave={handleSave}
            onClose={onClose}
            savingPixelRatio={1}
            previewPixelRatio={1}
            annotationsCommon={{
                fill: '#ff0000',
            }}
            Crop={{
                presetsItems: [
                    { titleKey: '16:9', ratio: 16 / 9 },
                    { titleKey: '4:3', ratio: 4 / 3 },
                    { titleKey: '1:1', ratio: 1 },
                    { titleKey: '3:2', ratio: 3 / 2 },
                ],
                autoResize: true,
            }}
            tabsIds={[TABS.ADJUST, TABS.RESIZE]}
            defaultTabId={TABS.ADJUST}
            defaultToolId={TOOLS.CROP}
        />
    );
}
