# Sales Portal

A full-stack web app for running a sales team: sales reporting, customer management with referral-based sign-up and payments, candidate recruitment, and role-based administration.

- **Client:** Next.js 16 (App Router), Redux Toolkit, Tailwind CSS, Socket.IO client
- **Server:** Express 4, MongoDB (Mongoose 8), JWT auth in HTTP-only cookies, Socket.IO, Nodemailer

## Run with Docker

Prerequisites: Docker with Compose v2.

```bash
cp .env.example .env          # set JWT_SECRET (e.g. `openssl rand -hex 48`)
docker compose up -d --build  # mongo + api + web
docker compose exec server npm run seed -- --demo   # optional demo data
```

Open http://localhost:3000. The API is published on :5000, and MongoDB stays internal to the Compose network with its data in the `mongo-data` volume.

| Container | Image | Port |
|---|---|---|
| `client` | Next.js standalone build on `node:22-alpine`, non-root | `CLIENT_PORT` (3000) |
| `server` | Express on `node:22-alpine`, non-root, health-checked | `API_PORT` (5000) |
| `mongo` | `mongo:7`, health-checked | internal only |

If you change `CLIENT_PORT` or `API_PORT`, update `CLIENT_URL` and `PUBLIC_SOCKET_URL` in `.env` to match. `PUBLIC_SOCKET_URL` is baked into the client image, so rebuild with `--build` after changing it. When serving over HTTPS, set `COOKIE_SECURE=true`.

CI (`.github/workflows/ci.yml`) runs the server tests and the client lint and build, then builds both images, starts the stack and smoke-tests it on every push.

## Run locally without Docker

Prerequisites: Node.js 18+ and MongoDB running locally (or a MongoDB Atlas URI).

```bash
# 1. Server
cd server
npm install
cp .env.example .env        # then set JWT_SECRET (and MONGO_URI if not local)
npm run seed -- --demo      # master admin + demo admin, employee, candidates, customers
npm start                   # http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm run dev                 # http://localhost:3000
```

The client proxies `/api/*` to the server (see `client/next.config.mjs`), so the auth cookie is first-party. If port 3000 is busy, Next.js picks 3001. `CLIENT_URL` in `server/.env` accepts a comma-separated list of allowed origins, and the first one is used in email links.

### Demo accounts (after `npm run seed -- --demo`)

| Role | Login | Password |
|---|---|---|
| Master admin | `master@salesportal.local` | `Master@12345` |
| Admin | `admin@salesportal.local` (or `ADM1002`) | `Admin@12345` |
| Employee | `employee@salesportal.local` (or `EMPDEMO1`) | `Employee@123` |

The login page has one-click buttons for these in development.

### Email

Set `EMAIL` / `EMAIL_PASSWORD` (a Gmail App Password) to send real emails. If they are blank, every email (OTP codes, resume invites, new-employee credentials, payment receipts) is **printed in the server console**, so every flow still works locally.

### Tests

```bash
cd server
npm test   # 23 integration tests against a throwaway `salesportal_test` database
```

## What each role can do

| Role | Where | Can |
|---|---|---|
| **Public** | `/apply`, `/register-customer?ref=…`, `/submission/[hash]` | Apply for a job; buy a plan using an employee's referral ID; submit a resume through the emailed link |
| **Employee** | `/emp/[id]` | See their referral link, customers, totals and revenue; edit their customers; change email (with OTP) and password |
| **Admin** | `/admin/[id]`, `/candidate/admin/[id]`, `/candidate/[id]`, `/view-emp/[id]` | Analytics dashboard; manage employees and customers; confirm offline payments and refunds; shortlist, discard, invite and hire candidates |
| **Master admin** | `/master/[id]` + everything an admin has | Create and delete admins; audit log of sensitive actions |

Dashboards update live over Socket.IO when candidates apply, customers pay, or accounts change.

## Project structure

```
client/
├── app/
│   ├── admin/[id]/page.jsx            admin dashboard (overview, employees, customers, account)
│   ├── emp/[id]/page.jsx              employee dashboard
│   ├── candidate/[id]/page.jsx        candidate profile + history (admin)
│   ├── candidate/admin/[id]/page.jsx  candidate list and actions (admin)
│   ├── view-emp/[id]/page.jsx         admin view of one employee
│   ├── master/[id]/page.jsx           master console (admins, audit log)
│   ├── login/page.jsx
│   ├── apply/page.jsx                 public job application
│   ├── register-customer/page.jsx     public plan purchase + checkout
│   ├── submission/[emailHash]/page.jsx  public resume submission
│   └── redux/
│       ├── api/    adminApi.ts, employeeApi.ts, candidateApi.ts, customerApi.ts, loginApi.ts
│       ├── slice/  adminSlice.ts, employeeSlice.ts, candidateSlice.ts, loginSlice.ts
│       └── store/  store.ts
├── components/    Header.js, Footer.js, ui.jsx, tables, charts, account settings, …
└── proxy.js       redirects signed-out visitors away from dashboards

server/
├── server.js      entry: DB connection, HTTP server, Socket.IO
├── app.js         Express app (middleware + routes); used by tests
├── socket.js      Socket.IO: cookie-authenticated, per-user and admin rooms
├── config/        config.js, database.js
├── models/        Admin, Employee, Candidate, Customer, AuditLog, Counter
├── controllers/   account (shared login/OTP/password), admin, employee, candidate, customer, masterAdmin
├── routes/        adminRoutes, employeeRoutes, candidateRoutes, customerRoutes, masterAdminRoutes, sessionRoutes
├── middlewares/   auth (validateAdmin, validateEmployee, validateAdminView, …), rate limits, errors
├── utils/         sendEmail, email templates, security helpers, payment gateway, audit, seed
└── tests/         api.test.js
```

## API

All routes are under `/api`. The routes marked *spec* follow the paths in the original documentation.

### Admin: `/api/admin` (spec)

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/fetchadmin` | admin | List admins |
| GET | `/stats/summary` | admin | Dashboard analytics |
| POST | `/login` · `/logout` | public | Login with email or admin ID; logout |
| POST | `/register` | master | Create an admin (sequential `ADM####` ID) |
| POST | `/checkPass/:id` | self | Check password, email a 6-digit OTP (5 min) |
| POST | `/otp/:id` | self | Verify OTP (`{ OTP }`) |
| PUT | `/updateEmail/:id` | self | Change email (needs a verified OTP) |
| POST | `/checkpass-pass/:id` | self | Check current password |
| PUT | `/passupdate/:id` | self | Change password (`{ currentPassword, newPassword }`) |
| GET | `/:id` | self or master | Get admin |
| DELETE | `/:id` | master | Delete admin |

### Employee: `/api/employee` (spec)

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/fetchemployees?page&limit&sortField&sortOrder&q` | admin | Paginated, sortable list |
| GET | `/employee/total-customers/:id` | self or admin | Recount and return customer totals |
| GET | `/adminview/:id` | admin | Employee details |
| POST | `/login` · `/logout` | public | Login with email or referral ID |
| POST | `/checkPass/:id` · `/otp/:id`, PUT `/updateEmail/:id` | self | Email change with OTP |
| POST | `/cpass/:id`, PUT `/updateUser/:id` | self | Password change |
| GET | `/:id` | self or admin | Get employee |
| DELETE | `/:id` | admin | Delete employee |

### Candidate: `/api/candidate` (spec)

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/` | public | Apply |
| GET | `/admin-candidate/:adminId?status&q` | admin | All candidates + counts by status |
| POST | `/pending` · `/shortlisted` · `/discarded` | admin | List by status |
| POST | `/shortlist/:adminId` · `/discard/:adminId` · `/pending/:adminId` · `/invited/:adminId` | admin | Change status (`{ candidateId }`) |
| POST | `/employee/:adminId` | admin | Hire: create employee, email credentials |
| POST | `/sendemail` | admin | Email resume links to all shortlisted candidates |
| POST | `/sendemail/:candidateId` | admin | Email one candidate |
| GET / POST | `/submission/:emailHash` | public | Resume submission (`{ email, resumeLink }`) |
| GET | `/:id` | admin | Candidate profile |

### Customer: `/api/customer`

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/plans` | public | Plans and prices |
| POST | `/register` | public | Sign up with `referralId` and `plan` |
| POST | `/payment/initiate/:customerId` | public | Create a payment order |
| POST | `/payment/confirm/:customerId` | public | Complete payment (`{ orderId }`), email receipt |
| GET | `/all?page&q&paymentStatus&referralId` | admin | All customers |
| PUT | `/payment/status/:customerId` | admin | Record an offline payment, failure or refund |
| GET | `/detail/:customerId` · PUT `/:customerId` | admin or referring employee | View / edit a customer |
| DELETE | `/:customerId` | admin | Delete a customer |
| GET | `/:employeeId` | self or admin | Customers referred by an employee (spec) |

### Master admin: `/api/master`

`GET /admins`, `POST /admins`, `DELETE /admins/:id`, `GET /overview`, `GET /audit-logs?page&action`. All require the master admin.

### Session: `/api/session`

`GET /me` returns the logged-in user, or `{ user: null }` if nobody is logged in. `POST /logout`.

### Socket.IO events

`adminUpdateResponse` and `employeeUpdateResponse` fire after an email change. `candidateUpdate`, `customerUpdate` and `employeeDeleted` are sent to the admin room, and `customerUpdate` also goes to the referring employee.

## Where this build differs from the spec

The spec was followed wherever it was consistent. These changes fix security holes or contradictions in it:

- **Every non-public route needs a valid session.** The spec left most routes unprotected, including delete, password update and email update. Account-change routes are restricted to the account owner. The `:id` on candidate status routes must be the logged-in admin, so an admin can't act as someone else.
- **Admin registration is master-only**, so the admin panel can't be taken over through a public `/register`. The first master admin is created by `npm run seed`.
- **Email changes require a verified OTP.** In the spec, `/updateEmail` could be called directly. OTPs are hashed, single-use, expire after 5 minutes, and lock after 5 wrong attempts.
- **Password updates re-check the current password** instead of trusting that `/checkpass-pass` was called first.
- **Status codes:** duplicates return `409` (the spec used `401`), "new email is the same" returns `400` (spec: `404`), and "employee not found" returns `404`. As the spec itself suggested for customers, "no customers" returns `200` with an empty list.
- **The resume link hash is an HMAC**, so a link can't be forged from a known email address.
- **Prices are set on the server**, so a customer can't choose their own amount.
- **Payments use a mock gateway** (`server/utils/paymentGateway.js`) so checkout works without a merchant account. Swap in Razorpay or Stripe there, with signature or webhook verification, before taking real money.
- The spec doc was cut off partway through the Customer Routes section. The rest of the customer, payment and master-admin endpoints were designed to match the style of the documented ones.

## Production notes

- Set `NODE_ENV=production`, a long random `JWT_SECRET`, and real `EMAIL` credentials. The auth cookie is `Secure` in production unless `COOKIE_SECURE=false`.
- Set `API_URL` for the client to where the API runs, and `NEXT_PUBLIC_SOCKET_URL` to where the browser can reach Socket.IO.
- Login, OTP and public forms are rate-limited per IP.
