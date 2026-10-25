import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import { CollabEditorProvider } from '../context/CollabEditorContext';
import { EditorHeader } from '../components/EditorHeader';
import { EditorWorkspace } from '../components/EditorWorkspace';

export function EditorPage() {
  const { projectId, documentId } = useParams<{ projectId?: string; documentId?: string }>();
  const activeDocumentId = projectId || documentId || 'doc-1';

  return (
    <CollabEditorProvider documentId={activeDocumentId}>
      <Box
        id="ide-root"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: 'background.default',
          color: 'text.primary',
        }}
      >
        <EditorHeader />
        <EditorWorkspace />
      </Box>
    </CollabEditorProvider>
  );
}
