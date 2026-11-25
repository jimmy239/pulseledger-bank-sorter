import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractAmount,
  detectDirection,
  parseNotification,
  parseBulkNotifications,
} from './www/parser.js';

test('extractAmount handles symbols and currency codes', () => {
  assert.deepEqual(extractAmount('You spent $18.45 at Starbucks'), {
    amount: 18.45,
    currency: 'USD',
    sign: '',
  });
  assert.deepEqual(extractAmount('Credit alert: +$3,250.00 from Acme Corp'), {
    amount: 3250,
    currency: 'USD',
    sign: '+',
  });
  assert.deepEqual(extractAmount('EUR 89.90 debited at Amazon EU'), {
    amount: 89.9,
    currency: 'EUR',
    sign: '',
  });
});

test('detectDirection distinguishes paid vs received accurately', () => {
  assert.equal(detectDirection('Chase: You spent $42.10 at Whole Foods'), 'paid');
  assert.equal(detectDirection('Bank of America: Direct deposit of $2,800.00 received from Gusto Payroll'), 'received');
  assert.equal(detectDirection('Zelle: Alice Nguyen sent you $120.00'), 'received');
  assert.equal(detectDirection('Citi Visa ••9910 charged $15.99 at Netflix'), 'paid');
  assert.equal(detectDirection('Wise: Refund of $54.00 credited from Amazon'), 'received');
});

test('parseNotification extracts full structured transaction', () => {
  const tx = parseNotification(
    'Chase Checking ••4821: You paid $64.50 at Trader Joes on 2026-11-24'
  );
  assert.ok(tx);
  assert.equal(tx.direction, 'paid');
  assert.equal(tx.amount, 64.5);
  assert.equal(tx.currency, 'USD');
  assert.equal(tx.bank, 'Chase ••4821');
  assert.equal(tx.counterparty, 'Trader Joes');
  assert.ok(tx.timestamp.startsWith('2026-11-24'));
});

test('parseBulkNotifications parses valid lines and reports invalid ones', () => {
  const input = [
    'Chase: You received $1,500.00 from Stripe Payout on 2026-11-20',
    'Invalid line without amount',
    'Amex ••1004: $19.99 charged at Spotify on 2026-11-21',
  ].join('\n');

  const { parsed, failed } = parseBulkNotifications(input);
  assert.equal(parsed.length, 2);
  assert.equal(failed.length, 1);
  assert.equal(parsed[0].direction, 'received');
  assert.equal(parsed[1].direction, 'paid');
});

test('parses Laos banks (BCELOne, LDB, APB Meporm) in English and Lao with LAK', () => {
  const bcel = parseNotification('BCELOne A/C ••4821: Money In +1,500,000 LAK received from Khamphone Vong on 2026-11-25');
  assert.ok(bcel);
  assert.equal(bcel.direction, 'received');
  assert.equal(bcel.amount, 1500000);
  assert.equal(bcel.currency, 'LAK');
  assert.equal(bcel.bank, 'BCELOne ••4821');
  assert.equal(bcel.counterparty, 'Khamphone Vong');

  const ldb = parseNotification('LDB Trust ••7710: QR Pay 85,000 LAK paid to Joma Bakery Cafe on 2026-11-25');
  assert.ok(ldb);
  assert.equal(ldb.direction, 'paid');
  assert.equal(ldb.amount, 85000);
  assert.equal(ldb.currency, 'LAK');
  assert.equal(ldb.bank, 'LDB ••7710');
  assert.equal(ldb.counterparty, 'Joma Bakery Cafe');

  const apb = parseNotification('APB Meporm ••3304: ເງິນເຂົ້າ 2.400.000 ກີບ ຈາກ ບໍລິສັດ ລາວເທັກ');
  assert.ok(apb);
  assert.equal(apb.direction, 'received');
  assert.equal(apb.amount, 2400000);
  assert.equal(apb.currency, 'LAK');
  assert.equal(apb.bank, 'APB Meporm ••3304');
});

