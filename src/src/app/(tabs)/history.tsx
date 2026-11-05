import { useRouter } from "expo-router";
import { Check, ChevronRight, Trash2, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Share, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styled from "styled-components/native";
import LogoSvg from "../../assets/Group1.svg";
import { Avatar } from "../../components/Avatar";
import { SettingsModal } from "../../components/SettingsModal";
import { ThemeColors } from "../../constants/theme";
import { useAppContext } from "../../context/AppContext";
import { useThemeContext } from "../../context/ThemeContext";
import { Expense, HistoryEntry } from "../../types";
import { generatePixBRCode } from "../../utils/pix";

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

// ─── Tipo unificado para exibição na lista ───

type UnifiedEntry =
  | { kind: "NF"; data: HistoryEntry }
  | { kind: "GENERIC"; data: Expense }
  | { kind: "PAYMENT"; data: Expense };

type FilterSegment = "ALL" | "NF" | "GENERIC";

export default function HistoryScreen() {
  const {
    historyEntries,
    expenses,
    profiles,
    deleteHistoryEntry,
    deleteExpense,
  } = useAppContext();
  const { colors } = useThemeContext();
  const router = useRouter();
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [filter, setFilter] = useState<FilterSegment>("ALL");

  // ─── Modo seleção múltipla ───
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ─── Billing modal ───
  const [billingModalVisible, setBillingModalVisible] = useState(false);
  const [billingStep, setBillingStep] = useState<1 | 2>(1); // 1 = escolher cobrador, 2 = escolher devedores
  const [billingCobradorId, setBillingCobradorId] = useState<string | null>(null);
  const [billingDebtorIds, setBillingDebtorIds] = useState<Set<string>>(new Set());

  // ─── Delete modal ───
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const insets = useSafeAreaInsets();

  // Consolida as entradas em lista unificada e ordenada por data
  const unifiedList = useMemo<UnifiedEntry[]>(() => {
    const list: UnifiedEntry[] = [];

    historyEntries.forEach((h) => list.push({ kind: "NF", data: h }));
    expenses.forEach((e) => {
      if (e.type === "GENERIC") list.push({ kind: "GENERIC", data: e });
      else if (e.type === "PAYMENT") list.push({ kind: "PAYMENT", data: e });
    });

    // Ordena por data (mais recente primeiro)
    // NFs usam date no formato DD/MM/YYYY ou ISO, Expenses usam ISO YYYY-MM-DD
    list.sort((a, b) => {
      const dateA = getComparableDate(a);
      const dateB = getComparableDate(b);
      
      if (dateA === dateB) {
        // Empate na data real da compra: quem foi adicionado no app por último aparece primeiro
        const tsA = getAppTimestamp(a);
        const tsB = getAppTimestamp(b);
        return tsB - tsA;
      }
      return dateB.localeCompare(dateA);
    });

    return list;
  }, [historyEntries, expenses]);

  const filteredList = useMemo(() => {
    if (filter === "ALL") return unifiedList.filter((e) => e.kind !== "PAYMENT");
    if (filter === "NF") return unifiedList.filter((e) => e.kind === "NF");
    return unifiedList.filter((e) => e.kind === "GENERIC");
  }, [unifiedList, filter]);

  // ─── Cálculo de débitos por devedor nas entradas selecionadas (para o cobrador) ───
  const billingDebts = useMemo(() => {
    if (!billingCobradorId) return new Map<string, number>();

    const debts = new Map<string, number>();

    selectedIds.forEach((id) => {
      const entry = filteredList.find((e) => getEntryId(e) === id);
      if (!entry) return;

      if (entry.kind === "NF") {
        const h = entry.data as HistoryEntry;
        // Só computa se o cobrador é o pagador desta NF
        if (h.payer?.id !== billingCobradorId) return;

        const parts = h.participants && h.participants.length > 0 ? h.participants : profiles;
        const items = h.items ?? [];
        const allocs = h.allocs ?? {};

        // Calcula consumo por participante
        const consumed: Record<string, number> = {};
        parts.forEach((p) => (consumed[p.id] = 0));

        items.forEach((it) => {
          const itemAlloc = allocs[it.id] ?? {};
          const totalItemPrice = it.totalUnits * it.unitPrice - (it.desconto ?? 0);
          const effectiveUnitPrice = it.totalUnits > 0 ? totalItemPrice / it.totalUnits : 0;

          Object.entries(itemAlloc).forEach(([pid, units]) => {
            if (units <= 0) return;
            const cost = units * effectiveUnitPrice;
            if (pid === "__collective__") {
              const split = cost / parts.length;
              parts.forEach((p) => (consumed[p.id] = (consumed[p.id] ?? 0) + split));
            } else {
              consumed[pid] = (consumed[pid] ?? 0) + cost;
            }
          });
        });

        parts.forEach((p) => {
          if (p.id === billingCobradorId) return;
          const isPaid = h.paidStatus?.[p.id] ?? false;
          if (isPaid) return;
          const val = consumed[p.id] ?? 0;
          if (val > 0.005) {
            debts.set(p.id, (debts.get(p.id) ?? 0) + val);
          }
        });
      } else if (entry.kind === "GENERIC") {
        const e = entry.data as Expense;
        if (e.payerId !== billingCobradorId) return;

        e.participants.forEach((p) => {
          if (p.profileId === billingCobradorId) return;
          if (p.isPaid) return;
          debts.set(p.profileId, (debts.get(p.profileId) ?? 0) + p.amountOwed);
        });
      }
    });

    return debts;
  }, [billingCobradorId, selectedIds, filteredList, profiles]);

  // ─── Cálculo do total pendente dos selecionados ───
  const selectedTotalPending = useMemo(() => {
    let total = 0;
    selectedIds.forEach((id) => {
      const entry = filteredList.find((e) => getEntryId(e) === id);
      if (!entry) return;

      if (entry.kind === "NF") {
        const h = entry.data as HistoryEntry;
        // Soma o que está pendente para todos os devedores
        const parts = h.participants ?? [];
        const items = h.items ?? [];
        const allocs = h.allocs ?? {};
        const ps = parts.length > 0 ? parts : profiles;

        ps.forEach((p) => {
          if (p.id === h.payer?.id) return;
          const isPaid = h.paidStatus?.[p.id] ?? false;
          if (isPaid) return;

          let debtorTotal = 0;
          items.forEach((it) => {
            const itemAlloc = allocs[it.id] ?? {};

            // Aplica desconto por item (consistente com o balance)
            const totalItemPrice =
              it.totalUnits * it.unitPrice - (it.desconto ?? 0);
            const effectiveUnitPrice =
              it.totalUnits > 0 ? totalItemPrice / it.totalUnits : 0;

            Object.entries(itemAlloc).forEach(([pid, units]) => {
              if (units <= 0) return;
              const cost = units * effectiveUnitPrice;
              if (pid === "__collective__") {
                debtorTotal += cost / ps.length;
              } else if (pid === p.id) {
                debtorTotal += cost;
              }
            });
          });
          total += debtorTotal;
        });
      } else if (entry.kind === "GENERIC") {
        const e = entry.data as Expense;
        e.participants.forEach((p) => {
          if (!p.isPaid) total += p.amountOwed;
        });
      }
    });
    return total;
  }, [selectedIds, filteredList, profiles]);

  // ─── Billing: abrir modal ───
  const openBillingModal = () => {
    setBillingStep(1);
    setBillingCobradorId(null);
    setBillingDebtorIds(new Set());
    setBillingModalVisible(true);
  };

  const selectCobrador = (id: string) => {
    setBillingCobradorId(id);
    // Pre-seleciona todos os devedores que têm dívida
    setBillingStep(2);
  };

  const toggleBillingDebtor = (id: string) => {
    setBillingDebtorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Pré-seleciona devedores quando billingDebts muda
  React.useEffect(() => {
    if (billingStep === 2 && billingCobradorId) {
      setBillingDebtorIds(new Set(billingDebts.keys()));
    }
  }, [billingDebts, billingStep, billingCobradorId]);

  const handleGenerateBilling = async () => {
    if (!billingCobradorId || billingDebtorIds.size === 0) return;

    const cobrador = profiles.find((p) => p.id === billingCobradorId);
    if (!cobrador) return;

    const pixKey = cobrador.pixKey || "";
    const pixName = cobrador.pixName || cobrador.name;
    const pixCity = cobrador.pixCity || "São Paulo";

    const lines: string[] = [
      `💰 *Cobrança — ${selectedIds.size} compra${selectedIds.size > 1 ? "s" : ""}*`,
      `Cobrador: ${cobrador.name}`,
      pixKey ? `Chave PIX: ${pixKey}\n` : "",
    ].filter(Boolean);

    const debtorLines: string[] = [];
    let grandTotal = 0;

    billingDebtorIds.forEach((did) => {
      const amount = billingDebts.get(did) ?? 0;
      if (amount <= 0.01) return;
      grandTotal += amount;

      const debtor = profiles.find((p) => p.id === did);
      const name = debtor?.name.split(" ")[0] ?? "?";

      if (pixKey) {
        const emvCode = generatePixBRCode(pixKey, amount, pixName, pixCity);
        const safePixCode = encodeURIComponent(emvCode);
        const pixLink = `https://tobiasmaugus.github.io/smartsplitPIX-SITE/?codigo=${safePixCode}`;
        debtorLines.push(`• ${name} deve ${fmt(amount)}:\n${pixLink}`);
      } else {
        debtorLines.push(`• ${name} deve ${fmt(amount)}`);
      }
    });

    lines.push(`Total pendente: ${fmt(grandTotal)}\n`);
    lines.push("⏳ *Faltam Pagar:*");

    const separador = pixKey ? "\n\n" : "\n";
    const message = `${lines.join("\n")}${separador}${debtorLines.join(separador)}`;

    try {
      await Share.share({ message });
    } catch (error) {
      console.error("Erro ao compartilhar cobrança:", error);
    }

    setBillingModalVisible(false);
    exitSelectionMode();
  };

  const handleDeleteMultiple = () => {
    setDeleteModalVisible(true);
  };

  const confirmDeleteMultiple = () => {
    selectedIds.forEach((id) => {
      const entry = filteredList.find((e) => getEntryId(e) === id);
      if (!entry) return;
      if (entry.kind === "NF") {
        deleteHistoryEntry(id);
      } else {
        deleteExpense(id);
      }
    });
    setDeleteModalVisible(false);
    exitSelectionMode();
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleLongPress = (id: string) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedIds(new Set([id]));
    }
  };

  const handlePress = (entry: UnifiedEntry) => {
    if (selectionMode) {
      toggleSelection(getEntryId(entry));
      return;
    }

    if (entry.kind === "NF") {
      router.push({
        pathname: "/history-details/[id]",
        params: { id: (entry.data as HistoryEntry).id },
      });
    } else if (entry.kind === "GENERIC") {
      router.push({
        pathname: "/expense/[id]" as any,
        params: { id: (entry.data as Expense).id },
      });
    }
  };

  const renderHeader = () => (
    <Header style={{ position: "relative", justifyContent: "center" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingRight: 48,
        }}
      >
        <Title>Últimas Gastos</Title>
      </View>
      <Pressable
        onPress={() => setIsSettingsModalVisible(true)}
        style={{ position: "absolute", right: 4, top: -15 }}
      >
        <LogoSvg width={34} height={34} />
      </Pressable>
      <Subtitle>Exibe os últimos gastos divididos.</Subtitle>

      {/* Filtro por segmento */}
      <FilterRow>
        {(["ALL", "NF", "GENERIC"] as FilterSegment[]).map((seg) => (
          <FilterPill
            key={seg}
            $active={filter === seg}
            onPress={() => {
              setFilter(seg);
              if (selectionMode) exitSelectionMode();
            }}
            activeOpacity={0.7}
          >
            <FilterPillText $active={filter === seg}>
              {seg === "ALL" ? "Todos" : seg === "NF" ? "Nota Fiscal" : "Genéricos"}
            </FilterPillText>
          </FilterPill>
        ))}
      </FilterRow>

      {selectionMode && (
        <SelectionBar>
          <Pressable onPress={exitSelectionMode} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4 }}>
            <X size={18} color={colors.text} />
            <SelectionBarText>
              Cancelar
            </SelectionBarText>
          </Pressable>
          <SelectionBarText style={{ color: colors.accent, fontWeight: "900" }}>
            {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
          </SelectionBarText>
        </SelectionBar>
      )}
    </Header>
  );

  const renderItem = ({
    item: entry,
    index,
  }: {
    item: UnifiedEntry;
    index: number;
  }) => {
    const id = getEntryId(entry);
    const isSelected = selectedIds.has(id);

    if (entry.kind === "NF") {
      return renderNFCard(entry.data as HistoryEntry, index, id, isSelected);
    }
    return renderGenericCard(entry.data as Expense, index, id, isSelected);
  };

  const renderNFCard = (
    e: HistoryEntry,
    index: number,
    id: string,
    isSelected: boolean,
  ) => {
    return (
      <Pressable
        onPress={() =>
          handlePress({ kind: "NF", data: e })
        }
        onLongPress={() => handleLongPress(id)}
        accessibilityRole="button"
      >
        <Card $selected={isSelected}>
          {selectionMode && (
            <SelectionCheckbox $checked={isSelected}>
              {isSelected && <CheckMark>✓</CheckMark>}
            </SelectionCheckbox>
          )}

          <Avatar name={e.payer.name} color={e.payer.color} size="md" />

          <CardBody>
            <TopRow>
              <TypeBadge $type="NF">
                <TypeBadgeText $type="NF">NF</TypeBadgeText>
              </TypeBadge>
              {/* @ts-ignore */}
              <MarketTitle numberOfLines={1}>
                {e.marketName || "Supermercado"}
              </MarketTitle>
            </TopRow>

            <PriceText>{fmt(e.total)}</PriceText>

            <SplitDetailsContainer>
              <PayerText numberOfLines={1}>
                {e.payer.name.split(" ")[0]} pagou tudo
              </PayerText>

              {e.desc.split(/,\s+/).map((debtor, idx) => {
                const trimmedDebtor = debtor.trim();
                if (!trimmedDebtor) return null;

                const match = trimmedDebtor.match(/(.+?) deve (.+)/);
                if (!match) {
                  return (
                    <DebtorText key={idx} numberOfLines={1}>
                      • {trimmedDebtor}
                    </DebtorText>
                  );
                }

                const name = match[1];
                const amount = match[2];

                const profile = e.participants?.find(
                  (p) => p.name.split(" ")[0] === name,
                );
                const isPaid = profile
                  ? (e.paidStatus?.[profile.id] ?? false)
                  : false;

                return (
                  <DebtorRow key={idx}>
                    <DebtorText numberOfLines={1}>
                      • {name}: {amount}
                    </DebtorText>
                    <StatusPill $isPaid={isPaid}>
                      <StatusText $isPaid={isPaid}>
                        {isPaid ? "PAGO" : "NÃO PAGO"}
                      </StatusText>
                    </StatusPill>
                  </DebtorRow>
                );
              })}
              <DatesContainer>
                <DateText numberOfLines={1}>
                  📱 App: {e.date}
                  {/* @ts-ignore */}
                  {e.horario ? ` às ${e.horario}` : null}
                </DateText>

                <PurchaseDateText numberOfLines={1}>
                  📅 Nota: {/* @ts-ignore */}
                  {e.dateCompra}
                  {/* @ts-ignore */}
                  {e.horarioCompra ? ` às ${e.horarioCompra}` : null}
                </PurchaseDateText>
              </DatesContainer>
            </SplitDetailsContainer>
          </CardBody>

          <RightSide>
            <IndexBadge>
              <IndexText>#{filteredList.length - index}</IndexText>
            </IndexBadge>
            <ChevronRight size={20} color={colors.textMuted} />
          </RightSide>
        </Card>
      </Pressable>
    );
  };

  const renderGenericCard = (
    e: Expense,
    index: number,
    id: string,
    isSelected: boolean,
  ) => {
    const payer = profiles.find((p) => p.id === e.payerId);
    const payerName = payer?.name ?? "Desconhecido";
    const payerColor = payer?.color ?? "#A1A1AA";

    let formattedDate = e.date;
    if (e.date.includes("-")) {
      const [yyyy, mm, dd] = e.date.split("-");
      formattedDate = `${dd}/${mm}/${yyyy}`;
    }

    let appDateStr = "";
    if (e.id.startsWith("exp_")) {
      const parts = e.id.split("_");
      if (parts.length >= 2) {
        const timestamp = parseInt(parts[1], 10);
        if (!isNaN(timestamp)) {
          const d = new Date(timestamp);
          const datePart = d.toLocaleDateString("pt-BR");
          const timePart = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          appDateStr = `📱 App: ${datePart} às ${timePart}`;
        }
      }
    }

    return (
      <Pressable
        onPress={() =>
          handlePress({ kind: "GENERIC", data: e })
        }
        onLongPress={() => handleLongPress(id)}
        accessibilityRole="button"
      >
        <Card $selected={isSelected}>
          {selectionMode && (
            <SelectionCheckbox $checked={isSelected}>
              {isSelected && <CheckMark>✓</CheckMark>}
            </SelectionCheckbox>
          )}

          <Avatar name={payerName} color={payerColor} size="md" />

          <CardBody>
            <TopRow>
              <TypeBadge $type="GENERIC">
                <TypeBadgeText $type="GENERIC">GEN</TypeBadgeText>
              </TypeBadge>
              <MarketTitle numberOfLines={1}>{e.title}</MarketTitle>
            </TopRow>

            <PriceText>{fmt(e.totalAmount)}</PriceText>

            <SplitDetailsContainer>
              <PayerText numberOfLines={1}>
                {payerName.split(" ")[0]} pagou tudo
              </PayerText>

              {e.participants
                .filter((p) => p.profileId !== e.payerId)
                .map((p) => {
                  const profile = profiles.find(
                    (pr) => pr.id === p.profileId,
                  );
                  const name = profile?.name.split(" ")[0] ?? "?";
                  return (
                    <DebtorRow key={p.profileId}>
                      <DebtorText numberOfLines={1}>
                        • {name}: {fmt(p.amountOwed)}
                      </DebtorText>
                      <StatusPill $isPaid={p.isPaid}>
                        <StatusText $isPaid={p.isPaid}>
                          {p.isPaid ? "PAGO" : "NÃO PAGO"}
                        </StatusText>
                      </StatusPill>
                    </DebtorRow>
                  );
                })}

              <DatesContainer>
                {appDateStr ? (
                  <DateText numberOfLines={1}>{appDateStr}</DateText>
                ) : null}
                <PurchaseDateText numberOfLines={1}>
                  📅 Gasto: {formattedDate}
                </PurchaseDateText>
              </DatesContainer>
            </SplitDetailsContainer>
          </CardBody>

          <RightSide>
            <IndexBadge>
              <IndexText>#{filteredList.length - index}</IndexText>
            </IndexBadge>
            <ChevronRight size={20} color={colors.textMuted} />
          </RightSide>
        </Card>
      </Pressable>
    );
  };

  return (
    <Container style={{ paddingTop: insets.top }}>
      <FlatList
        data={filteredList}
        keyExtractor={(item) => getEntryId(item)}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<EmptyText>Nenhum histórico disponível.</EmptyText>}
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

      {/* ─── Barra flutuante de seleção múltipla ─── */}
      {selectionMode && selectedIds.size > 0 && (
        <FloatingBar>
          <FloatingBarContent>
            <View style={{ flex: 1 }}>
              <FloatingLabel>Total pendente selecionado:</FloatingLabel>
              <FloatingAmount>{fmt(selectedTotalPending)}</FloatingAmount>
            </View>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center", flex: 1.1 }}>
              <DeleteBtn onPress={handleDeleteMultiple} activeOpacity={0.7}>
                <Trash2 size={22} color={colors.danger} />
              </DeleteBtn>
              <GenerateBillingBtn
                onPress={openBillingModal}
                activeOpacity={0.8}
              >
                <GenerateBillingText>Gerar Cobrança</GenerateBillingText>
              </GenerateBillingBtn>
            </View>
          </FloatingBarContent>
        </FloatingBar>
      )}

      {/* ─── Modal de Cobrança em Lote ─── */}
      <Modal
        visible={billingModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setBillingModalVisible(false)}
      >
        <BillingOverlay>
          <BillingSheet style={{ paddingBottom: Math.max(32, insets.bottom + 24) }}>
            {billingStep === 1 ? (
              <>
                <BillingTitle>Quem está cobrando?</BillingTitle>
                <BillingSubtitle>
                  Selecione o perfil de quem pagou as contas e quer cobrar os demais.
                </BillingSubtitle>

                <ScrollView
                  style={{ width: "100%", maxHeight: 320 }}
                  showsVerticalScrollIndicator={false}
                >
                  {profiles.map((p) => (
                    <BillingProfileRow
                      key={p.id}
                      onPress={() => selectCobrador(p.id)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                        <Avatar name={p.name} color={p.color} size="sm" />
                        <BillingProfileName numberOfLines={1}>{p.name}</BillingProfileName>
                      </View>
                      <ChevronRight size={18} color={colors.textMuted} />
                    </BillingProfileRow>
                  ))}
                </ScrollView>

                <BillingCancelBtn
                  onPress={() => setBillingModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <BillingCancelText>Cancelar</BillingCancelText>
                </BillingCancelBtn>
              </>
            ) : (
              <>
                <BillingTitle>Cobrar quem?</BillingTitle>
                <BillingSubtitle>
                  Selecione as pessoas que você quer cobrar. Os valores são calculados com base nas compras selecionadas.
                </BillingSubtitle>

                <ScrollView
                  style={{ width: "100%", maxHeight: 320, marginBottom: 12 }}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from(billingDebts.entries())
                    .filter(([, amount]) => amount > 0.01)
                    .map(([debtorId, amount]) => {
                      const debtor = profiles.find((p) => p.id === debtorId);
                      if (!debtor) return null;
                      const isChecked = billingDebtorIds.has(debtorId);

                      return (
                        <BillingProfileRow
                          key={debtorId}
                          onPress={() => toggleBillingDebtor(debtorId)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                            <Avatar name={debtor.name} color={debtor.color} size="sm" />
                            <View style={{ flex: 1 }}>
                              <BillingProfileName numberOfLines={1}>
                                {debtor.name}
                              </BillingProfileName>
                              <BillingAmountLabel>{fmt(amount)}</BillingAmountLabel>
                            </View>
                          </View>
                          <BillingCheckbox $checked={isChecked}>
                            {isChecked && <Check size={14} color="#FFFFFF" />}
                          </BillingCheckbox>
                        </BillingProfileRow>
                      );
                    })}

                  {billingDebts.size === 0 && (
                    <EmptyText style={{ marginTop: 20 }}>
                      Nenhum devedor encontrado para este cobrador nas compras selecionadas.
                    </EmptyText>
                  )}
                </ScrollView>

                <BillingActionsRow>
                  <BillingCancelBtn
                    onPress={() => {
                      setBillingStep(1);
                      setBillingCobradorId(null);
                    }}
                    activeOpacity={0.7}
                    style={{ flex: 1 }}
                  >
                    <BillingCancelText>Voltar</BillingCancelText>
                  </BillingCancelBtn>
                  <BillingConfirmBtn
                    onPress={handleGenerateBilling}
                    activeOpacity={0.7}
                    style={{ flex: 1, opacity: billingDebtorIds.size === 0 ? 0.4 : 1 }}
                    disabled={billingDebtorIds.size === 0}
                  >
                    <BillingConfirmText>Compartilhar</BillingConfirmText>
                  </BillingConfirmBtn>
                </BillingActionsRow>
              </>
            )}
          </BillingSheet>
        </BillingOverlay>
      </Modal>

      {/* ─── Modal de Confirmação de Exclusão ─── */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <ModalOverlay>
          <ModalContent>
            <ModalTitle>Excluir Compras</ModalTitle>
            <ModalSubtitle>
              Tem certeza que deseja excluir {selectedIds.size} compra{selectedIds.size > 1 ? "s" : ""}? Esta ação não pode ser desfeita.
            </ModalSubtitle>
            <ActionButtonsContainer>
              <ModalCancelButton
                onPress={() => setDeleteModalVisible(false)}
                activeOpacity={0.7}
              >
                <ModalCancelText>Cancelar</ModalCancelText>
              </ModalCancelButton>
              <ModalDeleteButton
                onPress={confirmDeleteMultiple}
                activeOpacity={0.7}
              >
                <ModalDeleteText>Excluir</ModalDeleteText>
              </ModalDeleteButton>
            </ActionButtonsContainer>
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

// ─── Helpers ───

function getEntryId(entry: UnifiedEntry): string {
  if (entry.kind === "NF") return (entry.data as HistoryEntry).id;
  return (entry.data as Expense).id;
}

function getComparableDate(entry: UnifiedEntry): string {
  if (entry.kind === "NF") {
    const h = entry.data as HistoryEntry;
    // Pega a data real da compra (dateCompra) se existir, senão pega a data de inclusão (date)
    const rawDate = h.dateCompra || h.date;
    // Tenta converter DD/MM/YYYY para YYYY-MM-DD para comparação
    const parts = rawDate.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return rawDate;
  }
  return (entry.data as Expense).date;
}

function getAppTimestamp(entry: UnifiedEntry): number {
  if (entry.kind === "NF") {
    const h = entry.data as HistoryEntry;
    return parseInt(h.id, 10) || 0;
  }
  const e = entry.data as Expense;
  if (e.id.startsWith("exp_")) {
    return parseInt(e.id.split("_")[1], 10) || 0;
  }
  return 0;
}

// ==========================================
// STYLED COMPONENTS
// ==========================================

const Container = styled(View)`
  flex: 1;
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.background};
`;

const Header = styled.View`
  margin-bottom: 24px;
`;

const Title = styled.Text`
  font-size: 32px;
  font-weight: 900;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
  letter-spacing: -0.5px;
  line-height: 38px;
`;

const Subtitle = styled.Text`
  font-size: 15px;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textSecondary};
  margin-top: 8px;
  font-weight: 500;
`;

const FilterRow = styled.View`
  flex-direction: row;
  gap: 8px;
  margin-top: 16px;
`;

const FilterPill = styled.TouchableOpacity<{ $active: boolean }>`
  padding: 8px 16px;
  border-radius: 999px;
  background-color: ${({
    $active,
    theme,
  }: {
    $active: boolean;
    theme: ThemeColors;
  }) => ($active ? theme.text : theme.cardBackground)};
  border-width: 1px;
  border-color: ${({
    $active,
    theme,
  }: {
    $active: boolean;
    theme: ThemeColors;
  }) => ($active ? theme.text : theme.borderLight)};
`;

const FilterPillText = styled.Text<{ $active: boolean }>`
  font-size: 13px;
  font-weight: 700;
  color: ${({ $active, theme }: { $active: boolean; theme: ThemeColors }) =>
    $active ? theme.background : theme.textSecondary};
`;

const SelectionBar = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 16px;
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.backgroundElevated};
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.border};
`;

const SelectionBarText = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
`;

const EmptyText = styled.Text`
  font-size: 15px;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textMuted};
  text-align: center;
  margin-top: 40px;
  font-weight: 500;
`;

const Card = styled.View<{ $selected?: boolean }>`
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.cardBackground};
  border-radius: 20px;
  padding: 16px;
  flex-direction: row;
  align-items: center;
  border-width: ${({ $selected }: { $selected?: boolean }) =>
    $selected ? "2px" : "1px"};
  border-color: ${({
    $selected,
    theme,
  }: {
    $selected?: boolean;
    theme: ThemeColors;
  }) => ($selected ? theme.accent : theme.border)};
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.04;
  shadow-radius: 8px;
  elevation: 2;
`;

const SelectionCheckbox = styled.View<{ $checked: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 12px;
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
  margin-right: 12px;
`;

const CheckMark = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
`;

const CardBody = styled.View`
  flex: 1;
  margin-left: 16px;
  margin-right: 12px;
  justify-content: center;
`;

const TopRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 2px;
  gap: 6px;
`;

const TypeBadge = styled.View<{ $type: string }>`
  padding: 2px 7px;
  border-radius: 6px;
  background-color: ${({
    $type,
    theme,
  }: {
    $type: string;
    theme: ThemeColors;
  }) => ($type === "NF" ? theme.infoLight : theme.accentLight)};
`;

const TypeBadgeText = styled.Text<{ $type: string }>`
  font-size: 9px;
  font-weight: 900;
  color: ${({
    $type,
    theme,
  }: {
    $type: string;
    theme: ThemeColors;
  }) => ($type === "NF" ? theme.infoText : theme.accent)};
  text-transform: uppercase;
`;

const MarketTitle = styled.Text`
  font-size: 15px;
  font-weight: 800;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
  flex: 1;
`;

const PriceText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }: { theme: ThemeColors }) => theme.accent};
  margin-bottom: 6px;
`;

const SplitDetailsContainer = styled.View`
  gap: 2px;
  margin-bottom: 8px;
`;

const PayerText = styled.Text`
  font-size: 12px;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textSecondary};
  font-weight: 600;
`;

const DebtorRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 2px;
`;

const DebtorText = styled.Text`
  font-size: 12px;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textMuted};
  font-weight: 500;
`;

const StatusPill = styled.View<{ $isPaid: boolean }>`
  border-width: 1px;
  border-color: ${({
    $isPaid,
    theme,
  }: {
    $isPaid: boolean;
    theme: ThemeColors;
  }) => ($isPaid ? theme.accent : theme.danger)};
  border-radius: 12px;
  padding-horizontal: 6px;
  padding-vertical: 2px;
  margin-left: 6px;
`;

const StatusText = styled.Text<{ $isPaid: boolean }>`
  font-size: 9px;
  font-weight: 800;
  color: ${({ $isPaid, theme }: { $isPaid: boolean; theme: ThemeColors }) =>
    $isPaid ? theme.accent : theme.danger};
  text-transform: uppercase;
`;

const DatesContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 0px;
  margin-top: 10px;
`;

const DateText = styled.Text`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textMuted};
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.backgroundElement};
  padding-vertical: 2px;
  padding-horizontal: 6px;
  border-radius: 6px;
`;

const PurchaseDateText = styled.Text`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textSecondary};
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.backgroundElement};
  padding-vertical: 2px;
  padding-horizontal: 6px;
  border-radius: 6px;
`;

const RightSide = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const IndexBadge = styled.View`
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.backgroundElement};
  align-items: center;
  justify-content: center;
`;

const IndexText = styled.Text`
  font-size: 10px;
  font-weight: 800;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textMuted};
`;

const Spacing = styled.View`
  height: 80px;
`;



// ─── Barra flutuante de seleção múltipla ───

const FloatingBar = styled.View`
  position: absolute;
  bottom: 24px;
  left: 24px;
  right: 24px;
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.backgroundElevated};
  border-radius: 24px;
  padding: 16px 20px;
  shadow-color: ${({ theme }: { theme: ThemeColors }) => theme.accent};
  shadow-offset: 0px 8px;
  shadow-opacity: 0.15;
  shadow-radius: 20px;
  elevation: 10;
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.border};
`;

const FloatingBarContent = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const FloatingLabel = styled.Text`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FloatingAmount = styled.Text`
  font-size: 20px;
  font-weight: 900;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
  margin-top: 2px;
`;

const DeleteBtn = styled.TouchableOpacity`
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.danger + "22"};
  width: 48px;
  height: 48px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.danger + "44"};
`;

const GenerateBillingBtn = styled.TouchableOpacity`
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.accent};
  padding: 14px 12px;
  border-radius: 16px;
  flex: 1;
  align-items: center;
  justify-content: center;
`;

const GenerateBillingText = styled.Text`
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
`;

// ─── Modal de Cobrança ───

const BillingOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.6);
  justify-content: flex-end;
`;

const BillingSheet = styled.View`
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.backgroundElevated};
  border-top-left-radius: 32px;
  border-top-right-radius: 32px;
  padding: 32px 24px;
  align-items: center;
  max-height: 80%;
`;

const BillingTitle = styled.Text`
  font-size: 22px;
  font-weight: 900;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
  margin-bottom: 8px;
`;

const BillingSubtitle = styled.Text`
  font-size: 14px;
  color: ${({ theme }: { theme: ThemeColors }) => theme.textSecondary};
  text-align: center;
  margin-bottom: 24px;
  line-height: 20px;
`;

const BillingProfileRow = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  padding: 12px 16px;
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.backgroundElement};
  border-radius: 16px;
  margin-bottom: 8px;
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.borderLight};
`;

const BillingProfileName = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
`;

const BillingAmountLabel = styled.Text`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }: { theme: ThemeColors }) => theme.danger};
  margin-top: 2px;
`;

const BillingCheckbox = styled.View<{ $checked: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border-width: 2px;
  border-color: ${({ $checked, theme }: { $checked: boolean; theme: ThemeColors }) =>
    $checked ? theme.accent : theme.borderLight};
  background-color: ${({ $checked, theme }: { $checked: boolean; theme: ThemeColors }) =>
    $checked ? theme.accent : "transparent"};
  align-items: center;
  justify-content: center;
`;

const BillingActionsRow = styled.View`
  flex-direction: row;
  gap: 12px;
  width: 100%;
`;

const BillingCancelBtn = styled.TouchableOpacity`
  padding: 16px;
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.backgroundElement};
  border-radius: 16px;
  align-items: center;
  border-width: 1px;
  border-color: ${({ theme }: { theme: ThemeColors }) => theme.border};
`;

const BillingCancelText = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }: { theme: ThemeColors }) => theme.text};
`;

const BillingConfirmBtn = styled.TouchableOpacity`
  padding: 16px;
  background-color: ${({ theme }: { theme: ThemeColors }) => theme.accent};
  border-radius: 16px;
  align-items: center;
`;

const BillingConfirmText = styled.Text`
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
`;

// ─── Modal de Exclusão ───

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.4);
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

const ModalContent = styled.View`
  width: 100%;
  background-color: ${({ theme }: { theme: ThemeColors }) =>
    theme.cardBackground};
  border-radius: 24px;
  padding: 32px 24px;
  align-items: center;
  shadow-color: #000;
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

const ActionButtonsContainer = styled.View`
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
