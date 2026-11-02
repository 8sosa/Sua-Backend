# Program Portal API (formerly Classbook)

The Program Portal is the Violet Care Foundation learning portal (frontend: `/classbook` on the She-Unites-Africa site). This backend serves it under `/api/portal`.

## Roles

| Role | Can |
| --- | --- |
| `admin` | Manage accounts and cohorts, post announcements to everyone, everything a teacher can do in any cohort |
| `teacher` | In the cohorts assigned to them: upload materials, set assignments and download hand-ins, post announcements |
| `student` | In their own cohort: download materials, hand in assignments, see announcements |

Portal accounts (`PortalUser`) are separate from the shop `Admin` accounts, and portal tokens carry `kind: "portal"` so the two can't be swapped.

There is no public sign-up. Admins create accounts in the portal; each new account gets a temporary password that is shown once, and the person must choose their own password the first time they sign in.

## Setup

Environment variables (in addition to the existing `MONGO_URI` and `JWT_SECRET`):

- `CORS_ORIGINS` — optional comma-separated list of allowed frontend origins. Defaults to `https://violetcarefoundation.com`. Add a Netlify preview URL here to test a preview against this API.

Create the first admin (run once, with `MONGO_URI` pointing at the production database):

```sh
npm run portal:create-admin -- "Full Name" admin@example.org 'a-strong-password'
```

Uploaded files (materials and hand-ins, up to 25 MB each) are stored in MongoDB GridFS in the `portalFiles` bucket, so they survive redeploys.

## Tests

```sh
npm test
```

Tests start an in-memory MongoDB via `mongodb-memory-server`. To use an existing `mongod` instead, set `MONGO_TEST_URI` (a throwaway database is created and dropped).

## Endpoints

All routes except `POST /auth/login` need `Authorization: Bearer <token>`.

- `POST /auth/login` (rate limited) · `GET /auth/me` · `POST /auth/password`
- `GET /cohorts` · `POST /cohorts` (admin) · `DELETE /cohorts/:id` (admin)
- `GET|POST /users`, `PATCH /users/:id`, `POST /users/:id/reset-password` (admin) · `GET /students` (staff)
- `GET|POST /materials`, `GET /materials/:id/file`, `DELETE /materials/:id`
- `GET|POST /assignments`, `DELETE /assignments/:id`, `POST|DELETE /assignments/:id/submission` (student), `GET /assignments/:id/submissions` (staff), `GET /submissions/:id/file`
- `GET|POST /announcements`, `DELETE /announcements/:id`
- `GET /merch-orders` (admin)
- `GET /collaborations` (admin) · `PATCH /collaborations/:id` (admin, body `{ status: "new" | "contacted" | "closed" }`)

## Collaboration requests

The public website's collaboration form posts to `POST /api/form/collaborate` (no sign-in, rate limited to 10 per hour per IP). Required fields: `organization`, `contactName`, `email`, `collaborationType` (one of the values in `Models/collaborationRequest.js`), `message`. Optional: `organizationType`, `website`, `country`, `phone`. Program Portal admins see the requests under **Collaborations**.

## Merch orders

The website's merch shop checks out with `POST /order/merch` (rate limited), body `{ items: [{ productId, quantity }], customer: { name, email, phone, address } }`. Prices are read from the database. If `PAYSTACK_SECRET_KEY` is set, the response includes a Paystack `paymentUrl` and Paystack returns the buyer to `${SITE_URL}/Merch-shop?order=<id>` (`SITE_URL` defaults to `https://sheunitesafrica.org`). Without the key, the order is saved as `pending` and the team follows up to take payment. Products accept optional `description` and `imageUrl` fields for the shop.
