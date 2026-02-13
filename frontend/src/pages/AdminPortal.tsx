import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  createWellnessTask,
  createCustomProduct,
  getCurrentUser,
  getEmailTemplates,
  getPendingSubmissions,
  importAmazonList,
  importAmazonProduct,
  seedStoreProduct,
  approveSubmission,
  rejectSubmission,
  updateEmailTemplate,
  getPendingPurchases,
  getAllPurchases,
  fulfillPurchase,
  getAllWellnessTasks,
  deleteWellnessTask,
  getAllUsersWithSubmissions,
  getAllEmployees,
  createEmployee,
  updateEmployeeRoles,
  getGoogleChatAuditLogs,
  getGoogleChatStats,
  getManagerAllotmentDetails,
  depositAllotment,
  setRecurringBudget,
  getBalanceReport,
  adjustUserBalance,
  bulkCreateEmployees,
  getAdminStoreProducts,
  toggleProductStatus,
  deleteProduct,
  getCampaigns,
  getAdminGameConfigs,
  toggleGameEnabled,
  updateAdminGameConfig,
  getAdminJackpots,
  createAdminJackpot,
  updateAdminJackpot,
  AdminGameConfig,
  GameType,
  Jackpot,
  User,
  EmailTemplate,
  PurchaseOrder,
  StoreProduct,
  WellnessTask as WellnessTaskType,
  WellnessSubmission,
  Employee,
  ChatCommandAudit,
  ChatAuditStats,
  ManagerAllotmentDetails,
  Campaign,
} from '../services/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import PendingSubmissionsList from '../components/Admin/PendingSubmissionsList';
import { CampaignStudio } from '../components/Admin/CampaignStudio';
import { StoreTab, GoogleChatTab, SettingsTab, GamesTab } from '../components/Admin/tabs';

interface Submission {
  id: string;
  employee: {
    id: string;
    name: string;
    email: string;
  };
  wellnessTask: {
    id: string;
    name: string;
    coinValue: number;
  };
  documentUrl: string;
  submittedAt: string;
  status: string;
}

type TabType = 'wellness' | 'store' | 'studio' | 'google-chat' | 'settings' | 'games';
type SettingsTabType = 'smtp' | 'email-templates' | 'roles' | 'allotments' | 'award-presets';

export default function AdminPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast, confirm } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('wellness');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    instructions: '',
    coinValue: '',
    frequencyRule: 'one_time',
    maxRewardedUsers: '',
  });
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [savingTemplateKey, setSavingTemplateKey] = useState<string | null>(null);
  const [customProductForm, setCustomProductForm] = useState({
    name: '',
    description: '',
    coinValue: '',
  });
  const [customProductImage, setCustomProductImage] = useState<File | null>(null);
  const [customProductLoading, setCustomProductLoading] = useState(false);
  const [amazonProductUrl, setAmazonProductUrl] = useState('');
  const [amazonProductLoading, setAmazonProductLoading] = useState(false);
  const [amazonProductResult, setAmazonProductResult] = useState<string | null>(null);
  const [amazonListUrl, setAmazonListUrl] = useState('');
  const [amazonListLimit, setAmazonListLimit] = useState('20');
  const [amazonListLoading, setAmazonListLoading] = useState(false);
  const [seedProductLoading, setSeedProductLoading] = useState(false);
  const [amazonListResult, setAmazonListResult] = useState<
    | {
        requested: number;
        totalFound: number;
        results: Array<{ asin: string; status: string; message?: string }>;
      }
    | null
  >(null);
  const [pendingPurchases, setPendingPurchases] = useState<PurchaseOrder[]>([]);
  const [allPurchases, setAllPurchases] = useState<PurchaseOrder[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesTab, setPurchasesTab] = useState<'pending' | 'all'>('pending');
  const [fulfillingId, setFulfillingId] = useState<string | null>(null);
  const [fulfillForm, setFulfillForm] = useState<{ trackingNumber: string; notes: string }>({
    trackingNumber: '',
    notes: '',
  });
  const [wellnessTasks, setWellnessTasks] = useState<WellnessTaskType[]>([]);
  const [wellnessTasksLoading, setWellnessTasksLoading] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [usersWithSubmissions, setUsersWithSubmissions] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      submissions: WellnessSubmission[];
    }>
  >([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<SettingsTabType>('smtp');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [updatingEmployeeId, setUpdatingEmployeeId] = useState<string | null>(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    name: '',
    isManager: false,
    isAdmin: false,
    isGameMaster: false,
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  // Balance management state
  const [balanceMap, setBalanceMap] = useState<Record<string, number>>({});
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [chatAuditLogs, setChatAuditLogs] = useState<ChatCommandAudit[]>([]);
  const [chatStats, setChatStats] = useState<ChatAuditStats | null>(null);
  const [chatLogsLoading, setChatLogsLoading] = useState(false);
  const [chatPage, setChatPage] = useState(1);
  const [chatTotalPages, setChatTotalPages] = useState(1);
  const [chatFilters, setChatFilters] = useState<{
    status?: string;
    userEmail?: string;
  }>({});
  // Allotment management state
  const [managers, setManagers] = useState<Employee[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [selectedManagerAllotment, setSelectedManagerAllotment] = useState<ManagerAllotmentDetails | null>(null);
  const [allotmentLoading, setAllotmentLoading] = useState(false);
  const [depositForm, setDepositForm] = useState({ amount: '', description: '' });
  const [depositLoading, setDepositLoading] = useState(false);
  const [recurringForm, setRecurringForm] = useState({ amount: '' });
  const [recurringLoading, setRecurringLoading] = useState(false);
  // Store product management state
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [storeProductsLoading, setStoreProductsLoading] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  // Campaign management state (used for tab badge count)
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  // Game management state
  const [adminGameConfigs, setAdminGameConfigs] = useState<AdminGameConfig[]>([]);
  const [gameConfigsLoading, setGameConfigsLoading] = useState(false);
  const [adminJackpots, setAdminJackpots] = useState<Jackpot[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const userRes = await getCurrentUser();
        const currentUser = userRes.data;
        setUser(currentUser);

        // [ORIGINAL - 2026-02-12] Check if user is admin - if not, redirect to dashboard
        // if (!currentUser.isAdmin) {
        //   navigate('/dashboard');
        //   return;
        // }
        // Check if user is admin or game master - if neither, redirect to dashboard
        if (!currentUser.isAdmin && !currentUser.isGameMaster) {
          navigate('/dashboard');
          return;
        }

        // GMs only see the games tab — skip loading admin-only data
        if (currentUser.isAdmin) {
          const [submissionsRes, templatesRes] = await Promise.all([
            getPendingSubmissions(),
            getEmailTemplates(),
          ]);
          setSubmissions(submissionsRes.data);
          setEmailTemplates(templatesRes.data);

          // Load purchases
          const [pendingRes, allRes] = await Promise.all([
            getPendingPurchases(),
            getAllPurchases(),
          ]);
          setPendingPurchases(pendingRes.data);
          setAllPurchases(allRes.data);
        }

        // GMs default to games tab
        if (!currentUser.isAdmin && currentUser.isGameMaster) {
          setActiveTab('games');
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
        if (axiosErr.response?.status === 401) {
          navigate('/login');
        } else if (axiosErr.response?.status === 403) {
          // Forbidden - not an admin
          navigate('/dashboard');
        }
      } finally {
        setLoading(false);
        setTemplatesLoading(false);
      }
    };

    loadData();
  }, [navigate, location.pathname]);

  // Auto-load wellness data when wellness tab becomes active
  useEffect(() => {
    if (activeTab === 'wellness' && !loading) {
      const loadWellnessData = async () => {
        setWellnessTasksLoading(true);
        setUsersLoading(true);
        try {
          const [tasksRes, usersRes] = await Promise.all([
            getAllWellnessTasks(),
            getAllUsersWithSubmissions(),
          ]);
          setWellnessTasks(tasksRes.data);
          setUsersWithSubmissions(usersRes.data);
        } catch (err: unknown) {
          console.error('Failed to load wellness data:', err);
        } finally {
          setWellnessTasksLoading(false);
          setUsersLoading(false);
        }
      };
      loadWellnessData();
    }
  }, [activeTab, loading]);

  // Auto-load employees when roles tab becomes active
  useEffect(() => {
    if (activeTab === 'settings' && settingsTab === 'roles' && !loading) {
      loadEmployees();
    }
  }, [activeTab, settingsTab, loading]);

  // Auto-load Google Chat data when google-chat tab becomes active
  useEffect(() => {
    if (activeTab === 'google-chat' && !loading) {
      loadGoogleChatData();
    }
  }, [activeTab, loading, chatPage, chatFilters]);

  // Auto-load managers when allotments tab becomes active
  useEffect(() => {
    if (activeTab === 'settings' && settingsTab === 'allotments' && !loading) {
      loadManagers();
    }
  }, [activeTab, settingsTab, loading]);

  // Auto-load store products when store tab becomes active
  useEffect(() => {
    if (activeTab === 'store' && !loading && storeProducts.length === 0) {
      loadStoreProducts();
    }
  }, [activeTab, loading]);

  // Load campaigns on initial load for tab badge count
  useEffect(() => {
    if (activeTab === 'studio' && !loading) {
      loadCampaigns();
    }
  }, [activeTab, loading]);

  // Auto-load game configs when games tab becomes active
  useEffect(() => {
    if (activeTab === 'games' && !loading) {
      loadGameData();
    }
  }, [activeTab, loading]);

  const loadGameData = async () => {
    setGameConfigsLoading(true);
    try {
      const [configRes, jackpotRes] = await Promise.allSettled([
        getAdminGameConfigs(),
        getAdminJackpots(),
      ]);
      if (configRes.status === 'fulfilled') setAdminGameConfigs(configRes.value.data);
      if (jackpotRes.status === 'fulfilled') {
        const jpData = jackpotRes.value.data;
        setAdminJackpots(Array.isArray(jpData) ? jpData : []);
      }
    } catch (err: unknown) {
      console.error('Failed to load game data:', err);
    } finally {
      setGameConfigsLoading(false);
    }
  };

  const handleToggleGame = async (gameType: GameType) => {
    try {
      const res = await toggleGameEnabled(gameType);
      setAdminGameConfigs((prev) =>
        prev.map((c) => (c.gameType === gameType ? { ...c, enabled: res.data.enabled } : c))
      );
      addToast(`${gameType} ${res.data.enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to toggle game', 'error');
    }
  };

  const handleUpdateGameConfig = async (gameType: GameType, data: Partial<AdminGameConfig>) => {
    try {
      const res = await updateAdminGameConfig(gameType, data);
      setAdminGameConfigs((prev) =>
        prev.map((c) => (c.gameType === gameType ? res.data : c))
      );
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to update game config', 'error');
    }
  };

  const handleToggleJackpot = async (jackpotId: string) => {
    try {
      const jp = adminJackpots.find((j) => j.id === jackpotId);
      if (!jp) return;
      await updateAdminJackpot(jackpotId, { isActive: true });
      addToast('Jackpot toggled', 'success');
      await loadGameData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to toggle jackpot', 'error');
    }
  };

  const handleInitializeJackpots = async () => {
    try {
      await createAdminJackpot({ name: 'Rolling Jackpot', type: 'rolling', initialBalance: 0 });
      await createAdminJackpot({ name: 'Daily Jackpot', type: 'daily', initialBalance: 0 });
      await createAdminJackpot({ name: 'Weekly Jackpot', type: 'weekly', initialBalance: 0 });
      addToast('Default jackpots created!', 'success');
      await loadGameData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to initialize jackpots', 'error');
    }
  };

  const loadCampaigns = async () => {
    try {
      const res = await getCampaigns();
      setCampaigns(res.data);
    } catch (err: unknown) {
      console.error('Failed to load campaigns:', err);
    }
  };

  const loadGoogleChatData = async () => {
    setChatLogsLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        getGoogleChatAuditLogs({
          page: chatPage,
          limit: 50,
          ...chatFilters,
        }),
        getGoogleChatStats(),
      ]);
      setChatAuditLogs(logsRes.data.data);
      setChatTotalPages(logsRes.data.pagination.totalPages);
      setChatStats(statsRes.data);
    } catch (err: unknown) {
      console.error('Failed to load Google Chat data:', err);
    } finally {
      setChatLogsLoading(false);
    }
  };

  const loadManagers = async () => {
    setManagersLoading(true);
    try {
      const res = await getAllEmployees();
      // Filter to only managers
      const managerList = res.data.filter((emp: Employee) => emp.isManager);
      setManagers(managerList);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to load managers', 'error');
    } finally {
      setManagersLoading(false);
    }
  };

  const loadManagerAllotment = async (managerId: string) => {
    setAllotmentLoading(true);
    setSelectedManagerAllotment(null);
    try {
      const res = await getManagerAllotmentDetails(managerId);
      setSelectedManagerAllotment(res.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to load manager allotment', 'error');
    } finally {
      setAllotmentLoading(false);
    }
  };

  const handleSelectManager = (managerId: string) => {
    setSelectedManagerId(managerId);
    setDepositForm({ amount: '', description: '' });
    setRecurringForm({ amount: '' });
    loadManagerAllotment(managerId);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManagerId) return;

    const amount = parseFloat(depositForm.amount);
    if (isNaN(amount) || amount === 0) {
      addToast('Please enter a non-zero amount', 'error');
      return;
    }

    setDepositLoading(true);
    try {
      await depositAllotment(selectedManagerId, {
        amount,
        description: depositForm.description || undefined,
      });
      addToast(amount > 0 ? 'Allotment deposited successfully!' : 'Allotment deducted successfully!', 'success');
      setDepositForm({ amount: '', description: '' });
      // Reload the allotment details
      await loadManagerAllotment(selectedManagerId);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to deposit allotment', 'error');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleSetRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManagerId) return;

    const amount = parseFloat(recurringForm.amount);
    if (isNaN(amount) || amount < 0) {
      addToast('Please enter a valid amount (0 to disable recurring)', 'error');
      return;
    }

    setRecurringLoading(true);
    try {
      await setRecurringBudget(selectedManagerId, { amount });
      addToast(amount > 0 ? 'Recurring budget set successfully!' : 'Recurring budget disabled', 'success');
      setRecurringForm({ amount: '' });
      // Reload the allotment details
      await loadManagerAllotment(selectedManagerId);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to set recurring budget', 'error');
    } finally {
      setRecurringLoading(false);
    }
  };

  const loadStoreProducts = async () => {
    setStoreProductsLoading(true);
    try {
      const res = await getAdminStoreProducts();
      setStoreProducts(res.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to load store products', 'error');
    } finally {
      setStoreProductsLoading(false);
    }
  };

  const handleToggleProduct = async (productId: string) => {
    setTogglingProductId(productId);
    try {
      const res = await toggleProductStatus(productId);
      setStoreProducts((prev) =>
        prev.map((p) => (p.id === productId ? res.data.product : p))
      );
      addToast(res.data.message, 'success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to toggle product status', 'error');
    } finally {
      setTogglingProductId(null);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!await confirm(`Are you sure you want to delete "${productName}"? This cannot be undone.`)) {
      return;
    }

    setDeletingProductId(productId);
    try {
      const res = await deleteProduct(productId);
      if (res.data.softDeleted) {
        // Product was soft deleted, update in list
        setStoreProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, isActive: false } : p))
        );
      } else {
        // Product was hard deleted, remove from list
        setStoreProducts((prev) => prev.filter((p) => p.id !== productId));
      }
      addToast(res.data.message, 'success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to delete product', 'error');
    } finally {
      setDeletingProductId(null);
    }
  };

  // [ORIGINAL - 2026-02-13] loadBalanceMap silently caught errors, leaving balanceMap as {} with no user feedback
  // const loadBalanceMap = async () => {
  //   try {
  //     const res = await getBalanceReport();
  //     const map: Record<string, number> = {};
  //     for (const row of res.data.reportData) {
  //       map[row.employeeId] = row.userBalance;
  //     }
  //     setBalanceMap(map);
  //   } catch (err: unknown) {
  //     console.error('Failed to load balance map:', err);
  //   }
  // };
  const loadBalanceMap = async () => {
    setBalanceError(null);
    try {
      const res = await getBalanceReport();
      const map: Record<string, number> = {};
      for (const row of res.data.reportData) {
        map[row.employeeId] = row.userBalance;
      }
      setBalanceMap(map);
    } catch (err: unknown) {
      console.error('Failed to load balance map:', err);
      setBalanceError('Failed to load balance data. Click Refresh to retry.');
    }
  };

  const loadEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const [empRes] = await Promise.all([
        getAllEmployees(),
        loadBalanceMap(),
      ]);
      setEmployees(empRes.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to load employees', 'error');
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleUpdateRoles = async (employeeId: string, updates: { isManager?: boolean; isAdmin?: boolean }) => {
    setUpdatingEmployeeId(employeeId);
    try {
      const res = await updateEmployeeRoles(employeeId, updates);
      setEmployees((prev) => prev.map((emp) => (emp.id === employeeId ? res.data : emp)));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to update roles', 'error');
    } finally {
      setUpdatingEmployeeId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserForm.email.trim() || !newUserForm.name.trim()) {
      addToast('Email and name are required', 'error');
      return;
    }

    setCreatingUser(true);
    try {
      const res = await createEmployee({
        email: newUserForm.email.trim(),
        name: newUserForm.name.trim(),
        isManager: newUserForm.isManager,
        isAdmin: newUserForm.isAdmin,
        isGameMaster: newUserForm.isGameMaster,
      });
      setEmployees((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewUserForm({ email: '', name: '', isManager: false, isAdmin: false, isGameMaster: false });
      setShowAddUserForm(false);
      addToast('User created successfully! An email notification has been sent.', 'success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to create user', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleAdjustBalance = async (employeeId: string, amount: number, reason: string) => {
    try {
      await adjustUserBalance(employeeId, { amount, reason });
      addToast(`Balance ${amount > 0 ? 'credited' : 'debited'} successfully`, 'success');
      await loadBalanceMap();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to adjust balance', 'error');
    }
  };

  const handleBulkUpload = async (file: File) => {
    setBulkUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await bulkCreateEmployees(formData);
      const parts: string[] = [];
      if (res.data.created > 0) parts.push(`${res.data.created} created`);
      if (res.data.skipped > 0) parts.push(`${res.data.skipped} skipped (already exist)`);
      if (res.data.errors.length > 0) parts.push(`${res.data.errors.length} errors`);
      addToast(parts.join(', ') || 'No rows processed', res.data.created > 0 ? 'success' : 'error');
      if (res.data.created > 0) {
        await loadEmployees();
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Bulk upload failed', 'error');
    } finally {
      setBulkUploading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveSubmission(id);
      addToast('Submission approved successfully!', 'success');
      // Reload submissions
      const submissionsRes = await getPendingSubmissions();
      setSubmissions(submissionsRes.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to approve submission', 'error');
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    if (!reason) {
      const input = prompt('Please provide a reason for rejection:');
      if (!input) return;
      reason = input;
    }

    try {
      await rejectSubmission(id, reason);
      addToast('Submission rejected', 'success');
      // Reload submissions
      const submissionsRes = await getPendingSubmissions();
      setSubmissions(submissionsRes.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to reject submission', 'error');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskForm.name.trim()) {
      addToast('Task name is required', 'error');
      return;
    }

    if (!taskForm.coinValue || Number(taskForm.coinValue) <= 0) {
      addToast('Coin value must be greater than 0', 'error');
      return;
    }

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', taskForm.name.trim());
      if (taskForm.description.trim()) {
        formData.append('description', taskForm.description.trim());
      }
      if (taskForm.instructions.trim()) {
        formData.append('instructions', taskForm.instructions.trim());
      }
      formData.append('coinValue', taskForm.coinValue);
      formData.append('frequencyRule', taskForm.frequencyRule);
      if (taskForm.maxRewardedUsers.trim()) {
        formData.append('maxRewardedUsers', taskForm.maxRewardedUsers.trim());
      }
      if (templateFile) {
        formData.append('template', templateFile);
      }

      await createWellnessTask(formData);
      addToast('Wellness task created successfully', 'success');
      setTaskForm({
        name: '',
        description: '',
        instructions: '',
        coinValue: '',
        frequencyRule: 'one_time',
        maxRewardedUsers: '',
      });
      setTemplateFile(null);
      // Reload wellness tasks list
      await loadWellnessTasks();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to create wellness task', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customProductForm.name.trim()) {
      addToast('Product name is required', 'error');
      return;
    }

    if (!customProductForm.coinValue || Number(customProductForm.coinValue) <= 0) {
      addToast('Guincoin value must be greater than 0', 'error');
      return;
    }

    if (!customProductImage) {
      addToast('Product image is required', 'error');
      return;
    }

    setCustomProductLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', customProductForm.name.trim());
      if (customProductForm.description.trim()) {
        formData.append('description', customProductForm.description.trim());
      }
      formData.append('coinValue', customProductForm.coinValue);
      formData.append('image', customProductImage);

      await createCustomProduct(formData);
      addToast('Store product created successfully', 'success');
      setCustomProductForm({ name: '', description: '', coinValue: '' });
      setCustomProductImage(null);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to create store product', 'error');
    } finally {
      setCustomProductLoading(false);
    }
  };

  const handleImportAmazonProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amazonProductUrl.trim()) {
      addToast('Amazon product URL is required', 'error');
      return;
    }

    setAmazonProductLoading(true);
    setAmazonProductResult(null);
    try {
      await importAmazonProduct(amazonProductUrl.trim());
      setAmazonProductResult('Imported successfully.');
      setAmazonProductUrl('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setAmazonProductResult(axiosErr.response?.data?.error || 'Amazon import failed.');
    } finally {
      setAmazonProductLoading(false);
    }
  };

  const handleImportAmazonList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amazonListUrl.trim()) {
      addToast('Amazon list URL is required', 'error');
      return;
    }

    const parsedLimit = amazonListLimit.trim() ? Number(amazonListLimit) : undefined;
    if (parsedLimit && Number.isNaN(parsedLimit)) {
      addToast('Limit must be a number', 'error');
      return;
    }

    setAmazonListLoading(true);
    setAmazonListResult(null);
    try {
      const response = await importAmazonList(amazonListUrl.trim(), parsedLimit);
      setAmazonListResult(response.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Amazon list import failed.', 'error');
    } finally {
      setAmazonListLoading(false);
    }
  };

  const handleSeedProduct = async () => {
    setSeedProductLoading(true);
    try {
      await seedStoreProduct();
      addToast('Sample store product created.', 'success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to seed store product.', 'error');
    } finally {
      setSeedProductLoading(false);
    }
  };

  const loadPurchases = async () => {
    setPurchasesLoading(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        getPendingPurchases(),
        getAllPurchases(),
      ]);
      setPendingPurchases(pendingRes.data);
      setAllPurchases(allRes.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to load purchases', 'error');
    } finally {
      setPurchasesLoading(false);
    }
  };

  const handleFulfillPurchase = async (purchaseId: string) => {
    setFulfillingId(purchaseId);
    try {
      await fulfillPurchase(purchaseId, {
        trackingNumber: fulfillForm.trackingNumber || undefined,
        notes: fulfillForm.notes || undefined,
      });
      addToast('Purchase marked as fulfilled! The customer will be notified.', 'success');
      setFulfillForm({ trackingNumber: '', notes: '' });
      setFulfillingId(null);
      await loadPurchases();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to fulfill purchase', 'error');
    } finally {
      setFulfillingId(null);
    }
  };

  const handleTemplateChange = (key: string, updates: Partial<EmailTemplate>) => {
    setEmailTemplates((prev) =>
      prev.map((template) => (template.key === key ? { ...template, ...updates } : template))
    );
  };

  const handleSaveTemplate = async (template: EmailTemplate) => {
    setSavingTemplateKey(template.key);
    try {
      await updateEmailTemplate(template.key, {
        subject: template.subject,
        html: template.html,
        isEnabled: template.isEnabled,
      });
      addToast('Email template updated', 'success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to update email template', 'error');
    } finally {
      setSavingTemplateKey(null);
    }
  };

  const loadWellnessTasks = async () => {
    setWellnessTasksLoading(true);
    try {
      const res = await getAllWellnessTasks();
      setWellnessTasks(res.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to load wellness tasks', 'error');
    } finally {
      setWellnessTasksLoading(false);
    }
  };

  const handleDeleteTask = async (id: string, name: string) => {
    if (!await confirm(`Are you sure you want to delete "${name}"? This will deactivate the program but preserve all submissions, documents, and rewards.`)) {
      return;
    }

    setDeletingTaskId(id);
    try {
      await deleteWellnessTask(id);
      addToast('Wellness program deactivated successfully', 'success');
      await loadWellnessTasks();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to delete wellness task', 'error');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const loadUsersWithSubmissions = async () => {
    setUsersLoading(true);
    try {
      const res = await getAllUsersWithSubmissions();
      setUsersWithSubmissions(res.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      addToast(axiosErr.response?.data?.error || 'Failed to load users', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  // [ORIGINAL - 2026-02-12] Tabs were admin-only, no games tab
  const allTabs = [
    { id: 'wellness' as TabType, name: 'Wellness', count: submissions.length, adminOnly: true },
    { id: 'store' as TabType, name: 'Store', count: pendingPurchases.length, adminOnly: true },
    { id: 'studio' as TabType, name: 'Campaign Studio', count: campaigns.filter(c => c.status === 'active').length || null, adminOnly: true },
    { id: 'google-chat' as TabType, name: 'Google Chat', count: chatStats?.recentActivity || null, adminOnly: true },
    { id: 'games' as TabType, name: 'Games', count: null, adminOnly: false },
    { id: 'settings' as TabType, name: 'Settings', count: null, adminOnly: true },
  ];
  // Non-admin GMs only see non-adminOnly tabs (Games)
  const tabs = user.isAdmin ? allTabs : allTabs.filter((t) => !t.adminOnly);

  return (
    <Layout user={user}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {user.isAdmin ? 'Admin Portal' : 'Game Master Portal'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {user.isAdmin ? 'Manage wellness programs, store, and system settings' : 'Manage game configurations and jackpots'}
              </p>
            </div>
            {user.isAdmin && <button
              onClick={() => navigate('/admin/balances')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Balance Report
            </button>}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.name}
                {tab.count !== null && tab.count > 0 && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Wellness Tab */}
        {activeTab === 'wellness' && (
          <div className="space-y-6">
            {/* Pending Submissions */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Pending Submissions</h2>
                <span className="text-sm text-gray-500">{submissions.length} pending</span>
              </div>
              <PendingSubmissionsList
                submissions={submissions}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </div>

            {/* Create Wellness Task */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Create Wellness Task</h2>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
                    <input
                      type="text"
                      value={taskForm.name}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Coin Value</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={taskForm.coinValue}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, coinValue: e.target.value }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                  <textarea
                    value={taskForm.instructions}
                    onChange={(e) => setTaskForm((prev) => ({ ...prev, instructions: e.target.value }))}
                    rows={2}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <select
                      value={taskForm.frequencyRule}
                      onChange={(e) => setTaskForm((prev) => ({ ...prev, frequencyRule: e.target.value }))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="one_time">One-time</option>
                      <option value="annual">Annual</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Rewarded Users
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={taskForm.maxRewardedUsers}
                      onChange={(e) =>
                        setTaskForm((prev) => ({ ...prev, maxRewardedUsers: e.target.value }))
                      }
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Form Template (optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif"
                    onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">PDF or image files only (max 5MB)</p>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {creating ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>

            {/* Wellness Programs Management */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Wellness Programs</h2>
                <div className="flex gap-2">
                  <button
                    onClick={loadWellnessTasks}
                    disabled={wellnessTasksLoading}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:bg-gray-200 disabled:text-gray-500"
                  >
                    {wellnessTasksLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>

              {wellnessTasksLoading && wellnessTasks.length === 0 ? (
                <div className="text-center py-6 text-gray-500">Loading tasks...</div>
              ) : wellnessTasks.length === 0 ? (
                <div className="text-center py-6 text-gray-500">No wellness tasks found.</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {wellnessTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`border rounded-lg p-4 ${
                        task.isActive ? 'border-gray-200' : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-gray-900 truncate">{task.name}</h4>
                            {!task.isActive && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                            <span>Reward: {task.coinValue.toFixed(2)} Guincoin</span>
                            <span>Frequency: {task.frequencyRule.replace('_', ' ')}</span>
                            {task.maxRewardedUsers && <span>Max: {task.maxRewardedUsers}</span>}
                          </div>
                        </div>
                        {task.isActive && (
                          <button
                            onClick={() => handleDeleteTask(task.id, task.name)}
                            disabled={deletingTaskId === task.id}
                            className="ml-4 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 disabled:bg-gray-200 disabled:text-gray-500"
                          >
                            {deletingTaskId === task.id ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Users & Documents */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Users & Documents</h2>
                <button
                  onClick={loadUsersWithSubmissions}
                  disabled={usersLoading}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:bg-gray-200 disabled:text-gray-500"
                >
                  {usersLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {usersLoading && usersWithSubmissions.length === 0 ? (
                <div className="text-center py-6 text-gray-500">Loading users...</div>
              ) : usersWithSubmissions.length === 0 ? (
                <div className="text-center py-6 text-gray-500">No users found.</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {usersWithSubmissions.map((userItem) => (
                    <div key={userItem.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900">{userItem.name}</h4>
                          <p className="text-xs text-gray-600">{userItem.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {userItem.submissions.length} submission{userItem.submissions.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setSelectedUserId(selectedUserId === userItem.id ? null : userItem.id)
                          }
                          className="ml-4 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                        >
                          {selectedUserId === userItem.id ? 'Hide' : 'View'}
                        </button>
                      </div>

                      {selectedUserId === userItem.id && userItem.submissions.length > 0 && (
                        <div className="mt-4 border-t border-gray-200 pt-4 space-y-2">
                          {userItem.submissions.map((submission) => (
                            <div
                              key={submission.id}
                              className="border border-gray-200 rounded-md p-3 bg-gray-50"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h5 className="text-xs font-medium text-gray-900">
                                      {submission.wellnessTask.name}
                                    </h5>
                                    <span
                                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                                        submission.status === 'approved'
                                          ? 'bg-green-100 text-green-800'
                                          : submission.status === 'rejected'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}
                                    >
                                      {submission.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(submission.submittedAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <a
                                  href={submission.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                                >
                                  View
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Store Tab */}
        {activeTab === 'store' && (
          <StoreTab
            pendingPurchases={pendingPurchases}
            allPurchases={allPurchases}
            purchasesLoading={purchasesLoading}
            purchasesTab={purchasesTab}
            fulfillingId={fulfillingId}
            fulfillForm={fulfillForm}
            onPurchasesTabChange={setPurchasesTab}
            onLoadPurchases={loadPurchases}
            onFulfillingIdChange={setFulfillingId}
            onFulfillFormChange={setFulfillForm}
            onFulfillPurchase={handleFulfillPurchase}
            storeProducts={storeProducts}
            storeProductsLoading={storeProductsLoading}
            togglingProductId={togglingProductId}
            deletingProductId={deletingProductId}
            onLoadStoreProducts={loadStoreProducts}
            onToggleProduct={handleToggleProduct}
            onDeleteProduct={handleDeleteProduct}
            customProductForm={customProductForm}
            customProductImage={customProductImage}
            customProductLoading={customProductLoading}
            onCustomProductFormChange={setCustomProductForm}
            onCustomProductImageChange={setCustomProductImage}
            onCreateProduct={handleCreateProduct}
            amazonProductUrl={amazonProductUrl}
            amazonProductLoading={amazonProductLoading}
            amazonProductResult={amazonProductResult}
            amazonListUrl={amazonListUrl}
            amazonListLimit={amazonListLimit}
            amazonListLoading={amazonListLoading}
            amazonListResult={amazonListResult}
            seedProductLoading={seedProductLoading}
            onAmazonProductUrlChange={setAmazonProductUrl}
            onAmazonListUrlChange={setAmazonListUrl}
            onAmazonListLimitChange={setAmazonListLimit}
            onImportAmazonProduct={handleImportAmazonProduct}
            onImportAmazonList={handleImportAmazonList}
            onSeedProduct={handleSeedProduct}
          />
        )}

        {/* Campaign Studio Tab */}
        {activeTab === 'studio' && (
          <div className="fixed inset-0 z-50">
            <CampaignStudio />
            <button
              onClick={() => setActiveTab('wellness')}
              className="absolute top-4 right-4 z-50 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
              title="Exit Studio"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Google Chat Tab */}
        {activeTab === 'google-chat' && (
          <GoogleChatTab
            chatStats={chatStats}
            chatAuditLogs={chatAuditLogs}
            chatLogsLoading={chatLogsLoading}
            chatPage={chatPage}
            chatTotalPages={chatTotalPages}
            chatFilters={chatFilters}
            onFiltersChange={setChatFilters}
            onPageChange={setChatPage}
          />
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <GamesTab
            gameConfigs={adminGameConfigs}
            gameConfigsLoading={gameConfigsLoading}
            jackpots={adminJackpots}
            onToggleGame={handleToggleGame}
            onUpdateConfig={handleUpdateGameConfig}
            onToggleJackpot={handleToggleJackpot}
            onInitializeJackpots={handleInitializeJackpots}
            onRefresh={loadGameData}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsTab
            user={user}
            settingsTab={settingsTab}
            onSettingsTabChange={setSettingsTab}
            emailTemplates={emailTemplates}
            templatesLoading={templatesLoading}
            savingTemplateKey={savingTemplateKey}
            onTemplateChange={handleTemplateChange}
            onSaveTemplate={handleSaveTemplate}
            employees={employees}
            employeesLoading={employeesLoading}
            updatingEmployeeId={updatingEmployeeId}
            showAddUserForm={showAddUserForm}
            newUserForm={newUserForm}
            creatingUser={creatingUser}
            onLoadEmployees={loadEmployees}
            onUpdateRoles={handleUpdateRoles}
            onShowAddUserFormChange={setShowAddUserForm}
            onNewUserFormChange={setNewUserForm}
            onCreateUser={handleCreateUser}
            onBulkUpload={handleBulkUpload}
            bulkUploading={bulkUploading}
            managers={managers}
            managersLoading={managersLoading}
            selectedManagerId={selectedManagerId}
            selectedManagerAllotment={selectedManagerAllotment}
            allotmentLoading={allotmentLoading}
            depositForm={depositForm}
            depositLoading={depositLoading}
            recurringForm={recurringForm}
            recurringLoading={recurringLoading}
            onLoadManagers={loadManagers}
            onSelectManager={handleSelectManager}
            onDepositFormChange={setDepositForm}
            onRecurringFormChange={setRecurringForm}
            onDeposit={handleDeposit}
            onSetRecurring={handleSetRecurring}
            balanceMap={balanceMap}
            balanceError={balanceError}
            onRetryBalance={loadBalanceMap}
            onAdjustBalance={handleAdjustBalance}
          />
        )}
      </div>
    </Layout>
  );
}
