import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import type { ReviewType } from "./ReviewTypeSelector";

export interface UserOption {
  id: string;
  name: string;
}

interface ReviewerSelectorProps {
  reviewType: ReviewType;
  officialReviewer: UserOption;
  peerOptions: UserOption[];
  selectedPeers: UserOption[];
  onPeersChange: (peers: UserOption[]) => void;
}

export const ReviewerSelector = ({
  reviewType,
  officialReviewer,
  peerOptions,
  selectedPeers,
  onPeersChange,
}: ReviewerSelectorProps) => {
  if (reviewType === "TECHNICAL_REVIEW") {
    return (
      <TextField
        fullWidth
        size="small"
        label="Revisor Oficial (Orientador)"
        value={officialReviewer.name}
        slotProps={{
          input: { readOnly: true },
        }}
        helperText="A revisão técnica é conduzida pelo Revisor Oficial designado para o projeto."
      />
    );
  }

  return (
    <Autocomplete
      multiple
      id="peer-reviewers-select"
      options={peerOptions}
      value={selectedPeers}
      onChange={(_, newValue) => onPeersChange(newValue)}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      filterSelectedOptions
      noOptionsText={
        peerOptions.length === 0
          ? "Nenhum co-autor cadastrado neste projeto"
          : "Todos os co-autores do projeto já foram selecionados"
      }
      renderValue={(value, getItemProps) =>
        value.map((option, index) => {
          const { key, ...itemProps } = getItemProps({ index });
          return (
            <Chip
              variant="outlined"
              size="small"
              label={option.name}
              key={key}
              {...itemProps}
            />
          );
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label="Atribuir Co-autores para Revisão (Pares)"
          placeholder={
            selectedPeers.length === peerOptions.length &&
            peerOptions.length > 0
              ? ""
              : "Selecione um ou mais co-autores..."
          }
          helperText="Por padrão, todos os co-autores são selecionados para avaliar esta tarefa."
        />
      )}
    />
  );
};
