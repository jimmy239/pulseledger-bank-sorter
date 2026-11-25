/**
 * Bank Notification Parser & Categorizer
 * Pure ES module compatible with both browser and Node.js.
 */

const RECEIVED_KEYWORDS = [
  /\breceived\b/i,
  /\bcredited\b/i,
  /\bcredit\s+alert\b/i,
  /\bdeposited\b/i,
  /\bdeposit\b/i,
  /\bincoming\b/i,
  /\bmoney\s+in\b/i,
  /\bcash\s+in\b/i,
  /\btransfer\s+in\b/i,
  /\bqr\s+receiv/i,
  /\bcr\b/i,
  /\brefund(?:ed)?\b/i,
  /\bcashback\b/i,
  /\bpayout\b/i,
  /\bsalary\b/i,
  /\bpayroll\b/i,
  /\btransferred\s+to\s+you\b/i,
  /\bsent\s+you\b/i,
  /\bpaid\s+you\b/i,
  /\bdirect\s+deposit\b/i,
  /\binterest\s+earned\b/i,
  /\bdividend\b/i,
  // Lao language keywords (money received)
  /ເງິນເຂົ້າ/,
  /ຍອດເງິນເຂົ້າ/,
  /ໄດ້ຮັບ/,
  /ຮັບເງິນ/,
  /ໂອນເຂົ້າ/,
  /ຝາກເງິນ/,
  /ເພີ່ມຂຶ້ນ/,
  /\+\s*(?:[$€£¥₹₫₭฿]|USD|EUR|GBP|SGD|AUD|CAD|IDR|VND|LAK|KIP|THB|CNY|Rp)/i,
];

const PAID_KEYWORDS = [
  /\bdebited\b/i,
  /\bdebit\s+alert\b/i,
  /\bpaid\b/i,
  /\bmoney\s+out\b/i,
  /\bcash\s+out\b/i,
  /\btransfer\s+out\b/i,
  /\bqr\s+pay/i,
  /\bdr\b/i,
  /\bpayment\s+(?:to|for|of|at|made|processed|successful)\b/i,
  /\bspent\b/i,
  /\bpurchase(?:d)?\b/i,
  /\bcharged\b/i,
  /\bwithdrawn\b/i,
  /\bwithdrawal\b/i,
  /\bsent\s+to\b/i,
  /\btransferred\s+to\b/i,
  /\btransfer\s+to\b/i,
  /\byou\s+sent\b/i,
  /\byou\s+paid\b/i,
  /\bauto[-\s]?pay\b/i,
  /\bsubscription\b/i,
  /\bbill\s+pay\b/i,
  /\bcard\s+(?:used|ending)\b/i,
  /\bpos\s+purchase\b/i,
  // Lao language keywords (money paid)
  /ເງິນອອກ/,
  /ຍອດເງິນອອກ/,
  /ຈ່າຍ/,
  /ຊຳລະ/,
  /ໂອນອອກ/,
  /ໂອນໃຫ້/,
  /ຫັກເງິນ/,
  /ຖອນເງິນ/,
  /ຊື້/,
  /-\s*(?:[$€£¥₹₫₭฿]|USD|EUR|GBP|SGD|AUD|CAD|IDR|VND|LAK|KIP|THB|CNY|Rp)/i,
];

const CURRENCY_SYMBOLS = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₹': 'INR',
  '₫': 'VND',
  '₭': 'LAK',
  '฿': 'THB',
  'ກີບ': 'LAK',
  'ບາດ': 'THB',
  'Rp': 'IDR',
  'S$': 'SGD',
  'A$': 'AUD',
  'C$': 'CAD',
};

const CATEGORY_RULES = [
  {
    category: 'Salary & Income',
    direction: 'received',
    patterns: [/\bsalary\b/i, /\bpayroll\b/i, /\bdirect\s+deposit\b/i, /\bpayout\b/i, /\bstripe\b/i, /\binvoice\b/i, /\bfreelance\b/i, /\bdividend\b/i, /\binterest\b/i],
  },
  {
    category: 'Refunds & Cashback',
    direction: 'received',
    patterns: [/\brefund/i, /\bcashback\b/i, /\brebate\b/i, /\breversal\b/i],
  },
  {
    category: 'Food & Dining',
    patterns: [/\bstarbucks\b/i, /\bcoffee\b/i, /\bcafe\b/i, /\brestaurant\b/i, /\buber\s*eats\b/i, /\bdoordash\b/i, /\bgrabfood\b/i, /\bmcdonald/i, /\bchipotle\b/i, /\bwhole\s*foods\b/i, /\bgrocery\b/i, /\bsupermarket\b/i, /\bbakery\b/i, /\bdining\b/i],
  },
  {
    category: 'Transport & Travel',
    patterns: [/\buber\b/i, /\blyft\b/i, /\bgrab\b/i, /\bshell\b/i, /\bchevron\b/i, /\bfuel\b/i, /\bgas\b/i, /\bairline\b/i, /\bdelta\b/i, /\bunited\b/i, /\bhotel\b/i, /\bairbnb\b/i, /\bmetro\b/i, /\btransit\b/i, /\bparking\b/i],
  },
  {
    category: 'Subscriptions',
    patterns: [/\bnetflix\b/i, /\bspotify\b/i, /\bapple\.com\b/i, /\bicloud\b/i, /\bgoogle\s*(?:one|cloud|play)\b/i, /\badobe\b/i, /\bnotion\b/i, /\bchatgpt\b/i, /\bopenai\b/i, /\bgithub\b/i, /\bsubscription\b/i, /\bmembership\b/i],
  },
  {
    category: 'Bills & Utilities',
    patterns: [/\belectric/i, /\bwater\b/i, /\binternet\b/i, /\bverizon\b/i, /\bat&t\b/i, /\bt-mobile\b/i, /\bcomcast\b/i, /\brent\b/i, /\bmortgage\b/i, /\binsurance\b/i, /\butility\b/i, /\bbill\s+pay\b/i],
  },
  {
    category: 'Shopping',
    patterns: [/\bamazon\b/i, /\btarget\b/i, /\bwalmart\b/i, /\bapple\s+store\b/i, /\buniqlo\b/i, /\bzara\b/i, /\bshopee\b/i, /\blazada\b/i, /\bebay\b/i, /\bbest\s*buy\b/i, /\bikea\b/i],
  },
  {
    category: 'Transfer',
    patterns: [/\bzelle\b/i, /\bvenmo\b/i, /\bpaypal\b/i, /\bwise\b/i, /\btransfer\b/i, /\bwire\b/i, /\bach\b/i, /\bsent\s+to\b/i, /\bfrom\b/i],
  },
];

/**
 * Normalize numeric amount strings, handling dot-separated thousands for LAK/VND/IDR (e.g. 150.000 -> 150000).
 */
function parseNumericAmount(rawNum, currency) {
  let normalized = rawNum.trim();
  if ((currency === 'LAK' || currency === 'VND' || currency === 'IDR') && /^\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '');
  } else {
    normalized = normalized.replace(/,/g, '');
  }
  const amount = parseFloat(normalized);
  return !Number.isNaN(amount) && amount > 0 ? amount : null;
}

/**
 * Extract currency and numeric amount from a notification string.
 */
export function extractAmount(text) {
  // Match patterns like: +$1,250.00, -₭150,000, USD 120.50, 150,000 LAK, 150,000 ກີບ
  const symbolFirst = text.match(/([+-])?\s*(S\$|A\$|C\$|Rp|[$€£¥₹₫₭฿])\s*([\d,.]+)/);
  if (symbolFirst) {
    const sign = symbolFirst[1] || '';
    const sym = symbolFirst[2];
    const currency = CURRENCY_SYMBOLS[sym] || 'USD';
    const amount = parseNumericAmount(symbolFirst[3], currency);
    if (amount !== null) {
      return { amount, currency, sign };
    }
  }

  const codeFirst = text.match(/([+-])?\s*\b(USD|EUR|GBP|SGD|AUD|CAD|JPY|INR|IDR|VND|LAK|KIP|THB|CNY|RMB)\b\s*([\d,.]+)/i);
  if (codeFirst) {
    const sign = codeFirst[1] || '';
    const rawCode = codeFirst[2].toUpperCase();
    const currency = rawCode === 'KIP' ? 'LAK' : rawCode === 'RMB' ? 'CNY' : rawCode;
    const amount = parseNumericAmount(codeFirst[3], currency);
    if (amount !== null) {
      return { amount, currency, sign };
    }
  }

  const codeAfter = text.match(/([+-])?\s*([\d,.]+)\s*(?:(LAK|KIP|USD|EUR|GBP|SGD|AUD|CAD|JPY|INR|IDR|VND|THB|CNY|RMB)\b|(ກີບ|ບາດ|₭|฿))/i);
  if (codeAfter) {
    const sign = codeAfter[1] || '';
    const token = (codeAfter[3] || codeAfter[4] || '').toUpperCase();
    const currency = token === 'KIP' || token === 'ກີບ' || token === '₭'
      ? 'LAK'
      : token === 'ບາດ' || token === '฿'
      ? 'THB'
      : token === 'RMB'
      ? 'CNY'
      : token;
    const amount = parseNumericAmount(codeAfter[2], currency);
    if (amount !== null) {
      return { amount, currency, sign };
    }
  }

  return null;
}

/**
 * Determine whether a notification represents 'received' (inflow) or 'paid' (outflow).
 */
export function detectDirection(text, sign = '') {
  if (sign === '+') return 'received';
  if (sign === '-') return 'paid';

  let receivedScore = 0;
  let paidScore = 0;

  for (const rx of RECEIVED_KEYWORDS) {
    if (rx.test(text)) receivedScore += 1;
  }
  for (const rx of PAID_KEYWORDS) {
    if (rx.test(text)) paidScore += 1;
  }

  // Tie-breakers for phrases like "Transfer from X" vs "Transfer to X"
  if (/\b(?:from|by)\s+[A-Z]/i.test(text) && /\breceived|credited|deposit|transfer\b/i.test(text)) {
    receivedScore += 1;
  }
  if (/\b(?:at|to)\s+[A-Z]/i.test(text) && /\bspent|paid|charged|purchase|debited\b/i.test(text)) {
    paidScore += 1;
  }

  if (receivedScore > paidScore) return 'received';
  if (paidScore > receivedScore) return 'paid';

  // Default to paid if ambiguous
  return 'paid';
}

/**
 * Extract bank or account label (e.g., "BCELOne ••4821", "LDB Trust", "APB Meporm").
 */
export function extractBank(text) {
  const knownBanks = [
    // Laos banks & wallets
    { pattern: /\bBCEL\s*One\b|ທຄຕລ/i, label: 'BCELOne' },
    { pattern: /\bBCEL\b/i, label: 'BCELOne' },
    { pattern: /\bLDB\s*Trust\b|\bLDB\b|ທພລ/i, label: 'LDB' },
    { pattern: /\bAPB\s*Mepor?m\b|\bMepor?m\b|\bAPB\b|ທສກ/i, label: 'APB Meporm' },
    { pattern: /\bJDB\b/i, label: 'JDB' },
    { pattern: /\bLVB\b|\bLao[-\s]?Viet\b/i, label: 'LVB' },
    { pattern: /\bBIC\s*Bank\b|\bBIC\b/i, label: 'BIC Bank' },
    { pattern: /\bIndochina\s*Bank\b/i, label: 'Indochina Bank' },
    { pattern: /\bPhongsavanh\b/i, label: 'Phongsavanh Bank' },
    { pattern: /\bMaruhan\b/i, label: 'Maruhan Japan Bank' },
    { pattern: /\bACLEDA\b/i, label: 'ACLEDA Bank' },
    { pattern: /\bSacombank\b/i, label: 'Sacombank Lao' },
    { pattern: /\bST\s*Bank\b|\bSTB\b/i, label: 'ST Bank' },
    { pattern: /\bU[-\s]?Money\b/i, label: 'U-Money' },
    { pattern: /\bM[-\s]?Money\b/i, label: 'M-Money' },
    // International banks & wallets
    'Chase', 'Bank of America', 'BofA', 'Wells Fargo', 'Citi', 'Citibank',
    'Capital One', 'Amex', 'American Express', 'Discover', 'HSBC', 'Barclays',
    'Revolut', 'Wise', 'PayPal', 'Venmo', 'Zelle', 'Cash App', 'Monzo',
    'DBS', 'OCBC', 'UOB', 'BCA', 'Mandiri', 'BRI', 'BNI', 'Vietcombank', 'Techcombank', 'MB Bank',
  ];

  let bankName = '';
  for (const entry of knownBanks) {
    if (typeof entry === 'string') {
      const rx = new RegExp(`\\b${entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (rx.test(text)) {
        bankName = entry;
        break;
      }
    } else if (entry.pattern.test(text)) {
      bankName = entry.label;
      break;
    }
  }

  const acctMatch = text.match(/(?:acct|account|a\/c|card|ending\s+in|x{2,4}|\*{2,4}|••)\s*([0-9]{4})\b/i);
  const last4 = acctMatch ? `••${acctMatch[1]}` : '';

  if (bankName && last4) return `${bankName} ${last4}`;
  if (bankName) return bankName;
  if (last4) return `Account ${last4}`;
  return 'Bank Alert';
}

/**
 * Extract merchant / counterparty name from notification text.
 */
export function extractCounterparty(text, direction) {
  // Look for "at <Merchant>", "to <Recipient>", "from <Sender>", or Lao "ຈາກ/ຫາ/ໃຫ້ <Name>"
  const patterns = direction === 'received'
    ? [
        /\bfrom\s+([A-Za-z0-9\u0E80-\u0EFF&'.\-\s]{2,40}?)(?=\s+(?:on|at|via|ref|acct|account|a\/c|card|ending|balance|bal|\d{4}-\d{2}|$)|[.,;!?]|$)/i,
        /\bby\s+([A-Za-z0-9\u0E80-\u0EFF&'.\-\s]{2,40}?)(?=\s+(?:on|at|via|ref|balance|$)|[.,;!?]|$)/i,
        /(?:ຈາກ|ຜູ້ສົ່ງ:?)\s*([A-Za-z0-9\u0E80-\u0EFF&'.\-\s]{2,40}?)(?=\s+(?:ວັນທີ|ເວລາ|Ref|ຍອດ|$)|[.,;!?]|$)/,
      ]
    : [
        /\b(?:at|to|merchant:?)\s+([A-Za-z0-9\u0E80-\u0EFF&'.\-#\s]{2,40}?)(?=\s+(?:on|via|ref|acct|account|a\/c|card|ending|balance|bal|using|with|\d{4}-\d{2}|$)|[.,;!?]|$)/i,
        /(?:ຫາ|ໃຫ້|ຜູ້ຮັບ:?|ທີ່)\s*([A-Za-z0-9\u0E80-\u0EFF&'.\-#\s]{2,40}?)(?=\s+(?:ວັນທີ|ເວລາ|Ref|ຍອດ|$)|[.,;!?]|$)/,
      ];

  for (const rx of patterns) {
    const match = text.match(rx);
    if (match && match[1]) {
      const cleaned = match[1].trim().replace(/\s{2,}/g, ' ');
      if (cleaned.length >= 2 && !/^(?:your|the|account|card)$/i.test(cleaned)) {
        return cleaned;
      }
    }
  }

  // Fallback: check known merchants/senders
  const fallbackNames = [
    'Starbucks', 'Amazon', 'Uber Eats', 'Uber', 'Netflix', 'Spotify', 'Apple',
    'Google', 'Stripe', 'Payroll', 'Zelle', 'Venmo', 'PayPal', 'Target', 'Walmart',
  ];
  for (const name of fallbackNames) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(text)) return name;
  }

  return direction === 'received' ? 'Incoming Deposit' : 'Card Payment';
}

/**
 * Extract date/time if present in notification, otherwise return current ISO timestamp.
 */
export function extractTimestamp(text, fallbackDate = new Date()) {
  // Match YYYY-MM-DD HH:MM or YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?\b/);
  if (isoMatch) {
    const dt = new Date(`${isoMatch[1]}T${isoMatch[2] || '12:00:00'}`);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }

  // Match MM/DD/YYYY or MM/DD/YY
  const slashMatch = text.match(/\b(\d{1,2}\/\d{1,2}\/(?:20)?\d{2})\b/);
  if (slashMatch) {
    const dt = new Date(slashMatch[1]);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }

  // Match "Nov 25, 2026" or "25 Nov 2026"
  const monthMatch = text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+20\d{2})?\b/i);
  if (monthMatch) {
    const raw = /20\d{2}/.test(monthMatch[0]) ? monthMatch[0] : `${monthMatch[0]}, ${fallbackDate.getFullYear()}`;
    const dt = new Date(raw);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }

  return fallbackDate.toISOString();
}

/**
 * Categorize a transaction based on text, counterparty, and direction.
 */
export function categorizeTransaction(text, counterparty, direction) {
  const combined = `${text} ${counterparty}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.direction && rule.direction !== direction) continue;
    if (rule.patterns.some((rx) => rx.test(combined))) {
      return rule.category;
    }
  }
  return direction === 'received' ? 'Other Income' : 'Other Expense';
}

/**
 * Parse a single bank notification line/block into a structured transaction object.
 * Returns null if no monetary amount can be found.
 */
export function parseNotification(rawText, options = {}) {
  const text = (rawText || '').trim();
  if (!text) return null;

  const money = extractAmount(text);
  if (!money) return null;

  const direction = detectDirection(text, money.sign);
  const bank = extractBank(text);
  const counterparty = extractCounterparty(text, direction);
  const timestamp = extractTimestamp(text, options.fallbackDate || new Date());
  const category = categorizeTransaction(text, counterparty, direction);

  return {
    id: options.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    direction, // 'paid' | 'received'
    amount: money.amount,
    currency: money.currency,
    counterparty,
    bank,
    category,
    timestamp,
    rawText: text,
  };
}

/**
 * Parse multiple notifications separated by newlines (or blank lines).
 */
export function parseBulkNotifications(bulkText, options = {}) {
  const lines = (bulkText || '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = [];
  const failed = [];

  lines.forEach((line, idx) => {
    const tx = parseNotification(line, {
      ...options,
      id: `tx_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    });
    if (tx) {
      parsed.push(tx);
    } else {
      failed.push(line);
    }
  });

  return { parsed, failed };
}
