import FilterListOffIcon from "@mui/icons-material/FilterListOff";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
} from "@mui/material";
import type {
  BoxProps,
  ButtonProps,
  FormControlProps,
  PaperProps,
  SelectProps,
  TextFieldProps,
} from "@mui/material";
import React from "react";

/**
 * Campo de Busca Textual para Tabelas (extende TextFieldProps).
 */
export interface TableSearchInputProps extends Omit<
  TextFieldProps,
  "onChange"
> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const TableSearchInput = ({
  value,
  onChange,
  placeholder = "Buscar...",
  fullWidth = true,
  size = "small",
  slotProps,
  ...restProps
}: TableSearchInputProps) => {
  return (
    <TextField
      fullWidth={fullWidth}
      size={size}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          ...slotProps?.input,
        },
        ...slotProps,
      }}
      {...restProps}
    />
  );
};

/**
 * Opção individual para SelectFilter.
 */
export interface TableSelectOption {
  value: string;
  label: string;
}

/**
 * Dropdown de Seleção/Filtro por Categoria, Papel ou Status (extende SelectProps).
 */
export interface TableSelectFilterProps extends Omit<
  SelectProps<string>,
  "onChange"
> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: TableSelectOption[];
  formControlProps?: FormControlProps;
  minWidth?: number | string;
}

export const TableSelectFilter = ({
  label,
  value,
  onChange,
  options,
  fullWidth = true,
  size = "small",
  variant = "outlined",
  minWidth = 140,
  formControlProps,
  ...restSelectProps
}: TableSelectFilterProps) => {
  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      variant={variant}
      sx={{ minWidth, ...formControlProps?.sx }}
      {...formControlProps}
    >
      <InputLabel>{label}</InputLabel>
      <Select<string>
        value={value}
        label={label}
        variant={variant}
        onChange={(e) => onChange(e.target.value as string)}
        {...restSelectProps}
      >
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

/**
 * Botão para Limpar Todos os Filtros Ativos (extende ButtonProps).
 */
export interface ClearFiltersButtonProps extends ButtonProps {
  visible?: boolean;
  label?: string;
}

export const ClearFiltersButton = ({
  onClick,
  visible = true,
  label = "Limpar Filtros",
  variant = "outlined",
  color = "secondary",
  size = "small",
  startIcon = <FilterListOffIcon fontSize="small" />,
  sx,
  ...restButtonProps
}: ClearFiltersButtonProps) => {
  if (!visible) return null;

  return (
    <Button
      variant={variant}
      color={color}
      size={size}
      startIcon={startIcon}
      onClick={onClick}
      sx={{ whiteSpace: "nowrap", height: 40, fontWeight: 600, ...sx }}
      {...restButtonProps}
    >
      {label}
    </Button>
  );
};

/**
 * Container de Barra de Filtros em Grid Responsivo (extende PaperProps).
 */
export interface TableFilterBarProps extends PaperProps {
  children: React.ReactNode;
  gridTemplateColumns?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
  };
  containerProps?: BoxProps;
}

export const TableFilterBar: React.FC<TableFilterBarProps> = ({
  children,
  gridTemplateColumns = {
    xs: "1fr",
    sm: "1fr 1fr",
    md: "2fr 1fr auto auto",
  },
  sx,
  variant = "outlined",
  containerProps,
  ...restPaperProps
}) => {
  return (
    <Paper
      variant={variant}
      sx={{
        p: 2,
        mb: 2.5,
        bgcolor: "background.paper",
        ...sx,
      }}
      {...restPaperProps}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns,
          gap: 2,
          alignItems: "center",
          ...containerProps?.sx,
        }}
        {...containerProps}
      >
        {children}
      </Box>
    </Paper>
  );
};
