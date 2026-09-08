# Étape 41 — Couche métier finale + Go-Live

Document de gel de la séquence. Domaine officiel : **rappelbeauty.com**  
(`www` = marketing · `app` = SaaS institut · `admin` = Super Admin).

Pas d’IA produit complète (étape 43) avant la fin de 41.33.  
Fondation technique 43.1–43.4 : voir `docs/roadmap-43.md`.

---

## Vision

```
                    RAPPEL BEAUTY
                         │
          ┌──────────────┴──────────────┐
          │                             │
    SaaS Institut                  Super Admin
 app.rappelbeauty.com          admin.rappelbeauty.com
```

---

## Déjà terminé

| Sous-étape | Statut | Notes |
|---|---|---|
| 41.1–41.16 | ✅ | CI/CD, staging, sécurité, backups, restore, monitoring (socle ops) |
| 41.17 | ✅ | Acompte hors ligne + anti-no-show (`BookingPolicySettings`, `depositState`) |
| 41.18 | ✅ | Liste d’attente (`WaitingListEntry` + WhatsApp) |
| 41.19 | ✅ | QR réservation (`PublicBookingEvent`, Paramètres → Réservation → QR) |
| 41.20 | ✅ | Relance post-prestation (`POST_VISIT`, ≠ réactivation) |
| 41.21 | ✅ | Cliente 360° (stats/timeline/notes, KPIs PostgreSQL) |
| 41.22 | ✅ | Notes cliente auditées (`CustomerNote` + AuditLog) |
| 41.23 | ✅ | POS produits (`PosSale` → Invoice → Payment → InventoryMovement SALE) |
| 41.24 | ✅ | Planning avancé (fermetures, OT, remplacements, assert serveur, vue ressources) |
| Support SaaS | ✅ | `SupportTicket` / `SupportMessage`, UI app + admin, notifs `SUPPORT_MESSAGE` |
| Dashboard / Agenda / Settings users | ✅ | Dynamiques |
| Super Admin | ✅ | Dynamique |
| Abonnements + feature guards | ✅ | |
| Réservation publique | ✅ | `/book/[slug]` |
| Analytics / Reports | ✅ | |
| Marketing / Réactivation / Avis | ✅ | |

---

## Séquence à livrer (ordre figé)

```
41.18 Liste d'attente
  ↓
41.19 QR réservation
  ↓
41.20 Relance post-prestation
  ↓
41.21–22 Cliente 360° + Notes
  ↓
41.23 POS produits
  ↓
41.24 Planning avancé
  ↓
41.25 Objectifs institut
  ↓
41.26–27 Support consolidation + notifs scopes
  ↓
41.28 Multi-sites
  ↓
41.29 Espace cliente Web
  ↓
41.30 QA complète
  ↓
41.31 Performance
  ↓
41.32 Sécurité finale
  ↓
41.33 GO LIVE
  ↓
43 — IA
```

---

## 41.18 — Liste d’attente

**Statut : livré** (migration `20260906220000_waiting_list`)

**Objectif** : prévenir une cliente lorsqu’un créneau se libère (pas de réservation auto).

**DB** : `WaitingListEntry`  
`organizationId`, `customerId`, `serviceId`, `staffId?`, `preferredDate`, `preferredTimeFrom`, `preferredTimeTo`, `status`, `createdAt`, `notifiedAt`, `expiresAt`

**Statuts** : `WAITING` | `NOTIFIED` | `BOOKED` | `EXPIRED` | `CANCELLED`

**Flux** : créneau plein → entrée WAITING → RDV `CANCELLED` → match → `WhatsAppTask` type `WAITING_LIST` → `/whatsapp` → wa.me

**UI** : `/waiting-list/` (sidebar Croissance)

**Règles** : isolation tenant ; pas de booking auto ; institut garde le contrôle.

**Tests** : `tests/stabilization/waiting-list.test.ts`

---

## 41.19 — QR Code réservation

**Statut : livré** (migration `20260906230000_booking_qr_tracking`)

**Objectif** : accès marketing au booking existant (`/book/[slug]`).

**Fonctions** :
- QR institut / service / employée (`?source=qr&service=&staff=`)
- PNG/SVG générés à la demande (pas d’image en DB)
- UI Paramètres → Réservation → QR (télécharger, copier, partager)
- Préremplissage booking ; prix/durée toujours serveur
- Tracking réel : `PublicBookingEvent` (VIEW / BOOKED) + `Appointment.attributionSource`

**Sécurité** : slug actif uniquement ; service/staff vérifiés côté serveur ; isolation tenant.

**Tests** : `tests/stabilization/booking-qr.test.ts`

---

## 41.20 — Relance post-prestation

**Statut : livré** (migration `20260906240000_post_visit`)

**≠ Réactivation** (inactivité 30/45/60/90 j).

**DB** : `Service.recommendedReturnDays`, `PostVisitSettings`, WhatsApp type `POST_VISIT`

**Flux** : `COMPLETED` → délai (service → institut → 30) → éligible → `WhatsAppTask` clé `postvisit:{appointmentId}` → `/whatsapp` → wa.me → SENT → booking `?source=post_visit`

**UI** : `/post-visit/` (sidebar Croissance) + Paramètres → Communication

**Analytics** : éligibles / préparées / envoyées / réservations & COMPLETED après (attribution réelle)

**Tests** : `tests/stabilization/post-visit.test.ts`

---

## 41.21 — Fiche cliente 360°

**Statut : livré** (APIs stats / timeline / notes)

**Fiche** : `/customers/[id]/` — profil, KPIs serveur, timeline unifiée, historique, fidélité, forfaits, paiements, notes.

**APIs** :
- `GET /api/customers/[id]/stats`
- `GET /api/customers/[id]/timeline`
- `GET|POST /api/customers/[id]/notes`
- `PATCH|DELETE /api/customers/[id]/notes/[noteId]`

**KPIs** : LTV = paiements nets COMPLETED ; visites ; panier moyen ; prochain RDV ; no-shows ; annulations ; points ; forfaits ; cartes cadeaux.

**Sécurité** : session → RBAC → `organizationId` → Customer ; soft-delete invisible.

**Tests** : `tests/stabilization/customer-360.test.ts`

---

## 41.22 — Notes cliente

**Statut : livré** (intégré à 41.21 — migration `20260906250000_customer_notes_360`)

**DB** : `CustomerNote` (`content`, `authorId`, soft-delete `deletedAt`).

**Sécurité** : internes uniquement ; jamais publiques ; `AuditLog` CREATE/UPDATE/DELETE ; isolation tenant.

---

## 41.23 — POS produits ✅

Panier produit → `Invoice` → `Payment` COMPLETED → `InventoryMovement` type `SALE` (ledger, jamais `stock--` direct).

**Livré** : `/pos/`, APIs `/api/pos/*`, transaction PostgreSQL, RBAC caisse + plan `cashRegister`+`inventory`, analytics stock (CA produits / marge / top), audits `POS_*`, refund + RETURN stock.

---

## 41.24 — Planning avancé ✅

Horaires, pauses, congés, exceptions (fermeture), remplacements, OT. Même source de vérité pour booking public. Interdit RDV hors dispo (assert serveur + EXCLUDE PG).

**Livré** : `OrganizationClosure` / `StaffOvertime` / `StaffReplacement`, `assertAppointmentBookable` sur POST/PATCH + `/book/`, DnD → PATCH serveur, vue colonnes employées|ressources, overlays pauses/congés, `/planning/`, audit + notif `APPOINTMENT_RESCHEDULED`.

---

## 41.25 — Objectifs institut

Objectifs CA / RDV / nouveaux clients / réactivation / panier / produits / avis. Réalisé = agrégats PostgreSQL.

---

## 41.26 — Support SaaS (consolidation)

Existant à enrichir : FAQ in-app, filtres admin (ouverts / urgents), pièces jointes optionnelles plus tard.

---

## 41.27 — Notifications SaaS (scopes)

Séparer strictement :

- **Institut** : RDV, paiement, stock, marketing, support
- **Super Admin** : nouvel institut, abo, support, suspension, erreur système

---

## 41.28 — Multi-sites

`OrganizationGroup` + switch institut. Isolation tenant obligatoire.

---

## 41.29 — Espace cliente Web

`app.rappelbeauty.com/client` — RDV, infos, fidélité, forfaits, réserver. Auth téléphone + OTP (pas d’app native = pas d’étape 42).

---

## 41.30 — QA complète

Matrice rôles OWNER/MANAGER/STAFF/CASHIER/ACCOUNTANT/SUPER_ADMIN + Org A ≠ Org B + plans.

---

## 41.31 — Performance

API courantes &lt; 500 ms ; pagination ; indexes ; Redis utile ; zéro mock / chiffre statique.

---

## 41.32 — Sécurité finale

Checklist auth, RBAC, feature guards, tenant (`organizationId` = session uniquement), rate limit, FK/EXCLUDE, HTTPS, Cloudflare, backups/restore.

---

## 41.33 — GO LIVE

```
GitHub → CI → Staging → E2E → Backup → Rollback test → Production → Health → Monitoring
```

Domaines : `rappelbeauty.com`, `www`, `app`, `admin`.

---

## Règles transverses (toutes sous-étapes)

1. `organizationId` uniquement depuis la session (jamais le body client).
2. Pas de paiement en ligne PSP (Stripe/CMI) tant que non décidé autrement.
3. WhatsApp = préparation `WhatsAppTask` + wa.me (pas d’API Meta obligatoire en V1).
4. Stock = ledger `InventoryMovement`.
5. Une sous-étape = schéma + API + UI + règles + sécurité + tests avant la suivante.

---

## Prochaine livraison

**41.19 — QR Code réservation**
