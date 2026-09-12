import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ChandaReceipt, WhatsAppContactNumber } from '../types/index.ts';
import { normalizeWhatsAppNumber } from '../services/whatsappService.ts';
import { formatToIndianDate } from './dateUtils.ts';

const ORGANIZATION_INFO = {
  mandalName: 'NAVYUVAK GANESH MITRA MANDAL',
  established: 'Since 2023',
  pandalAddress: 'Navyuvak Ganesh Utsav Pandal, Jannod, Rampura, Madhya Pradesh – 458118',
  helpline1: '+91 7724095705',
  helpline2: '+91 6262982251',
  email: 'navyuvakganeshmitramandal14@gmail.com',
};

/**
 * Builds a clean, high-resolution HTML container for rendering the sacred Chanda / Donation Receipt.
 */
function buildReceiptHtmlElement(receipt: ChandaReceipt, mobile?: string): HTMLElement {
  const container = document.createElement('div');
  container.id = 'temp-chanda-receipt-export';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '640px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = 'Arial, Helvetica, sans-serif';
  container.style.boxSizing = 'border-box';
  container.style.color = '#1c1917';

  const formattedAmount = Number(receipt.amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const displayMobile = mobile || receipt.temporaryMobile || '—';

  container.innerHTML = `
    <div style="width: 640px; background-color: #ffffff; border: 3px solid #b45309; border-radius: 16px; overflow: hidden; box-sizing: border-box; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
      
      <!-- Top Sacred Header -->
      <div style="background: linear-gradient(135deg, #7c2d12 0%, #b45309 50%, #9a3412 100%); padding: 24px 20px; text-align: center; color: #ffffff; border-bottom: 3px solid #f59e0b; position: relative;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 6px;">
          <div style="background-color: #ffffff; width: 44px; height: 44px; border-radius: 10px; padding: 3px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
            <img src="/logo.png" style="width: 100%; height: 100%; object-fit: contain;" alt="Logo" />
          </div>
          <div style="text-align: left;">
            <h1 style="font-size: 20px; font-weight: 900; margin: 0; padding: 0; color: #ffffff; font-family: Georgia, serif; letter-spacing: 0.5px;">
              ${ORGANIZATION_INFO.mandalName}
            </h1>
            <p style="font-size: 11px; color: #fef3c7; margin: 2px 0 0 0; font-weight: 700; letter-spacing: 1px;">
              ${ORGANIZATION_INFO.established}
            </p>
          </div>
        </div>

        <div style="display: inline-block; padding: 4px 16px; border-radius: 9999px; background-color: rgba(0,0,0,0.35); color: #fde68a; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; border: 1px solid rgba(253,230,138,0.4);">
          📜 CHANDA / DONATION RECEIPT
        </div>
      </div>

      <!-- Receipt Content -->
      <div style="padding: 24px; background-color: #fdfbf7;">
        
        <!-- Identification Strip -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background-color: #fef3c7; border-radius: 10px; border: 1px solid #fde68a; margin-bottom: 16px;">
          <div>
            <div style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #92400e; letter-spacing: 0.5px;">Receipt Number</div>
            <div style="font-size: 17px; font-weight: 900; color: #451a03; font-family: monospace; letter-spacing: 0.5px; margin-top: 2px;">
              ${receipt.receiptNumber}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #92400e; letter-spacing: 0.5px;">Donation Date</div>
            <div style="font-size: 14px; font-weight: 800; color: #451a03; margin-top: 2px;">
              ${formatToIndianDate(receipt.donationDate)}
            </div>
          </div>
        </div>

        <!-- Donor Information Box -->
        <div style="background-color: #ffffff; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tbody>
              <tr style="border-bottom: 1px solid #f5f5f4;">
                <td style="padding: 8px 0; color: #78716c; font-weight: 600; width: 35%;">Donor Name:</td>
                <td style="padding: 8px 0; color: #1c1917; font-weight: 900; font-size: 15px;">${receipt.donorName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f5f5f4;">
                <td style="padding: 8px 0; color: #78716c; font-weight: 600;">Mobile Number:</td>
                <td style="padding: 8px 0; color: #44403c; font-weight: 700; font-family: monospace;">${displayMobile}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f5f5f4;">
                <td style="padding: 8px 0; color: #78716c; font-weight: 600;">Payment Mode:</td>
                <td style="padding: 8px 0; color: #92400e; font-weight: 800;">
                  <span style="display: inline-block; padding: 2px 10px; border-radius: 6px; background-color: #fff7ed; border: 1px solid #fdba74; font-size: 12px;">
                    ${receipt.paymentMode.replace('_', ' ')}
                  </span>
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f5f5f4;">
                <td style="padding: 8px 0; color: #78716c; font-weight: 600;">Collected By:</td>
                <td style="padding: 8px 0; color: #1c1917; font-weight: 700;">${receipt.collectedBy}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #78716c; font-weight: 600;">Purpose / Remark:</td>
                <td style="padding: 8px 0; color: #1c1917; font-weight: 600;">${receipt.purpose || 'Shri Ganesh Utsav Seva'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Donation Amount Highlight Box -->
        <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 16px; margin-bottom: 16px; text-align: center;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #92400e; letter-spacing: 1px; margin-bottom: 4px;">
            Donation Amount Received
          </div>
          <div style="font-size: 26px; font-weight: 900; color: #78350f; font-family: Georgia, serif;">
            ₹ ${formattedAmount}
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #92400e; margin-top: 6px; font-style: italic;">
            (Amount in Words: ${receipt.amountInWords})
          </div>
        </div>

        <!-- Blessing & Seva Note -->
        <div style="padding: 10px 14px; background-color: #ecfdf5; border-radius: 8px; border: 1px solid #a7f3d0; color: #065f46; font-size: 11px; font-weight: 700; text-align: center; margin-bottom: 16px;">
          🙏 Shri Ganesh Bhagwan bless you and your family with prosperity, happiness, and peace.
        </div>

        <!-- Organization & Contact Details -->
        <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 10px; padding: 14px; font-size: 11px; color: #44403c; line-height: 1.5;">
          <div style="font-weight: 800; color: #1c1917; margin-bottom: 4px;">
            📍 Organization:
          </div>
          <div style="color: #57534e; margin-bottom: 8px;">
            ${ORGANIZATION_INFO.pandalAddress}
          </div>
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; border-top: 1px solid #f5f5f4; padding-top: 8px;">
            <div>
              <strong>📞 Helpline:</strong> ${ORGANIZATION_INFO.helpline1} / ${ORGANIZATION_INFO.helpline2}
            </div>
            <div>
              <strong>✉️ Email:</strong> ${ORGANIZATION_INFO.email}
            </div>
          </div>
        </div>

      </div>

      <!-- Footer Authenticity Bar -->
      <div style="background-color: #292524; color: #d6d3d1; padding: 8px 20px; text-align: center; font-size: 10px; font-weight: 600; letter-spacing: 0.5px;">
        Official Digital Receipt • Navyuvak Ganesh Mitra Mandal, Jannod, Rampura (M.P.)
      </div>

    </div>
  `;

  return container;
}

/**
 * Generates high quality PDF Blob for a given Chanda receipt.
 */
export async function generateChandaReceiptPDFBlob(
  receipt: ChandaReceipt,
  temporaryMobile?: string
): Promise<{ blob: Blob; filename: string; pdf: jsPDF }> {
  const container = buildReceiptHtmlElement(receipt, temporaryMobile);
  document.body.appendChild(container);

  // Wait for layout to render
  await new Promise((resolve) => setTimeout(resolve, 250));

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    allowTaint: true,
  });

  if (container.parentNode) {
    container.parentNode.removeChild(container);
  }

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
  const marginY = Math.max(15, (pdfHeight - contentHeight) / 3.5);

  pdf.addImage(imgData, 'PNG', marginX, marginY, contentWidth, contentHeight);

  const cleanNum = receipt.receiptNumber.replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `Chanda-Receipt-${cleanNum}.pdf`;
  const blob = pdf.output('blob');

  return { blob, filename, pdf };
}

/**
 * Downloads the Chanda Receipt PDF.
 */
export async function downloadChandaReceiptPDF(
  receipt: ChandaReceipt,
  temporaryMobile?: string
): Promise<void> {
  try {
    const { blob, filename, pdf } = await generateChandaReceiptPDFBlob(receipt, temporaryMobile);
    try {
      pdf.save(filename);
    } catch {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 3000);
    }
  } catch (error) {
    console.error('Error downloading Chanda receipt PDF:', error);
    alert('Unable to generate PDF receipt. Please try again.');
  }
}

/**
 * Prints the Chanda Receipt directly.
 */
export async function printChandaReceipt(
  receipt: ChandaReceipt,
  temporaryMobile?: string
): Promise<void> {
  try {
    // Dispatch same-origin print trigger event
    window.dispatchEvent(
      new CustomEvent('mandal-trigger-print', {
        detail: {
          type: 'receipt',
          data: receipt,
          mobile: temporaryMobile,
        },
      })
    );
  } catch (error) {
    console.error('Error printing receipt:', error);
    alert('Failed to trigger print. Please download the PDF and print.');
  }
}

/**
 * Shares the generated Chanda Receipt PDF directly via Web Share API or opens WhatsApp as a fallback.
 */
export async function shareChandaReceiptWhatsApp(
  receipt: ChandaReceipt,
  selectedWhatsAppNumber?: WhatsAppContactNumber | null,
  temporaryMobile?: string
): Promise<void> {
  const formattedAmount = Number(receipt.amount || 0).toLocaleString('en-IN');
  const helpline = selectedWhatsAppNumber?.phoneNumber || '+91 7724095705';
  const channelLabel = selectedWhatsAppNumber?.label ? ` [${selectedWhatsAppNumber.label}]` : '';

  const shareText = `*NAVYUVAK GANESH MITRA MANDAL, RAMPURA*\n` +
    `*📜 Chanda / Donation Receipt*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📜 *Receipt No:* ${receipt.receiptNumber}\n` +
    `👤 *Donor Name:* ${receipt.donorName}\n` +
    `💰 *Amount:* ₹${formattedAmount} (${receipt.amountInWords})\n` +
    `💳 *Payment Mode:* ${(receipt.paymentMode || 'CASH').replace('_', ' ')}\n` +
    `📅 *Donation Date:* ${formatToIndianDate(receipt.donationDate)}\n` +
    `🙏 *Purpose:* ${receipt.purpose || 'Ganesh Utsav Pooja & Seva'}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📍 *Organization:* Navyuvak Ganesh Utsav Pandal, Jannod, Rampura (M.P.)\n` +
    `📞 *Helpline${channelLabel}:* ${helpline}\n\n` +
    `_May Lord Ganesha bless you and your family with health, wealth, and prosperity!_ 🙏🪔\n` +
    `_Ganpati Bappa Morya!_ ✨`;

  const donorMobile = receipt.mobileNumber || temporaryMobile || receipt.temporaryMobile || '';

  try {
    const { blob, filename } = await generateChandaReceiptPDFBlob(receipt, donorMobile);
    const file = new File([blob], filename, { type: 'application/pdf' });

    // 1. Check if Web Share API with files is supported (e.g. mobile browsers, Chrome/Safari on Android/iOS/Mac/Windows)
    if (
      navigator.canShare &&
      navigator.canShare({ files: [file] }) &&
      typeof navigator.share === 'function'
    ) {
      await navigator.share({
        title: `Donation Receipt - ${receipt.receiptNumber}`,
        text: shareText,
        files: [file],
      });
      return;
    }
  } catch (shareErr) {
    console.warn('Web Share API failed or was cancelled, using WhatsApp web link fallback:', shareErr);
  }

  // 2. Fallback: Automatically download PDF & open WhatsApp with pre-filled message
  try {
    await downloadChandaReceiptPDF(receipt, donorMobile);
  } catch (err) {
    console.warn('Fallback download failed:', err);
  }

  const targetPhone = normalizeWhatsAppNumber(donorMobile);
  const encodedText = encodeURIComponent(shareText);
  const waUrl = targetPhone
    ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  window.open(waUrl, '_blank', 'noopener,noreferrer');
}
