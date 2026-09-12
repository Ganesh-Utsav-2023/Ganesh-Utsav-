import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Booking, WhatsAppContactNumber } from '../types/index.ts';
import { normalizeWhatsAppNumber } from '../services/whatsappService.ts';
import { formatToIndianDate } from './dateUtils.ts';

/**
 * Builds HTML container and converts it to a jsPDF instance.
 */
async function buildAartiPassJsPdf(
  booking: Booking,
  currentUserUid?: string,
  elementId: string = 'booking-pass-card-content',
  isAdmin: boolean = false
): Promise<{ pdf: jsPDF; filename: string; displayPassId: string; rawBookingId: string }> {
  // 1. Validate booking object
  if (!booking) {
    throw new Error('Booking data is not available.');
  }

  // 2. Extract & Format Pass Data
  const rawBookingId = String(booking.booking_id || booking.id || 'GA-2026-00001');
  const formattedBookingId = rawBookingId.replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `Ganesh-Aarti-Pass-${formattedBookingId}.pdf`;

  const displayPassId = String(
    booking.passId || booking.pass_id || (booking.booking_id ? `GA-PASS-${booking.booking_id}` : `GA-PASS-${rawBookingId}`)
  );

  const timeSlot = (booking.slot_start_time && booking.slot_end_time)
    ? `${booking.slot_start_time} – ${booking.slot_end_time}`
    : '07:30 PM – 09:00 PM';

  const devoteeName = booking.devotee_name || (booking as any).devoteeName || 'Devotee';
  const phone = booking.phone || (booking as any).mobileNumber || 'N/A';
  const numberOfPeople = booking.number_of_people || (booking as any).numberOfPeople || 1;
  const rawDate = booking.slot_date || (booking as any).date || '2026-09-14';
  const slotDate = formatToIndianDate(rawDate);
  const statusUpper = String(booking.status || 'ACCEPTED').toUpperCase();

  // 3. Extract QR Code Data URL from DOM canvas or fallback generator
  let qrDataUrl = '';

  const qrCanvas = (document.querySelector('#booking-pass-qr-canvas') as HTMLCanvasElement) ||
    (document.querySelector(`#${elementId} canvas`) as HTMLCanvasElement) ||
    (document.querySelector('canvas') as HTMLCanvasElement);

  if (qrCanvas && typeof qrCanvas.toDataURL === 'function') {
    try {
      qrDataUrl = qrCanvas.toDataURL('image/png');
    } catch (err) {
      console.warn('Could not extract QR canvas directly:', err);
    }
  }

  // Fallback SVG conversion if canvas not found
  if (!qrDataUrl) {
    const qrSvg = document.querySelector(`#${elementId} svg`) as SVGElement;
    if (qrSvg) {
      try {
        const svgData = new XMLSerializer().serializeToString(qrSvg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          img.src = svgUrl;
        });

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 160;
        tempCanvas.height = 160;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 160, 160);
          ctx.drawImage(img, 0, 0, 160, 160);
          qrDataUrl = tempCanvas.toDataURL('image/png');
        }
        URL.revokeObjectURL(svgUrl);
      } catch (e) {
        console.warn('SVG QR conversion warning:', e);
      }
    }
  }

  // 4. Build Clean, High-Contrast HTML Pass Container using Standard Inline CSS
  const container = document.createElement('div');
  container.id = 'temp-aarti-pass-pdf-export';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '580px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = 'Arial, Helvetica, sans-serif';
  container.style.boxSizing = 'border-box';
  container.style.color = '#1c1917';

  container.innerHTML = `
    <div style="width: 580px; background-color: #ffffff; border: 3px solid #f59e0b; border-radius: 16px; overflow: hidden; font-family: Arial, Helvetica, sans-serif; box-sizing: border-box; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #881337 0%, #b45309 50%, #c2410c 100%); padding: 24px 20px; text-align: center; color: #ffffff; border-bottom: 3px solid #f59e0b; position: relative;">
        <div style="display: inline-block; padding: 4px 14px; border-radius: 9999px; background-color: rgba(0,0,0,0.35); color: #fde68a; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; border: 1px solid rgba(253,230,138,0.4);">
          ✨ GANESH AARTI PASS
        </div>
        <h1 style="font-size: 22px; font-weight: 900; margin: 0; padding: 0; color: #ffffff; font-family: Georgia, serif; letter-spacing: 0.5px;">
          NAVYUVAK GANESH MITRA MANDAL
        </h1>
        <p style="font-size: 12px; color: #fef3c7; margin: 4px 0 0 0; font-weight: 600;">
          Jannod, Rampura, Madhya Pradesh – 458118
        </p>
      </div>

      <!-- Body Details -->
      <div style="padding: 20px; background-color: #fcfaf5;">
        <!-- Pass Identification Box -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background-color: #fef3c7; border-radius: 12px; border: 1px solid #fde68a; margin-bottom: 14px;">
          <div>
            <div style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #92400e; letter-spacing: 1px;">Pass Identification</div>
            <div style="font-size: 18px; font-weight: 900; color: #451a03; font-family: monospace; letter-spacing: 1px;">${displayPassId}</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
              <span style="font-size: 11px; font-weight: 700; color: #b45309; font-family: monospace;">Booking ID: ${rawBookingId}</span>
              ${(booking.tokenNumber || booking.token_number) ? `
                <span style="padding: 1px 6px; background-color: #ea580c; color: #ffffff; font-weight: 900; font-size: 9px; border-radius: 4px; text-transform: uppercase; font-family: Arial, sans-serif;">
                  Token #${booking.tokenNumber || booking.token_number}
                </span>
              ` : ''}
            </div>
          </div>
          <div style="padding: 6px 14px; background-color: #d1fae5; color: #065f46; font-weight: 900; font-size: 12px; border-radius: 8px; border: 1px solid #a7f3d0; text-transform: uppercase; letter-spacing: 0.5px;">
            ${statusUpper} ✓
          </div>
        </div>

        <!-- Devotee Info Grid -->
        <div style="display: flex; gap: 12px; margin-bottom: 14px;">
          <div style="flex: 1; padding: 12px 14px; background-color: #ffffff; border-radius: 10px; border: 1px solid #fde68a;">
            <div style="font-size: 9px; text-transform: uppercase; color: #78716c; font-weight: 800; letter-spacing: 0.5px;">Devotee Name</div>
            <div style="font-size: 14px; font-weight: 900; color: #1c1917; margin-top: 2px;">${devoteeName}</div>
            <div style="font-size: 11px; color: #57534e; font-family: monospace; margin-top: 2px;">${phone}</div>
          </div>
          <div style="flex: 1; padding: 12px 14px; background-color: #ffffff; border-radius: 10px; border: 1px solid #fde68a;">
            <div style="font-size: 9px; text-transform: uppercase; color: #78716c; font-weight: 800; letter-spacing: 0.5px;">Number of Devotees</div>
            <div style="font-size: 14px; font-weight: 900; color: #1c1917; margin-top: 2px;">${numberOfPeople} Person(s)</div>
            <div style="font-size: 11px; color: #b45309; font-weight: 700; margin-top: 2px;">Confirmed Slot</div>
          </div>
        </div>

        <!-- Aarti Schedule & Venue Details -->
        <div style="padding: 14px 16px; background-color: #fff7ed; border-radius: 12px; border: 1px solid #ffedd5; margin-bottom: 14px;">
          <div style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #c2410c; letter-spacing: 1px; margin-bottom: 6px;">Aarti Schedule & Venue</div>
          <div style="font-size: 14px; font-weight: 900; color: #7c2d12; margin-bottom: 4px;">
            📅 Date: <strong>${slotDate}</strong> &nbsp;|&nbsp; ⏰ Time: <strong>${timeSlot}</strong>
          </div>
          <div style="font-size: 11px; color: #431407; line-height: 1.4; margin-top: 6px; padding-top: 6px; border-top: 1px solid #fed7aa;">
            📍 <strong>Venue:</strong> Navyuvak Ganesh Utsav Pandal, Jannod, Rampura (M.P.)
          </div>
        </div>

        <!-- Verification QR Code -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e7e5e4; margin-bottom: 14px;">
          <div>
            <div style="font-size: 12px; font-weight: 900; color: #1c1917;">🛡️ Entry Verification QR</div>
            <div style="font-size: 10px; color: #78716c; margin-top: 2px;">Present at entrance for scan & entry.</div>
            <div style="font-size: 9px; font-family: monospace; color: #b45309; font-weight: 700; margin-top: 4px;">Pass: ${displayPassId}</div>
          </div>
          <div style="width: 80px; height: 80px; background-color: #ffffff; border: 1px solid #d6d3d1; border-radius: 8px; padding: 4px; display: flex; align-items: center; justify-content: center;">
            ${qrDataUrl ? `<img src="${qrDataUrl}" style="width: 100%; height: 100%; object-fit: contain;" alt="QR" />` : `<div style="font-size: 9px; text-align: center; color: #78716c;">QR Verified</div>`}
          </div>
        </div>

        <!-- Blessings & Helpline Footer -->
        <div style="padding: 10px 14px; background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca; color: #991b1b; font-size: 10px; font-weight: 700; text-align: center; margin-bottom: 8px;">
          🙏 Ganpati Bappa Morya! Please arrive 15 minutes before the Aarti timing.
        </div>
        <div style="text-align: center; font-size: 10px; color: #78716c;">
          📞 Helpline: +91 7724095705 / +91 6262982251 &nbsp;|&nbsp; ✉️ navyuvakganeshmitramandal14@gmail.com
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Wait for layout to settle
  await new Promise((resolve) => setTimeout(resolve, 250));

  // Render high-resolution canvas using html2canvas
  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    allowTaint: true,
  });

  // Cleanup temporary container
  if (container.parentNode) {
    container.parentNode.removeChild(container);
  }

  // Build A4 PDF
  const imgData = canvas.toDataURL('image/png', 1.0);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

  const marginX = 15;
  const contentWidth = pdfWidth - marginX * 2; // 180mm
  const contentHeight = (canvas.height * contentWidth) / canvas.width;
  const marginY = Math.max(12, (pdfHeight - contentHeight) / 3);

  pdf.addImage(imgData, 'PNG', marginX, marginY, contentWidth, contentHeight);

  return { pdf, filename, displayPassId, rawBookingId };
}

/**
 * Generates and downloads a high-quality A4 PDF for the Ganesh Aarti Pass.
 */
export async function downloadAartiPassPDF(
  booking: Booking,
  currentUserUid?: string,
  elementId: string = 'booking-pass-card-content',
  isAdmin: boolean = false
): Promise<{ success: boolean; message?: string }> {
  try {
    const statusUpper = String(booking.status || 'ACCEPTED').toUpperCase();
    if (statusUpper === 'CANCELLED' || statusUpper === 'REJECTED') {
      const msg = 'This Aarti booking has been cancelled or rejected. The pass cannot be downloaded.';
      alert(msg);
      return { success: false, message: msg };
    }

    const { pdf, filename } = await buildAartiPassJsPdf(booking, currentUserUid, elementId, isAdmin);

    // Save PDF
    try {
      pdf.save(filename);
    } catch (saveError) {
      console.warn('pdf.save failed, using blob download fallback:', saveError);
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 3000);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error generating Aarti Pass PDF:', err);
    alert('Unable to generate PDF pass. Please try again.');
    return { success: false, message: err?.message || 'Unable to generate PDF pass. Please try again.' };
  }
}

/**
 * Generates a PDF Blob for Aarti Pass.
 */
export async function generateAartiPassPDFBlob(
  booking: Booking,
  currentUserUid?: string,
  elementId: string = 'booking-pass-card-content',
  isAdmin: boolean = false
): Promise<{ blob: Blob; filename: string }> {
  const { pdf, filename } = await buildAartiPassJsPdf(booking, currentUserUid, elementId, isAdmin);
  const blob = pdf.output('blob');
  return { blob, filename };
}

/**
 * Shares Aarti Pass on WhatsApp.
 * - If Web Share API is supported, shares the generated PDF directly.
 * - Otherwise, automatically downloads the PDF and opens WhatsApp with pre-filled message.
 */
export async function shareAartiPassWhatsApp(
  booking: Booking,
  selectedWhatsAppNumber?: WhatsAppContactNumber | null,
  currentUserUid?: string,
  isAdmin: boolean = false
): Promise<void> {
  const rawBookingId = String(booking.booking_id || booking.id || 'GA-2026-00001');
  const displayPassId = String(
    booking.passId || booking.pass_id || (booking.booking_id ? `GA-PASS-${booking.booking_id}` : `GA-PASS-${rawBookingId}`)
  );
  const timeSlot = (booking.slot_start_time && booking.slot_end_time)
    ? `${booking.slot_start_time} – ${booking.slot_end_time}`
    : '07:30 PM – 09:00 PM';
  const devoteeName = booking.devotee_name || (booking as any).devoteeName || 'Devotee';
  const numberOfPeople = booking.number_of_people || (booking as any).numberOfPeople || 1;
  const rawDate = booking.slot_date || (booking as any).date || '2026-09-14';
  const slotDate = formatToIndianDate(rawDate);

  const helpline = selectedWhatsAppNumber?.phoneNumber || '+91 7724095705';
  const channelLabel = selectedWhatsAppNumber?.label ? ` [${selectedWhatsAppNumber.label}]` : '';

  const shareText = `*NAVYUVAK GANESH MITRA MANDAL, RAMPURA*\n` +
    `*✨ Ganesh Maha Sandhya Aarti Entry Pass ✨*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🎫 *Pass ID:* ${displayPassId}\n` +
    `🔢 *Booking ID:* ${rawBookingId}\n` +
    `👤 *Devotee Name:* ${devoteeName}\n` +
    `👥 *Devotees:* ${numberOfPeople} Person(s)\n` +
    `📅 *Aarti Date:* ${slotDate}\n` +
    `⏰ *Aarti Timing:* ${timeSlot}\n` +
    `📍 *Venue:* Navyuvak Ganesh Utsav Pandal, Jannod, Rampura (M.P.)\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📞 *Mandal Helpline${channelLabel}:* ${helpline}\n\n` +
    `_Please present this pass at the entrance pandal. Ganpati Bappa Morya!_ 🙏🪔`;

  try {
    const { blob, filename } = await generateAartiPassPDFBlob(booking, currentUserUid, 'booking-pass-card-content', isAdmin);
    const file = new File([blob], filename, { type: 'application/pdf' });

    // Mode 2: Web Share API if supported
    if (
      navigator.canShare &&
      navigator.canShare({ files: [file] }) &&
      typeof navigator.share === 'function'
    ) {
      await navigator.share({
        title: `Aarti Pass - ${displayPassId}`,
        text: shareText,
        files: [file],
      });
      return;
    }
  } catch (shareErr) {
    console.warn('Web Share API error or cancelled, falling back to WhatsApp link:', shareErr);
  }

  // Fallback: Download PDF & open WhatsApp
  try {
    await downloadAartiPassPDF(booking, currentUserUid, 'booking-pass-card-content', isAdmin);
  } catch (err) {
    console.warn('Fallback pass PDF download failed:', err);
  }

  const rawPhone = booking.phone || (booking as any).mobileNumber || '';
  const targetPhone = normalizeWhatsAppNumber(rawPhone);
  const encodedText = encodeURIComponent(shareText);

  const waUrl = targetPhone
    ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  window.open(waUrl, '_blank', 'noopener,noreferrer');
}
