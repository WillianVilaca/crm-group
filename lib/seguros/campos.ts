import type { CustomFieldDef } from "@/lib/schemas/settings";

/**
 * Campos que ajudam a equipe a fazer a primeira triagem sem transformar o
 * formulário em uma vistoria. Nome e WhatsApp continuam sendo os campos
 * estruturais do lead; estes entram em `custom_fields` e podem ser editados no
 * dossiê depois.
 */
export const CAMPOS_DE_SEGURO = [
  {
    key: "tipo_veiculo",
    label: "Tipo de veículo",
    type: "select",
    options: [
      { value: "carro", label: "Carro" },
      { value: "moto", label: "Moto" },
      { value: "caminhao", label: "Caminhão" },
      { value: "utilitario", label: "Utilitário" },
      { value: "outro", label: "Outro" },
    ],
  },
  { key: "marca_veiculo", label: "Marca do veículo", type: "text" },
  { key: "modelo_veiculo", label: "Modelo do veículo", type: "text" },
  { key: "ano_veiculo", label: "Ano do veículo", type: "number" },
  { key: "cidade_uf", label: "Cidade e UF", type: "text" },
  {
    key: "tipo_protecao",
    label: "Proteção desejada",
    type: "select",
    options: [
      { value: "seguro_auto", label: "Seguro auto" },
      { value: "protecao_veicular", label: "Proteção veicular" },
      { value: "assistencia_24h", label: "Assistência 24h" },
      { value: "nao_sei", label: "Ainda não sei" },
    ],
  },
  { key: "observacoes", label: "Observações", type: "textarea" },
] satisfies readonly CustomFieldDef[];
