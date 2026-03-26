import { useState } from 'react';
import { useTranslate } from 'react-admin';
import { ToggleButton } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import { useTiptapEditor } from 'ra-input-rich-text';
import { MediaBrowser } from './MediaBrowser.tsx';
import type { MediaRecord } from '../hooks/useMediaUpload.ts';

export function MediaEditorButton() {
  const editor = useTiptapEditor();
  const translate = useTranslate();
  const [open, setOpen] = useState(false);

  const handleSelect = (media: MediaRecord) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src: media.url, alt: media.altText ?? '' }).run();
    setOpen(false);
  };

  return (
    <>
      <ToggleButton
        aria-label={translate('psyched.media.browse')}
        title={translate('psyched.media.browse')}
        value="media-image"
        onClick={() => setOpen(true)}
        size="small"
      >
        <ImageIcon fontSize="inherit" />
      </ToggleButton>
      <MediaBrowser
        open={open}
        onClose={() => setOpen(false)}
        onSelect={handleSelect}
        mimeTypeFilter="image/"
      />
    </>
  );
}
