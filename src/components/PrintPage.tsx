import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Sparkles, Calendar, Clock, MapPin, ShieldCheck, Users } from 'lucide-react';
import { formatToIndianDate } from '../utils/dateUtils.ts';

const ORGANIZATION_INFO = {
  mandalName: 'NAVYUVAK GANESH MITRA MANDAL',
  established: 'Since 2023',
  pandalAddress: 'Navyuvak Ganesh Utsav Pandal, Jannod, Rampura, Madhya Pradesh – 458118',
  helpline1: '+91 7724095705',
  helpline2: '+91 6262982251',
  email: 'navyuvakganeshmitramandal14@gmail.com',
};

interface PrintableReceiptProps {
  receipt: {
    receiptNumber: string;
    donationDate: any;
    donorName: string;
    mobileNumber?: string;
    temporaryMobile?: string;
    paymentMode: string;
    collectedBy: string;
    purpose?: string;
    amount: number | string;
    amountInWords: string;
  };
  mobile?: string;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ receipt, mobile }) => {
  const formattedAmount = Number(receipt.amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const displayMobile = mobile || receipt.temporaryMobile || receipt.mobileNumber || '—';

  return (
    <div className="w-[640px] mx-auto bg-white border-3 border-amber-700 rounded-2xl overflow-hidden shadow-none p-0 my-0 print:border-amber-700">
      {/* Top Sacred Header */}
      <div className="bg-gradient-to-br from-amber-800 via-amber-700 to-red-800 p-6 text-center text-white border-b-3 border-amber-500 relative">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="bg-white w-11 h-11 rounded-lg p-0.5 flex items-center justify-center shadow-md">
            <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" referrerPolicy="no-referrer" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-black font-serif tracking-wide text-white">
              {ORGANIZATION_INFO.mandalName}
            </h1>
            <p className="text-[11px] text-amber-200 font-bold tracking-widest uppercase">
              {ORGANIZATION_INFO.established}
            </p>
          </div>
        </div>

        <div className="inline-block px-4 py-1 rounded-full bg-black/25 text-amber-200 text-xs font-black tracking-widest uppercase border border-amber-400/30 mt-1">
          📜 CHANDA / DONATION RECEIPT
        </div>
      </div>

      {/* Receipt Content */}
      <div className="p-6 bg-[#fdfbf7] space-y-4">
        
        {/* Identification Strip */}
        <div className="flex justify-between items-center p-3.5 bg-amber-50 rounded-xl border border-amber-200">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-amber-800 tracking-wider">Receipt Number</div>
            <div className="text-lg font-black text-amber-950 font-mono tracking-wider mt-0.5">
              {receipt.receiptNumber}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-extrabold text-amber-800 tracking-wider">Donation Date</div>
            <div className="text-sm font-extrabold text-amber-950 mt-0.5">
              {formatToIndianDate(receipt.donationDate)}
            </div>
          </div>
        </div>

        {/* Donor Information Box */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
          <table className="w-full text-stone-800 text-sm">
            <tbody>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 text-stone-500 font-bold w-[35%]">Donor Name:</td>
                <td className="py-2.5 text-stone-900 font-black text-base">{receipt.donorName}</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 text-stone-500 font-bold">Mobile Number:</td>
                <td className="py-2.5 text-stone-800 font-bold font-mono">{displayMobile}</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 text-stone-500 font-bold">Payment Mode:</td>
                <td className="py-2.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-extrabold">
                    {receipt.paymentMode.replace('_', ' ')}
                  </span>
                </td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2.5 text-stone-500 font-bold">Collected By:</td>
                <td className="py-2.5 text-stone-800 font-bold">{receipt.collectedBy}</td>
              </tr>
              <tr>
                <td className="py-2.5 text-stone-500 font-bold">Purpose / Remark:</td>
                <td className="py-2.5 text-stone-700 font-semibold">{receipt.purpose || 'Shri Ganesh Utsav Seva'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Donation Amount Highlight Box */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/70 border-2 border-amber-400 rounded-xl p-4 text-center">
          <div className="text-[10px] uppercase font-extrabold text-amber-800 tracking-wider mb-1">
            Donation Amount Received
          </div>
          <div className="text-2xl font-black text-amber-950 font-serif">
            ₹ {formattedAmount}
          </div>
          <div className="text-xs font-bold text-amber-800 mt-1.5 italic">
            (Amount in Words: {receipt.amountInWords})
          </div>
        </div>

        {/* Blessing & Seva Note */}
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center text-xs font-bold">
          🙏 Shri Ganesh Bhagwan bless you and your family with prosperity, happiness, and peace.
        </div>

        {/* Organization & Contact Details */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-xs text-stone-600 space-y-2">
          <div>
            <strong className="text-stone-800">📍 Organization Address:</strong>
            <p className="mt-0.5 text-stone-500">{ORGANIZATION_INFO.pandalAddress}</p>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-stone-100 flex-wrap gap-2">
            <div>
              <strong className="text-stone-800">📞 Helpline:</strong> {ORGANIZATION_INFO.helpline1} / {ORGANIZATION_INFO.helpline2}
            </div>
            <div>
              <strong className="text-stone-800">✉️ Email:</strong> {ORGANIZATION_INFO.email}
            </div>
          </div>
        </div>

      </div>

      {/* Footer Authenticity Bar */}
      <div className="bg-stone-900 text-stone-300 py-2.5 px-6 text-center text-[10px] font-bold tracking-wider">
        Official Digital Receipt • Navyuvak Ganesh Mitra Mandal, Jannod, Rampura (M.P.)
      </div>
    </div>
  );
};

interface PrintablePassProps {
  booking: {
    booking_id?: string;
    id?: string;
    passId?: string;
    pass_id?: string;
    status?: string;
    devotee_name: string;
    phone: string;
    number_of_people: number;
    slot_date: any;
    slot_start_time?: string;
    slot_end_time?: string;
  };
}

export const PrintablePass: React.FC<PrintablePassProps> = ({ booking }) => {
  const displayPassId = booking.passId || booking.pass_id || (booking.booking_id ? `GA-PASS-${booking.booking_id}` : 'GA-PASS-2026-00001');
  const timeSlot = booking.slot_start_time && booking.slot_end_time 
    ? `${booking.slot_start_time} – ${booking.slot_end_time}`
    : '07:30 PM – 09:00 PM';

  return (
    <div className="w-[500px] mx-auto bg-white border-3 border-amber-500 rounded-2xl overflow-hidden shadow-none p-0 my-0 print:border-amber-600">
      {/* Top Sacred Header */}
      <div className="bg-gradient-to-br from-amber-800 via-amber-700 to-red-800 p-5 text-center text-white border-b-3 border-amber-500 relative">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="bg-white w-9 h-9 rounded-lg p-0.5 flex items-center justify-center shadow-md">
            <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" referrerPolicy="no-referrer" />
          </div>
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/25 text-amber-200 text-[10px] font-black tracking-widest uppercase border border-amber-400/30">
            <Sparkles className="w-3 h-3 text-amber-300" />
            GANESH AARTI PASS
          </div>
        </div>

        <h1 className="text-lg font-black font-serif tracking-wide text-white">
          NAVYUVAK GANESH MITRA MANDAL
        </h1>
        <p className="text-[10px] text-amber-100 font-medium tracking-wide">
          Jannod, Rampura, Madhya Pradesh
        </p>
      </div>

      {/* Pass Card Details */}
      <div className="p-5 bg-[#fcfaf5] space-y-4">
        {/* Booking ID & Pass ID Badge */}
        <div className="flex items-center justify-between gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
          <div>
            <p className="text-[9px] uppercase font-extrabold tracking-wider text-amber-800">Pass Identification</p>
            <p className="text-base font-black text-amber-950 font-mono tracking-wider mt-0.5">{displayPassId}</p>
            <p className="text-[10px] font-mono font-bold text-amber-700">Booking ID: {booking.booking_id || booking.id}</p>
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wider border border-emerald-200">
              {booking.status || 'ACCEPTED'}
            </span>
          </div>
        </div>

        {/* Devotee Info */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white rounded-lg border border-amber-100 shadow-3xs">
            <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block">Devotee Name</span>
            <span className="font-bold text-stone-900 text-sm block truncate">{booking.devotee_name}</span>
            <span className="text-stone-500 font-mono block mt-0.5">{booking.phone}</span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-amber-100 shadow-3xs">
            <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block">Number of People</span>
            <div className="flex items-center gap-1 font-bold text-stone-900 text-sm mt-0.5">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              <span>{booking.number_of_people} Devotee(s)</span>
            </div>
          </div>
        </div>

        {/* Aarti Timing & Venue */}
        <div className="p-3.5 bg-orange-50 rounded-xl border border-orange-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-stone-950 font-extrabold text-xs">
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <span>Aarti Date: {formatToIndianDate(booking.slot_date)}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-200 text-amber-900 uppercase">
              Maha Sandhya Aarti
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>Aarti Timing: {timeSlot}</span>
          </div>

          <div className="flex items-start gap-1.5 text-[11px] text-stone-700 font-medium pt-2 border-t border-orange-200">
            <MapPin className="w-3.5 h-3.5 text-amber-700 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Venue:</strong> {ORGANIZATION_INFO.pandalAddress}
            </span>
          </div>
        </div>

        {/* QR Code Verification Section */}
        <div className="p-3.5 bg-white rounded-xl border border-stone-200 flex items-center justify-between gap-4">
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-1 font-bold text-stone-900">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Entry QR Code</span>
            </div>
            <p className="text-[10px] text-stone-500 leading-normal">
              Scan at entry gate for instant verification.
            </p>
            <p className="text-[9px] font-mono text-amber-800 font-bold pt-1">
              Pass ID: {displayPassId}
            </p>
          </div>

          <div className="p-1.5 bg-stone-50 border border-stone-200 rounded-lg flex-shrink-0">
            <QRCodeCanvas
              value={`Pass ID: ${displayPassId}`}
              size={72}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Visit Note */}
        <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[10px] font-semibold text-amber-950 flex items-center gap-1.5">
          <span className="text-amber-700 text-xs">ℹ️</span>
          <span>Please carry this pass during your visit to the Ganesh Utsav Pandal. Report 15 minutes prior.</span>
        </div>
      </div>

      {/* Footer Authenticity Bar */}
      <div className="bg-stone-900 text-stone-300 py-2 px-4 text-center text-[9px] font-bold tracking-wider">
        Official Digital Aarti Pass • Navyuvak Ganesh Mitra Mandal
      </div>
    </div>
  );
};
