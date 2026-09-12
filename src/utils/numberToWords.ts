/**
 * Converts a numeric amount in Indian Rupees to capitalized English words.
 * Example:
 * 500 -> "Five Hundred Rupees Only"
 * 2500 -> "Two Thousand Five Hundred Rupees Only"
 * 105000 -> "One Lakh Five Thousand Rupees Only"
 */

const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertBelowThousand(num: number): string {
  let str = '';
  if (num >= 100) {
    str += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  }
  if (num > 0) {
    str += ones[num] + ' ';
  }
  return str.trim();
}

export function convertAmountToWords(amount: number): string {
  if (isNaN(amount) || amount <= 0) {
    return 'Zero Rupees Only';
  }

  const rounded = Math.floor(amount);
  const paise = Math.round((amount - rounded) * 100);

  let remaining = rounded;
  let words = '';

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  const hundred = remaining;

  if (crore > 0) {
    words += convertBelowThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertBelowThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertBelowThousand(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    words += convertBelowThousand(hundred) + ' ';
  }

  words = words.trim();
  if (!words) {
    words = 'Zero';
  }

  words += ' Rupees';

  if (paise > 0) {
    words += ' and ' + convertBelowThousand(paise) + ' Paise';
  }

  words += ' Only';

  return words;
}
