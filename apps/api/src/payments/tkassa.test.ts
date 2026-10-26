import { test } from 'node:test';
import assert from 'node:assert/strict';

// env.ts валидирует окружение при импорте — задаём минимум для тестов
process.env.DATABASE_URL ??= 'postgresql://test@localhost/test';
process.env.WEB_URL ??= 'http://localhost:5173';
process.env.API_URL ??= 'http://localhost:4000';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-1234';

const { createHash } = await import('node:crypto');
const { tkassaToken, verifyTkassaToken } = await import('./tkassa');

test('подпись = SHA-256 от значений, отсортированных по имени ключа, вместе с Password', () => {
    const token = tkassaToken(
        {
            TerminalKey: 'TinkoffBankTest',
            Amount: 19200,
            OrderId: '21090',
            Description: 'Подарочная карта на 1000 рублей',
        },
        'usaf8fw8fsw21g',
    );
    // Amount, Description, OrderId, Password, TerminalKey — в алфавитном порядке ключей
    const expected = createHash('sha256')
        .update('19200Подарочная карта на 1000 рублей21090usaf8fw8fsw21gTinkoffBankTest', 'utf8')
        .digest('hex');
    assert.equal(token, expected);
});

test('вложенные объекты (Receipt, DATA) и сам Token в подписи не участвуют', () => {
    const base = { TerminalKey: 'T', Amount: 100, OrderId: 'o1' };
    const withNested = { ...base, Receipt: { Email: 'a@b.c' }, DATA: { x: 1 }, Token: 'whatever' };
    assert.equal(tkassaToken(withNested, 'p'), tkassaToken(base, 'p'));
});

test('булевы значения подписываются как "true"/"false"', () => {
    const a = tkassaToken({ TerminalKey: 'T', Success: true }, 'p');
    const b = tkassaToken({ TerminalKey: 'T', Success: 'true' }, 'p');
    assert.equal(a, b);
});

test('уведомление: верная подпись проходит, подмена суммы — нет', () => {
    const notification: Record<string, unknown> = {
        TerminalKey: 'T',
        OrderId: 'o1',
        Success: true,
        Status: 'CONFIRMED',
        PaymentId: 13660,
        ErrorCode: '0',
        Amount: 100000,
        Pan: '430000******0777',
    };
    notification.Token = tkassaToken(notification, 'secret');
    assert.equal(verifyTkassaToken(notification, 'secret'), true);
    assert.equal(verifyTkassaToken({ ...notification, Amount: 1 }, 'secret'), false);
    assert.equal(verifyTkassaToken(notification, 'wrong'), false);
    assert.equal(verifyTkassaToken({ ...notification, Token: undefined }, 'secret'), false);
});
