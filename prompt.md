As discussed, below are all the required details to proceed with full production deployment.

1. VPS / Server

VPS IP Address: <VPS_IP_ADDRESS>

Server access: Full MCP access provided "Hostinger MCP"
(You have full control to manage Docker, Nginx, SSL, DNS, and server configuration)

2. DNS

DNS A records will be handled by you via MCP:

capimaxrt.com → <VPS_IP_ADDRESS>

www.capimaxrt.com → <VPS_IP_ADDRESS>

3. Email (Hostinger SMTP)

EMAIL_HOST: smtp.hostinger.com


EMAIL_HOST_USER: <no-reply@capimaxrt.com>

EMAIL_HOST_PASSWORD: <No@1122Capirt>



4. Stripe (LIVE Mode)

STRIPE_SECRET_KEY: <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>

STRIPE_WEBHOOK_SECRET: <whsec_hUCEgyGnNKolFGUiUgh4H73wSZWRc9oR>

Webhook URL (already configured):
https://capimaxrt.com/api/v1/payments/webhooks/stripe/

5. NOWPayments (LIVE Mode)

NOWPAYMENTS_API_KEY: <EX6JWPP-3X74DFW-KBHXDAB-GDSNG6S>

NOWPAYMENTS_IPN_SECRET: <EaPCxEh+MXpNyHiHMNENXYR9j13BS+C+>

IPN Callback URL:
https://capimaxrt.com/api/v1/payments/nowpayments/ipn/

Final Confirmation

Blockchain minting: ENABLED

SSL: Let’s Encrypt

Admin panel: Django Admin

Please proceed with:

Updating .env.production


Nginx + SSL configuration

Database migrations

Admin superuser setup

End-to-end verification (payments, emails, blockchain)

Once completed, please confirm when the platform is live on the production domain.