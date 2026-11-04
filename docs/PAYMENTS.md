# Payments

Only the **sandbox** provider exists. It generates reference numbers like `SBX-XXXXXXXXXX`, moves no money and never contacts any external service. All receipts say "DEMO - NO REAL PAYMENT".

`src/payments.js` exposes `charge()` / `refund()`. `getProvider('mobile_money')` or `('bank_card')` throws HTTP 501 `provider_not_connected` — they are placeholders so administrators can see what is planned.

## To connect a real provider (not done)
1. Confirm which providers operate in Somalia/Puntland and their merchant requirements (account, KYC, fees, settlement times).
2. Obtain official API documentation and sandbox credentials from the provider. **Never put keys in the frontend or in git** — use environment variables.
3. Implement an adapter with `charge`, `refund` and a signed webhook for asynchronous confirmation; store only provider references, never card numbers.
4. Add idempotency keys and reconciliation reports; test in the provider's sandbox; get legal/financial review.
5. Only then add the provider id to the allow-list and switch `DEMO_MODE` policies accordingly.
