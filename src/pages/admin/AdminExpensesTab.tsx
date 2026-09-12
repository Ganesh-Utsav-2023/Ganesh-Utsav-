import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { ExpenseRecord, ChandaReceipt, PaymentMode } from '../../types/index.ts';
import {
  subscribeToExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  generateExpenseId,
} from '../../services/expenseService.ts';
import { subscribeToChandaReceipts } from '../../services/chandaService.ts';
import { ConfirmationModal } from '../../components/ConfirmationModal.tsx';
import { formatToIndianDate } from '../../utils/dateUtils.ts';
import {
  Wallet,
  PlusCircle,
  Search,
  Filter,
  Download,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  CreditCard,
  Building2,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Lock,
  AlertCircle,
  Receipt,
  User,
  FileText
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'Mandap / Decoration',
  'Ganesh Idol',
  'Lighting',
  'Sound System',
  'Flowers / Pooja Material',
  'Prasad / Food',
  'Electricity',
  'Printing',
  'Transportation',
  'Cleaning',
  'Furniture / Equipment',
  'Seva / Charity',
  'Miscellaneous',
  'Other',
];

export const AdminExpensesTab: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [chandaReceipts, setChandaReceipts] = useState<ChandaReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState<any>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [deleteExpenseItem, setDeleteExpenseItem] = useState<ExpenseRecord | null>(null);
  const [activeExpense, setActiveExpense] = useState<ExpenseRecord | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    expenseNumber: '',
    expenseDate: new Date().toISOString().split('T')[0],
    amount: '',
    category: 'Mandap / Decoration',
    customCategory: '',
    paymentMode: 'CASH' as PaymentMode,
    paidTo: '',
    recordedBy: 'Navyuvak Ganesh Mitra Mandal Admin',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to Firestore Expenses & Chanda
  useEffect(() => {
    if (authLoading) return;

    if (!user || user.email !== 'navyuvakganeshmitramandal14@gmail.com') {
      setSubscriptionError({
        code: 'permission-denied',
        message: 'Only authorized administrator (navyuvakganeshmitramandal14@gmail.com) can access expenses.',
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setSubscriptionError(null);

    const unsubExpenses = subscribeToExpenses(
      (data) => {
        setExpenses(data);
        setLoading(false);
      },
      (err) => {
        console.warn('Error subscribing to expenses:', err);
        setLoading(false);
      }
    );

    const unsubChanda = subscribeToChandaReceipts(
      (data) => {
        setChandaReceipts(data);
      },
      (err) => {
        console.warn('Error subscribing to chanda for balance calculation:', err);
      }
    );

    return () => {
      unsubExpenses();
      unsubChanda();
    };
  }, [user, authLoading]);

  // Compute Next Expense Number when opening Add Modal
  const handleOpenAddModal = () => {
    const nextNo = generateExpenseId(expenses);
    setFormData({
      expenseNumber: nextNo,
      expenseDate: new Date().toISOString().split('T')[0],
      amount: '',
      category: 'Mandap / Decoration',
      customCategory: '',
      paymentMode: 'CASH',
      paidTo: '',
      recordedBy: user?.full_name || user?.displayName || 'Navyuvak Ganesh Mitra Mandal',
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (item: ExpenseRecord) => {
    const isCustomCat = !EXPENSE_CATEGORIES.includes(item.category) && item.category !== 'Other';
    setEditingId(item.id || item.expenseId || null);
    setFormData({
      expenseNumber: item.expenseNumber,
      expenseDate: item.expenseDate || new Date().toISOString().split('T')[0],
      amount: String(item.amount || ''),
      category: isCustomCat ? 'Other' : item.category,
      customCategory: isCustomCat ? item.category : '',
      paymentMode: (item.paymentMode as PaymentMode) || 'CASH',
      paidTo: item.paidTo || '',
      recordedBy: item.recordedBy || 'Navyuvak Ganesh Mitra Mandal',
    });
    setShowEditModal(true);
  };

  // Save Add Expense
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(formData.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }
    if (!formData.expenseDate) {
      alert('Please select a valid expense date.');
      return;
    }

    const finalCategory = formData.category === 'Other' && formData.customCategory.trim()
      ? formData.customCategory.trim()
      : formData.category;

    setIsSubmitting(true);
    try {
      await createExpense({
        expenseNumber: formData.expenseNumber,
        expenseDate: formData.expenseDate,
        amount: amt,
        category: finalCategory,
        paymentMode: formData.paymentMode,
        paidTo: formData.paidTo.trim(),
        recordedBy: formData.recordedBy.trim(),
        createdBy: user?.email || 'admin',
      });

      setShowAddModal(false);
      alert('Expense recorded successfully!');
    } catch (err: any) {
      alert(`Error recording expense: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Edit Expense
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const amt = Number(formData.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    const finalCategory = formData.category === 'Other' && formData.customCategory.trim()
      ? formData.customCategory.trim()
      : formData.category;

    setIsSubmitting(true);
    try {
      await updateExpense(editingId, {
        expenseDate: formData.expenseDate,
        amount: amt,
        category: finalCategory,
        paymentMode: formData.paymentMode,
        paidTo: formData.paidTo.trim(),
        recordedBy: formData.recordedBy.trim(),
      });

      setShowEditModal(false);
      setEditingId(null);
      alert('Expense updated successfully!');
    } catch (err: any) {
      alert(`Error updating expense: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Expense
  const handleDeleteConfirm = async () => {
    if (!deleteExpenseItem) return;
    try {
      await deleteExpense(deleteExpenseItem.id || deleteExpenseItem.expenseId || '');
      setDeleteExpenseItem(null);
      alert('Expense deleted successfully.');
    } catch (err: any) {
      alert(`Error deleting expense: ${err.message}`);
    }
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentWeekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

    return expenses.filter((e) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = (e.expenseNumber || '').toLowerCase().includes(q);
        const matchCat = (e.category || '').toLowerCase().includes(q);
        const matchVendor = (e.paidTo || '').toLowerCase().includes(q);
        const matchRecorder = (e.recordedBy || '').toLowerCase().includes(q);
        if (!matchId && !matchCat && !matchVendor && !matchRecorder) return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && e.category !== selectedCategory) {
        return false;
      }

      // Payment mode filter
      if (selectedMode !== 'ALL' && e.paymentMode !== selectedMode) {
        return false;
      }

      // Date filter
      if (dateFilter === 'TODAY' && e.expenseDate !== todayStr) return false;
      if (dateFilter === 'THIS_MONTH' && (!e.expenseDate || !e.expenseDate.startsWith(currentMonthStr))) return false;
      if (dateFilter === 'THIS_WEEK' && (!e.expenseDate || e.expenseDate < currentWeekStart)) return false;
      if (dateFilter === 'CUSTOM') {
        if (customStartDate && e.expenseDate < customStartDate) return false;
        if (customEndDate && e.expenseDate > customEndDate) return false;
      }

      return true;
    });
  }, [expenses, searchQuery, selectedCategory, selectedMode, dateFilter, customStartDate, customEndDate]);

  // Financial Statistics
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    let totalSpending = 0;
    let todaySpending = 0;
    let thisMonthSpending = 0;
    const categorySpending: Record<string, number> = {};
    const paymentModeSpending: Record<string, number> = { CASH: 0, UPI: 0, BANK_TRANSFER: 0, OTHER: 0 };

    expenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      totalSpending += amt;

      if (e.expenseDate === todayStr) todaySpending += amt;
      if (e.expenseDate && e.expenseDate.startsWith(currentMonthStr)) thisMonthSpending += amt;

      const cat = e.category || 'Miscellaneous';
      categorySpending[cat] = (categorySpending[cat] || 0) + amt;

      const mode = e.paymentMode || 'CASH';
      paymentModeSpending[mode] = (paymentModeSpending[mode] || 0) + amt;
    });

    const totalChanda = chandaReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const remainingBalance = totalChanda - totalSpending;

    return {
      totalSpending,
      todaySpending,
      thisMonthSpending,
      totalExpenses: expenses.length,
      categorySpending,
      paymentModeSpending,
      totalChanda,
      remainingBalance,
    };
  }, [expenses, chandaReceipts]);

  // Top spending categories sorted descending
  const topCategories = useMemo(() => {
    return Object.entries(stats.categorySpending)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 5);
  }, [stats.categorySpending]);

  if (subscriptionError) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center bg-rose-50 border border-rose-200 rounded-2xl shadow-sm mt-10">
        <Lock className="w-12 h-12 text-rose-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold font-serif text-rose-900">Access Restricted</h2>
        <p className="text-sm text-rose-700 mt-2">{subscriptionError.message}</p>
        <p className="text-xs text-rose-500 mt-1">Authorized admin: navyuvakganeshmitramandal14@gmail.com</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-3 border border-amber-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Secure Financial & Expense Accounting
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-amber-100">
              Spending / Expenses Management
            </h1>
            <p className="text-sm text-stone-300 mt-1">
              Track all Mandal festival expenses, vendor payments, and live financial balance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 rounded-xl bg-amber-600 text-white hover:bg-amber-500 transition-colors font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-600/30 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chanda + Spending Financial Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Chanda Collected</p>
            <h3 className="text-2xl font-bold font-serif text-emerald-700 mt-1">
              ₹{stats.totalChanda.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">{chandaReceipts.length} total donations</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Spending</p>
            <h3 className="text-2xl font-bold font-serif text-rose-700 mt-1">
              ₹{stats.totalSpending.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">{expenses.length} expense records</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className={`rounded-2xl p-5 border shadow-sm flex items-center justify-between ${
          stats.remainingBalance >= 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-rose-50 border-rose-200'
        }`}>
          <div>
            <p className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Current Remaining Balance</p>
            <h3 className={`text-2xl font-bold font-serif mt-1 ${stats.remainingBalance >= 0 ? 'text-amber-900' : 'text-rose-700'}`}>
              ₹{stats.remainingBalance.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">Chanda minus Total Expenses</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            stats.remainingBalance >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'
          }`}>
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Spending Summary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold text-stone-500">Today's Spending</p>
          <p className="text-xl font-bold font-serif text-stone-900 mt-1">
            ₹{stats.todaySpending.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold text-stone-500">This Month's Spending</p>
          <p className="text-xl font-bold font-serif text-stone-900 mt-1">
            ₹{stats.thisMonthSpending.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold text-stone-500">Total Expense Entries</p>
          <p className="text-xl font-bold font-serif text-stone-900 mt-1">{expenses.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
          <p className="text-xs font-semibold text-stone-500">Payment Modes Used</p>
          <p className="text-sm font-bold text-stone-800 mt-1">
            Cash: ₹{(stats.paymentModeSpending['CASH'] || 0).toLocaleString('en-IN')} | UPI: ₹{(stats.paymentModeSpending['UPI'] || 0).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Expense Number, Vendor, Category, Recorded By..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Category dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="ALL">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Payment Mode dropdown */}
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="ALL">All Payment Modes</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>

            {/* Date filter dropdown */}
            <select
              value={dateFilter}
              onChange={(e: any) => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Date Range</option>
            </select>
          </div>
        </div>

        {/* Custom date range inputs */}
        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-3 pt-3 border-t border-stone-100 text-xs">
            <span className="font-semibold text-stone-600">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg"
            />
            <span className="font-semibold text-stone-600">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg"
            />
            {(customStartDate || customEndDate) && (
              <button
                onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                className="text-amber-700 hover:underline font-semibold"
              >
                Clear Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold font-serif text-stone-900">
              Expense Records ({filteredExpenses.length})
            </h2>
          </div>
          <p className="text-xs text-stone-500">Real-time Firestore Synchronized</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-stone-500">Loading expenses from Firestore...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-stone-800">No expense records found</h3>
            <p className="text-xs text-stone-500 mt-1">Click "Add New Expense" above to record Mandal festival spending.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 text-[11px] font-semibold text-stone-600 uppercase tracking-wider border-b border-stone-200">
                  <th className="py-3 px-4">Expense Number</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4">Paid To / Vendor</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                {filteredExpenses.map((item) => (
                  <tr key={item.id || item.expenseId} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">{item.expenseNumber}</td>
                    <td className="py-3 px-4">{item.expenseDate ? formatToIndianDate(item.expenseDate) : '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 font-semibold text-[11px] border border-amber-200">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold font-serif text-rose-700">
                      ₹{(Number(item.amount) || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 text-[11px] font-semibold">
                        {(item.paymentMode || 'CASH').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-600">{item.paidTo || '-'}</td>
                    <td className="py-3 px-4 text-stone-500">{item.recordedBy || 'Admin'}</td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => { setActiveExpense(item); setShowViewModal(true); }}
                        className="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                        title="View Expense Record"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
                        title="Edit Expense"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteExpenseItem(item)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Financial Audit View: Top Categories & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
          <h3 className="text-base font-bold font-serif text-stone-900 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            Top Spending Categories
          </h3>
          {topCategories.length === 0 ? (
            <p className="text-xs text-stone-500">No expense records available yet.</p>
          ) : (
            <div className="space-y-3">
              {topCategories.map(([cat, amt]) => {
                const percentage = stats.totalSpending > 0 ? Math.round((amt / stats.totalSpending) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-800">{cat}</span>
                      <span className="font-bold text-stone-900">₹{amt.toLocaleString('en-IN')} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                      <div className="h-full bg-amber-600 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
          <h3 className="text-base font-bold font-serif text-stone-900 mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            Financial Audit Overview
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100">
              <span className="font-semibold text-stone-600">Total Chanda Donations</span>
              <span className="font-bold font-serif text-emerald-700">₹{stats.totalChanda.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100">
              <span className="font-semibold text-stone-600">Total Festival Expenses</span>
              <span className="font-bold font-serif text-rose-700">- ₹{stats.totalSpending.toLocaleString('en-IN')}</span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-xl border ${
              stats.remainingBalance >= 0 ? 'bg-amber-50/80 border-amber-200 text-amber-950' : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}>
              <span className="font-bold">Remaining Working Balance</span>
              <span className="font-bold font-serif text-base">₹{stats.remainingBalance.toLocaleString('en-IN')}</span>
            </div>
            <p className="text-[11px] text-stone-400 italic text-center mt-2">
              Calculated live in real-time from Firestore collections (`chandaReceipts` & `expenses`).
            </p>
          </div>
        </div>
      </div>

      {/* Add / Edit Expense Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
              className="absolute right-6 top-6 p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-750 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold font-serif text-stone-900 mb-1">
              {showAddModal ? 'Record New Expense' : 'Edit Expense Record'}
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              {showAddModal ? `Expense ID: ${formData.expenseNumber}` : `Editing: ${formData.expenseNumber}`}
            </p>

            <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 4500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold font-serif text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {formData.category === 'Other' && (
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Custom Category Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Special Guest Hospitality"
                      value={formData.customCategory}
                      onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Payment Mode *</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e: any) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Paid To / Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sharma Flower Decorators"
                    value={formData.paidTo}
                    onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Recorded By</label>
                  <input
                    type="text"
                    value={formData.recordedBy}
                    onChange={(e) => setFormData({ ...formData, recordedBy: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  className="px-5 py-2.5 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 text-white hover:bg-amber-500 font-bold shadow-lg shadow-amber-600/30 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : showAddModal ? 'Save Expense' : 'Update Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Expense Modal */}
      {showViewModal && activeExpense && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
            <button
              onClick={() => setShowViewModal(false)}
              className="absolute right-6 top-6 p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-750 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-4 border-b border-stone-100">
              <h2 className="text-lg font-bold font-serif text-stone-900">Navyuvak Ganesh Mitra Mandal</h2>
              <p className="text-xs text-stone-500">Official Festival Expense Record</p>
              <div className="inline-block mt-3 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full font-mono text-xs font-bold text-amber-900">
                {activeExpense.expenseNumber}
              </div>
            </div>

            <div className="space-y-3 text-xs text-stone-700">
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="font-semibold text-stone-500">Expense Date:</span>
                <span className="font-medium text-stone-900">{formatToIndianDate(activeExpense.expenseDate)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="font-semibold text-stone-500">Category:</span>
                <span className="font-medium text-stone-900">{activeExpense.category}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="font-semibold text-stone-500">Amount Paid:</span>
                <span className="font-bold font-serif text-rose-700 text-sm">₹{(Number(activeExpense.amount) || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="font-semibold text-stone-500">Payment Mode:</span>
                <span className="font-medium text-stone-900">{(activeExpense.paymentMode || 'CASH').replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="font-semibold text-stone-500">Paid To / Vendor:</span>
                <span className="font-medium text-stone-900">{activeExpense.paidTo || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="font-semibold text-stone-500">Recorded By:</span>
                <span className="font-medium text-stone-900">{activeExpense.recordedBy || 'Admin'}</span>
              </div>
            </div>

            <button
              onClick={() => setShowViewModal(false)}
              className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-semibold text-xs hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Close Record
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      <ConfirmationModal
        isOpen={Boolean(deleteExpenseItem)}
        title="Delete Expense Record"
        message={`Are you sure you want to delete expense record "${deleteExpenseItem?.expenseNumber}" (${deleteExpenseItem?.category}) for ₹${deleteExpenseItem?.amount}? This action will instantly recalculate total spending and remaining balance.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteExpenseItem(null)}
      />
    </div>
  );
};
