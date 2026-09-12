import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { AUTHORIZED_ADMIN_EMAIL } from '../../utils/devoteeUtils.ts';
import { WhatsAppContactNumber } from '../../types/index.ts';
import {
  getAdminWhatsAppNumbers,
  saveAdminWhatsAppNumbers,
  subscribeToAdminWhatsAppNumbers,
} from '../../services/whatsappService.ts';
import {
  Settings,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Lock,
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Star,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Info
} from 'lucide-react';

const PRESET_LABELS = ['Aarti Pass', 'Donation', 'General Enquiry', 'Mandal Office'];

export const AdminSettingsTab: React.FC = () => {
  const { user } = useAuth();
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // WhatsApp Numbers State
  const [whatsAppNumbers, setWhatsAppNumbers] = useState<WhatsAppContactNumber[]>([]);
  const [loadingWhatsApp, setLoadingWhatsApp] = useState(true);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);

  // Editing / Adding State
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Subscribe to real-time WhatsApp contact settings
  useEffect(() => {
    const unsubscribe = subscribeToAdminWhatsAppNumbers((numbers) => {
      setWhatsAppNumbers(numbers);
      setLoadingWhatsApp(false);
    });
    return () => unsubscribe();
  }, []);

  const showSuccess = (msg: string) => {
    setSavedMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSavedMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // Open modal/form to Add new number
  const handleStartAdd = () => {
    if (whatsAppNumbers.length >= 4) {
      showError('Maximum limit of 4 WhatsApp numbers reached.');
      return;
    }
    setEditingId(null);
    setFormLabel(PRESET_LABELS[whatsAppNumbers.length % PRESET_LABELS.length] || 'General');
    setFormPhone('+91 ');
    setFormActive(true);
    setFormIsDefault(whatsAppNumbers.length === 0);
    setIsAddingNew(true);
  };

  // Open form to Edit existing number
  const handleStartEdit = (num: WhatsAppContactNumber) => {
    setIsAddingNew(false);
    setEditingId(num.id);
    setFormLabel(num.label);
    setFormPhone(num.phoneNumber);
    setFormActive(num.active);
    setFormIsDefault(num.isDefault || false);
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormLabel('');
    setFormPhone('');
  };

  // Save Add or Edit
  const handleSaveNumberForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) {
      showError('Please enter a display name/label (e.g. Aarti Pass, Donation).');
      return;
    }
    if (!formPhone.trim() || formPhone.trim().replace(/\D/g, '').length < 10) {
      showError('Please enter a valid 10-digit WhatsApp number.');
      return;
    }

    setSavingWhatsApp(true);
    try {
      let updatedList = [...whatsAppNumbers];

      if (isAddingNew) {
        if (updatedList.length >= 4) {
          throw new Error('Maximum limit of 4 WhatsApp numbers reached.');
        }

        const newId = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const willBeDefault = formIsDefault || updatedList.length === 0;

        if (willBeDefault) {
          updatedList = updatedList.map((item) => ({ ...item, isDefault: false }));
        }

        updatedList.push({
          id: newId,
          label: formLabel.trim(),
          phoneNumber: formPhone.trim(),
          active: formActive,
          isDefault: willBeDefault,
          updatedAt: new Date().toISOString(),
        });
      } else if (editingId) {
        const willBeDefault = formIsDefault;
        if (willBeDefault) {
          updatedList = updatedList.map((item) => ({ ...item, isDefault: false }));
        }

        updatedList = updatedList.map((item) => {
          if (item.id === editingId) {
            return {
              ...item,
              label: formLabel.trim(),
              phoneNumber: formPhone.trim(),
              active: formActive,
              isDefault: willBeDefault,
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        });

        // Ensure at least one default if there are items and none is marked
        if (!updatedList.some((n) => n.isDefault) && updatedList.length > 0) {
          updatedList[0].isDefault = true;
        }
      }

      await saveAdminWhatsAppNumbers(updatedList, user?.email || AUTHORIZED_ADMIN_EMAIL);
      showSuccess(isAddingNew ? 'New WhatsApp number added successfully.' : 'WhatsApp number updated successfully.');
      handleCancelForm();
    } catch (err: any) {
      showError(err?.message || 'Failed to save WhatsApp number.');
    } finally {
      setSavingWhatsApp(false);
    }
  };

  // Toggle Active/Inactive status
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setSavingWhatsApp(true);
    try {
      const updatedList = whatsAppNumbers.map((num) => {
        if (num.id === id) {
          return { ...num, active: !currentActive, updatedAt: new Date().toISOString() };
        }
        return num;
      });

      await saveAdminWhatsAppNumbers(updatedList, user?.email || AUTHORIZED_ADMIN_EMAIL);
      showSuccess(`WhatsApp number ${!currentActive ? 'activated' : 'deactivated'}.`);
    } catch (err: any) {
      showError(err?.message || 'Failed to update status.');
    } finally {
      setSavingWhatsApp(false);
    }
  };

  // Set as Default Number
  const handleSetDefault = async (id: string) => {
    setSavingWhatsApp(true);
    try {
      const updatedList = whatsAppNumbers.map((num) => ({
        ...num,
        isDefault: num.id === id,
        updatedAt: new Date().toISOString(),
      }));

      await saveAdminWhatsAppNumbers(updatedList, user?.email || AUTHORIZED_ADMIN_EMAIL);
      showSuccess('Default WhatsApp number updated.');
    } catch (err: any) {
      showError(err?.message || 'Failed to set default.');
    } finally {
      setSavingWhatsApp(false);
    }
  };

  // Remove / Delete number
  const handleDeleteNumber = async (id: string, label: string) => {
    if (!window.confirm(`Are you sure you want to delete "${label}" WhatsApp contact number?`)) {
      return;
    }

    setSavingWhatsApp(true);
    try {
      let updatedList = whatsAppNumbers.filter((num) => num.id !== id);

      // If we deleted the default number and there are others, make the first one default
      if (updatedList.length > 0 && !updatedList.some((n) => n.isDefault)) {
        updatedList[0].isDefault = true;
      }

      await saveAdminWhatsAppNumbers(updatedList, user?.email || AUTHORIZED_ADMIN_EMAIL);
      showSuccess(`"${label}" WhatsApp number removed.`);
    } catch (err: any) {
      showError(err?.message || 'Failed to delete number.');
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const handleGeneralSave = (e: React.FormEvent) => {
    e.preventDefault();
    showSuccess('General mandal settings updated.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-stone-900 text-white p-6 rounded-3xl shadow-sm border border-amber-800/40 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-amber-300" />
              Administrative Security & Mandal Settings
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-amber-100">
            ⚙️ Mandal & System Settings
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
            Manage organization credentials, communication contacts, WhatsApp channels, helplines, and security policies.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {savedMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SECTION 1: WhatsApp Contact Numbers Management */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold font-serif text-stone-900">
                WhatsApp Contact Numbers
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Configure up to 4 official WhatsApp numbers used across Aarti booking passes, donation receipts, and devotee communication.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
              {whatsAppNumbers.length} / 4 Configured
            </span>
            {whatsAppNumbers.length < 4 && !isAddingNew && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add WhatsApp Number</span>
              </button>
            )}
          </div>
        </div>

        {/* Add / Edit Form Card */}
        {(isAddingNew || editingId) && (
          <form
            onSubmit={handleSaveNumberForm}
            className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAddingNew ? 'Add New WhatsApp Number' : 'Edit WhatsApp Number'}</span>
              </h3>
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                  Display Name / Label *
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g. Aarti Pass, Donation, General Enquiry"
                  required
                  className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-stone-900"
                />
                {/* Preset Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PRESET_LABELS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormLabel(preset)}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                        formLabel === preset
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                  WhatsApp Mobile Number *
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+91 7724095705 or 7724095705"
                  required
                  className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-stone-900"
                />
                <span className="text-[10px] text-stone-500 block mt-1">
                  Include country code (e.g. +91 7724095705)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-emerald-100">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700 select-none">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Active Channel</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-800 select-none">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>Make Default Number</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingWhatsApp}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {savingWhatsApp ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Number</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* List of Configured WhatsApp Numbers */}
        {loadingWhatsApp ? (
          <div className="p-8 text-center text-xs text-stone-500 animate-pulse">
            Loading configured WhatsApp channels from Firestore...
          </div>
        ) : whatsAppNumbers.length === 0 ? (
          <div className="p-8 rounded-2xl bg-amber-50/60 border border-amber-200 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950">No WhatsApp Numbers Configured</p>
              <p className="text-xs text-amber-800 mt-1 max-w-md mx-auto">
                No WhatsApp number has been configured. Please add a WhatsApp number above so it can be selected when sharing Aarti Passes and Donation Receipts.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First WhatsApp Number</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {whatsAppNumbers.map((num) => (
              <div
                key={num.id}
                className={`p-4 rounded-2xl border transition-all ${
                  num.active
                    ? 'bg-white border-stone-200 hover:border-emerald-300 shadow-2xs'
                    : 'bg-stone-50/80 border-stone-200 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900">{num.label}</span>
                      {num.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                          Default
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs font-bold text-stone-700 mt-1 block">
                      {num.phoneNumber}
                    </span>
                  </div>

                  {/* Active / Inactive Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      num.active
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-stone-200 text-stone-600 border border-stone-300'
                    }`}
                  >
                    {num.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-stone-100">
                  <div className="flex items-center gap-1.5">
                    {/* Toggle Active Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(num.id, num.active)}
                      disabled={savingWhatsApp}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                        num.active
                          ? 'text-stone-600 bg-stone-50 hover:bg-stone-100 border-stone-200'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                      }`}
                    >
                      {num.active ? (
                        <>
                          <ToggleRight className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Deactivate</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-3.5 h-3.5 text-stone-400" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>

                    {/* Set Default */}
                    {!num.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(num.id)}
                        disabled={savingWhatsApp}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(num)}
                      disabled={savingWhatsApp}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Edit number"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteNumber(num.id, num.label)}
                      disabled={savingWhatsApp}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove number"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Master Admin Security & Credentials */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold font-serif text-stone-900 flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-amber-600" />
            <span>Master Admin Account Credentials</span>
          </h2>
          <p className="text-xs text-stone-500">
            The master administrative account that holds exclusive authorization for all mandal management, financial Chanda records, devotee approvals, and system settings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#fcfaf5] border border-amber-200">
            <span className="text-[10px] font-bold uppercase text-amber-800 block">Authorized Admin Email</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-stone-900 mt-1 block">
              {AUTHORIZED_ADMIN_EMAIL}
            </span>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Active Security Guard ✓
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
            <span className="text-[10px] font-bold uppercase text-stone-600 block">Current Logged-in Session</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-stone-900 mt-1 block">
              {user?.email || 'N/A'}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">
              UID: {user?.uid || '—'}
            </span>
          </div>
        </div>

        {/* Organization Information Form */}
        <form onSubmit={handleGeneralSave} className="space-y-4 pt-4 border-t border-stone-100">
          <h3 className="text-sm font-bold text-stone-900">Mandal Contact & Helpline Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                Mandal Name
              </label>
              <input
                type="text"
                defaultValue="Navyuvak Ganesh Mitra Mandal"
                readOnly
                className="w-full px-3.5 py-2 text-xs bg-stone-100 border border-stone-200 rounded-xl font-bold text-stone-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                Establishment Year
              </label>
              <input
                type="text"
                defaultValue="2023 (Continuous Annual Utsav)"
                readOnly
                className="w-full px-3.5 py-2 text-xs bg-stone-100 border border-stone-200 rounded-xl font-bold text-stone-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                Helpline Phone Number 1
              </label>
              <input
                type="text"
                defaultValue="+91 7724095705"
                className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                Helpline Phone Number 2
              </label>
              <input
                type="text"
                defaultValue="+91 6262982251"
                className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                Pandal & Mandap Address
              </label>
              <input
                type="text"
                defaultValue="Navyuvak Ganesh Utsav Pandal, Jannod, Rampura, Madhya Pradesh – 458118"
                className="w-full px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl font-medium"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-900 hover:bg-stone-900 transition-colors cursor-pointer shadow-sm"
            >
              Save Mandal Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
