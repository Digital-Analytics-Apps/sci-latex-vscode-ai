import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Box,
  Divider,
  IconButton,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

interface ChatMarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

const CodeBlock: React.FC<{
  language?: string;
  codeString: string;
  isUser?: boolean;
}> = ({ language, codeString, isUser }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Paper
      elevation={0}
      sx={{
        my: 1.5,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: isUser ? 'rgba(255,255,255,0.2)' : 'divider',
        bgcolor: isUser ? 'rgba(0,0,0,0.35)' : 'grey.950',
      }}
    >
      {/* Barra superior do bloco de código */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.5,
          bgcolor: isUser ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid',
          borderColor: isUser ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.08)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: isUser ? 'rgba(255,255,255,0.7)' : 'grey.400',
          }}
        >
          {language || 'code'}
        </Typography>

        <Tooltip title={copied ? 'Copiado!' : 'Copiar código'}>
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{
              p: 0.5,
              color: copied ? 'success.light' : isUser ? 'rgba(255,255,255,0.7)' : 'grey.400',
              '&:hover': {
                color: isUser ? '#fff' : 'grey.200',
              },
            }}
          >
            {copied ? <CheckIcon sx={{ fontSize: 15 }} /> : <ContentCopyIcon sx={{ fontSize: 15 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Conteúdo do código */}
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.75,
          overflowX: 'auto',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.825rem',
          lineHeight: 1.5,
          color: isUser ? '#fff' : 'grey.100',
          '& code': {
            fontFamily: 'inherit',
          },
        }}
      >
        <code>{codeString}</code>
      </Box>
    </Paper>
  );
};

export const ChatMarkdownRenderer: React.FC<ChatMarkdownRendererProps> = ({
  content,
  isUser = false,
}) => {
  return (
    <Box
      sx={{
        fontSize: '0.925rem',
        lineHeight: 1.65,
        wordBreak: 'break-word',
        color: 'inherit',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <Typography
              variant="body1"
              sx={{
                fontSize: '0.925rem',
                lineHeight: 1.65,
                mb: 1.25,
                '&:last-child': { mb: 0 },
                color: 'inherit',
              }}
            >
              {children}
            </Typography>
          ),

          h1: ({ children }) => (
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                fontSize: '1.15rem',
                mt: 1.75,
                mb: 0.75,
                color: isUser ? 'inherit' : 'primary.main',
              }}
            >
              {children}
            </Typography>
          ),

          h2: ({ children }) => (
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                fontSize: '1.05rem',
                mt: 1.5,
                mb: 0.5,
                color: isUser ? 'inherit' : 'text.primary',
              }}
            >
              {children}
            </Typography>
          ),

          h3: ({ children }) => (
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: '0.95rem',
                mt: 1.25,
                mb: 0.5,
                color: isUser ? 'inherit' : 'text.primary',
              }}
            >
              {children}
            </Typography>
          ),

          ul: ({ children }) => (
            <Box
              component="ul"
              sx={{
                m: 0,
                mb: 1.25,
                pl: 2.5,
                '&:last-child': { mb: 0 },
                '& li': { mb: 0.5 },
              }}
            >
              {children}
            </Box>
          ),

          ol: ({ children }) => (
            <Box
              component="ol"
              sx={{
                m: 0,
                mb: 1.25,
                pl: 2.5,
                '&:last-child': { mb: 0 },
                '& li': { mb: 0.5 },
              }}
            >
              {children}
            </Box>
          ),

          table: ({ children }) => (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{
                my: 1.5,
                borderRadius: 2,
                overflowX: 'auto',
                bgcolor: isUser ? 'rgba(0,0,0,0.1)' : 'background.paper',
                borderColor: isUser ? 'rgba(255,255,255,0.2)' : 'divider',
              }}
            >
              <Table size="small" sx={{ minWidth: 320 }}>
                {children}
              </Table>
            </TableContainer>
          ),

          thead: ({ children }) => <TableHead>{children}</TableHead>,

          tbody: ({ children }) => <TableBody>{children}</TableBody>,

          tr: ({ children }) => (
            <TableRow
              sx={{
                '&:nth-of-type(even)': {
                  bgcolor: isUser ? 'rgba(255,255,255,0.03)' : 'action.hover',
                },
                '&:last-child td, &:last-child th': {
                  borderBottom: 0,
                },
              }}
            >
              {children}
            </TableRow>
          ),

          th: ({ children }) => (
            <TableCell
              sx={{
                fontWeight: 700,
                fontSize: '0.8rem',
                bgcolor: isUser ? 'rgba(255,255,255,0.1)' : 'action.selected',
                color: isUser ? 'inherit' : 'text.primary',
                borderBottom: '1px solid',
                borderColor: isUser ? 'rgba(255,255,255,0.2)' : 'divider',
                p: '6px 12px',
              }}
            >
              {children}
            </TableCell>
          ),

          td: ({ children }) => (
            <TableCell
              sx={{
                fontSize: '0.825rem',
                color: isUser ? 'inherit' : 'text.primary',
                borderBottom: '1px solid',
                borderColor: isUser ? 'rgba(255,255,255,0.1)' : 'divider',
                p: '6px 12px',
              }}
            >
              {children}
            </TableCell>
          ),

          blockquote: ({ children }) => (
            <Box
              sx={{
                borderLeft: '3px solid',
                borderColor: isUser ? 'rgba(255,255,255,0.6)' : 'primary.main',
                bgcolor: isUser ? 'rgba(255,255,255,0.08)' : 'action.hover',
                pl: 1.5,
                py: 0.75,
                my: 1.25,
                borderRadius: '0 8px 8px 0',
                fontStyle: 'italic',
                opacity: 0.95,
              }}
            >
              {children}
            </Box>
          ),

          hr: () => (
            <Divider
              sx={{
                my: 1.5,
                borderColor: isUser ? 'rgba(255,255,255,0.2)' : 'divider',
              }}
            />
          ),

          a: ({ href, children }) => (
            <Link
              href={href}
              target="_blank"
              rel="noreferrer"
              underline="hover"
              color={isUser ? 'inherit' : 'primary'}
              sx={{ fontWeight: 600 }}
            >
              {children}
            </Link>
          ),

          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : undefined;
            const isMultiline = String(children).includes('\n') || Boolean(language);

            if (isMultiline) {
              return (
                <CodeBlock
                  language={language}
                  codeString={String(children).replace(/\n$/, '')}
                  isUser={isUser}
                />
              );
            }

            return (
              <Box
                component="code"
                sx={{
                  px: 0.6,
                  py: 0.2,
                  borderRadius: 1,
                  bgcolor: isUser ? 'rgba(255,255,255,0.2)' : 'action.selected',
                  border: '1px solid',
                  borderColor: isUser ? 'rgba(255,255,255,0.1)' : 'divider',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.825rem',
                }}
                {...props}
              >
                {children}
              </Box>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
};
