# UKPI · pay-by-bank prototype

A web prototype of UPI-style "pay by bank" for the UK.
A shop shows a QR code, a shopper scans it, taps **Pay by bank**, and the
shop's screen turns green by itself. No card involved.

> Right now only **demo mode** is built: the bank screens are pretend, so no
> accounts or real money are needed. TrueLayer sandbox mode comes next.

## Run it on your laptop

You need [Node.js](https://nodejs.org) 20.19 or newer (`node -v` to check).

```bash
git clone https://github.com/anmolsrivastavadev-pixel/pay-by-bank-prototype.git
cd pay-by-bank-prototype
npm install                 # downloads the libraries
cp .env.example .env.local  # your private settings (PAYMENT_MODE=demo)
npm run db:setup            # creates the SQLite database file (prisma/dev.db)
npm run dev                 # starts the server
```

The last command prints something like:

```
- Local:    http://localhost:3000
- Network:  http://192.168.1.23:3000
```

## Scan the QR with your phone

1. Make sure your phone and laptop are on the **same Wi-Fi**.
2. On the laptop, open the **Network** address + `/shop`, e.g.
   `http://192.168.1.23:3000/shop`. (Not `localhost`: on your phone,
   "localhost" means the phone itself, so the QR link wouldn't work.)
3. Enter `3.50` and `Latte`, press **Create QR**.
4. Scan it with your phone camera, tap **Pay by bank**, pick a bank, tap **Approve**.
5. Watch the laptop switch to **Paid ✅** within 2 seconds.

If your phone can't open the page, your laptop's firewall may be blocking
port 3000. On a Mac: System Settings → Network → Firewall, and allow Node.
Some school or public Wi-Fi networks also block phones from talking to
laptops; a home network or your phone's hotspot works.
No phone? Use the "Open the shopper page in a new tab" link under the QR.

Other pages: `/history` lists every payment and its status.

## How it fits together

```
 Shop laptop (/shop)                Server (Next.js)                 Database (SQLite)
   "create £3.50 Latte"  ──POST /api/payments──────────▶  saves Payment (status: created)
   shows QR → /pay/<id>
   "paid yet?" every 2s  ──GET /api/payments/<id>──────▶  reads status

 Shopper's phone
   scans QR → /pay/<id>  (server reads the amount from the database)
   taps Pay              ──POST /api/payments/<id>/pay──▶ created → pending
                         ◀── "go to the bank" ─────────
   demo bank: Approve    ──POST /api/demo-bank/<id>/decision──▶ pending → succeeded
   → /pay/<id>/done
```

## The rules the code follows

| Rule | Where |
| --- | --- |
| Money is always whole pence (`350`, never `3.50`) | `src/lib/money.ts`, `prisma/schema.prisma` |
| The server decides the amount; the phone only sends the payment id | `src/app/api/payments/[id]/pay/route.ts` |
| Status only moves forward: created → pending → succeeded/failed | `advanceStatus` in `src/lib/payments.ts` |
| A repeated request (e.g. the same webhook twice) changes nothing | `advanceStatus` again: "update only if still in the old status" |
| Secrets live in `.env.local`, which is never committed or sent to the browser | `.gitignore`, `src/lib/config.ts` |

## Project map

```
prisma/schema.prisma          the Payment table
prisma.config.ts              where the database file lives (for the Prisma CLI)
src/lib/                      server-side logic (money, payments, config, providers)
src/app/shop/                 the shop till page
src/app/pay/[id]/             the shopper's page and the result page
src/app/demo-bank/[id]/       the pretend bank (demo mode only)
src/app/history/              the payment list
src/app/api/                  the server endpoints the pages call
```
