import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react-native";
import React, { useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styled from "styled-components/native";
import { Avatar } from "../../components/Avatar";
import { ThemeColors } from "../../constants/theme";
import { useAppContext } from "../../context/AppContext";
import { useThemeContext } from "../../context/ThemeContext";

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export default function ExpenseDetailScreen() {
  const params = useLocalSearchParams();
  const { id } = params as { id?: string };
  const router = useRouter();

  const {
    expenses,
    profiles,
    deleteExpense,
    toggleExpenseParticipantStatus,
  } = useAppContext();
  const { colors } = useThemeContext();

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const expense = expenses.find((e) => e.id === id);

  if (!expense) {
    return (
      <Container>
        <Header>
          <BackButton onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft size={20} color={colors.textMuted} />
            <BackText>Voltar</BackText>
          </BackButton>
        </Header>
        <Body>
          <EmptyText>Gasto não encontrado.</EmptyText>
        </Body>
      </Container>
    );
  }

  const payer = profiles.find((p) => p.id === expense.payerId);
  const payerName = payer?.name ?? "Desconhecido";
  const payerColor = payer?.color ?? "#A1A1AA";

  const confirmDelete = () => {
    deleteExpense(expense.id);
    setIsDeleteModalVisible(false);
    router.replace("/(tabs)");
  };

  const handleToggle = (profileId: string, currentIsPaid: boolean) => {
    toggleExpenseParticipantStatus(expense.id, profileId, !currentIsPaid);
  };

  const pendingCount = expense.participants.filter(
    (p) => !p.isPaid && p.profileId !== expense.payerId,
  ).length;
  const totalPending = expense.participants
    .filter((p) => !p.isPaid && p.profileId !== expense.payerId)
    .reduce((sum, p) => sum + p.amountOwed, 0);

  return (
    <Container>
      <Header>
        <View style={{ width: "100%", alignItems: "center", marginBottom: 24 }}>
          <ScreenTitle>Detalhes do Gasto</ScreenTitle>
        </View>

        <HeaderRow>
          <BackButton onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft size={20} color={colors.textMuted} />
            <BackText>Voltar</BackText>
          </BackButton>
          <EditButton
            onPress={() =>
              router.push({
                pathname: "/add-expense" as any,
                params: { id: expense.id },
              })
            }
            activeOpacity={0.7}
          >
            <Pencil size={16} color={colors.accent} />
            <EditText>Editar</EditText>
          </EditButton>
        </HeaderRow>
      </Header>

      <Scroll>
        {/* ─── Cabeçalho do gasto ─── */}
        <TopSection>
          <Avatar name={payerName} color={payerColor} size="lg" />
          <TopInfo>
            <ExpenseTitle numberOfLines={2}>{expense.title}</ExpenseTitle>
            <MetaRow>
              <MetaText>📅 {expense.date}</MetaText>
            </MetaRow>
            <TotalAmount>{fmt(expense.totalAmount)}</TotalAmount>
            {expense.description ? (
              <Description>{expense.description}</Description>
            ) : null}
          </TopInfo>
        </TopSection>

        {/* ─── Pagador em destaque ─── */}
        <PayerCard>
          <Avatar name={payerName} color={payerColor} size="sm" />
          <PayerInfo>
            <PayerLabel>PAGOU A CONTA</PayerLabel>
            <PayerNameText>{payerName}</PayerNameText>
          </PayerInfo>
        </PayerCard>

        <Divider />

        {/* ─── Status summary ─── */}
        <StatusSummary>
          {pendingCount > 0 ? (
            <>
              <StatusSummaryDot style={{ backgroundColor: colors.danger }} />
              <StatusSummaryText>
                {pendingCount} pendente{pendingCount !== 1 ? "s" : ""} ·{" "}
                {fmt(totalPending)}
              </StatusSummaryText>
            </>
          ) : (
            <>
              <StatusSummaryDot style={{ backgroundColor: colors.accent }} />
              <StatusSummaryText>Todos pagaram!</StatusSummaryText>
            </>
          )}
        </StatusSummary>

        {/* ─── Lista de Participantes ─── */}
        <SectionTitle>Participantes</SectionTitle>

        {expense.participants.map((p) => {
          const profile = profiles.find((pr) => pr.id === p.profileId);
          const name = profile?.name ?? "Perfil Excluído";
          const color = profile?.color ?? "#A1A1AA";
          const isSelfPayer = p.profileId === expense.payerId;

          return (
            <ParticipantRow
              key={p.profileId}
              onPress={() => {
                if (!isSelfPayer) handleToggle(p.profileId, p.isPaid);
              }}
              activeOpacity={isSelfPayer ? 1 : 0.7}
              disabled={isSelfPayer}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                }}
              >
                <Avatar name={name} color={color} size="sm" />
                <View style={{ flex: 1 }}>
                  <ParticipantName numberOfLines={1}>
                    {name}
                    {isSelfPayer ? " (pagador)" : ""}
                  </ParticipantName>
                  <ParticipantAmount>{fmt(p.amountOwed)}</ParticipantAmount>
                </View>
              </View>

              <StatusPill $isPaid={p.isPaid}>
                <StatusPillText $isPaid={p.isPaid}>
                  {p.isPaid ? "PAGO" : "PENDENTE"}
                </StatusPillText>
              </StatusPill>
            </ParticipantRow>
          );
        })}

        <SpacingBottom />
      </Scroll>

      {/* ─── Footer ─── */}
      <Footer>
        <DangerButton
          onPress={() => setIsDeleteModalVisible(true)}
          activeOpacity={0.8}
        >
          <Trash2 size={16} color={colors.danger} />
          <DangerText>Excluir Gasto</DangerText>
        </DangerButton>
      </Footer>

      {/* ─── Modal de confirmação de exclusão ─── */}
      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <ModalOverlay>
          <ModalContent>
            <ModalTitle>Excluir gasto</ModalTitle>
            <ModalSubtitle>
              Tem certeza que deseja excluir este gasto? Esta ação não poderá
              ser desfeita.
            </ModalSubtitle>
            <ModalActions>
              <ModalCancelButton
                onPress={() => setIsDeleteModalVisible(false)}
                activeOpacity={0.7}
              >
                <ModalCancelText>Cancelar</ModalCancelText>
              </ModalCancelButton>
              <ModalDeleteButton onPress={confirmDelete} activeOpacity={0.7}>
                <ModalDeleteText>Excluir</ModalDeleteText>
              </ModalDeleteButton>
            </ModalActions>
          </ModalContent>
        </ModalOverlay>
      </Modal>
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
  padding: 20px 24px 8px 24px;
`;

const ScreenTitle = styled.Text`
  font-size: 32px;
  font-weight: 900;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
  letter-spacing: -0.5px;
  line-height: 38px;
  text-align: center;
`;

const BackButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

const HeaderRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const EditButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 12px;
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.accentLight};
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.accentBorder};
`;

const EditText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: { theme: ThemeColors }) => theme.accent};
`;

const BackText = styled.Text`
  color: ${({ theme }: { theme: ThemeColors }) => theme.textMuted};
  font-size: 16px;
  font-weight: 600;
`;

const Body = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
`;

const EmptyText = styled.Text`
  font-size: 14px;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textMuted};
`;

const Scroll = styled(ScrollView).attrs({
  contentContainerStyle: { paddingHorizontal: 24, paddingBottom: 24 },
  showsVerticalScrollIndicator: false,
})`
  flex: 1;
`;

const TopSection = styled.View`
  flex-direction: row;
  gap: 16px;
  align-items: flex-start;
  margin-top: 8px;
`;

const TopInfo = styled.View`
  flex: 1;
`;

const ExpenseTitle = styled.Text`
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
`;

const MetaRow = styled.View`
  flex-direction: row;
  gap: 8px;
  margin-top: 4px;
`;

const MetaText = styled.Text`
  font-size: 12px;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textSecondary};
  font-weight: 600;
`;

const TotalAmount = styled.Text`
  font-size: 24px;
  font-weight: 900;
  color: ${({ theme }: { theme: ThemeColors }) => theme.accent};
  margin-top: 6px;
`;

const Description = styled.Text`
  font-size: 14px;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textSecondary};
  margin-top: 8px;
  font-weight: 500;
  line-height: 20px;
`;

const PayerCard = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  padding: 14px 16px;
  border-radius: 16px;
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.accentLight};
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.accentBorder};
`;

const PayerInfo = styled.View``;

const PayerLabel = styled.Text`
  font-size: 10px;
  font-weight: 800;
  color: ${({ theme }: { theme: ThemeColors }) => theme.accent};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const PayerNameText = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
  margin-top: 2px;
`;

const Divider = styled.View`
  height: 1px;
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.divider};
  margin-vertical: 20px;
`;

const StatusSummary = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
`;

const StatusSummaryDot = styled.View`
  width: 10px;
  height: 10px;
  border-radius: 5px;
`;

const StatusSummaryText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
`;

const SectionTitle = styled.Text`
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
`;

const ParticipantRow = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.borderLight};
`;

const ParticipantName = styled.Text`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
`;

const ParticipantAmount = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textMuted};
  margin-top: 2px;
`;

const StatusPill = styled.View<{ $isPaid: boolean }>`
  border-width: 1.5px;
  border-color: ${({
    $isPaid,
    theme,
  }: {
    $isPaid: boolean;
    theme: ThemeColors;
  }) => ($isPaid ? theme.accent : theme.danger)};
  border-radius: 12px;
  padding-horizontal: 10px;
  padding-vertical: 5px;
  background-color: ${({
    $isPaid,
    theme,
  }: {
    $isPaid: boolean;
    theme: ThemeColors;
  }) => ($isPaid ? theme.accentLight : theme.dangerLight)};
`;

const StatusPillText = styled.Text<{ $isPaid: boolean }>`
  font-size: 10px;
  font-weight: 900;
  color: ${({ $isPaid, theme }: { $isPaid: boolean; theme: ThemeColors }) =>
    $isPaid ? theme.accent : theme.danger};
  text-transform: uppercase;
`;

const SpacingBottom = styled.View`
  height: 20px;
`;

const Footer = styled.View`
  padding: 12px 24px 24px 24px;
`;

const DangerButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.cardBackground};
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.danger};
  padding: 14px;
  border-radius: 12px;
`;

const DangerText = styled.Text`
  color: ${({ theme }: { theme: ThemeColors }) => theme.danger};
  font-weight: 800;
  font-size: 15px;
`;

// ─── Modal ───

const ModalOverlay = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.modalOverlay};
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const ModalContent = styled.View`
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.backgroundElevated};
  width: 100%;
  max-width: 340px;
  border-radius: 24px;
  padding: 32px;
  align-items: center;
  justify-content: center;
  shadow-color: #000000;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.15;
  shadow-radius: 16px;
  elevation: 8;
`;

const ModalTitle = styled.Text`
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
  font-size: 18px;
  font-weight: 700;
  text-align: center;
`;

const ModalSubtitle = styled.Text`
  color: ${({ theme }: { theme: ThemeColors }) => theme.textSecondary};
  margin-top: 8px;
  font-size: 13px;
  text-align: center;
  line-height: 18px;
  margin-bottom: 24px;
`;

const ModalActions = styled.View`
  flex-direction: row;
  width: 100%;
  gap: 12px;
`;

const ModalCancelButton = styled.TouchableOpacity`
  flex: 1;
  height: 48px;
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.backgroundElement};
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.borderLight};
`;

const ModalCancelText = styled.Text`
  color: ${({ theme }: { theme: ThemeColors }) => theme.textSecondary};
  font-size: 14px;
  font-weight: 600;
`;

const ModalDeleteButton = styled.TouchableOpacity`
  flex: 1;
  height: 48px;
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.danger};
  border-radius: 14px;
  align-items: center;
  justify-content: center;
`;

const ModalDeleteText = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
`;
