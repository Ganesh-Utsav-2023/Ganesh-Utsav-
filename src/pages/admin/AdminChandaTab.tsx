import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { ChandaReceipt, PaymentMode, ChandaStats, WhatsAppContactNumber } from '../../types/index.ts';
import { WhatsAppSenderSelector } from '../../components/WhatsAppSenderSelector.tsx';
import {
  subscribeToChandaReceipts,
  createChandaReceipt,
  updateChandaReceipt,
  deleteChandaReceipt,
  generateReceiptNumber,
  getChandaReceiptCounterInfo,
  formatChandaReceiptNumber,
  findLowestUnusedReceiptNumber,
} from '../../services/chandaService.ts';
import { convertAmountToWords } from '../../utils/numberToWords.ts';
import {
  downloadChandaReceiptPDF,
  printChandaReceipt,
  shareChandaReceiptWhatsApp,
} from '../../utils/chandaPdfGenerator.ts';
import { ConfirmationModal } from '../../components/ConfirmationModal.tsx';
import { formatToIndianDate } from '../../utils/dateUtils.ts';
import {
  Coins,
  PlusCircle,
  Search,
  Filter,
  Download,
  Printer,
  Share2,
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
  HeartHandshake,
  TrendingUp,
  X,
  Copy,
  AlertCircle,
  Lock,
} from 'lucide-react';

const COMMON_PURPOSES = [
  'Ganesh Utsav Aarti & Pooja Seva',
  'Mahaprasad & Bhandara Seva',
  'Mandap & Light Decoration Seva',
  'Maha Aarti & Hawan Seva',
  'General Mandal Donation',
  'Cultural & Musical Programme Seva',
];

export const AdminChandaTab: React.FC = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [receipts, setReceipts] = useState<ChandaReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'ALL' | 'TODAY' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customDate, setCustomDate] = useState<string>('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [deleteReceiptItem, setDeleteReceiptItem] = useState<ChandaReceipt | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ChandaReceipt | null>(null);
  const [activeReceiptMobile, setActiveReceiptMobile] = useState<string>('');
  const [selectedWhatsAppNumber, setSelectedWhatsAppNumber] = useState<WhatsAppContactNumber | null>(null);

  // Add / Edit Form State
  const [formData, setFormData] = useState({
    receiptNumber: '',
    donorName: '',
    amount: '',
    amountInWords: '',
    paymentMode: 'CASH' as PaymentMode,
    donationDate: new Date().toISOString().split('T')[0],
    collectedBy: 'Navyuvak Ganesh Mitra Mandal',
    purpose: 'Ganesh Utsav Aarti & Pooja Seva',
    mobileNumber: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Subscribe to real-time Chanda receipts
  useEffect(() => {
    if (authLoading) {
      // Still initializing Firebase Auth, do NOT query chandaReceipts yet
      return;
    }

    if (!user) {
      console.warn('Cannot load chanda receipts: currentUser does not exist.');
      setLoading(false);
      return;
    }

    if (user.email !== 'navyuvakganeshmitramandal14@gmail.com') {
      console.error('Cannot load chanda receipts: currentUser is not the authorized admin email.', user.email);
      setSubscriptionError({
        code: 'permission-denied',
        message: 'Current user is not the authorized administrator.'
      });
      setLoading(false);
      return;
    }

    // Auth is ready, user exists, and user is the authorized admin.
    // Attach the real-time Firestore listener/query.
    setLoading(true);
    setSubscriptionError(null);

    const unsubscribe = subscribeToChandaReceipts(
      (data) => {
        setReceipts(data);
        setLoading(false);
      },
      (err: any) => {
        // Log required details exactly as specified
        console.error('Error loading chanda receipts:', err);
        console.error('--- Firestore Permission Denied details ---');
        console.error('currentUser.uid:', user?.uid || user?.id);
        console.error('currentUser.email:', user?.email);
        console.error('currentUser.role:', user?.role || 'admin');
        console.error('Firestore collection being accessed: chandaReceipts');
        console.error('Firebase error.code:', err?.code || 'unknown');
        console.error('------------------------------------------');

        // Capture details for state display in UI
        setSubscriptionError({
          code: err?.code || 'permission-denied',
          message: err?.message || 'Missing or insufficient permissions.',
          uid: user?.uid || user?.id,
          email: user?.email,
          role: user?.role || 'admin',
          collection: 'chandaReceipts'
        });
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user, authLoading, isAdmin]);

  // Compute 8 Key Metrics
  const stats: ChandaStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

    let totalCollected = 0;
    let todayCollection = 0;
    let thisMonthCollection = 0;
    let cashCollection = 0;
    let upiCollection = 0;
    let bankTransferCollection = 0;
    let otherCollection = 0;

    receipts.forEach((r) => {
      const amt = Number(r.amount) || 0;
      totalCollected += amt;

      if (r.donationDate === todayStr) {
        todayCollection += amt;
      }
      if (r.donationDate && r.donationDate.startsWith(currentMonthStr)) {
        thisMonthCollection += amt;
      }

      if (r.paymentMode === 'CASH') cashCollection += amt;
      else if (r.paymentMode === 'UPI') upiCollection += amt;
      else if (r.paymentMode === 'BANK_TRANSFER') bankTransferCollection += amt;
      else otherCollection += amt;
    });

    return {
      totalCollected,
      todayCollection,
      thisMonthCollection,
      totalDonations: receipts.length,
      cashCollection,
      upiCollection,
      bankTransferCollection,
      otherCollection,
    };
  }, [receipts]);

  // Close Receipt Modal
  const handleCloseReceipt = () => {
    setShowReceiptModal(false);
    setActiveReceipt(null);
    setActiveReceiptMobile('');
  };

  // Keyboard Escape listener for closing modal overlays cleanly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showReceiptModal) {
          handleCloseReceipt();
        } else if (showAddModal) {
          setShowAddModal(false);
        } else if (showEditModal) {
          setShowEditModal(false);
        } else if (deleteReceiptItem) {
          setDeleteReceiptItem(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showReceiptModal, showAddModal, showEditModal, deleteReceiptItem]);

  // Handle Amount input change & auto-convert to words
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const num = parseFloat(val);
    const words = num > 0 ? convertAmountToWords(num) : '';
    setFormData((prev) => ({
      ...prev,
      amount: val,
      amountInWords: words,
    }));
  };

  // Open Add Chanda Modal with lowest available unused serial preview
  const handleOpenAddModal = async () => {
    // Calculate lowest unused serial number from current active receipts list (handles gap filling & reuse)
    const lowestAvailable = findLowestUnusedReceiptNumber(receipts);
    setFormData({
      receiptNumber: lowestAvailable.receiptNumber,
      donorName: '',
      amount: '',
      amountInWords: '',
      paymentMode: 'CASH',
      donationDate: new Date().toISOString().split('T')[0],
      collectedBy: user?.displayName || 'Navyuvak Ganesh Mitra Mandal',
      purpose: 'Ganesh Utsav Aarti & Pooja Seva',
      mobileNumber: '',
    });
    setShowAddModal(true);

    // Also fetch live counter snapshot from Firestore to verify fresh state
    try {
      const info = await getChandaReceiptCounterInfo();
      setFormData((prev) => ({
        ...prev,
        receiptNumber: info.nextReceiptNumber,
      }));
    } catch (e) {
      console.warn('Could not fetch next receipt number preview:', e);
    }
  };

  // Submit Add / Create (Guaranteed Atomic Transaction)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.donorName.trim()) {
      alert('Please enter the donor devotee name.');
      return;
    }
    const amtNum = parseFloat(formData.amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      alert('Please enter a valid donation amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { fullReceipt } = await createChandaReceipt(
        {
          donorName: formData.donorName.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          amount: amtNum,
          amountInWords: formData.amountInWords.trim() || convertAmountToWords(amtNum),
          paymentMode: formData.paymentMode,
          donationDate: formData.donationDate,
          collectedBy: formData.collectedBy.trim(),
          purpose: formData.purpose.trim(),
        },
        user?.email || undefined
      );

      // Prepare active receipt for instant view/share modal
      const createdObj: ChandaReceipt = {
        ...fullReceipt,
        mobileNumber: formData.mobileNumber.trim(),
        temporaryMobile: formData.mobileNumber.trim(),
      };

      setActiveReceipt(createdObj);
      setActiveReceiptMobile(formData.mobileNumber.trim());
      setShowAddModal(false);
      setShowReceiptModal(true);
    } catch (err) {
      console.error('Failed to create Chanda receipt:', err);
      alert('Failed to save donation receipt. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (receipt: ChandaReceipt) => {
    setEditingId(receipt.id || receipt.receiptId || null);
    setFormData({
      receiptNumber: receipt.receiptNumber,
      donorName: receipt.donorName,
      amount: String(receipt.amount),
      amountInWords: receipt.amountInWords,
      paymentMode: receipt.paymentMode,
      donationDate: receipt.donationDate,
      collectedBy: receipt.collectedBy,
      purpose: receipt.purpose,
      mobileNumber: receipt.mobileNumber || '',
    });
    setShowEditModal(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    if (!formData.donorName.trim()) {
      alert('Please enter the donor devotee name.');
      return;
    }
    const amtNum = parseFloat(formData.amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      alert('Please enter a valid donation amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateChandaReceipt(
        editingId,
        {
          receiptNumber: formData.receiptNumber.trim(),
          donorName: formData.donorName.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          amount: amtNum,
          amountInWords: formData.amountInWords.trim() || convertAmountToWords(amtNum),
          paymentMode: formData.paymentMode,
          donationDate: formData.donationDate,
          collectedBy: formData.collectedBy.trim(),
          purpose: formData.purpose.trim(),
        },
        user?.email || undefined
      );

      setShowEditModal(false);
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update receipt:', err);
      alert('Failed to update donation receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Receipt
  const handleDeleteConfirm = async () => {
    if (!deleteReceiptItem?.id) return;
    try {
      await deleteChandaReceipt(deleteReceiptItem.id);
      setDeleteReceiptItem(null);
    } catch (err) {
      console.error('Error deleting receipt:', err);
      alert('Failed to delete receipt.');
    }
  };

  // Copy receipt number to clipboard
  const handleCopyReceiptNo = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedId(num);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter and Search logic
  const filteredReceipts = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    return receipts.filter((r) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.donorName.toLowerCase().includes(q);
        const matchNumber = r.receiptNumber.toLowerCase().includes(q);
        const matchPurpose = (r.purpose || '').toLowerCase().includes(q);
        const matchCollected = (r.collectedBy || '').toLowerCase().includes(q);
        if (!matchName && !matchNumber && !matchPurpose && !matchCollected) {
          return false;
        }
      }

      // Payment Mode filter
      if (selectedMode !== 'ALL' && r.paymentMode !== selectedMode) {
        return false;
      }

      // Date filter
      if (selectedDateFilter === 'TODAY' && r.donationDate !== todayStr) {
        return false;
      }
      if (selectedDateFilter === 'THIS_MONTH' && (!r.donationDate || !r.donationDate.startsWith(currentMonthStr))) {
        return false;
      }
      if (selectedDateFilter === 'CUSTOM' && customDate && r.donationDate !== customDate) {
        return false;
      }

      return true;
    });
  }, [receipts, searchQuery, selectedMode, selectedDateFilter, customDate]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-stone-900 text-white p-6 rounded-3xl shadow-sm border border-amber-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Protected Mandal Treasury
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Admin Protected (Since 2023)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-amber-100 flex items-center gap-2.5">
              <span>💰 Chanda / Donation Management</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
              Manage devotee Chanda contributions, generate official digital PDF receipts, share on WhatsApp, and export financial records.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add Chanda / Donation</span>
            </button>
          </div>
        </div>
      </div>

      {/* 8 Primary Collection Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* 1. Total Chanda Collected */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200/80 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Total Chanda</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-amber-950 font-serif">
              ₹ {stats.totalCollected.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">All time donations collected</p>
          </div>
        </div>

        {/* 2. Today's Collection */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Today's Collection</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-emerald-900 font-serif">
              ₹ {stats.todayCollection.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">Collected today ({new Date().toLocaleDateString('en-IN')})</p>
          </div>
        </div>

        {/* 3. This Month's Collection */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-blue-200/80 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">This Month</span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-blue-950 font-serif">
              ₹ {stats.thisMonthCollection.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">Current calendar month total</p>
          </div>
        </div>

        {/* 4. Total Donations Count */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-purple-200/80 shadow-sm relative overflow-hidden group hover:border-purple-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Total Donations</span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shadow-xs">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-purple-950 font-serif">
              {stats.totalDonations} <span className="text-xs font-normal text-purple-700">Receipts</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">Total receipt records issued</p>
          </div>
        </div>

        {/* 5. Cash Collection */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-stone-500 uppercase">💵 Cash Collection</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-200 text-stone-700 font-bold">CASH</span>
          </div>
          <div className="text-lg font-bold text-stone-900 mt-2 font-serif">
            ₹ {stats.cashCollection.toLocaleString('en-IN')}
          </div>
        </div>

        {/* 6. UPI Collection */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-stone-500 uppercase">📱 UPI Collection</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-bold">UPI</span>
          </div>
          <div className="text-lg font-bold text-stone-900 mt-2 font-serif">
            ₹ {stats.upiCollection.toLocaleString('en-IN')}
          </div>
        </div>

        {/* 7. Bank Transfer Collection */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-stone-500 uppercase">🏦 Bank Transfer</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-teal-100 text-teal-700 font-bold">NEFT/RTGS</span>
          </div>
          <div className="text-lg font-bold text-stone-900 mt-2 font-serif">
            ₹ {stats.bankTransferCollection.toLocaleString('en-IN')}
          </div>
        </div>

        {/* 8. Other Collection */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-stone-500 uppercase">🏷️ Other Collection</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">CHEQUE/OTHER</span>
          </div>
          <div className="text-lg font-bold text-stone-900 mt-2 font-serif">
            ₹ {stats.otherCollection.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by donor name, receipt number, purpose, or volunteer..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Payment Mode Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-stone-500">Mode:</span>
            {(['ALL', 'CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedMode === mode
                    ? 'bg-amber-900 text-amber-50'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {mode === 'ALL' ? 'All' : mode.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-stone-100 text-xs">
          <span className="font-semibold text-stone-500">Date Filter:</span>
          {(['ALL', 'TODAY', 'THIS_MONTH', 'CUSTOM'] as const).map((dFilt) => (
            <button
              key={dFilt}
              onClick={() => setSelectedDateFilter(dFilt)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                selectedDateFilter === dFilt
                  ? 'bg-stone-900 text-white font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {dFilt === 'ALL' && 'All Time'}
              {dFilt === 'TODAY' && 'Today'}
              {dFilt === 'THIS_MONTH' && 'This Month'}
              {dFilt === 'CUSTOM' && 'Custom Date'}
            </button>
          ))}

          {selectedDateFilter === 'CUSTOM' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-2 py-1 text-xs border border-stone-300 rounded-lg bg-white"
            />
          )}

          <span className="ml-auto text-[11px] text-stone-500">
            Showing <strong className="text-stone-900">{filteredReceipts.length}</strong> of{' '}
            <strong>{receipts.length}</strong> records
          </span>
        </div>
      </div>

      {/* Receipts Table or Permission Error */}
      {subscriptionError ? (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-rose-900 font-serif">Firestore Permission Error</h3>
              <p className="text-xs text-rose-800 leading-relaxed">
                Could not load Chanda receipts due to insufficient database access privileges.
              </p>
            </div>
          </div>
          
          <div className="bg-rose-950 text-rose-100 font-mono text-[11px] p-4 rounded-xl space-y-1 overflow-x-auto border border-rose-800">
            <div><strong className="text-rose-400">Error Code:</strong> {subscriptionError.code}</div>
            <div><strong className="text-rose-400">Message:</strong> {subscriptionError.message}</div>
            <div><strong className="text-rose-400">Accessed Collection:</strong> {subscriptionError.collection || 'chandaReceipts'}</div>
            <div><strong className="text-rose-400">Current User UID:</strong> {subscriptionError.uid || 'N/A'}</div>
            <div><strong className="text-rose-400">Current User Email:</strong> {subscriptionError.email || 'N/A'}</div>
            <div><strong className="text-rose-400">Current User Role:</strong> {subscriptionError.role || 'N/A'}</div>
          </div>
          <p className="text-[11px] text-stone-500 italic">
            This issue must be resolved by updating the Firestore security rules.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-100 text-stone-600 uppercase tracking-wider text-[10px] font-bold border-b border-stone-200">
                <tr>
                  <th className="py-3.5 px-4">Receipt No</th>
                  <th className="py-3.5 px-4">Donor Devotee</th>
                  <th className="py-3.5 px-4">Amount (₹)</th>
                  <th className="py-3.5 px-4">Payment Mode</th>
                  <th className="py-3.5 px-4">Donation Date</th>
                  <th className="py-3.5 px-4">Collected By</th>
                  <th className="py-3.5 px-4">Purpose</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                        <span>Loading sacred Chanda receipts...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-500">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <Coins className="w-8 h-8 text-stone-300" />
                        <p className="font-semibold text-stone-700">No donation records found</p>
                        <p className="text-xs text-stone-400">
                          {searchQuery || selectedMode !== 'ALL' || selectedDateFilter !== 'ALL'
                            ? 'Try clearing your filters or search terms.'
                            : 'Click "+ Add Chanda / Donation" above to record the first donation.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((r) => (
                    <tr key={r.id || r.receiptId} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-900">
                        <div className="flex items-center gap-1.5">
                          <span>{r.receiptNumber}</span>
                          <button
                            onClick={() => handleCopyReceiptNo(r.receiptNumber)}
                            title="Copy Receipt Number"
                            className="text-stone-400 hover:text-amber-700 p-0.5 rounded cursor-pointer"
                          >
                            {copiedId === r.receiptNumber ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">{r.donorName}</div>
                        {r.mobileNumber && (
                          <div className="text-[11px] font-mono text-stone-500 font-medium flex items-center gap-1 mt-0.5">
                            <span>📱 {r.mobileNumber}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-amber-950 font-serif text-sm">
                          ₹ {Number(r.amount).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            r.paymentMode === 'CASH'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : r.paymentMode === 'UPI'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                              : r.paymentMode === 'BANK_TRANSFER'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {r.paymentMode.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-600 font-medium">{formatToIndianDate(r.donationDate)}</td>
                      <td className="py-3 px-4 text-stone-600">{r.collectedBy}</td>
                      <td className="py-3 px-4 text-stone-500 max-w-[200px] truncate" title={r.purpose}>
                        {r.purpose || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Receipt */}
                          <button
                            onClick={() => {
                              setActiveReceipt(r);
                              setActiveReceiptMobile(r.mobileNumber || '');
                              setShowReceiptModal(true);
                            }}
                            title="View Official Receipt"
                            className="p-1.5 text-stone-600 hover:text-amber-900 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => downloadChandaReceiptPDF(r, r.mobileNumber)}
                            title="Download PDF"
                            className="p-1.5 text-stone-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Print */}
                          <button
                            onClick={() => printChandaReceipt(r, r.mobileNumber)}
                            title="Print Receipt"
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            onClick={() => {
                              setActiveReceipt(r);
                              setActiveReceiptMobile(r.mobileNumber || '');
                              setShowReceiptModal(true);
                            }}
                            title="Share on WhatsApp"
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(r)}
                            title="Edit Record"
                            className="p-1.5 text-stone-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteReceiptItem(r)}
                            title="Delete Record"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD CHANDA MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-amber-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  💰
                </div>
                <div>
                  <h2 className="text-lg font-bold font-serif text-stone-900">Add Chanda / Donation</h2>
                  <p className="text-[11px] text-stone-500">Record a new devotee donation & issue receipt</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
              {/* Receipt No & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wide">
                      Receipt Number
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300">
                      ⚡ Lowest Available Serial (Auto-Assigned)
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={formData.receiptNumber || 'NYGMM-CH-0001'}
                    className="w-full px-3.5 py-2 text-xs font-mono font-black bg-amber-50/80 border border-amber-200 rounded-xl text-amber-950 cursor-not-allowed select-none focus:outline-none"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Format: <strong className="text-amber-900 font-mono">NYGMM-CH-XXXX</strong> (sequential & reusable upon deletion)
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wide mb-1">
                    Donation Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.donationDate}
                    onChange={(e) => setFormData({ ...formData, donationDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* Donor Name */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Donor Devotee Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra Sharma & Family"
                  value={formData.donorName}
                  onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium text-stone-900"
                />
              </div>

              {/* Donor Mobile Number */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Donor Mobile Number (For WhatsApp Receipt)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210 (10-digit mobile for instant WhatsApp receipt)"
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono"
                />
              </div>

              {/* Donation Amount & Auto Words */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Donation Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 1100"
                    value={formData.amount}
                    onChange={handleAmountChange}
                    className="w-full pl-8 pr-4 py-2 text-sm font-bold bg-amber-50/30 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-stone-900"
                  />
                </div>
                {formData.amountInWords && (
                  <p className="text-[11px] text-amber-800 mt-1.5 font-medium bg-amber-50/80 p-2 rounded-lg border border-amber-200/50">
                    <strong>In Words:</strong> {formData.amountInWords}
                  </p>
                )}
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'] as PaymentMode[]).map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setFormData({ ...formData, paymentMode: mode })}
                      className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        formData.paymentMode === mode
                          ? 'bg-amber-800 text-white border-amber-900 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Purpose Selection */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Purpose / Seva Category
                </label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 mb-2"
                />
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_PURPOSES.map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setFormData({ ...formData, purpose: p })}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 transition-colors cursor-pointer border border-stone-200/60"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collected By */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Collected By
                </label>
                <input
                  type="text"
                  value={formData.collectedBy}
                  onChange={(e) => setFormData({ ...formData, collectedBy: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-900 hover:bg-stone-900 transition-colors cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Receipt...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save & Generate Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h2 className="text-lg font-bold font-serif text-stone-900">Edit Donation Receipt</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-stone-700 uppercase">Receipt Number</label>
                    <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                      Permanent Record
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={formData.receiptNumber}
                    className="w-full px-3 py-2 text-xs font-mono font-black bg-stone-100 border border-stone-200 rounded-xl text-stone-700 cursor-not-allowed select-none focus:outline-none"
                  />
                  <p className="text-[10px] text-stone-400 mt-0.5">Original issued receipt number cannot be modified.</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">Donation Date</label>
                  <input
                    type="date"
                    required
                    value={formData.donationDate}
                    onChange={(e) => setFormData({ ...formData, donationDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">Donor Name *</label>
                <input
                  type="text"
                  required
                  value={formData.donorName}
                  onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">Donor Mobile Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.amount}
                  onChange={handleAmountChange}
                  className="w-full px-3 py-2 text-sm font-bold bg-stone-50 border border-stone-200 rounded-xl"
                />
                {formData.amountInWords && (
                  <p className="text-[11px] text-amber-800 mt-1 font-medium">{formData.amountInWords}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">Payment Mode</label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as PaymentMode })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl font-semibold"
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">Purpose / Remark</label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">Collected By</label>
                <input
                  type="text"
                  value={formData.collectedBy}
                  onChange={(e) => setFormData({ ...formData, collectedBy: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-900 hover:bg-stone-900"
                >
                  {isSubmitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL SACRED RECEIPT PREVIEW / ACTIONS MODAL */}
      {showReceiptModal && activeReceipt && (
        <div
          id="receipt-preview-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseReceipt();
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto"
        >
          <div
            id="receipt-preview-dialog"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-amber-200 my-8 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header with Prominent Close Button */}
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-100 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl shrink-0">📜</span>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold font-serif text-stone-900 truncate">
                    Official Chanda / Donation Receipt
                  </h2>
                  <p className="text-[10px] text-stone-500 truncate hidden sm:block">
                    Receipt #{activeReceipt.receiptNumber} • {activeReceipt.donorName}
                  </p>
                </div>
              </div>

              {/* Prominent Top-Right Close Button */}
              <button
                type="button"
                id="close-receipt-btn"
                onClick={handleCloseReceipt}
                className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 active:scale-95 border border-stone-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Close Receipt (Esc)"
              >
                <X className="w-3.5 h-3.5 text-stone-500" />
                <span>✕ Close Receipt</span>
              </button>
            </div>

            {/* Sacred Receipt Card Preview */}
            <div className="mt-4 rounded-2xl border-2 border-amber-600 bg-[#fdfbf7] p-5 shadow-xs text-stone-800 space-y-4">
              {/* Receipt Header */}
              <div className="text-center pb-3 border-b border-amber-200">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-white p-0.5 border border-amber-300 shadow-2xs flex items-center justify-center">
                    <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="text-base font-black font-serif text-amber-950">
                    NAVYUVAK GANESH MITRA MANDAL
                  </h3>
                </div>
                <p className="text-[11px] font-bold text-amber-800 tracking-wider">Since 2023</p>
                <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase tracking-widest border border-amber-300">
                  CHANDA / DONATION RECEIPT
                </div>
              </div>

              {/* Key Strip */}
              <div className="flex justify-between items-center bg-amber-100/60 p-3 rounded-xl border border-amber-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">Receipt Number</span>
                  <span className="font-mono font-black text-amber-950 text-sm">{activeReceipt.receiptNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">Donation Date</span>
                  <span className="font-bold text-stone-900">{formatToIndianDate(activeReceipt.donationDate)}</span>
                </div>
              </div>

              {/* Devotee Info */}
              <div className="bg-white p-3.5 rounded-xl border border-amber-100 text-xs space-y-2">
                <div className="flex justify-between border-b border-stone-100 pb-1.5">
                  <span className="text-stone-500 font-medium">Donor Devotee:</span>
                  <span className="font-bold text-stone-900 text-sm">{activeReceipt.donorName}</span>
                </div>
                {activeReceiptMobile && (
                  <div className="flex justify-between border-b border-stone-100 pb-1.5">
                    <span className="text-stone-500 font-medium">Mobile (Current Session):</span>
                    <span className="font-mono font-bold text-stone-700">{activeReceiptMobile}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-stone-100 pb-1.5">
                  <span className="text-stone-500 font-medium">Payment Mode:</span>
                  <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {activeReceipt.paymentMode.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between border-b border-stone-100 pb-1.5">
                  <span className="text-stone-500 font-medium">Collected By:</span>
                  <span className="font-semibold text-stone-800">{activeReceipt.collectedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Purpose / Seva:</span>
                  <span className="font-medium text-stone-700">{activeReceipt.purpose || 'Ganesh Utsav Seva'}</span>
                </div>
              </div>

              {/* Amount Highlight */}
              <div className="bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border border-amber-300 rounded-xl p-3.5 text-center">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide block">
                  Amount Received
                </span>
                <span className="text-2xl font-black font-serif text-amber-950">
                  ₹ {Number(activeReceipt.amount).toLocaleString('en-IN')}
                </span>
                <p className="text-[11px] font-medium text-amber-900 mt-1 italic">
                  ({activeReceipt.amountInWords})
                </p>
              </div>

              {/* Organization & Helpline Footer */}
              <div className="bg-white p-3 rounded-xl border border-stone-200 text-[11px] text-stone-600 leading-relaxed">
                <p className="font-bold text-stone-800">
                  📍 Navyuvak Ganesh Utsav Pandal, Jannod, Rampura, Madhya Pradesh – 458118
                </p>
                <p className="text-stone-500 mt-1">
                  📞 <strong>Helpline:</strong> {selectedWhatsAppNumber?.phoneNumber || '+91 7724095705 / +91 6262982251'} • ✉️ navyuvakganeshmitramandal14@gmail.com
                </p>
              </div>
            </div>

            {/* WhatsApp Contact Channel Selection */}
            <div className="mt-4">
              <WhatsAppSenderSelector
                selectedNumberId={selectedWhatsAppNumber?.id}
                onSelect={setSelectedWhatsAppNumber}
                title="Send From WhatsApp Channel"
              />
            </div>

            {/* Receipt Actions Grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                id="download-receipt-pdf-btn"
                onClick={() => downloadChandaReceiptPDF(activeReceipt, activeReceiptMobile || activeReceipt.mobileNumber)}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                id="print-receipt-btn"
                onClick={() => printChandaReceipt(activeReceipt, activeReceiptMobile || activeReceipt.mobileNumber)}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>

              <button
                type="button"
                id="share-receipt-whatsapp-btn"
                onClick={() => shareChandaReceiptWhatsApp(activeReceipt, selectedWhatsAppNumber, activeReceiptMobile || activeReceipt.mobileNumber)}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>Share WhatsApp</span>
              </button>
            </div>

            {/* Bottom Secondary Close Option */}
            <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-end">
              <button
                type="button"
                id="close-receipt-bottom-btn"
                onClick={handleCloseReceipt}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 hover:text-stone-900 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close Receipt & Return to List</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteReceiptItem)}
        title="Delete Chanda Record?"
        message={`Are you sure you want to delete receipt ${deleteReceiptItem?.receiptNumber} of ₹${deleteReceiptItem?.amount} for ${deleteReceiptItem?.donorName}? This action cannot be undone.`}
        confirmLabel="Yes, Delete Receipt"
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteReceiptItem(null)}
      />
    </div>
  );
};
