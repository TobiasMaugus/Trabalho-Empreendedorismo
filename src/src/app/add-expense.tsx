import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronLeft, Users } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styled from "styled-components/native";
import { Avatar } from "../components/Avatar";
import { ThemeColors } from "../constants/theme";
import { useAppContext } from "../context/AppContext";
import { useThemeContext } from "../context/ThemeContext";

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

/** Formata uma Date em pt-BR extenso: "Domingo, 31 de Agosto de 2026" */
const formatDateBR = (d: Date): string => {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/** Capitaliza a primeira letra */
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function AddExpenseScreen() {
  const { profiles, addGenericExpense, updateGenericExpense, expenses } =
    useAppContext();
  const { colors } = useThemeContext();
  const router = useRouter();
  const params = useLocalSearchParams();
  const editId = params.id as string | undefined;

  // Busca gasto existente se em modo edição
  const existingExpense = useMemo(
    () => (editId ? expenses.find((e) => e.id === editId) : undefined),
    [editId, expenses],
  );
  const isEditMode = !!existingExpense;

  // Form state
  const [title, setTitle] = useState("");
  const [rawAmount, setRawAmount] = useState(""); // Valor em centavos como string
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [payerId, setPayerId] = useState<string>(profiles[0]?.id ?? "");
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(
    () => new Set(profiles.map((p) => p.id)),
  );

  // DatePicker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Pré-preenche campos no modo edição
  useEffect(() => {
    if (!existingExpense) return;

    setTitle(existingExpense.title);
    setDescription(existingExpense.description ?? "");
    setPayerId(existingExpense.payerId);

    // Converte valor para centavos como string
    const cents = Math.round(existingExpense.totalAmount * 100);
    setRawAmount(String(cents));

    // Converte data ISO para Date
    const [y, m, d] = existingExpense.date.split("-").map(Number);
    setSelectedDate(new Date(y, m - 1, d));

    // Preenche participantes
    setSelectedParticipants(
      new Set(existingExpense.participants.map((p) => p.profileId)),
    );
  }, [existingExpense]);

  // Máscara de moeda: armazena centavos, exibe formatado
  const handleAmountChange = (text: string) => {
    // Remove tudo que não é dígito
    const digits = text.replace(/\D/g, "");
    setRawAmount(digits);
  };

  const getDisplayAmount = (): string => {
    if (!rawAmount) return "";
    const cents = parseInt(rawAmount, 10);
    if (isNaN(cents)) return "";
    const reais = cents / 100;
    return reais.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getNumericAmount = (): number => {
    if (!rawAmount) return 0;
    const cents = parseInt(rawAmount, 10);
    if (isNaN(cents)) return 0;
    return cents / 100;
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedParticipants.size === profiles.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(profiles.map((p) => p.id)));
    }
  };

  // ─── Date helpers ───

  const setToday = () => setSelectedDate(new Date());

  const setYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    date?: Date,
  ) => {
    setShowDatePicker(Platform.OS === "ios"); // iOS keeps picker open
    if (date) setSelectedDate(date);
  };

  const getISODate = (): string => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const isToday = useMemo(() => {
    const now = new Date();
    return (
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate()
    );
  }, [selectedDate]);

  const isYesterday = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      selectedDate.getFullYear() === yesterday.getFullYear() &&
      selectedDate.getMonth() === yesterday.getMonth() &&
      selectedDate.getDate() === yesterday.getDate()
    );
  }, [selectedDate]);

  // ─── Save handler ───

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Campo obrigatório", "Informe o título do gasto.");
      return;
    }
    const amount = getNumericAmount();
    if (amount <= 0) {
      Alert.alert("Valor inválido", "Informe um valor maior que zero.");
      return;
    }
    if (!payerId) {
      Alert.alert("Pagador", "Selecione quem pagou a conta.");
      return;
    }
    if (selectedParticipants.size === 0) {
      Alert.alert(
        "Participantes",
        "Selecione ao menos um participante para a divisão.",
      );
      return;
    }

    const expenseData = {
      title: title.trim(),
      description: description.trim() || undefined,
      date: getISODate(),
      totalAmount: amount,
      payerId,
      participantIds: Array.from(selectedParticipants),
    };

    if (isEditMode && editId) {
      updateGenericExpense(editId, expenseData);
    } else {
      addGenericExpense(expenseData);
    }

    router.back();
  };

  const perPerson =
    selectedParticipants.size > 0
      ? getNumericAmount() / selectedParticipants.size
      : 0;

  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <Header>
          <HeaderTop>
            <BackButton onPress={() => router.back()} activeOpacity={0.7}>
              <ChevronLeft size={20} color={colors.textMuted} />
              <BackText>Voltar</BackText>
            </BackButton>
            <SaveButton onPress={handleSave} activeOpacity={0.8}>
              <Check size={18} color="#FFFFFF" />
              <SaveText>Salvar</SaveText>
            </SaveButton>
          </HeaderTop>
          <ScreenTitle>
            {isEditMode ? "Editar Gasto" : "Novo Gasto"}
          </ScreenTitle>
          <ScreenSubtitle>
            {isEditMode
              ? "Altere os dados do gasto e salve."
              : "Adicione um gasto manual dividido igualmente."}
          </ScreenSubtitle>
        </Header>

        <StyledScrollView>
          {/* Título */}
          <FieldGroup>
            <FieldLabel>Título *</FieldLabel>
            <StyledInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Almoço no restaurante"
              placeholderTextColor={colors.textMuted}
              maxLength={80}
            />
          </FieldGroup>

          {/* Valor */}
          <FieldGroup>
            <FieldLabel>Valor Total *</FieldLabel>
            <AmountInputRow>
              <CurrencyPrefix>R$</CurrencyPrefix>
              <AmountInput
                value={getDisplayAmount()}
                onChangeText={handleAmountChange}
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={12}
              />
            </AmountInputRow>
          </FieldGroup>

          {/* Descrição */}
          <FieldGroup>
            <FieldLabel>Descrição (opcional)</FieldLabel>
            <StyledInput
              value={description}
              onChangeText={setDescription}
              placeholder="Detalhes adicionais..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 80 }}
            />
          </FieldGroup>

          {/* Data */}
          <FieldGroup>
            <FieldLabel>Data do Gasto</FieldLabel>

            {/* Atalhos rápidos */}
            <DateShortcutsRow>
              <DateShortcutPill
                onPress={setToday}
                activeOpacity={0.7}
                $active={isToday}
              >
                <DateShortcutText $active={isToday}>Hoje</DateShortcutText>
              </DateShortcutPill>

              <DateShortcutPill
                onPress={setYesterday}
                activeOpacity={0.7}
                $active={isYesterday}
              >
                <DateShortcutText $active={isYesterday}>
                  Ontem
                </DateShortcutText>
              </DateShortcutPill>

              <DateShortcutPill
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
                $active={!isToday && !isYesterday}
              >
                <DateShortcutText $active={!isToday && !isYesterday}>
                  📅 Selecionar
                </DateShortcutText>
              </DateShortcutPill>
            </DateShortcutsRow>

            {/* Display da data selecionada */}
            <Pressable onPress={() => setShowDatePicker(true)}>
              <DateDisplay>
                <DateDisplayText>
                  {capitalize(formatDateBR(selectedDate))}
                </DateDisplayText>
              </DateDisplay>
            </Pressable>

            {/* DateTimePicker nativo */}
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                maximumDate={new Date()}
                locale="pt-BR"
              />
            )}
          </FieldGroup>

          {/* Pagador */}
          <FieldGroup>
            <FieldLabel>Quem pagou a conta?</FieldLabel>
            <PayerList>
              {profiles.map((p) => {
                const isSelected = payerId === p.id;
                return (
                  <PayerOption
                    key={p.id}
                    onPress={() => setPayerId(p.id)}
                    activeOpacity={0.7}
                    $selected={isSelected}
                  >
                    <Avatar name={p.name} color={p.color} size="sm" />
                    <PayerName $selected={isSelected} numberOfLines={1}>
                      {p.name.split(" ")[0]}
                    </PayerName>
                    {isSelected && (
                      <SelectedDot
                        style={{ backgroundColor: colors.accent }}
                      />
                    )}
                  </PayerOption>
                );
              })}
            </PayerList>
          </FieldGroup>

          {/* Participantes */}
          <FieldGroup>
            <ParticipantHeader>
              <FieldLabel style={{ marginBottom: 0 }}>
                Participantes da divisão
              </FieldLabel>
              <ToggleAllBtn onPress={toggleAll} activeOpacity={0.7}>
                <Users size={14} color={colors.accent} />
                <ToggleAllText>
                  {selectedParticipants.size === profiles.length
                    ? "Desmarcar Todos"
                    : "Marcar Todos"}
                </ToggleAllText>
              </ToggleAllBtn>
            </ParticipantHeader>

            {profiles.map((p) => {
              const isChecked = selectedParticipants.has(p.id);
              return (
                <ParticipantRow
                  key={p.id}
                  onPress={() => toggleParticipant(p.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      flex: 1,
                    }}
                  >
                    <Avatar name={p.name} color={p.color} size="sm" />
                    <ParticipantName numberOfLines={1}>
                      {p.name}
                    </ParticipantName>
                  </View>

                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                  >
                    {isChecked && perPerson > 0 && (
                      <PerPersonBadge>
                        <PerPersonText>{fmt(perPerson)}</PerPersonText>
                      </PerPersonBadge>
                    )}
                    <Checkbox $checked={isChecked}>
                      {isChecked && <Check size={14} color="#FFFFFF" />}
                    </Checkbox>
                  </View>
                </ParticipantRow>
              );
            })}
          </FieldGroup>

          {/* Resumo */}
          {selectedParticipants.size > 0 && getNumericAmount() > 0 && (
            <SummaryCard>
              <SummaryTitle>Resumo da Divisão</SummaryTitle>
              <SummaryRow>
                <SummaryLabel>Total</SummaryLabel>
                <SummaryValue>{fmt(getNumericAmount())}</SummaryValue>
              </SummaryRow>
              <SummaryRow>
                <SummaryLabel>Participantes</SummaryLabel>
                <SummaryValue>{selectedParticipants.size}</SummaryValue>
              </SummaryRow>
              <SummaryDivider />
              <SummaryRow>
                <SummaryLabel style={{ fontWeight: "800" }}>
                  Por pessoa
                </SummaryLabel>
                <SummaryHighlight>{fmt(perPerson)}</SummaryHighlight>
              </SummaryRow>
            </SummaryCard>
          )}

          <Spacing />
        </StyledScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
}

// ==========================================
// STYLED COMPONENTS
// ==========================================

const Container = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.background};
`;

const Header = styled.View`
  padding: 16px 24px 0 24px;
`;

const HeaderTop = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const BackButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

const BackText = styled.Text`
  color: ${({ theme }: { theme: ThemeColors }) => theme.textMuted};
  font-size: 16px;
  font-weight: 600;
`;

const SaveButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.accent};
  padding: 10px 20px;
  border-radius: 12px;
`;

const SaveText = styled.Text`
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
`;

const ScreenTitle = styled.Text`
  font-size: 32px;
  font-weight: 900;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
  letter-spacing: -0.5px;
  line-height: 38px;
`;

const ScreenSubtitle = styled.Text`
  font-size: 15px;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textSecondary};
  margin-top: 8px;
  font-weight: 500;
  margin-bottom: 8px;
`;

const StyledScrollView = styled(ScrollView).attrs({
  contentContainerStyle: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  showsVerticalScrollIndicator: false,
})`
  flex: 1;
`;

const FieldGroup = styled.View`
  margin-bottom: 24px;
`;

const FieldLabel = styled.Text`
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StyledInput = styled(TextInput)`
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.inputBackground};
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.borderLight};
`;

const AmountInputRow = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.inputBackground};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.borderLight};
  padding-left: 16px;
`;

const CurrencyPrefix = styled.Text`
  font-size: 18px;
  font-weight: 900;
  color: ${({ theme }: { theme: ThemeColors }) => theme.accent};
  margin-right: 8px;
`;

const AmountInput = styled(TextInput)`
  flex: 1;
  padding: 14px 16px 14px 0;
  font-size: 22px;
  font-weight: 800;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
`;

// ─── Date Picker ───

const DateShortcutsRow = styled.View`
  flex-direction: row;
  gap: 8px;
  margin-bottom: 12px;
`;

const DateShortcutPill = styled.TouchableOpacity<{ $active: boolean }>`
  padding: 8px 16px;
  border-radius: 999px;
  background-color: ${({
    $active,
    theme,
  }: {
    $active: boolean;
    theme: ThemeColors;
  }) => ($active ? theme.accent : theme.backgroundElement)};
  border-width: 1px;
  border-color: ${({
    $active,
    theme,
  }: {
    $active: boolean;
    theme: ThemeColors;
  }) => ($active ? theme.accent : theme.borderLight)};
`;

const DateShortcutText = styled.Text<{ $active: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ $active, theme }: { $active: boolean; theme: ThemeColors }) =>
    $active ? "#FFFFFF" : theme.textSecondary};
`;

const DateDisplay = styled.View`
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.inputBackground};
  border-radius: 14px;
  padding: 14px 16px;
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.borderLight};
`;

const DateDisplayText = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
`;

// ─── Payer ───

const PayerList = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 10px;
`;

const PayerOption = styled.TouchableOpacity<{ $selected: boolean }>`
  align-items: center;
  padding: 12px 14px;
  border-radius: 16px;
  border-width: 2px;
  border-color: ${({
    $selected,
    theme,
  }: {
    $selected: boolean;
    theme: ThemeColors;
  }) => ($selected ? theme.accent : theme.borderLight)};
  background-color: ${({
    $selected,
    theme,
  }: {
    $selected: boolean;
    theme: ThemeColors;
  }) => ($selected ? theme.accentLight : theme.cardBackground)};
  gap: 6px;
  min-width: 80px;
`;

const PayerName = styled.Text<{ $selected: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({
    $selected,
    theme,
  }: {
    $selected: boolean;
    theme: ThemeColors;
  }) => ($selected ? theme.accent : theme.textSecondary)};
`;

const SelectedDot = styled.View`
  width: 8px;
  height: 8px;
  border-radius: 4px;
`;

// ─── Participants ───

const ParticipantHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const ToggleAllBtn = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.accentLight};
`;

const ToggleAllText = styled.Text`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }: { theme: ThemeColors }) => theme.accent};
`;

const ParticipantRow = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.borderLight};
`;

const ParticipantName = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
  flex: 1;
`;

const PerPersonBadge = styled.View`
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.accentLight};
  padding: 4px 10px;
  border-radius: 999px;
`;

const PerPersonText = styled.Text`
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }: { theme: ThemeColors }) => theme.accent};
`;

const Checkbox = styled.View<{ $checked: boolean }>`
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border-width: 2px;
  border-color: ${({
    $checked,
    theme,
  }: {
    $checked: boolean;
    theme: ThemeColors;
  }) => ($checked ? theme.accent : theme.borderLight)};
  background-color: ${({
    $checked,
    theme,
  }: {
    $checked: boolean;
    theme: ThemeColors;
  }) => ($checked ? theme.accent : "transparent")};
  align-items: center;
  justify-content: center;
`;

// ─── Summary ───

const SummaryCard = styled.View`
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.cardBackground};
  border-radius: 20px;
  padding: 20px;
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.accentBorder};
`;

const SummaryTitle = styled.Text`
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
`;

const SummaryRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const SummaryLabel = styled.Text`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textSecondary};
`;

const SummaryValue = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
`;

const SummaryDivider = styled.View`
  height: 1px;
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.divider};
  margin-vertical: 10px;
`;

const SummaryHighlight = styled.Text`
  font-size: 18px;
  font-weight: 900;
  color: ${({ theme }: { theme: ThemeColors }) => theme.accent};
`;

const Spacing = styled.View`
  height: 40px;
`;
