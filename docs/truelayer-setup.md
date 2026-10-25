# Setting up TrueLayer sandbox mode

Sandbox means pretend banks and pretend money, so nothing here can cost you anything.
It takes about 15 minutes. You need a TrueLayer Console account
(sign up free at [console.truelayer.com](https://console.truelayer.com)).

> TrueLayer changes Console's menus from time to time. If a button isn't
> exactly where this says, look for the same word nearby. Make sure the
> **Sandbox** switch at the top of Console is on.

## 1. Get your client id and secret

In Console, open your app's **Settings**. Copy the **client_id**.
Create or reset the **client_secret** and copy it straight away (it's shown once).

## 2. Make a signing key pair

In Terminal, inside the project folder:

```bash
openssl ecparam -genkey -name secp521r1 -noout -out ec512-private-key.pem
openssl ec -in ec512-private-key.pem -pubout -out ec512-public-key.pem
```

This makes two files. The **private** key stays on your laptop and signs our
requests. The **public** key goes to TrueLayer so it can check the signatures.
(`*.pem` files are already git-ignored, so they won't be pushed to GitHub.)

In Console go to **Payments → Settings → Signing keys** and upload
`ec512-public-key.pem`. Console then shows a **KID** (key id). Copy it.

## 3. Find your merchant account id

In Console go to **Payments → Merchant account** (sandbox gives you one for GBP).
Copy its id. This is the "shop's bank account" the money lands in.

## 4. Allow the return address

After paying, TrueLayer sends the shopper back to our server, but only to
addresses you've allowed. In Console find **Allowed redirect URIs** and add:

```
http://localhost:3000/api/truelayer/return
http://192.168.0.47:3000/api/truelayer/return
```

(Swap in your own **Network** address from `npm run dev`. If Console refuses
the `192.168…` one, test on your laptop only, using `localhost`, for now.)

## 5. Fill in `.env.local`

```bash
PAYMENT_MODE=truelayer
TRUELAYER_CLIENT_ID=sandbox-...
TRUELAYER_CLIENT_SECRET=...
TRUELAYER_SIGNING_KEY_ID=...
TRUELAYER_SIGNING_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----
...the lines from ec512-private-key.pem...
-----END EC PRIVATE KEY-----"
TRUELAYER_MERCHANT_ACCOUNT_ID=...
```

Tip: `cat ec512-private-key.pem` prints the key so you can copy it.
Restart `npm run dev` after editing `.env.local`.

## 6. Make a test payment

1. Open `/shop`, create a QR, open it (phone or the "open in a new tab" link).
2. Tap **Pay by bank**. You land on TrueLayer's page.
3. Pick **Mock UK Payments - Redirect Flow**.
4. On the mock bank page, type the username **`test_executed`** and continue.
5. You come back to our done page. Within a few seconds the payment
   reaches TrueLayer's `settled` status and both screens show **Paid ✅**.

Other usernames: `test_authorisation_failed` (bank says no) and
`test_execution_rejected` (bank rejects it later). Pressing cancel on
TrueLayer's page brings you back to the Pay button.

## 7. (Optional) Webhooks

A webhook is TrueLayer calling *our* server to say "this payment changed".
TrueLayer is on the internet, so it can't reach `localhost` on your laptop.
To try webhooks you need a public HTTPS address that forwards to your laptop
(a "tunnel"), for example:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

It prints an `https://….trycloudflare.com` address. Put
`https://….trycloudflare.com/api/webhooks/truelayer` in Console under
**Payments → Settings → Webhook URI**. Watch the `npm run dev` terminal for
`TrueLayer webhook payment_settled …`.

You don't need webhooks for the demo to work: while a payment is pending, our
server also asks TrueLayer for the status every few seconds.

## If something goes wrong

The error shows on the Pay page and, with full details, in the `npm run dev` terminal.

| Message mentions | Usually means |
| --- | --- |
| `... is missing` | That line in `.env.local` is empty, or you didn't restart `npm run dev` |
| `token request failed (401)` | Client id or secret is wrong, or the Sandbox switch is off |
| `create payment failed (401)` + signature | Wrong KID, or the public key in Console doesn't match your private key |
| `create payment failed (400)` | Something in the request TrueLayer didn't like; the message says which field |
| TrueLayer page says the redirect isn't allowed | Step 4: the return address isn't on the allow list exactly |
