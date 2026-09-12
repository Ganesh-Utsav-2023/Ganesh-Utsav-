import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Booking, WhatsAppContactNumber } from '../types/index.ts';
import { AartiBadge } from './AartiBadge.tsx';
import { downloadAartiPassPDF, shareAartiPassWhatsApp } from '../utils/pdfGenerator.ts';
import { formatToIndianDate } from '../utils/dateUtils.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { WhatsAppSenderSelector } from './WhatsAppSenderSelector.tsx';
import {
  X,
  Printer,
  Download,
  Calendar,
  Clock,
  Users,
  MapPin,
  Sparkles,
  ShieldCheck,
  Phone,
  Mail,
  Loader2,
  Info,
  Check,
  MessageSquare,
  Share2
} from 'lucide-react';

interface BookingPassModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserUid?: string;
  onNavigateToSettings?: () => void;
}

export const BookingPassModal: React.FC<BookingPassModalProps> = ({
  booking,
  isOpen,
  onClose,
  currentUserUid,
  onNavigateToSettings,
}) => {
  const [downloadState, setDownloadState] = useState<'idle' | 'generating' | 'success'>('idle');
  const [sharingState, setSharingState] = useState<'idle' | 'sharing' | 'success'>('idle');
  const [selectedWhatsAppNumber, setSelectedWhatsAppNumber] = useState<WhatsAppContactNumber | null>(null);

  const { user } = useAuth();

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !booking) return null;

  const displayPassId = booking.passId || booking.pass_id || (booking.booking_id ? `GA-PASS-${booking.booking_id}` : 'GA-PASS-2026-00001');
  const timeSlot = booking.slot_start_time && booking.slot_end_time 
    ? `${booking.slot_start_time} – ${booking.slot_end_time}`
    : '07:30 PM – 09:00 PM';

  const activeUid = user?.uid || currentUserUid;
  const isAdmin = user?.role === 'admin';

  const handleDownloadPDF = async () => {
    if (downloadState === 'generating') return;
    setDownloadState('generating');
    try {
      const result = await downloadAartiPassPDF(booking, activeUid, 'booking-pass-card-content', isAdmin);
      if (result.success) {
        setDownloadState('success');
        setTimeout(() => setDownloadState('idle'), 3000);
      } else {
        setDownloadState('idle');
      }
    } catch (err) {
      console.error('Download PDF error:', err);
      setDownloadState('idle');
    }
  };

  const handleShareWhatsApp = async () => {
    if (sharingState === 'sharing') return;
    setSharingState('sharing');
    try {
      await shareAartiPassWhatsApp(booking, selectedWhatsAppNumber, activeUid, isAdmin);
      setSharingState('success');
      setTimeout(() => setSharingState('idle'), 3000);
    } catch (err) {
      console.error('Share WhatsApp error:', err);
      setSharingState('idle');
    }
  };

  const handlePrint = () => {
    window.dispatchEvent(
      new CustomEvent('mandal-trigger-print', {
        detail: {
          type: 'pass',
          data: booking,
        },
      })
    );
  };

  return (
    <div
      id="booking-pass-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white"
    >
      <div
        id="booking-pass-card"
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-amber-400/80 overflow-hidden my-4 relative print:shadow-none print:border-amber-500 print:rounded-none print:my-0 print:max-w-none"
      >
        {/* Exportable PDF Canvas Content */}
        <div id="booking-pass-card-content" className="bg-white">
          {/* Pass Top Header */}
          <div className="bg-gradient-to-br from-amber-700 via-orange-600 to-red-800 text-white p-6 text-center relative overflow-hidden">
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-black/20 transition-colors print:hidden cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-white p-0.5 shadow-xs flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 text-amber-200 text-xs font-bold tracking-widest uppercase border border-amber-300/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                GANESH AARTI PASS
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black font-serif tracking-wider text-white drop-shadow-md">
              NAVYUVAK GANESH MITRA MANDAL
            </h1>
            <p className="text-xs text-amber-100 font-medium mt-1 tracking-wide">
              Jannod, Rampura, Madhya Pradesh
            </p>
          </div>

          {/* Pass Card Details */}
          <div className="p-5 sm:p-6 bg-[#fcfaf5] space-y-4">
            {/* Booking ID & Pass ID Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-amber-50 rounded-2xl border border-amber-200 shadow-2xs">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-amber-800">Pass Identification</p>
                <p className="text-lg font-black text-amber-950 font-mono tracking-wider">{displayPassId}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <p className="text-xs font-mono font-semibold text-amber-700">Booking ID: {booking.booking_id || booking.id}</p>
                  {(booking.tokenNumber || booking.token_number) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-600 text-white uppercase tracking-wider">
                      Token #{booking.tokenNumber || booking.token_number}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <AartiBadge status={booking.status || 'ACCEPTED'} size="lg" />
              </div>
            </div>

            {/* Devotee Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-amber-100 shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">Devotee Name</span>
                <span className="font-bold text-stone-900 text-sm block truncate">{booking.devotee_name}</span>
                <span className="text-stone-500 font-mono block mt-0.5">{booking.phone}</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-amber-100 shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">Number of People</span>
                <div className="flex items-center gap-1 font-bold text-stone-900 text-sm mt-0.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>{booking.number_of_people} Devotee(s)</span>
                </div>
              </div>
            </div>

            {/* Aarti Timing & Venue */}
            <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-300/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <span>Aarti Date: {formatToIndianDate(booking.slot_date)}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900 uppercase">
                  Maha Sandhya Aarti
                </span>
              </div>

              <div className="flex items-center gap-2 text-amber-950 font-black text-sm">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>Aarti Timing: {timeSlot}</span>
              </div>

              <div className="flex items-start gap-2 text-xs text-stone-700 font-medium pt-2 border-t border-orange-200/80">
                <MapPin className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Venue:</strong> Navyuvak Ganesh Utsav Pandal, Jannod, Rampura, Madhya Pradesh – 458118
                </span>
              </div>
            </div>

            {/* QR Code Verification Section */}
            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs flex items-center justify-between gap-4">
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-stone-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Entry QR Code</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-snug">
                  Scan at entry gate for instant verification.
                </p>
                <p className="text-[10px] font-mono text-amber-800 font-bold pt-1">
                  Pass ID: {displayPassId}
                </p>
              </div>

              <div className="p-2 bg-stone-50 border border-stone-200 rounded-xl flex-shrink-0 shadow-2xs">
                <QRCodeCanvas
                  id="booking-pass-qr-canvas"
                  value={`Pass ID: ${displayPassId}`}
                  size={88}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* Visit Note */}
            <div className="p-2.5 bg-amber-100/70 rounded-xl border border-amber-300/80 text-[11px] font-semibold text-amber-950 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>Please carry this pass during your visit to the Ganesh Utsav Pandal.</span>
            </div>

            {/* WhatsApp Contact Selection (Admin Communication) */}
            {isAdmin && (
              <div className="pt-2 print:hidden">
                <WhatsAppSenderSelector
                  selectedNumberId={selectedWhatsAppNumber?.id}
                  onSelect={setSelectedWhatsAppNumber}
                  title="Official WhatsApp Contact"
                  onNavigateToSettings={onNavigateToSettings}
                />
              </div>
            )}

            {/* Contact Helpline */}
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Phone className="w-3.5 h-3.5 text-amber-700" />
                <span>
                  Helpline: {selectedWhatsAppNumber?.phoneNumber || '+91 7724095705 / +91 6262982251'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-600">
                <Mail className="w-3.5 h-3.5 text-stone-500" />
                <a
                  href="mailto:navyuvakganeshmitramandal14@gmail.com"
                  className="text-stone-600 hover:text-amber-800 underline underline-offset-2 transition-colors"
                >
                  navyuvakganeshmitramandal14@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          >
            ✕ Close
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={sharingState === 'sharing'}
              className="px-3.5 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {sharingState === 'sharing' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : sharingState === 'success' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Sent / Opened ✓</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Share on WhatsApp</span>
                </>
              )}
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloadState === 'generating'}
              className="px-3.5 py-2 text-xs font-bold rounded-xl text-stone-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              {downloadState === 'generating' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-800" />
                  <span>PDF...</span>
                </>
              ) : downloadState === 'success' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Downloaded ✓</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-amber-800" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
