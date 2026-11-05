import React, { useMemo, useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styled from "styled-components/native";
import LogoSvg from "../../assets/Group1.svg";
import { Avatar } from "../../components/Avatar";
import { PixModal } from "../../components/PixModal";
import { SettingsModal } from "../../components/SettingsModal";
import { ThemeColors } from "../../constants/theme";
import { useAppContext } from "../../context/AppContext";
import { useThemeContext } from "../../context/ThemeContext";
import { Profile } from "../../types";

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

// ─── Tipo para um débito entre dois perfis ───
interface DebtEdge {
  debtorId: string;
  creditorId: string;
  amount: number;
}

// ─── Tipo para itens pendentes exibidos no modal de gerenciamento ───
interface PendingItem {
  sourceType: "NF" | "GENERIC";
  sourceId: string;
  label: string;
  amount: number;
  isPaid: boolean;
  profileId: string; // o devedor
}

let hasAuthenticatedThisSession = false;

export default function BalanceScreen() {
  const {
    profiles,
    historyEntries,
    expenses,
    addPaymentTransaction,
    settleFullDebt,
    toggleExpenseParticipantStatus,
    setHistoryEntries,
  } = useAppContext();
  const { colors } = useThemeContext();
  const insets = useSafeAreaInsets();
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

  const requireAuth = async (action: () => void) => {
    if (hasAuthenticatedThisSession) {
      action();
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autentique para gerenciar débitos",
        cancelLabel: "Cancelar",
      });

      if (!result.success) {
        return;
      }
    }
    
    hasAuthenticatedThisSession = true;
    action();
  };

  // ─── Modals state ───
  const [pixModalData, setPixModalData] = useState<{
    profile: Profile;
    amount: number;
  } | null>(null);

  const [manageModalData, setManageModalData] = useState<{
    debtorId: string;
    creditorId: string;
  } | null>(null);

  const [partialModalData, setPartialModalData] = useState<{
    debtorId: string;
    creditorId: string;
  } | null>(null);
  const [partialAmount, setPartialAmount] = useState("");

  const [settleConfirmData, setSettleConfirmData] = useState<{
    debtorId: string;
    creditorId: string;
    amount: number;
  } | null>(null);

  // ─── Cálculo da Matriz de Débitos ───
  //
  // Abordagem: para cada compra/gasto, calculamos quanto cada pessoa CONSUMIU
  // vs quanto ela PAGOU. A diferença é o débito direto devedor→pagador.
  //
  // Regra: itens marcados como isPaid = true NÃO geram débito (já quitados).
  // PAYMENTs avulsos (parciais) reduzem o saldo líquido entre o par.

  const debtEdges = useMemo<DebtEdge[]>(() => {
    // Matriz de débitos brutos: rawDebts[debtorId][creditorId] = total pendente
    const rawDebts: Record<string, Record<string, number>> = {};

    const addDebt = (debtorId: string, creditorId: string, amount: number) => {
      if (debtorId === creditorId || amount <= 0.005) return;
      if (!rawDebts[debtorId]) rawDebts[debtorId] = {};
      rawDebts[debtorId][creditorId] =
        (rawDebts[debtorId][creditorId] ?? 0) + amount;
    };

    // ─── 1. Débitos de NFs (HistoryEntry) ───
    historyEntries.forEach((entry) => {
      const payerId = entry.payer?.id;
      if (!payerId) return;

      const parts =
        entry.participants && entry.participants.length > 0
          ? entry.participants
          : profiles;
      const entryItems = entry.items ?? [];
      const allocs = entry.allocs ?? {};

      // Calcula o total consumido por cada participante
      // Usa effectiveUnitPrice para descontar item.desconto
      const consumed: Record<string, number> = {};
      parts.forEach((p) => (consumed[p.id] = 0));

      entryItems.forEach((it) => {
        const itemAlloc = allocs[it.id] ?? {};

        // Aplica desconto por item
        const totalItemPrice =
          it.totalUnits * it.unitPrice - (it.desconto ?? 0);
        const effectiveUnitPrice =
          it.totalUnits > 0 ? totalItemPrice / it.totalUnits : 0;

        Object.entries(itemAlloc).forEach(([pid, units]) => {
          if (units <= 0) return;
          const cost = units * effectiveUnitPrice;
          if (pid === "__collective__") {
            const split = cost / parts.length;
            parts.forEach((p) => {
              consumed[p.id] = (consumed[p.id] ?? 0) + split;
            });
          } else {
            consumed[pid] = (consumed[pid] ?? 0) + cost;
          }
        });
      });

      // Cada participante (exceto o pagador) deve ao pagador o que consumiu
      // Apenas se NÃO está marcado como pago
      parts.forEach((p) => {
        if (p.id === payerId) return;
        const isPaid = entry.paidStatus?.[p.id] ?? false;
        if (isPaid) return;
        addDebt(p.id, payerId, consumed[p.id] ?? 0);
      });
    });

    // ─── 2. Débitos de Expenses (GENERIC) ───
    expenses.forEach((exp) => {
      if (exp.type !== "GENERIC") return;
      exp.participants.forEach((p) => {
        if (p.profileId === exp.payerId) return;
        if (p.isPaid) return;
        addDebt(p.profileId, exp.payerId, p.amountOwed);
      });
    });

    // ─── 3. Pagamentos avulsos (PAYMENT) reduzem débitos brutos ───
    // Esses são pagamentos parciais registrados SEM marcar items como pagos.
    expenses.forEach((exp) => {
      if (exp.type !== "PAYMENT") return;
      if (!exp.receiverId) return;
      const pid = exp.payerId;      // quem pagou
      const rid = exp.receiverId;   // quem recebeu

      // Reduz o débito do pagador para o recebedor
      if (rawDebts[pid]?.[rid]) {
        rawDebts[pid][rid] = Math.max(0, rawDebts[pid][rid] - exp.totalAmount);
      }
    });

    // ─── 4. Netting entre pares (A deve a B vs B deve a A) ───
    const edges: DebtEdge[] = [];
    const visited = new Set<string>();

    const allIds = new Set<string>();
    Object.keys(rawDebts).forEach((id) => {
      allIds.add(id);
      Object.keys(rawDebts[id]).forEach((id2) => allIds.add(id2));
    });

    const idsArray = Array.from(allIds);
    for (let i = 0; i < idsArray.length; i++) {
      for (let j = i + 1; j < idsArray.length; j++) {
        const a = idsArray[i];
        const b = idsArray[j];

        const pairKey = `${a}-${b}`;
        if (visited.has(pairKey)) continue;
        visited.add(pairKey);

        const aOwesB = rawDebts[a]?.[b] ?? 0;
        const bOwesA = rawDebts[b]?.[a] ?? 0;
        const net = aOwesB - bOwesA;

        if (net > 0.01) {
          edges.push({
            debtorId: a,
            creditorId: b,
            amount: Math.round(net * 100) / 100,
          });
        } else if (net < -0.01) {
          edges.push({
            debtorId: b,
            creditorId: a,
            amount: Math.round(Math.abs(net) * 100) / 100,
          });
        }
      }
    }

    return edges;
  }, [historyEntries, expenses, profiles]);

  // ─── Itens pendentes para o modal de gerenciamento ───
  const getPendingItems = (
    debtorId: string,
    creditorId: string
  ): PendingItem[] => {
    const items: PendingItem[] = [];

    // NFs
    historyEntries.forEach((entry) => {
      if (entry.payer?.id !== creditorId) return;
      const parts =
        entry.participants && entry.participants.length > 0
          ? entry.participants
          : profiles;
      const participant = parts.find((p) => p.id === debtorId);
      if (!participant) return;

      const isPaid = entry.paidStatus?.[debtorId] ?? false;
      let debtorTotal = 0;
      const entryItems = entry.items ?? [];
      const allocs = entry.allocs ?? {};

      entryItems.forEach((it) => {
        const itemAlloc = allocs[it.id] ?? {};

        // Aplica desconto por item (consistente com o cálculo principal)
        const totalItemPrice =
          it.totalUnits * it.unitPrice - (it.desconto ?? 0);
        const effectiveUnitPrice =
          it.totalUnits > 0 ? totalItemPrice / it.totalUnits : 0;

        Object.entries(itemAlloc).forEach(([pid, units]) => {
          if (units <= 0) return;
          const cost = units * effectiveUnitPrice;
          if (pid === "__collective__") {
            debtorTotal += cost / parts.length;
          } else if (pid === debtorId) {
            debtorTotal += cost;
          }
        });
      });

      if (debtorTotal > 0) {
        items.push({
          sourceType: "NF",
          sourceId: entry.id,
          label: entry.marketName || "Supermercado",
          amount: debtorTotal,
          isPaid,
          profileId: debtorId,
        });
      }
    });

    // Expenses GENERIC
    expenses.forEach((exp) => {
      if (exp.type !== "GENERIC") return;
      if (exp.payerId !== creditorId) return;
      const participant = exp.participants.find(
        (p) => p.profileId === debtorId
      );
      if (!participant) return;

      items.push({
        sourceType: "GENERIC",
        sourceId: exp.id,
        label: exp.title,
        amount: participant.amountOwed,
        isPaid: participant.isPaid,
        profileId: debtorId,
      });
    });

    return items;
  };

  const handleTogglePendingItem = (item: PendingItem) => {
    if (item.sourceType === "GENERIC") {
      toggleExpenseParticipantStatus(
        item.sourceId,
        item.profileId,
        !item.isPaid
      );
    } else {
      setHistoryEntries((prev) =>
        prev.map((h) => {
          if (h.id !== item.sourceId) return h;
          return {
            ...h,
            paidStatus: {
              ...(h.paidStatus || {}),
              [item.profileId]: !item.isPaid,
            },
          };
        })
      );
    }
  };

  const handlePartialPayment = () => {
    if (!partialModalData) return;
    const digits = partialAmount.replace(/\D/g, "");
    const cents = parseInt(digits, 10);
    if (isNaN(cents) || cents <= 0) return;
    const amount = cents / 100;

    addPaymentTransaction(
      partialModalData.debtorId,
      partialModalData.creditorId,
      amount
    );
    setPartialAmount("");
    setPartialModalData(null);
  };

  const getDisplayPartialAmount = (): string => {
    const digits = partialAmount.replace(/\D/g, "");
    if (!digits) return "";
    const cents = parseInt(digits, 10);
    if (isNaN(cents)) return "";
    return (cents / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const renderHeader = () => (
    <HeaderContainer style={{ position: "relative", justifyContent: "center" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingRight: 48,
        }}
      >
        <HeaderTitle>Balanço</HeaderTitle>
      </View>
      <Pressable
        onPress={() => setIsSettingsModalVisible(true)}
        style={{ position: "absolute", right: 4, top: -15 }}
      >
        <LogoSvg width={34} height={34} />
      </Pressable>
      <HeaderSubtitle>Débitos consolidados entre os perfis.</HeaderSubtitle>
    </HeaderContainer>
  );

  const renderDebtCard = ({ item: edge }: { item: DebtEdge }) => {
    const debtor = profiles.find((p) => p.id === edge.debtorId);
    const creditor = profiles.find((p) => p.id === edge.creditorId);
    if (!debtor || !creditor) return null;

    return (
      <DebtCard>
        <AvatarRow>
          <View style={{ alignItems: "center" }}>
            <Avatar name={debtor.name} color={debtor.color} size="md" />
            <AvatarLabel numberOfLines={1}>
              {debtor.name.split(" ")[0]}
            </AvatarLabel>
          </View>

          <ArrowContainer>
            <ArrowLine />
            <ArrowText>deve</ArrowText>
            <ArrowLine />
          </ArrowContainer>

          <View style={{ alignItems: "center" }}>
            <Avatar name={creditor.name} color={creditor.color} size="md" />
            <AvatarLabel numberOfLines={1}>
              {creditor.name.split(" ")[0]}
            </AvatarLabel>
          </View>
        </AvatarRow>

        <DebtAmount>{fmt(edge.amount)}</DebtAmount>

        <ActionsGrid>
          <ActionButton
            onPress={() =>
              setPixModalData({ profile: creditor, amount: edge.amount })
            }
            activeOpacity={0.7}
            $variant="primary"
          >
            <ActionText $variant="primary" numberOfLines={1}>
              Cobrar
            </ActionText>
          </ActionButton>

          <ActionButton
            onPress={() =>
              requireAuth(() => {
                setManageModalData({
                  debtorId: edge.debtorId,
                  creditorId: edge.creditorId,
                });
              })
            }
            activeOpacity={0.7}
            $variant="secondary"
          >
            <ActionText $variant="secondary" numberOfLines={1}>
              Gerenciar
            </ActionText>
          </ActionButton>

          <ActionButton
            onPress={() =>
              requireAuth(() => {
                setPartialAmount("");
                setPartialModalData({
                  debtorId: edge.debtorId,
                  creditorId: edge.creditorId,
                });
              })
            }
            activeOpacity={0.7}
            $variant="secondary"
          >
            <ActionText $variant="secondary" numberOfLines={1}>
              Quitar Parcial
            </ActionText>
          </ActionButton>

          <ActionButton
            onPress={() =>
              requireAuth(() => {
                setSettleConfirmData({
                  debtorId: edge.debtorId,
                  creditorId: edge.creditorId,
                  amount: edge.amount,
                });
              })
            }
            activeOpacity={0.7}
            $variant="danger"
          >
            <ActionText $variant="danger" numberOfLines={1}>
              Quitar Tudo
            </ActionText>
          </ActionButton>
        </ActionsGrid>
      </DebtCard>
    );
  };

  const managePendingItems = manageModalData
    ? getPendingItems(manageModalData.debtorId, manageModalData.creditorId)
    : [];

  return (
    <Container style={{ paddingTop: insets.top }}>
      <FlatList
        data={debtEdges}
        keyExtractor={(item) => `${item.debtorId}-${item.creditorId}`}
        renderItem={renderDebtCard}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyContainer>
            <EmptyIcon>✅</EmptyIcon>
            <EmptyText>Todos os débitos estão quitados!</EmptyText>
          </EmptyContainer>
        }
        ListFooterComponent={<Spacing />}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 24,
        }}
      />

      {/* ─── Pix Modal ─── */}
      {pixModalData && (
        <PixModal
          visible
          profile={pixModalData.profile}
          amount={pixModalData.amount}
          onClose={() => setPixModalData(null)}
        />
      )}

      {/* ─── Modal de Gerenciamento de Pagamentos ─── */}
      <Modal
        visible={!!manageModalData}
        transparent
        animationType="slide"
        onRequestClose={() => setManageModalData(null)}
      >
        <ModalOverlay>
          <ModalSheet>
            <ModalTitle>Gerenciar Pagamentos</ModalTitle>
            <ModalSubtitle>
              Toque em cada item para alternar entre Pago e Pendente.
            </ModalSubtitle>

            <ScrollView
              style={{ width: "100%", maxHeight: 350, marginBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {managePendingItems.map((item, idx) => (
                <ManageRow
                  key={`${item.sourceType}-${item.sourceId}-${idx}`}
                  onPress={() => handleTogglePendingItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <ManageLabel numberOfLines={1}>
                      {item.sourceType === "NF" ? "🧾" : "📝"} {item.label}
                    </ManageLabel>
                    <ManageAmount>{fmt(item.amount)}</ManageAmount>
                  </View>
                  <SmallStatusPill $isPaid={item.isPaid}>
                    <SmallStatusText $isPaid={item.isPaid}>
                      {item.isPaid ? "PAGO" : "PENDENTE"}
                    </SmallStatusText>
                  </SmallStatusPill>
                </ManageRow>
              ))}
              {managePendingItems.length === 0 && (
                <EmptyText style={{ marginTop: 20 }}>
                  Nenhum item encontrado.
                </EmptyText>
              )}
            </ScrollView>

            <ModalPrimaryButton
              onPress={() => setManageModalData(null)}
              activeOpacity={0.8}
            >
              <ModalPrimaryText>Pronto</ModalPrimaryText>
            </ModalPrimaryButton>
          </ModalSheet>
        </ModalOverlay>
      </Modal>

      {/* ─── Modal de Quitação Parcial ─── */}
      <Modal
        visible={!!partialModalData}
        transparent
        animationType="fade"
        onRequestClose={() => setPartialModalData(null)}
      >
        <ModalOverlay>
          <ModalContent>
            <ModalTitle>Quitar Parcial</ModalTitle>
            <ModalSubtitle>
              Informe o valor abatido neste pagamento avulso.
            </ModalSubtitle>

            <AmountInputRow>
              <CurrencyPrefix>R$</CurrencyPrefix>
              <AmountInput
                value={getDisplayPartialAmount()}
                onChangeText={(t: string) =>
                  setPartialAmount(t.replace(/\D/g, ""))
                }
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={12}
              />
            </AmountInputRow>

            <ModalActionsRow>
              <ModalCancelBtn
                onPress={() => setPartialModalData(null)}
                activeOpacity={0.7}
              >
                <ModalCancelText>Cancelar</ModalCancelText>
              </ModalCancelBtn>
              <ModalConfirmBtn
                onPress={handlePartialPayment}
                activeOpacity={0.7}
              >
                <ModalConfirmText>Confirmar</ModalConfirmText>
              </ModalConfirmBtn>
            </ModalActionsRow>
          </ModalContent>
        </ModalOverlay>
      </Modal>

      {/* ─── Modal de Confirmação Quitar Tudo ─── */}
      <Modal
        visible={!!settleConfirmData}
        transparent
        animationType="fade"
        onRequestClose={() => setSettleConfirmData(null)}
      >
        <ModalOverlay>
          <ModalContent>
            <ModalTitle>Quitar Tudo</ModalTitle>
            <ModalSubtitle>
              Tem certeza que deseja quitar todos os débitos no valor de{" "}
              {settleConfirmData ? fmt(settleConfirmData.amount) : ""}? Todos os
              pagamentos pendentes serão marcados como pagos.
            </ModalSubtitle>
            <ModalActionsRow>
              <ModalCancelBtn
                onPress={() => setSettleConfirmData(null)}
                activeOpacity={0.7}
              >
                <ModalCancelText>Cancelar</ModalCancelText>
              </ModalCancelBtn>
              <ModalConfirmBtn
                onPress={() => {
                  if (settleConfirmData) {
                    settleFullDebt(
                      settleConfirmData.debtorId,
                      settleConfirmData.creditorId
                    );
                  }
                  setSettleConfirmData(null);
                }}
                activeOpacity={0.7}
              >
                <ModalConfirmText>Quitar</ModalConfirmText>
              </ModalConfirmBtn>
            </ModalActionsRow>
          </ModalContent>
        </ModalOverlay>
      </Modal>

      <SettingsModal
        visible={isSettingsModalVisible}
        onRequestClose={() => setIsSettingsModalVisible(false)}
      />
    </Container>
  );
}

// ==========================================
// STYLED COMPONENTS (LAYOUT REVISADO)
// ==========================================

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.background};
`;

const HeaderContainer = styled.View`
  margin-bottom: 24px;
`;

const HeaderTitle = styled.Text`
  font-size: 32px;
  font-weight: 900;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
  letter-spacing: -0.5px;
  line-height: 38px;
`;

const HeaderSubtitle = styled.Text`
  font-size: 15px;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textSecondary};
  margin-top: 8px;
  font-weight: 500;
`;

const EmptyContainer = styled.View`
  align-items: center;
  margin-top: 60px;
`;

const EmptyIcon = styled.Text`
  font-size: 48px;
  margin-bottom: 16px;
`;

const EmptyText = styled.Text`
  font-size: 15px;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textMuted};
  text-align: center;
  font-weight: 600;
`;

const Spacing = styled.View`
  height: 40px;
`;

// ─── Debt Card ───

const DebtCard = styled.View`
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.cardBackground};
  border-radius: 24px;
  padding: 24px;
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.border};
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.06;
  shadow-radius: 12px;
  elevation: 3;
`;

const AvatarRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
`;

const AvatarLabel = styled.Text`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textSecondary};
  margin-top: 6px;
  max-width: 80px;
  text-align: center;
`;

const ArrowContainer = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const ArrowLine = styled.View`
  width: 20px;
  height: 2px;
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.danger};
  border-radius: 1px;
`;

const ArrowText = styled.Text`
  font-size: 11px;
  font-weight: 800;
  color: ${({ theme }: { theme: ThemeColors }) => theme.danger};
  text-transform: uppercase;
`;

const DebtAmount = styled.Text`
  font-size: 28px;
  font-weight: 900;
  color: ${({ theme }: { theme: ThemeColors }) => theme.danger};
  text-align: center;
  margin-bottom: 20px;
`;

const ActionsGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  row-gap: 8px;
  width: 100%;
`;

const ActionButton = styled.TouchableOpacity<{
  $variant: "primary" | "secondary" | "danger";
}>`
  width: 48.5%;
  height: 42px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  padding-horizontal: 4px;
  background-color: ${({
    $variant,
    theme,
  }: {
    $variant: string;
    theme: ThemeColors;
  }) => {
    if ($variant === "primary") return theme.accent;
    if ($variant === "danger") return theme.dangerLight;
    return theme.backgroundElement;
  }};
  border-width: ${({ $variant }: { $variant: string }) =>
    $variant === "danger" ? "1px" : "0px"};
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.dangerBorder};
`;

const ActionText = styled.Text<{
  $variant: "primary" | "secondary" | "danger";
}>`
  font-size: 12px;
  font-weight: 800;
  text-align: center;
  text-align-vertical: center;
  include-font-padding: false;
  color: ${({
    $variant,
    theme,
  }: {
    $variant: string;
    theme: ThemeColors;
  }) => {
    if ($variant === "primary") return "#FFFFFF";
    if ($variant === "danger") return theme.danger;
    return theme.text;
  }};
`;

// ─── Modals ───

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

const ModalSheet = styled.View`
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.backgroundElevated};
  width: 100%;
  max-width: 400px;
  border-radius: 24px;
  padding: 28px;
  align-items: center;
  shadow-color: #000000;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.15;
  shadow-radius: 16px;
  elevation: 8;
`;

const ModalContent = styled.View`
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.backgroundElevated};
  width: 100%;
  max-width: 340px;
  border-radius: 24px;
  padding: 32px;
  align-items: center;
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
  margin-bottom: 20px;
`;

const ManageRow = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-vertical: 12px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.borderLight};
`;

const ManageLabel = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
`;

const ManageAmount = styled.Text`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textMuted};
  margin-top: 2px;
`;

const SmallStatusPill = styled.View<{ $isPaid: boolean }>`
  border-width: 1.5px;
  border-color: ${({
    $isPaid,
    theme,
  }: {
    $isPaid: boolean;
    theme: ThemeColors;
  }) => ($isPaid ? theme.accent : theme.danger)};
  border-radius: 10px;
  padding-horizontal: 8px;
  padding-vertical: 4px;
`;

const SmallStatusText = styled.Text<{ $isPaid: boolean }>`
  font-size: 9px;
  font-weight: 900;
  color: ${({ $isPaid, theme }: { $isPaid: boolean; theme: ThemeColors }) =>
    $isPaid ? theme.accent : theme.danger};
  text-transform: uppercase;
`;

const ModalPrimaryButton = styled.TouchableOpacity`
  width: 100%;
  height: 48px;
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.accent};
  border-radius: 14px;
  align-items: center;
  justify-content: center;
`;

const ModalPrimaryText = styled.Text`
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
`;

const AmountInputRow = styled.View`
  flex-direction: row;
  align-items: center;
  width: 100%;
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.inputBackground};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.borderLight};
  padding-left: 16px;
  margin-bottom: 20px;
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

const ModalActionsRow = styled.View`
  flex-direction: row;
  width: 100%;
  gap: 12px;
`;

const ModalCancelBtn = styled.TouchableOpacity`
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

const ModalConfirmBtn = styled.TouchableOpacity`
  flex: 1;
  height: 48px;
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.accent};
  border-radius: 14px;
  align-items: center;
  justify-content: center;
`;

const ModalConfirmText = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
`;