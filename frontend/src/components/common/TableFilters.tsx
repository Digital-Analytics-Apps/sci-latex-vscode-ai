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
import React, { useMemo } from "react";

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
 * Configuração genérica declarativa de um filtro de seleção em dropdown.
 */
export interface TableSelectFilterConfig<
  V = string,
  TFilterState = Record<string, any>,
> {
  id: keyof TFilterState | string;
  label: string;
  value: V;
  onChange: (value: V) => void;
  options: TableSelectOption[];
  minWidth?: number | string;
  disabled?: boolean;
}

/**
 * Toolbar de Filtros Integrada no Cabeçalho de Cards e DataGrids com Generics.
 * Suporta modo declarativo (search, selectFilters, actions, clearFilters)
 * ou modo livre (children).
 */
export interface TableHeaderFilterToolbarProps<
  TFilterState extends Record<string, any> = Record<string, any>,
> {
  /** Configuração do campo de busca textual */
  search?: TableSearchInputProps;
  /** Alias para busca textual */
  searchProps?: TableSearchInputProps;
  /** Lista de filtros de seleção (dropdowns) */
  selectFilters?: TableSelectFilterConfig<string, TFilterState>[];
  /** Elemento ou botões de ações primárias (ex: "Novo Artigo", "Nova Tarefa") */
  actions?: React.ReactNode;
  /** Configuração do botão de limpar filtros */
  clearFilters?: {
    visible?: boolean;
    onClear: () => void;
    label?: string;
  };
  /** Alias para botão de limpar filtros */
  clearFiltersProps?: {
    visible?: boolean;
    onClear: () => void;
    label?: string;
  };
  /** Elementos filhos customizados (modo livre / composição manual) */
  children?: React.ReactNode;
  /** Override manual de gridTemplateColumns */
  gridTemplateColumns?:
    | {
        xs?: string;
        sm?: string;
        md?: string;
        lg?: string;
      }
    | string;
  sx?: BoxProps["sx"];
}

export const TableHeaderFilterToolbar = <
  TFilterState extends Record<string, any> = Record<string, any>,
>({
  children,
  search,
  searchProps,
  selectFilters,
  actions,
  clearFilters,
  clearFiltersProps,
  gridTemplateColumns,
  sx,
}: TableHeaderFilterToolbarProps<TFilterState>) => {
  const activeSearch = search ?? searchProps;
  const activeClearFilters = clearFilters ?? clearFiltersProps;

  const defaultMdColumns = useMemo(() => {
    if (gridTemplateColumns) return undefined;
    const parts: string[] = [];
    if (activeSearch) parts.push("2fr");
    if (selectFilters && selectFilters.length > 0) {
      selectFilters.forEach(() => parts.push("1.2fr"));
    }
    if (actions) parts.push("auto");
    if (activeClearFilters) parts.push("auto");
    return parts.length > 0 ? parts.join(" ") : undefined;
  }, [
    gridTemplateColumns,
    activeSearch,
    selectFilters,
    actions,
    activeClearFilters,
  ]);

  const computedGridTemplateColumns = gridTemplateColumns ?? {
    xs: "1fr",
    sm: selectFilters && selectFilters.length > 1 ? "1fr 1fr" : "1fr auto",
    md: defaultMdColumns ?? "2fr 1.5fr auto auto",
  };

  return (
    <Box
      sx={{
        p: 2,
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        display: "grid",
        gridTemplateColumns: computedGridTemplateColumns,
        gap: 2,
        alignItems: "center",
        ...sx,
      }}
    >
      {activeSearch && <TableSearchInput {...activeSearch} />}

      {selectFilters?.map((sf) => (
        <TableSelectFilter
          key={String(sf.id)}
          label={sf.label}
          value={sf.value}
          onChange={sf.onChange}
          options={sf.options}
          minWidth={sf.minWidth}
          disabled={sf.disabled}
        />
      ))}

      {actions}

      {activeClearFilters && (
        <ClearFiltersButton
          visible={activeClearFilters.visible ?? true}
          onClick={activeClearFilters.onClear}
          label={activeClearFilters.label}
        />
      )}

      {children}
    </Box>
  );
};

/** Alias para manter compatibilidade com TableHeaderToolbar */
export const TableHeaderToolbar = TableHeaderFilterToolbar;
export type TableHeaderToolbarProps<
  TFilterState extends Record<string, any> = Record<string, any>,
> = TableHeaderFilterToolbarProps<TFilterState>;

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
