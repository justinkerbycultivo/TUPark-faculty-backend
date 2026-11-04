# TUPark — Campus Parking Management System
TUP–Cavite Campus · Mobile (Expo/React Native) + Backend (Node/Express/MongoDB)

TUPark now covers the full student/faculty/guard/admin parking lifecycle: QR-based
entry/exit with automatic space assignment, a visual parking map, in-app campus
navigation to the assigned slot, 8 supported vehicle types, visitor tickets,
violation reporting, announcements, and faculty/admin-only reservations — all on
a TUP-red design system with light/dark mode.

---

## 1. Architecture summary

- **backend/** — Express API + MongoDB/Mongoose. Header-based auth (`x-user-id`)
  with server-side `requireRole()` enforcement — **not** JWT, acceptable for a
  school project, clearly documented in `backend/middleware/auth.js`.
- **mobile/** — Expo React Native app. Role-based bottom-tab navigation
  (Student / Faculty / Guard / Admin), each tab holding its own stack so back
  behavior stays correct and screens aren't duplicated in the tree.
- Capacity model: every `ParkingArea` has a configurable capacity in
  **motorcycle-equivalent slots**; individual `ParkingSpace` documents
  (e.g. `A-1`…`A-20`) are generated per area and topped up (never shrunk) when
  capacity increases.
- Allocation (`backend/utils/capacity.js`) claims spaces with atomic
  `findOneAndUpdate({status:'available'}, ...)` calls, not read-then-write, so
  two simultaneous QR scans can't be assigned the same space.

## 2. Files changed / created in this pass

**Backend** (rebuilt onto the original bare-bones draft — see §8 "What this
replaced"):
`models/{User,ParkingArea,ParkingSpace,ParkingTransaction,VisitorTicket,
ViolationReport,Announcement,Reservation,CampusNode,CampusEdge}.js`,
`middleware/auth.js`,
`utils/{capacity,captcha,ticketNumber,vehicleTypes,pathfinding}.js`,
`routes/{auth,areas,guard,admin,transactions,violations,announcements,
reservations,navigation}.js`, `server.js`, `seed.js`, `.env.example`.

**Mobile**: `App.js`, `src/theme.js`, `src/context/{AuthContext,ThemeContext}.js`,
`src/api/api.js`, `src/navigation/AppNavigator.js`,
`src/components/{ScreenContainer,ParkingSpaceGrid,VehicleTypePicker,
CampusSchematicMap}.js`, `src/components/ui/{Button,Card,Input,StatusBadge,
SectionHeading,EmptyState,LoadingState,ConfirmDialog}.js`,
`src/utils/{validators,format,vehicleTypes}.js`,
`src/screens/shared/{LoginScreen,RegisterScreen,ProfileScreen,
AnnouncementsScreen,NavigationScreen}.js`,
`src/screens/student/{DashboardScreen,ParkingMapScreen,MyQRCodeScreen,
MyParkingHistoryScreen,ReportViolationScreen}.js`,
`src/screens/faculty/{FacultyDashboardScreen,ReservationsScreen}.js`,
`src/screens/guard/{GuardDashboardScreen,ScanQRScreen,VisitorsScreen}.js`,
`src/screens/admin/{AdminDashboardScreen,ParkingAreasScreen,
AdminVehiclesScreen,AdminHistoryScreen,AdminMoreScreen,AdminStudentsScreen,
AdminVisitorsScreen,AdminPhotosScreen,AdminViolationsScreen,
AdminAnnouncementsScreen,AdminReservationsScreen}.js`,
`app.json` (TUP-red splash/icon, Android package id), `eas.json` (new).

## 3. Navigation structure

Bottom tabs switch entirely on `user.role` (`src/navigation/AppNavigator.js`):

| Role | Tabs |
|---|---|
| Student | Home · Parking · Activity · Profile |
| Faculty | Home · Parking · Reservations · Profile |
| Guard | Dashboard · Scan QR · Visitors · Profile |
| Admin | Dashboard · Parking Areas · Vehicles · History · More (Students/Visitors/Photos/Violations/Announcements/Reservations/Profile) |

Each tab is its own native-stack so pushing into "Navigate to My Slot" or
"My QR Code" preserves correct Android back-button behavior without
duplicating screens across tabs. Logged-out users see an auth stack
(Login/Register); role is never trusted from the client — the backend assigns
`role` at account creation and only an admin can change it.

## 4. Vehicle types & parking eligibility

`backend/utils/vehicleTypes.js` (mirrored in `mobile/src/utils/vehicleTypes.js`
for the picker UI) defines 8 types: **motorcycle, car, tricycle, e-bike,
bicycle, electric motorcycle, electric scooter, other** (with a required
free-text `vehicleTypeOther` field). Each has a configured
motorcycle-equivalent `slotsFor` value (car/tricycle/other = 2 adjacent slots,
everything else = 1) and an `eligibleAreaTypes` flag (`'any'` by default, so
the system stays usable without every area being manually tagged — a real
dedicated-bike-rack rule is left as a documented TODO rather than invented).
Existing car/motorcycle accounts and historical transactions are untouched;
no one has to re-register.

## 5. Campus navigation ("Navigate to My Parking Slot")

This is an **in-app schematic map**, not GPS or Google Maps — per the spec,
that's the correct v1 approach for a private campus lot:

- `CampusNode` (entrances / intersections / area entrances, each with x/y for
  a simple schematic layout) and `CampusEdge` (walkable paths with a distance
  weight and instruction text) model the campus as a graph.
- `backend/utils/pathfinding.js` runs Dijkstra from a chosen entrance to the
  `ParkingArea`'s linked entrance node.
- `GET /api/navigation/route?from=<nodeKey>&areaId=<id>` is **public** (no
  login required) so a visitor can get directions from a guard-issued ticket
  without ever creating an account.
- If an area has no configured node or no path exists, the API returns a
  explicit `{error: "No route data configured for this area yet."}` — the
  app shows that message instead of a fabricated route.
- `NavigationScreen` resolves the destination from the user's **current
  active transaction only**; once that transaction ends, the screen no
  longer offers it as "your assignment."
- Seed data wires a "Main Gate" entrance to each seeded area with
  approximate schematic coordinates — `seed.js` comments explicitly flag
  these as illustrative, not surveyed GPS.

## 6. Database / API changes

- New models: `ParkingSpace`, `ParkingTransaction`, `VisitorTicket`,
  `ViolationReport`, `Announcement`, `CampusNode`, `CampusEdge`; `Reservation`
  redefined as faculty/admin-only (space-level, not the old spot-booking one).
- `User` gained `surname/givenName/middleName`, `role`, `vehicle.vehicleType`
  (8-value enum) + `vehicleTypeOther`, `qrToken`, `failedLoginAttempts`/
  `lockUntil`, `agreedToTerms`. All new fields are optional-safe for any
  pre-existing document (there are none outside seed data in this rebuild).
- New routes: `/api/guard/*`, `/api/admin/*`, `/api/transactions/*`,
  `/api/violations/*`, `/api/announcements/*`, `/api/reservations/*`
  (hard-gated `requireRole('faculty','admin')` at the top of the router —
  a student calling it directly gets `403`, not just a hidden button),
  `/api/navigation/*`.
- No destructive migrations; this is a from-scratch seed on a fresh dev DB.

## 7. Tests actually performed (and what wasn't)

Performed in this sandbox (no MongoDB instance available here, see below):
- `node -c` / `node --check` syntax validation on **every** backend `.js` file — passed.
- `require()`-time load check on every backend model/route/util/middleware
  file (catches undefined imports, not just syntax) — all loaded cleanly.
- Static cross-reference checks: every screen imported by `AppNavigator.js`
  resolves to a real file; every API function imported by any screen is
  actually exported from `api/api.js`; brace/paren balance across every
  mobile `.js` file.
- Confirmed all new mobile dependencies (`@react-navigation/bottom-tabs`,
  `@expo/vector-icons`, `expo-camera`, `expo-image-picker`,
  `react-native-qrcode-svg`, `react-native-svg`) are present in
  `mobile/node_modules`.

**Not performed** (this sandbox has no MongoDB, no Android/iOS device, and no
Expo Go runtime): end-to-end login/registration, an actual QR scan, a live
build via `npx expo start`, or an EAS build. **You need to run these
yourself** on your machine per §9–12 below before trusting the full flow —
treat everything above as "the code is structurally sound," not "it was
exercised against a real database."

## 8. What this replaced

The zip you most recently uploaded was the project's very first draft
(single `fullName` field, spot-booking reservations, no roles/QR/admin). This
build reconstructs the advanced architecture designed in earlier sessions
(roles, QR entry/exit, visitor tickets, admin dashboard, CAPTCHA-on-register,
Terms modal, dark/light theme) and layers the full redesign spec on top of
*that*. If you have a newer export than both of these, send it and I'll
diff against it instead.

## 9. Run the backend locally

```bash
cd backend
npm install
cp .env.example .env        # if .env doesn't already exist — don't overwrite a real one
# edit .env: set MONGODB_URI to your Atlas or local connection string
npm run seed                # resets collections and creates demo accounts (see below)
npm run dev
```
Seeded accounts (all passwords as shown): `admin@tup.edu.ph` / `admin123`,
`guard@tup.edu.ph` / `guard123`, `faculty@tup.edu.ph` / `faculty123`, 4 demo
students / `student123`.

## 10. Run the mobile app locally (Expo Go)

```bash
cd mobile
npm install
```
Edit `mobile/src/config.js` → set `API_BASE_URL` to your computer's LAN IP
(not `localhost` — your phone can't reach that), e.g. `http://192.168.1.23:5000`.
```bash
npx expo start
```
Scan the QR code with Expo Go (Android) or the Camera app (iOS).

## 11. Deploy the backend safely (Render)

1. Push `backend/` to your Git repo (confirm `.env` is in `.gitignore` —
   never commit it).
2. In the Render dashboard, create a **Web Service** from that repo/subdir,
   build command `npm install`, start command `npm start`.
3. Add `MONGODB_URI` and `PORT` as Render **environment variables** (not in
   code) — use your production Atlas string, not the dev one.
4. After deploy, update `mobile/src/config.js`'s `API_BASE_URL` to the
   Render URL (`https://your-service.onrender.com`) **only in a build meant
   for real users** — keep the LAN-IP value for local Expo Go testing, per
   the "don't hardcode localhost into production" / "don't break local dev"
   constraints.
5. Run `npm run seed` once against the production DB only if you intend to
   wipe it — it resets all collections.

## 12. Build an Android APK (EAS)

```bash
cd mobile
npm install -g eas-cli      # if not already installed
eas login
eas build:configure         # links this project to your Expo account; eas.json already exists
eas build --platform android --profile preview   # produces an installable .apk
```
Use `--profile production` for an `.aab` (Play Store) once `app.json`'s
`android.package` (`edu.tupcavite.tupark`) and versioning are finalized for
release. Before building, set `API_BASE_URL` in `config.js` to your deployed
Render URL — an APK built pointing at a LAN IP will only work on your home
network.

## 13. Known limitations

- Auth is header-based (`x-user-id`), not cryptographically secure — fine for
  a classroom demo, not for a real deployment.
- Campus navigation uses a schematic (illustrative) layout, not a surveyed
  map or GPS — accurate only to the extent you configure real
  `CampusNode`/`CampusEdge` data for your actual campus.
- Parking photos are stored as base64 in MongoDB — fine at small scale, would
  need object storage (S3-style) for production volume.
- No push notifications; announcements are pull-based (students see them on
  next app open).
- Not tested end-to-end against a live database or a physical device in this
  environment — see §7.

---

## 14. Update: password reset, change password, crash hardening

**Forgot Password** (login screen → "Forgot Password?"): the user enters their email, the server emails a 6-digit code (stored only as a SHA-256 hash, valid 15 minutes, single use, max 5 wrong tries), then the user sets a new password. The response never reveals whether an email is registered. Requests are rate limited (5 code requests and 10 reset/change attempts per 15 minutes per IP).

**Change Password** (Profile → "Change Password"): requires the current password.

**Email setup (required for Forgot Password to deliver email):** set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` in `backend/.env` (and in Render's environment variables). For Gmail use an App Password. Without these, no email is sent and the app says so. For local testing only, `RESET_DEV_LOG=true` prints the code in the server console (ignored when `NODE_ENV=production`).

**Crash fix (Parking/Navigation):** the route map set `strokeDasharray="0"` on its lines, which can throw on Android, and nothing caught render errors so the app closed. Removed the dash setting, the map now skips nodes with invalid coordinates, API responses are checked to be arrays before use, and both screens plus the whole app sit inside an error boundary that shows a message and a "Try again" button. This is the most likely cause found by reading the code; it has not been confirmed on a physical phone.

**Dependency fix:** `@expo/vector-icons` was pulling a second `expo-font` (v57) next to Expo 54's (v14), which Expo Doctor flags as a native-build risk. Pinned `expo-font ~14.0.12` and `@expo/vector-icons ~15.0.3`; one copy remains.

Do not run `npm run seed` against your live database; it wipes all collections.
