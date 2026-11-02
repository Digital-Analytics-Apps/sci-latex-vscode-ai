import React from 'react';
import { Chip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SearchIcon from '@mui/icons-material/Search';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EditNoteIcon from '@mui/icons-material/EditNote';
import type { AgentName } from '../../features/ai-chat/types/chat.types';

interface ChatAgentBadgeProps {
  agent?: AgentName;
  size?: 'small' | 'medium';
}

interface AgentMetadata {
  label: string;
  color: 'primary' | 'info' | 'success' | 'warning' | 'secondary' | 'default';
  icon: React.ReactElement;
}

const AGENT_MAP: Record<AgentName, AgentMetadata> = {
  supervisor: {
    label: 'Belisa',
    color: 'primary',
    icon: <AutoAwesomeIcon sx={{ fontSize: 16 }} />,
  },
  idea_refiner: {
    label: 'Guia de Exploração',
    color: 'info',
    icon: <LightbulbOutlinedIcon sx={{ fontSize: 16 }} />,
  },
  search_specialist: {
    label: 'Especialista de Busca',
    color: 'success',
    icon: <SearchIcon sx={{ fontSize: 16 }} />,
  },
  curation_manager: {
    label: 'Gerente de Curadoria',
    color: 'warning',
    icon: <CalendarMonthIcon sx={{ fontSize: 16 }} />,
  },
  writer: {
    label: 'Redator Acadêmico',
    color: 'secondary',
    icon: <EditNoteIcon sx={{ fontSize: 16 }} />,
  },
};

export const ChatAgentBadge: React.FC<ChatAgentBadgeProps> = ({
  agent = 'supervisor',
  size = 'small',
}) => {
  const meta = AGENT_MAP[agent] || AGENT_MAP.supervisor;

  return (
    <Chip
      size={size}
      icon={meta.icon}
      label={meta.label}
      color={meta.color}
      variant="outlined"
      sx={{
        fontWeight: 600,
        fontSize: '0.75rem',
        height: 24,
        '& .MuiChip-icon': {
          marginLeft: '4px',
        },
      }}
    />
  );
};
