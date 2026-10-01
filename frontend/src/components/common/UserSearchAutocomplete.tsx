import {
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { useUserSearchQuery } from "../../hooks/useUserQueries";
import { MEMBER_ROLE_LABELS } from "../../constants/teams";
import type { UserMemberItem } from "../../types/user.types";

function normalizeRoles(roles?: string[] | string): string[] {
  if (!roles) return [];
  if (Array.isArray(roles)) return roles;
  return [roles];
}

interface BaseUserSearchProps {
  allowedRoles?: string[] | string;
  excludeRoles?: string[] | string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  fullWidth?: boolean;
  helperText?: string;
  size?: "small" | "medium";
  freeSolo?: boolean;
}

export interface SingleUserSearchProps extends BaseUserSearchProps {
  multiple?: false;
  value?: string;
  onChange: (email: string, user?: UserMemberItem | null) => void;
}

export interface MultiUserSearchProps extends BaseUserSearchProps {
  multiple: true;
  value: UserMemberItem[];
  onChange: (emails: string[], users: UserMemberItem[]) => void;
}

export type UserSearchAutocompleteProps =
  SingleUserSearchProps | MultiUserSearchProps;

export const UserSearchAutocomplete = (props: UserSearchAutocompleteProps) => {
  const {
    allowedRoles,
    excludeRoles,
    label = "Busca por nome ou e-mail",
    placeholder = "Digite nome ou e-mail do pesquisador...",
    required = false,
    fullWidth = true,
    helperText,
    size = "medium",
    freeSolo = false,
  } = props;

  // Estado único para o texto pesquisado no input (SEMPRE string)
  const initialValue =
    !props.multiple && typeof props.value === "string" ? props.value : "";
  const [searchText, setSearchText] = useState<string>(initialValue);

  // Sincronização de valor derivado quando a prop value é alterada externamente
  const [prevValue, setPrevValue] = useState<unknown>(props.value);
  if (props.value !== prevValue) {
    setPrevValue(props.value);
    if (!props.multiple) {
      setSearchText(typeof props.value === "string" ? props.value : "");
    }
  }

  const debouncedSearch = useDebounce(searchText, 300);

  // Normalização de arrays de roles permitidas e excluídas
  const allowedRolesArray = useMemo(
    () => normalizeRoles(allowedRoles),
    [allowedRoles],
  );

  const excludeRolesArray = useMemo(
    () => normalizeRoles(excludeRoles),
    [excludeRoles],
  );

  // Se houver apenas 1 role permitida, envia filtro direto para o backend
  const backendRoleFilter =
    allowedRolesArray.length === 1 ? allowedRolesArray[0] : undefined;

  const { data: usersList = [], isFetching } = useUserSearchQuery(
    debouncedSearch,
    backendRoleFilter,
  );

  // Filtragem local dos usuários encontrados pelo texto digitado
  const filteredUsers = useMemo(() => {
    return usersList.filter((user) => {
      if (allowedRolesArray.length > 0) {
        if (!user.role || !allowedRolesArray.includes(user.role)) {
          return false;
        }
      }
      if (excludeRolesArray.length > 0) {
        if (user.role && excludeRolesArray.includes(user.role)) {
          return false;
        }
      }
      return true;
    });
  }, [usersList, allowedRolesArray, excludeRolesArray]);

  const singleValue =
    !props.multiple && typeof props.value === "string" ? props.value : "";

  // Deriva o objeto UserMemberItem selecionado a partir do valor string (email ou id)
  const selectedOption = useMemo(() => {
    if (!singleValue) return null;
    const found = filteredUsers.find(
      (u) => u.email === singleValue || u.id === singleValue,
    );
    if (found) return found;
    return {
      id: "",
      name: singleValue,
      email: singleValue,
      role: "AUTHOR",
    } as unknown as UserMemberItem;
  }, [filteredUsers, singleValue]);

  // MODO MÚLTIPLO (Seleção de vários usuários)
  if (props.multiple) {
    const { value, onChange } = props;
    return (
      <Autocomplete<UserMemberItem, true, false, false>
        multiple
        fullWidth={fullWidth}
        options={filteredUsers}
        value={value || []}
        inputValue={searchText}
        onInputChange={(_e, newInputValue) => setSearchText(newInputValue)}
        onChange={(_e, newValue) => {
          const users = newValue as UserMemberItem[];
          const emails = users.map((u) => u.email);
          onChange(emails, users);
        }}
        getOptionLabel={(option) => option.name || option.email}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        loading={isFetching}
        noOptionsText={
          debouncedSearch.trim().length > 0 && debouncedSearch.trim().length < 3
            ? "Digite ao menos 3 letras para pesquisar..."
            : "Nenhum usuário encontrado."
        }
        renderInput={(params) => (
          <TextField
            {...params}
            size={size}
            required={required}
            label={label}
            placeholder={placeholder}
            helperText={helperText}
            slotProps={{
              ...params.slotProps,
              input: {
                ...params.slotProps.input,
                endAdornment: (
                  <>
                    {isFetching ? (
                      <CircularProgress color="inherit" size={18} />
                    ) : null}
                    {params.slotProps.input.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
        renderOption={(renderProps, option) => {
          const { key, ...optionProps } = renderProps as any;
          return (
            <Box
              component="li"
              key={key || option.id}
              {...optionProps}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                py: 1,
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {option.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.email}
                </Typography>
              </Box>
              <Chip
                label={
                  MEMBER_ROLE_LABELS[
                    option.role as keyof typeof MEMBER_ROLE_LABELS
                  ] || option.role
                }
                size="small"
                variant="outlined"
                color={option.role === "COORDINATOR" ? "warning" : "default"}
              />
            </Box>
          );
        }}
      />
    );
  }

  // MODO SIMPLES (Seleção de 1 usuário)
  const singleProps = props as SingleUserSearchProps;

  if (freeSolo) {
    return (
      <Autocomplete<UserMemberItem, false, false, true>
        freeSolo
        fullWidth={fullWidth}
        options={filteredUsers}
        inputValue={searchText}
        onInputChange={(_e, newInputValue, reason) => {
          setSearchText(newInputValue);
          if (reason === "input") {
            singleProps.onChange(newInputValue, null);
          } else if (reason === "clear") {
            singleProps.onChange("", null);
          }
        }}
        onChange={(_e, newValue) => {
          if (typeof newValue === "string") {
            setSearchText(newValue);
            singleProps.onChange(newValue, null);
          } else if (newValue) {
            setSearchText(newValue.name || newValue.email);
            singleProps.onChange(newValue.email, newValue);
          } else {
            setSearchText("");
            singleProps.onChange("", null);
          }
        }}
        getOptionLabel={(option) => {
          if (typeof option === "string") return option;
          return `${option.name} (${option.email})`;
        }}
        isOptionEqualToValue={(option, val) => {
          if (typeof val === "string") {
            return option.email === val || option.name === val;
          }
          return option.id === val.id;
        }}
        loading={isFetching}
        noOptionsText={
          debouncedSearch.trim().length > 0 && debouncedSearch.trim().length < 3
            ? "Digite ao menos 3 letras para pesquisar..."
            : "Nenhum usuário encontrado."
        }
        renderInput={(params) => (
          <TextField
            {...params}
            size={size}
            required={required}
            label={label}
            placeholder={placeholder}
            helperText={helperText}
            slotProps={{
              ...params.slotProps,
              input: {
                ...params.slotProps.input,
                endAdornment: (
                  <>
                    {isFetching ? (
                      <CircularProgress color="inherit" size={18} />
                    ) : null}
                    {params.slotProps.input.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
        renderOption={(renderProps, option) => {
          if (typeof option === "string") return null;
          const { key, ...optionProps } = renderProps as any;
          return (
            <Box
              component="li"
              key={key || option.id}
              {...optionProps}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                py: 1,
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {option.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.email}
                </Typography>
              </Box>
              <Chip
                label={
                  MEMBER_ROLE_LABELS[
                    option.role as keyof typeof MEMBER_ROLE_LABELS
                  ] || option.role
                }
                size="small"
                variant="outlined"
                color={option.role === "COORDINATOR" ? "warning" : "default"}
              />
            </Box>
          );
        }}
      />
    );
  }

  // MODO SELEÇÃO ESTRITA (Obrigatório escolher um usuário da lista)
  return (
    <Autocomplete<UserMemberItem, false, false, false>
      fullWidth={fullWidth}
      options={filteredUsers}
      value={selectedOption}
      inputValue={searchText}
      onInputChange={(_e, newInputValue, reason) => {
        setSearchText(newInputValue);
        if (reason === "clear") {
          singleProps.onChange("", null);
        }
      }}
      onChange={(_e, newValue) => {
        if (newValue) {
          setSearchText(newValue.name || newValue.email);
          singleProps.onChange(newValue.email, newValue);
        } else {
          setSearchText("");
          singleProps.onChange("", null);
        }
      }}
      getOptionLabel={(option) =>
        option.name ? `${option.name} (${option.email})` : option.email || ""
      }
      isOptionEqualToValue={(option, val) =>
        option.id === val.id || option.email === val.email
      }
      loading={isFetching}
      noOptionsText={
        debouncedSearch.trim().length > 0 && debouncedSearch.trim().length < 3
          ? "Digite ao menos 3 letras para pesquisar..."
          : "Nenhum usuário encontrado na lista."
      }
      renderInput={(params) => (
        <TextField
          {...params}
          size={size}
          required={required}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {isFetching ? (
                    <CircularProgress color="inherit" size={18} />
                  ) : null}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      renderOption={(renderProps, option) => {
        const { key, ...optionProps } = renderProps as any;
        return (
          <Box
            component="li"
            key={key || option.id}
            {...optionProps}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              py: 1,
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {option.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {option.email}
              </Typography>
            </Box>
            <Chip
              label={
                MEMBER_ROLE_LABELS[
                  option.role as keyof typeof MEMBER_ROLE_LABELS
                ] || option.role
              }
              size="small"
              variant="outlined"
              color={option.role === "COORDINATOR" ? "warning" : "default"}
            />
          </Box>
        );
      }}
    />
  );
};
