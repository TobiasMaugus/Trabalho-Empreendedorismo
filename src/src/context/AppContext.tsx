import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Allocations, Expense, GroceryItem, HistoryEntry, Profile } from "../types";

// ─── Tipos auxiliares ───

interface AddGenericExpenseData {
  title: string;
  description?: string;
  date: string; // ISO YYYY-MM-DD
  totalAmount: number;
  payerId: string;
  participantIds: string[]; // IDs dos participantes (divisão igualitária)
}

interface BatchStatusUpdate {
  expenseId: string;
  profileId: string;
  isPaid: boolean;
}

// ─── Interface do Contexto ───

interface AppContextType {
  profiles: Profile[];
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
  items: GroceryItem[];
  setItems: React.Dispatch<React.SetStateAction<GroceryItem[]>>;
  allocs: Allocations;
  setAllocs: React.Dispatch<React.SetStateAction<Allocations>>;
  historyEntries: HistoryEntry[];
  setHistoryEntries: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  // Edição / restauração de histórico
  editingEntry: HistoryEntry | null;
  setEditingEntry: React.Dispatch<React.SetStateAction<HistoryEntry | null>>;
  deleteHistoryEntry: (id: string) => void;
  restoreHistoryEntry: (entry: HistoryEntry) => void;
  updateHistoryEntry: (entry: HistoryEntry) => void;
  loadMockData: () => void;
  clearAllData: () => Promise<void>; // Tipagem da nova função
  isHydrated: boolean;
  scrapedMarket: string;
  setScrapedMarket: React.Dispatch<React.SetStateAction<string>>;
  scrapedDate: string;
  setScrapedDate: React.Dispatch<React.SetStateAction<string>>;
  scrapedTime: string;
  setScrapedTime: React.Dispatch<React.SetStateAction<string>>;
  scrapedTotal: number | null;
  setScrapedTotal: React.Dispatch<React.SetStateAction<number | null>>;
  scrapedPaid: number | null;
  setScrapedPaid: React.Dispatch<React.SetStateAction<number | null>>;
  scrapedDiscount: number | null;
  setScrapedDiscount: React.Dispatch<React.SetStateAction<number | null>>;

  // ─── Novos: Gastos Genéricos & Pagamentos ───
  expenses: Expense[];
  addGenericExpense: (data: AddGenericExpenseData) => void;
  deleteExpense: (expenseId: string) => void;
  addPaymentTransaction: (payerId: string, receiverId: string, amount: number) => void;
  toggleExpenseParticipantStatus: (expenseId: string, profileId: string, isPaid: boolean) => void;
  updateMultipleExpensesStatus: (updates: BatchStatusUpdate[]) => void;
  settleFullDebt: (debtorId: string, creditorId: string) => void;
  updateGenericExpense: (id: string, data: AddGenericExpenseData) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const HISTORY_KEY = "@app:history";
const PROFILES_KEY = "@app:profiles";
const EXPENSES_KEY = "@app:expenses";

export function AppProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [allocs, setAllocs] = useState<Allocations>({});
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  // ─── Novo state: Gastos Genéricos & Pagamentos ───
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Os estados agora estão no lugar certo (dentro do AppProvider)
  const [scrapedMarket, setScrapedMarket] = useState("");
  const [scrapedDate, setScrapedDate] = useState("");
  const [scrapedTime, setScrapedTime] = useState("");
  const [scrapedTotal, setScrapedTotal] = useState<number | null>(null);
  const [scrapedPaid, setScrapedPaid] = useState<number | null>(null);
  const [scrapedDiscount, setScrapedDiscount] = useState<number | null>(null);

  // Histórico em edição (quando o usuário 'refaz' um rateio)
  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null);

  // Controla se a leitura inicial terminou
  const [isHydrated, setIsHydrated] = useState(false);

  // Trava interna síncrona para impedir os useEffects de salvamento na inicialização
  const isLoaded = useRef(false);

  // ─── Funções para manipular histórico (delete / restore / update) ───

  const deleteHistoryEntry = (id: string) => {
    setHistoryEntries((prev) => prev.filter((h) => h.id !== id));
  };

  const restoreHistoryEntry = (entry: HistoryEntry) => {
    // Injetamos o estado completo no contexto para reabrir o fluxo de processamento
    setItems(entry.items ?? []);
    // Ao refazer o rateio, queremos iniciar o processamento do ZERO —
    // limpamos as alocações salvas para que a tela de Processing comece do início.
    setAllocs({});
    setScrapedMarket(entry.marketName ?? "");
    setScrapedDate(entry.dateCompra ?? "");
    setScrapedTime(entry.horarioCompra ?? "");
    setScrapedTotal(entry.total ?? null);
    const disc = entry.desconto ?? 0;
    setScrapedDiscount(entry.desconto ?? null);
    setScrapedPaid(
      entry.total != null ? Math.max(0, (entry.total ?? 0) - disc) : null,
    );
    setEditingEntry(entry);

    if (entry.participants && entry.participants.length > 0) {
      setProfiles((prevProfiles) => {
        const updatedProfiles = [...prevProfiles];

        entry.participants!.forEach((pastProfile) => {
          // Se o perfil da época não existe mais na lista atual do app, nós o resgatamos
          const exists = updatedProfiles.some((p) => p.id === pastProfile.id);
          if (!exists) {
            updatedProfiles.push(pastProfile);
          }
        });

        return updatedProfiles;
      });
    }
  };

  const updateHistoryEntry = (entry: HistoryEntry) => {
    setHistoryEntries((prev) =>
      prev.map((h) => (h.id === entry.id ? entry : h)),
    );
  };

  // ─── Funções de Gastos Genéricos & Pagamentos ───

  const generateId = () =>
    `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const addGenericExpense = (data: AddGenericExpenseData) => {
    const perPerson = data.totalAmount / data.participantIds.length;
    const newExpense: Expense = {
      id: generateId(),
      type: "GENERIC",
      title: data.title,
      description: data.description,
      date: data.date,
      totalAmount: data.totalAmount,
      payerId: data.payerId,
      participants: data.participantIds.map((pid) => ({
        profileId: pid,
        amountOwed: perPerson,
        isPaid: pid === data.payerId, // O pagador já "pagou" a si mesmo
      })),
    };
    setExpenses((prev) => [newExpense, ...prev]);
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
  };

  const updateGenericExpense = (id: string, data: AddGenericExpenseData) => {
    setExpenses((prev) =>
      prev.map((exp) => {
        if (exp.id !== id) return exp;
        const perPerson = data.totalAmount / data.participantIds.length;
        return {
          ...exp,
          title: data.title,
          description: data.description,
          date: data.date,
          totalAmount: data.totalAmount,
          payerId: data.payerId,
          participants: data.participantIds.map((pid) => {
            // Preserve isPaid status from existing participant if they existed before
            const existing = exp.participants.find((p) => p.profileId === pid);
            return {
              profileId: pid,
              amountOwed: perPerson,
              isPaid: pid === data.payerId ? true : (existing?.isPaid ?? false),
            };
          }),
        };
      }),
    );
  };

  const addPaymentTransaction = (
    payerId: string,
    receiverId: string,
    amount: number,
  ) => {
    const payment: Expense = {
      id: generateId(),
      type: "PAYMENT",
      title: "Pagamento avulso",
      date: new Date().toISOString().split("T")[0],
      totalAmount: amount,
      payerId,
      receiverId,
      participants: [
        { profileId: payerId, amountOwed: amount, isPaid: true },
      ],
    };
    setExpenses((prev) => [payment, ...prev]);
  };

  const toggleExpenseParticipantStatus = (
    expenseId: string,
    profileId: string,
    isPaid: boolean,
  ) => {
    setExpenses((prev) =>
      prev.map((exp) => {
        if (exp.id !== expenseId) return exp;
        return {
          ...exp,
          participants: exp.participants.map((p) =>
            p.profileId === profileId ? { ...p, isPaid } : p,
          ),
        };
      }),
    );
  };

  const updateMultipleExpensesStatus = (updates: BatchStatusUpdate[]) => {
    setExpenses((prev) =>
      prev.map((exp) => {
        const relevantUpdates = updates.filter((u) => u.expenseId === exp.id);
        if (relevantUpdates.length === 0) return exp;
        return {
          ...exp,
          participants: exp.participants.map((p) => {
            const update = relevantUpdates.find(
              (u) => u.profileId === p.profileId,
            );
            return update ? { ...p, isPaid: update.isPaid } : p;
          }),
        };
      }),
    );
  };

  const settleFullDebt = (debtorId: string, creditorId: string) => {
    // 1. Marca tudo como pago nos gastos genéricos
    setExpenses((prev) =>
      prev.map((exp) => {
        if (exp.type === "PAYMENT") return exp;
        if (exp.payerId !== creditorId) return exp;
        return {
          ...exp,
          participants: exp.participants.map((p) =>
            p.profileId === debtorId ? { ...p, isPaid: true } : p,
          ),
        };
      }),
    );

    // 2. Marca tudo como pago nas NFs
    setHistoryEntries((prev) =>
      prev.map((entry) => {
        if (entry.payer?.id !== creditorId) return entry;
        const entryProfiles =
          entry.participants && entry.participants.length > 0
            ? entry.participants
            : profiles;
        const participant = entryProfiles.find((p) => p.id === debtorId);
        if (!participant) return entry;
        return {
          ...entry,
          paidStatus: {
            ...(entry.paidStatus || {}),
            [debtorId]: true,
          },
        };
      }),
    );

    // Nota: NÃO criamos um PAYMENT transaction aqui. Marcar isPaid=true já é
    // suficiente — criar um PAYMENT causaria dupla contagem na tela de Balanço.
  };

  // ─── NOVA FUNÇÃO: Limpa todos os estados e o armazenamento físico local ───

  // 🔥 NOVA FUNÇÃO: Limpa todos os estados e o armazenamento físico local
  const clearAllData = async () => {
    try {
      setProfiles([]);
      setHistoryEntries([]);
      setExpenses([]);
      setItems([]);
      setAllocs({});
      setEditingEntry(null);
      setScrapedMarket("");
      setScrapedDate("");
      setScrapedTime("");
      setScrapedTotal(null);
      setScrapedPaid(null);
      setScrapedDiscount(null);

      await Promise.all([
        AsyncStorage.removeItem(HISTORY_KEY),
        AsyncStorage.removeItem(PROFILES_KEY),
        AsyncStorage.removeItem(EXPENSES_KEY),
      ]);
      console.log("AppProvider: Todos os dados foram resetados.");
    } catch (e) {
      console.error("Erro ao resetar dados do AsyncStorage", e);
    }
  };

  // 1. CARREGA OS DADOS DO DISPOSITIVO AO INICIAR
  useEffect(() => {
    const loadAllData = async () => {
      console.log("AppProvider: start loadAllData");
      try {
        const [storedHistory, storedProfiles, storedExpenses] = await Promise.all([
          AsyncStorage.getItem(HISTORY_KEY),
          AsyncStorage.getItem(PROFILES_KEY),
          AsyncStorage.getItem(EXPENSES_KEY),
          new Promise((resolve) => setTimeout(resolve, 600)), // Mínimo de 0.6s garantido
        ]);

        if (storedHistory) {
          setHistoryEntries(JSON.parse(storedHistory));
        }
        if (storedProfiles) {
          setProfiles(JSON.parse(storedProfiles));
        }
        if (storedExpenses) {
          setExpenses(JSON.parse(storedExpenses));
        }
      } catch (e) {
        console.error("Erro ao carregar dados do AsyncStorage", e);
      } finally {
        setTimeout(() => {
          isLoaded.current = true;
          setIsHydrated(true);
        }, 50);
      }
    };

    loadAllData();
  }, []);

  // 2. SALVA O HISTÓRICO APENAS APÓS O CARREGAMENTO INICIAL
  useEffect(() => {
    if (!isLoaded.current) return;

    const saveHistory = async () => {
      try {
        console.log(
          "AppProvider: saving history, count=",
          historyEntries.length,
        );
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(historyEntries));
      } catch (e) {
        console.error("Erro ao salvar histórico", e);
      }
    };
    saveHistory();
  }, [historyEntries]);

  // 3. SALVA OS PERFIS APENAS APÓS O CARREGAMENTO INICIAL
  useEffect(() => {
    if (!isLoaded.current) return;

    const saveProfiles = async () => {
      try {
        console.log("AppProvider: saving profiles, count=", profiles.length);
        await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      } catch (e) {
        console.error("Erro ao salvar perfis", e);
      }
    };
    saveProfiles();
  }, [profiles]);

  // 4. SALVA OS GASTOS (EXPENSES) APENAS APÓS O CARREGAMENTO INICIAL
  useEffect(() => {
    if (!isLoaded.current) return;

    const saveExpenses = async () => {
      try {
        console.log("AppProvider: saving expenses, count=", expenses.length);
        await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
      } catch (e) {
        console.error("Erro ao salvar expenses", e);
      }
    };
    saveExpenses();
  }, [expenses]);

  const loadMockData = () => {
    import("../mockData").then((mock) => {
      setProfiles(mock.MOCK_PROFILES);
      setItems(mock.MOCK_ITEMS);
    });
  };

  return (
    <AppContext.Provider
      value={{
        profiles,
        setProfiles,
        items,
        setItems,
        allocs,
        setAllocs,
        historyEntries,
        setHistoryEntries,
        editingEntry,
        setEditingEntry,
        deleteHistoryEntry,
        restoreHistoryEntry,
        updateHistoryEntry,
        loadMockData,
        clearAllData, // Exportado com sucesso aqui
        isHydrated,
        scrapedMarket,
        setScrapedMarket,
        scrapedDate,
        setScrapedDate,
        scrapedTime,
        setScrapedTime,
        scrapedTotal,
        setScrapedTotal,
        scrapedPaid,
        setScrapedPaid,
        scrapedDiscount,
        setScrapedDiscount,
        // ─── Novos ───
        expenses,
        addGenericExpense,
        deleteExpense,
        addPaymentTransaction,
        toggleExpenseParticipantStatus,
        updateMultipleExpensesStatus,
        settleFullDebt,
        updateGenericExpense,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }

  return context;
}
