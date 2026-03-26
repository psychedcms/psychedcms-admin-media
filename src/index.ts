import React from 'react';
import { FunctionField } from 'react-admin';
import { registerPlugin } from '@psychedcms/admin-core';
import type { InputResolverProps, ListColumnResolverProps } from '@psychedcms/admin-core';

import { MediaImageInput } from './components/MediaImageInput.tsx';
import { MediaFileInput } from './components/MediaFileInput.tsx';
import { MediaImageListInput } from './components/MediaImageListInput.tsx';
import { MediaFileListInput } from './components/MediaFileListInput.tsx';
import { MediaLibraryPage } from './components/MediaLibraryPage.tsx';
import { MediaEditorButton } from './components/MediaEditorButton.tsx';
import { enMessages } from './i18n/en.ts';
import { frMessages } from './i18n/fr.ts';

import PermMediaIcon from '@mui/icons-material/PermMedia';

registerPlugin({
    inputResolvers: [
        {
            types: ['image'],
            resolve: (props: InputResolverProps) =>
                React.createElement(MediaImageInput, props),
        },
        {
            types: ['file'],
            resolve: (props: InputResolverProps) =>
                React.createElement(MediaFileInput, props),
        },
        {
            types: ['imagelist'],
            resolve: (props: InputResolverProps) =>
                React.createElement(MediaImageListInput, props),
        },
        {
            types: ['filelist'],
            resolve: (props: InputResolverProps) =>
                React.createElement(MediaFileListInput, props),
        },
    ],
    listColumnResolvers: [
        {
            types: ['image'],
            resolve: ({ source, label }: ListColumnResolverProps) =>
                React.createElement(FunctionField, {
                    source,
                    label,
                    render: (record: Record<string, unknown>) => {
                        const value = record[source] as Record<string, string> | null;
                        if (!value?.thumbnailUrl) return null;
                        return React.createElement('img', {
                            src: value.thumbnailUrl,
                            height: 32,
                            style: { borderRadius: 4, objectFit: 'cover' },
                            alt: '',
                        });
                    },
                }),
        },
    ],
    editorToolbarButtons: [
        {
            component: MediaEditorButton,
            position: 10,
        },
    ],
    toolPages: [
        {
            path: 'media',
            component: MediaLibraryPage,
            menuLabel: 'Media',
            menuIcon: PermMediaIcon,
        },
    ],
    i18nMessages: { en: enMessages, fr: frMessages },
});

export { MediaBrowser } from './components/MediaBrowser.tsx';
export { MediaImageInput } from './components/MediaImageInput.tsx';
export { MediaFileInput } from './components/MediaFileInput.tsx';
export { MediaImageListInput } from './components/MediaImageListInput.tsx';
export { MediaFileListInput } from './components/MediaFileListInput.tsx';
export { MediaLibraryPage } from './components/MediaLibraryPage.tsx';
export { MediaCategoryChip } from './components/MediaCategoryChip.tsx';
export { MediaCategoryDialog } from './components/MediaCategoryDialog.tsx';
export { MediaCategorySidebar } from './components/MediaCategorySidebar.tsx';
export { MediaAdvancedFilters } from './components/MediaAdvancedFilters.tsx';
export type { MediaFilters } from './components/MediaAdvancedFilters.tsx';
export { defaultFilters } from './components/MediaAdvancedFilters.tsx';
export { MediaImageEditor } from './components/MediaImageEditor.tsx';
export { MediaImageEditorDialog } from './components/MediaImageEditorDialog.tsx';
export { MediaFormatCropper } from './components/MediaFormatCropper.tsx';
export { MediaDropZone } from './components/MediaDropZone.tsx';
export { MediaBulkActions } from './components/MediaBulkActions.tsx';
export { MediaBulkMetadataDialog } from './components/MediaBulkMetadataDialog.tsx';
export { MediaStorageDashboard } from './components/MediaStorageDashboard.tsx';
export { MediaExifPanel } from './components/MediaExifPanel.tsx';
export { useMediaUpload } from './hooks/useMediaUpload.ts';
export { useMediaReplace } from './hooks/useMediaReplace.ts';
export { useUploadConfig } from './hooks/useUploadConfig.ts';
export type { UploadConfig } from './hooks/useUploadConfig.ts';
export type { MediaRecord } from './hooks/useMediaUpload.ts';
export { FileSizeWarningDialog } from './components/FileSizeWarningDialog.tsx';
export { validateFileType, checkFileSize, getMaxSizeForFile, getMaxSizeForCategory, getMediaCategory, formatFileSize, getAcceptFromAllowedTypes } from './utils/validateFile.ts';
export type { MediaCategory } from './utils/validateFile.ts';
