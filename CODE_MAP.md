# Guincoin Code Map — Complete Dependency Reference

> **Last Updated**: 2026-02-18
> **Purpose**: Function-level dependency map so agents/developers can safely modify code without reading the entire codebase.
> **How to Use**: Search for the function, model, or file you plan to change. Check its "Depended On By" list before modifying.

---

## TABLE OF CONTENTS

1. [Safe Change Protocol](#1-safe-change-protocol)
2. [Breakage Map — What Breaks When You Change X](#2-breakage-map)
3. [Database Schema — Models, Enums, Relations](#3-database-schema)
4. [Backend Services — Function-Level Dependencies](#4-backend-services)
5. [Backend Routes — Endpoint → Service Chain](#5-backend-routes)
6. [Backend Middleware — Request Pipeline](#6-backend-middleware)
7. [Backend Configuration — Environment & Setup](#7-backend-configuration)
8. [Frontend API Client — Every Function & Endpoint](#8-frontend-api-client)
9. [Frontend Pages — Component → API Dependencies](#9-frontend-pages)
10. [Frontend Contexts & Components](#10-frontend-contexts--components)
11. [Common Tasks Guide](#11-common-tasks-guide)

---

## 1. SAFE CHANGE PROTOCOL

For **every** code change:

1. **Trace**: Find all references to the affected code (use this document)
2. **List**: Document breakage points
3. **Preserve**: Comment out originals with `// [ORIGINAL - YYYY-MM-DD]`
4. **Change**: Implement the modification
5. **Verify**: Confirm all dependencies still work

---

## 2. BREAKAGE MAP

### If you change a Prisma model...

| Model Changed | Services Affected | Routes Affected | Frontend Affected |
|---------------|-------------------|-----------------|-------------------|
| **Employee** | accountService, allotmentService, transactionService, emailService, pendingTransferService, bulkImportService, googleChatService, auditService | auth, admin/users, admin/wellness, admin/purchases, manager, transfers | All pages (user object), AdminPortal (employee management) |
| **Account** | accountService, transactionService, allotmentService | accounts, manager, transfers, store, wellness | Dashboard (balance), Store (purchase), Transfers (balance check) |
| **LedgerTransaction** | transactionService, allotmentService, pendingTransferService, bulkImportService, googleChatService | accounts, manager, transfers, wellness, store, admin/wellness | Dashboard (transactions), Transfers (history), ManagerPortal (history) |
| **ManagerAllotment** | allotmentService | manager, admin/users | ManagerPortal (allotment display) |
| **PeerTransferLimit** | (transfers route directly) | transfers | Transfers (limits display) |
| **PendingTransfer** | pendingTransferService | transfers | Transfers (pending list) |
| **WellnessTask** | campaignService | wellness, admin/wellness, admin/campaigns | Wellness (task list), AdminPortal (task management) |
| **WellnessSubmission** | transactionService, emailService | wellness, admin/wellness | Wellness (submissions), AdminPortal (pending approvals) |
| **StoreProduct** | storeService, amazonImportService | store, admin/store | Store (product listing) |
| **StorePurchaseOrder** | (store route directly) | store, admin/purchases | Store (purchase history), AdminPortal (fulfillment) |
| **WishlistItem** | (store route directly) | store | Store (wishlist tab) |
| **Goal** | (store route directly) | store | Dashboard (goals), Store (goal creation) |
| **Campaign** | campaignService, campaignDistributionService, aiImageService, studioService | admin/campaigns, admin/studio | AdminPortal (CampaignStudio) |
| **CampaignTask** | campaignService | admin/campaigns | AdminPortal (campaign task management) |
| **Banner** | bannerService | admin/banners, files (banner serving) | AdminPortal (BackgroundsTab), Layout (dynamic background) |
| **EmailTemplate** | emailTemplateService | admin/emailTemplates | AdminPortal (email templates) |
| **SystemSettings** | studioService | admin/studio, admin/settings | ThemeContext (campaign theming) |
| **SmtpSettings** | email config (email.ts) | admin/settings | AdminPortal (SMTP settings) |
| **Game** | gameService, games.ts | games, admin/games | (Gaming pages) |
| **GameConfig** | games.ts (gameEngine) | admin/games | (Gaming config) |
| **Jackpot** | games.ts (jackpotService) | admin/games | (Jackpot display) |
| **ChatCommandAudit** | googleChatService | admin/googleChat | AdminPortal (GoogleChatTab) |
| **BulkImportJob** | bulkImportService | (route removed) | (panel removed — legacy data only) |
| **PendingImportBalance** | bulkImportService | (route removed) | (panel removed — legacy data only) |
| **AuditLog** | auditService | (no direct route) | (no direct display) |
| **AwardPreset** | googleChatService (wizard flow) | admin/awardPresets, manager (award-presets) | AdminPortal (AwardPresetsPanel), AwardForm (preset chips) |

### If you change a TransactionType enum value...

Every `TransactionType` is used in:
- `transactionService.ts` — `postTransaction()` balance logic (determines credit vs debit)
- `transactionService.ts` — `getTransactionHistory()` filtering
- `allotmentService.ts` — `calculateUsedAmount()` filters on `manager_award`
- `transfers.ts` route — filters on `peer_transfer_sent`
- `googleChatService.ts` — creates `manager_award`, `peer_transfer_sent/received`
- `bulkImportService.ts` — creates `bulk_import` transactions
- Frontend `TransactionList.tsx` — `getTransactionTypeLabel()` maps types to display labels

### If you change a service function signature...

| Function | Called By |
|----------|-----------|
| **accountService.getOrCreateAccount()** | `config/auth.ts` (on login), `admin/users.ts` route, `admin/wellness.ts` route |
| **accountService.getOrCreateAccountForEmployee()** | `admin/wellness.ts` (approve submission) |
| **transactionService.createPendingTransaction()** | `wellness.ts` route, `pendingTransferService`, `bulkImportService` |
| **transactionService.postTransaction()** | `allotmentService.awardCoins()`, `pendingTransferService.claimPendingTransfers()`, `bulkImportService.createImportJob()`, `bulkImportService.claimPendingImportBalances()`, `admin/wellness.ts` (approve), `store.ts` (purchase), `googleChatService.executeTransfer()` |
| **transactionService.rejectTransaction()** | `pendingTransferService.cancelPendingTransfer()`, `admin/wellness.ts` (reject) |
| **transactionService.getAccountBalance()** | `accounts.ts` route, `store.ts` route (purchase), `googleChatService.executeBalance()`, `googleChatService.executeTransfer()`, `store.ts` (goal achievements) |
| **transactionService.getTransactionHistory()** | `accounts.ts` route, `transfers.ts` route |
| **transactionService.getPendingTransactions()** | `accounts.ts` route |
| **allotmentService.getCurrentAllotment()** | `manager.ts` route, `admin/users.ts` route, `googleChatService.executeAward()` |
| **allotmentService.awardCoins()** | `manager.ts` route (award), `googleChatService.executeAward()` |
| **allotmentService.canAward()** | `googleChatService.executeAward()` |
| **allotmentService.depositAllotment()** | `admin/users.ts` route |
| **allotmentService.setRecurringBudget()** | `admin/users.ts` route |
| **allotmentService.getAwardHistory()** | `manager.ts` route, `admin/users.ts` route |
| **allotmentService.getDepositHistory()** | `admin/users.ts` route |
| **emailService.sendManagerAwardNotification()** | `manager.ts` route |
| **emailService.sendManagerAwardSentNotification()** | `manager.ts` route |
| **emailService.sendPeerTransferNotification()** | `transfers.ts` route, `pendingTransferService.claimPendingTransfers()` |
| **emailService.sendPeerTransferSentNotification()** | `transfers.ts` route |
| **emailService.sendPeerTransferRecipientNotFoundNotification()** | `pendingTransferService.createPendingTransfer()` |
| **emailService.sendWellnessApprovalNotification()** | `admin/wellness.ts` route |
| **emailService.sendWellnessRejectionNotification()** | `admin/wellness.ts` route |
| **emailService.sendPurchaseFulfilledNotification()** | `admin/purchases.ts` route |
| **emailService.sendRoleAssignedNotification()** | `admin/users.ts` route |
| **emailService.sendAllotmentDepositNotification()** | `admin/users.ts` route |
| **emailService.sendBulkImportInvitation()** | `bulkImportService.sendInvitationEmail()` |
| **pendingTransferService.claimPendingTransfers()** | `config/auth.ts` (on login) |
| **pendingTransferService.cancelPendingTransfer()** | `transfers.ts` route |
| **campaignService.getCampaignById()** | `admin/campaigns.ts` route, `aiImageService.generateCampaignImages()`, `aiImageService.regenerateImage()`, `aiImageService.getCampaignAssets()` |
| **campaignService.updateCampaignImages()** | `aiImageService.generateCampaignImages()`, `aiImageService.regenerateImage()` |
| **campaignService.listCampaigns()** | `admin/campaigns.ts` route |
| **campaignService.activateCampaign()** | `admin/campaigns.ts` route, `campaignService.toggleCampaign()` |
| **campaignService.deactivateCampaign()** | `admin/campaigns.ts` route, `campaignService.toggleCampaign()` |
| **campaignDistributionService.sendCampaignEmail()** | `admin/campaigns.ts` route |
| **campaignDistributionService.postToGoogleChat()** | `admin/campaigns.ts` route |
| **googleChatService.handleEvent()** | `googleChat.ts` route (webhook) |
| **studioService.getStudioState()** | `admin/studio.ts` route, `studioService.getCurrentTheme()` |
| **studioService.getCurrentTheme()** | `admin/studio.ts` route |
| **studioService.activateCampaignFull()** | `admin/studio.ts` route |
| **bulkImportService.claimPendingImportBalances()** | `config/auth.ts` (on login) |
| **emailTemplateService.renderTemplate()** | `emailService` (all send methods) |
| **emailTemplateService.listEmailTemplates()** | `admin/emailTemplates.ts` route |
| **emailTemplateService.upsertEmailTemplate()** | `admin/emailTemplates.ts` route |
| **bannerService.listBanners()** | `admin/banners.ts` route (list, deactivate-background) |
| **bannerService.getBannerById()** | `admin/banners.ts` route (get, upload, generate-ai, activate-background) |
| **bannerService.createBanner()** | `admin/banners.ts` route (create, generate-background) |
| **bannerService.updateBanner()** | `admin/banners.ts` route (update, deactivate-background) |
| **bannerService.updateBannerImage()** | `admin/banners.ts` route (upload, generate-ai, generate-background) |
| **bannerService.deleteBanner()** | `admin/banners.ts` route |
| **bannerService.toggleBanner()** | `admin/banners.ts` route (toggle, activate-background) |
| **bannerService.getActiveBackground()** | (available — returns currently active background banner) |
| **aiImageService.generateCampaignImages()** | `admin/campaigns.ts` route |
| **aiImageService.regenerateImage()** | `admin/campaigns.ts` route |
| **aiImageService.generateBannerImage()** | `admin/banners.ts` route |
| **auditService.log()** | All other audit methods (logTransaction, logBalanceAdjustment, etc.) |

### If you change a frontend API function...

| API Function | Used By Pages/Components |
|-------------|--------------------------|
| **getCurrentUser()** | Login, Dashboard, ManagerPortal, Transfers, Wellness, Store, AdminPortal |
| **getBalance()** | Dashboard, Store |
| **getTransactions()** | Dashboard |
| **getManagerAllotment()** | ManagerPortal |
| **awardCoins()** | ManagerPortal (AwardForm) |
| **getAwardHistory()** | ManagerPortal |
| **getTransferLimits()** | Transfers |
| **sendTransfer()** | Transfers (TransferForm) |
| **getTransferHistory()** | Transfers |
| **getPendingTransfers()** | Transfers |
| **cancelTransfer()** | Transfers |
| **getWellnessTasks()** | Wellness |
| **submitWellness()** | Wellness (WellnessTaskModal) |
| **getWellnessSubmissions()** | Wellness |
| **getStoreProducts()** | Store |
| **purchaseProduct()** | Store |
| **getWishlist()** | Store |
| **addToWishlist()** | Store |
| **removeFromWishlist()** | Store |
| **createGoal()** | Store |
| **getGoals()** | Dashboard, Store |
| **checkGoalAchievements()** | Dashboard |
| **logout()** | Layout |
| **getPendingSubmissions()** | AdminPortal |
| **approveSubmission()** | AdminPortal (PendingSubmissionsList) |
| **rejectSubmission()** | AdminPortal (PendingSubmissionsList) |
| **getAllEmployees()** | AdminPortal |
| **createEmployee()** | AdminPortal |
| **updateEmployeeRoles()** | AdminPortal |
| **getSmtpSettings()** | AdminPortal (SettingsTab) |
| **updateSmtpSettings()** | AdminPortal (SettingsTab) |
| **getCurrentTheme()** | ThemeContext |

---

## 3. DATABASE SCHEMA

### Enums

```
TransactionType: manager_award | peer_transfer_sent | peer_transfer_received | wellness_reward |
  adjustment | store_purchase | allotment_deposit | bulk_import | game_bet | game_win |
  game_refund | jackpot_contribution | jackpot_win | daily_bonus | prediction_bet | prediction_win

TransactionStatus: pending | posted | rejected

PeriodType: monthly | quarterly

FrequencyRule: one_time | annual | quarterly

SubmissionStatus: pending | approved | rejected

PendingTransferStatus: pending | claimed | cancelled

StoreProductSource: custom | amazon | amazon_list

PurchaseOrderStatus: pending | fulfilled | cancelled

CampaignStatus: draft | scheduled | active | completed | archived

BannerPosition: sidebar_left | sidebar_right | header | footer | background

GameType: coin_flip | dice_roll | spin_wheel | higher_lower | scratch_card | daily_bonus |
  lucky_numbers | plinko | crash | mines | trivia | prediction | head_to_head | pool_bet |
  fantasy_football | super_bowl_pool | bracket_challenge

GameStatus: pending | active | completed | cancelled | expired

GameTxType: bet | payout | refund | jackpot_in | jackpot_out

JackpotType: rolling | daily | weekly | event

GameAssetType: background | card_back | overlay | frame

ChatProvider: google_chat

ChatCommandStatus: received | authorized | rejected | failed | succeeded

BulkImportStatus: pending | processing | completed | failed

PendingImportBalanceStatus: pending | claimed | expired

AuditAction: transaction_created | transaction_posted | transaction_rejected | balance_adjustment |
  allotment_deposit | purchase_created | purchase_fulfilled | purchase_cancelled | refund_issued |
  role_changed | user_created | user_deactivated | settings_changed | store_product_created |
  store_product_updated | store_product_deleted | wellness_task_created | wellness_task_updated |
  wellness_submission_approved | wellness_submission_rejected | bulk_import_started |
  bulk_import_completed | admin_login | permission_denied | suspicious_activity
```

### Models — Key Fields & Relations

#### Employee
- `id` (UUID), `email` (unique), `name`, `isManager`, `isAdmin`
- → Account (1:1), → ManagerAllotment[] , → LedgerTransaction[] (as source/sender/receiver), → WellnessSubmission[], → PeerTransferLimit[], → PendingTransfer[], → StorePurchaseOrder[], → WishlistItem[], → Goal[], → Game[] (creator), → GameParticipant[], → GameStats (1:1), → DailyBonusSpin[], → JackpotContribution[], → BulkImportJob[] (creator)

#### Account
- `id` (UUID), `employeeId` (unique FK), `balance` Decimal(10,2), `allotmentBalance` Decimal(10,2)
- → Employee (1:1), → LedgerTransaction[]

#### LedgerTransaction
- `id` (UUID), `accountId` (FK), `transactionType`, `amount` Decimal(10,2), `status`, `description`, `sourceEmployeeId`, `targetEmployeeId`, `wellnessSubmissionId` (unique)
- Indexes: accountId, status, createdAt, sourceEmployeeId, targetEmployeeId, (transactionType+createdAt)
- → Account, → Employee (source/sender/receiver), → WellnessSubmission, → StorePurchaseOrder, → ChatCommandAudit[], → PendingImportBalance

#### ManagerAllotment
- `id` (UUID), `managerId` (FK), `periodType`, `amount` Decimal(10,2), `periodStart`, `periodEnd`
- Index: (managerId+periodStart+periodEnd)

#### WellnessTask
- `id` (UUID), `name`, `description`, `instructions`, `coinValue` Decimal(10,2), `frequencyRule`, `requiresApproval`, `formTemplateUrl`, `maxRewardedUsers`, `isActive`, `tags`[]
- → WellnessSubmission[], → CampaignTask[]

#### WellnessSubmission
- `id` (UUID), `employeeId` (FK), `wellnessTaskId` (FK), `documentUrl`, `status`, `rejectionReason`, `reviewedById`, `reviewedAt`
- → Employee, → WellnessTask, → Employee (reviewer), → LedgerTransaction

#### StoreProduct
- `id` (UUID), `name`, `description`, `imageUrls`[], `amazonUrl`, `amazonAsin` (unique), `source`, `priceUsd` Decimal(10,2), `priceGuincoin` Decimal(10,2), `isActive`
- → StorePurchaseOrder[], → WishlistItem[], → Goal[]

#### StorePurchaseOrder
- `id` (UUID), `employeeId` (FK), `productId` (FK), `transactionId` (unique FK), `status`, `fulfilledById`, `shippingAddress`, `trackingNumber`, `notes`
- → Employee, → StoreProduct, → LedgerTransaction, → Employee (fulfiller)

#### Campaign
- `id` (UUID), `name`, `description`, `slug` (unique), `status`, `startDate`, `endDate`, `theme` (JSON), `bannerImageUrl`, `posterImageUrl`, `emailBannerUrl`, `chatImageUrl`, `aiPromptUsed`, `emailSentAt`, `chatPostedAt`, `createdById` (FK)
- → Employee (creator), → CampaignTask[], → Banner[], → GameAsset[]

#### CampaignTask
- `id` (UUID), `campaignId` (FK), `wellnessTaskId` (optional FK), `name`, `description`, `coinValue` Decimal(10,2), `bonusMultiplier` Decimal(3,2), `displayOrder`
- Unique: (campaignId+wellnessTaskId)
- → Campaign, → WellnessTask

#### EmailTemplate
- `id` (UUID), `key` (unique), `name`, `subject`, `html`, `isEnabled`

#### SystemSettings
- `id` ("system"), `themeMode` ("manual"|"campaign"), `manualTheme` (JSON)

#### SmtpSettings
- `id` ("smtp"), `host`, `port`, `secure`, `user`, `pass`, `fromName`, `fromEmail`, `isEnabled`, `lastTestedAt`, `lastTestResult`

#### Banner
- `id` (UUID), `name`, `position`, `campaignId` (optional FK), `imageUrl`, `isAiGenerated`, `width`, `height`, `isActive`, `textOverlay` (JSON), `imagePositionX`, `imagePositionY`, `showOnDashboard/Transfers/Store/Wellness/Manager`, `displayOrder`
- → Campaign

#### Game, GameParticipant, GameTransaction, GameConfig, GameStats, GameAsset, Jackpot, JackpotContribution, DailyBonusSpin
- (Gaming system — see schema.prisma for full details)

#### BulkImportJob
- `id` (UUID), `name`, `status`, `createdById` (FK), `totalRows`, `processedRows`, `successCount`, `errorCount`, `columnMapping` (JSON), `errorLog` (JSON)
- → Employee (creator), → PendingImportBalance[]

#### PendingImportBalance
- `id` (UUID), `importJobId` (FK), `recipientEmail`, `recipientName`, `amount` Decimal(10,2), `status`, `transactionId` (unique FK), `inviteSentAt`, `claimedAt`
- Unique: (importJobId+recipientEmail)
- → BulkImportJob, → LedgerTransaction

#### AwardPreset
- `id` (UUID), `title`, `amount` Decimal(10,2), `displayOrder` Int, `isActive` Bool
- Used by: admin/awardPresets route (CRUD), manager route (list active), googleChatService (wizard flow), AwardForm (preset chips)

#### AuditLog
- `id` (UUID), `action`, `actorId`, `actorEmail`, `targetType`, `targetId`, `description`, `metadata` (JSON), `ipAddress`, `userAgent`

#### ChatCommandAudit
- `id` (UUID), `provider`, `eventType`, `messageId`, `spaceName`, `threadName`, `userEmail`, `commandText`, `commandName`, `status`, `transactionId` (FK), `errorMessage`
- → LedgerTransaction

---

## 4. BACKEND SERVICES

### accountService.ts
**Location**: `backend/src/services/accountService.ts`

| Function | Signature | Calls | Prisma Ops | Depended On By |
|----------|-----------|-------|------------|----------------|
| `getOrCreateAccount(userId)` | `(string) → Promise<Account>` | — | employee.findUnique, account.create | config/auth.ts (login), admin/users.ts route, getOrCreateAccountForEmployee() |
| `getOrCreateAccountForEmployee(employee)` | `({id}) → Promise<Account>` | getOrCreateAccount() | (delegates) | admin/wellness.ts (approve) |

### allotmentService.ts
**Location**: `backend/src/services/allotmentService.ts`

| Function | Signature | Calls | Prisma Ops | Depended On By |
|----------|-----------|-------|------------|----------------|
| `getCurrentAllotment(managerId, periodType?)` | `(string, PeriodType?) → Promise<AllotmentResponse>` | calculateUsedAmount() | managerAllotment.findFirst, .create | manager.ts route, admin/users.ts route, googleChatService.executeAward(), canAward(), setRecurringBudget(), depositAllotment(). **Normalizes `amount` Decimal→Number in spread** (2026-02-10). |
| `calculateUsedAmount(managerId, start, end)` | `(string, Date, Date) → Promise<number>` | — | ledgerTransaction.aggregate | getCurrentAllotment() |
| `canAward(managerId, amount, periodType?)` | `(string, number, PeriodType?) → Promise<boolean>` | getCurrentAllotment() | (delegates) | googleChatService.executeAward() |
| `awardCoins(managerId, email, amount, desc)` | `(string, string, number, string) → Promise<LedgerTransaction>` | transactionService.postTransaction() | employee.findUnique, $transaction, ledgerTransaction.create | manager.ts route, googleChatService.executeAward(). **Now sets `targetEmployeeId`** (2026-02-10). |
| `getAwardHistory(managerId, limit?, offset?)` | `(string, number?, number?) → Promise<{transactions, total}>` | — | ledgerTransaction.findMany, .count | manager.ts route, admin/users.ts route. **Normalizes `amount` Decimal→Number** (2026-02-10). |
| `setRecurringBudget(managerId, amount, period)` | `(string, number, PeriodType) → Promise<ManagerAllotment>` | getCurrentAllotment() | managerAllotment.update | admin/users.ts route |
| `depositAllotment(managerId, amount, desc?)` | `(string, number, string?) → Promise<ManagerAllotment>` | getCurrentAllotment() | managerAllotment.update | admin/users.ts route |
| `getDepositHistory(managerId, limit?)` | `(string, number?) → Promise<{transactions}>` | — | managerAllotment.findMany | admin/users.ts route |
| `resetAllotments(periodType)` | `(PeriodType) → void` | — | — | (stub, not called) |

### transactionService.ts
**Location**: `backend/src/services/transactionService.ts`

| Function | Signature | Calls | Prisma Ops | Depended On By |
|----------|-----------|-------|------------|----------------|
| `createPendingTransaction(accountId, type, amount, desc?, sourceId?, targetId?, wellnessSubId?)` | `(...) → Promise<LedgerTransaction>` | — | ledgerTransaction.create | wellness.ts route, pendingTransferService.createPendingTransfer(), bulkImportService.createImportJob() |
| `postTransaction(transactionId, tx?)` | `(string, TransactionClient?) → Promise<LedgerTransaction>` | — | ledgerTransaction.findUnique, account.update, ledgerTransaction.update | allotmentService.awardCoins(), pendingTransferService.claimPendingTransfers(), bulkImportService (2 functions), admin/wellness.ts (approve), store.ts (purchase), googleChatService.executeTransfer() |
| `rejectTransaction(transactionId, reason?)` | `(string, string?) → Promise<LedgerTransaction>` | — | ledgerTransaction.update | pendingTransferService.cancelPendingTransfer(), admin/wellness.ts (reject) |
| `getAccountBalance(accountId, includePending?)` | `(string, boolean?) → Promise<{posted, pending, total}>` | — | account.findUnique | accounts.ts route, store.ts route, googleChatService.executeBalance(), googleChatService.executeTransfer(), store.ts (goal check) |
| `getTransactionHistory(accountId, options?)` | `(string, {limit?, offset?, status?, transactionType?}?) → Promise<{transactions, total}>` | — | ledgerTransaction.findMany, .count | accounts.ts route, transfers.ts route. **Normalizes `amount` Decimal→Number** (2026-02-10). |
| `getPendingTransactions(accountId)` | `(string) → Promise<LedgerTransaction[]>` | — | ledgerTransaction.findMany | accounts.ts route. **Normalizes `amount` Decimal→Number** (2026-02-10). |

### emailService.ts
**Location**: `backend/src/services/emailService.ts`

| Function | Depended On By |
|----------|----------------|
| `sendWelcomeNotification(email, name)` | (not called currently — placeholder) |
| `sendManagerAwardNotification(recipientEmail, recipientName, managerName, amount, message?)` | manager.ts route |
| `sendManagerAwardSentNotification(managerEmail, managerName, recipientName, amount, message?)` | manager.ts route |
| `sendPeerTransferNotification(recipientEmail, recipientName, senderName, amount, message?)` | transfers.ts route, pendingTransferService.claimPendingTransfers() |
| `sendPeerTransferSentNotification(senderEmail, senderName, recipientName, amount, message?)` | transfers.ts route |
| `sendPeerTransferRecipientNotFoundNotification(recipientEmail, recipientName, senderName, amount, message?)` | pendingTransferService.createPendingTransfer() |
| `sendWellnessApprovalNotification(email, name, taskName, amount)` | admin/wellness.ts route |
| `sendWellnessRejectionNotification(email, name, taskName, reason?)` | admin/wellness.ts route |
| `sendPurchaseFulfilledNotification(email, name, productName, trackingNumber?)` | admin/purchases.ts route |
| `sendRoleAssignedNotification(email, name, role)` | admin/users.ts route |
| `sendAllotmentDepositNotification(managerEmail, managerName, amount)` | admin/users.ts route |
| `sendBulkImportInvitation(recipientEmail, recipientName, amount)` | bulkImportService.sendInvitationEmail() |

All send methods internally call: `emailTemplateService.renderTemplate()` → `sendEmail()` (private)

### pendingTransferService.ts
**Location**: `backend/src/services/pendingTransferService.ts`

| Function | Signature | Calls | Depended On By |
|----------|-----------|-------|----------------|
| `createPendingTransfer(params)` | `({senderEmployeeId, senderAccountId, recipientEmail, amount, message?, recipientNameFallback, senderName}) → Promise<{pendingTransfer, senderTransaction}>` | transactionService.createPendingTransaction(), emailService.sendPeerTransferRecipientNotFoundNotification() | transfers.ts route (when recipient not found) |
| `claimPendingTransfers(recipientEmail)` | `(string) → Promise<PendingTransfer[]>` | transactionService.postTransaction(), emailService.sendPeerTransferNotification() | config/auth.ts (on OAuth login) |
| `cancelPendingTransfer(transferId, senderEmployeeId)` | `(string, string) → Promise<PendingTransfer>` | transactionService.rejectTransaction() | transfers.ts route |

### storeService.ts
**Location**: `backend/src/services/storeService.ts`

| Function | Signature | Depended On By |
|----------|-----------|----------------|
| `usdToGuincoin(usd)` | `(number) → number` (USD * 10) | admin/store.ts route (Amazon import price conversion) |
| `normalizeStoreProduct(product)` | `(StoreProduct) → normalized product` | admin/store.ts route, store.ts route |

### amazonImportService.ts
**Location**: `backend/src/services/amazonImportService.ts`

| Function | Signature | Depended On By |
|----------|-----------|----------------|
| `fetchAmazonProductDetails(url)` | `(string) → Promise<AmazonProductDetails>` | admin/store.ts route (amazon import) |
| `fetchAmazonListAsins(url)` | `(string) → Promise<string[]>` | admin/store.ts route (amazon-list import) |

### campaignService.ts
**Location**: `backend/src/services/campaignService.ts`

| Function | Signature | Depended On By |
|----------|-----------|----------------|
| `createCampaign(data)` | `(CreateCampaignInput) → Promise<Campaign>` | admin/campaigns.ts route |
| `updateCampaign(id, data)` | `(string, UpdateCampaignInput) → Promise<Campaign>` | admin/campaigns.ts route |
| `getCampaignById(id)` | `(string) → Promise<Campaign>` | admin/campaigns.ts route, aiImageService (3 functions), activateCampaign(), updateCampaign() |
| `getActiveCampaign()` | `() → Promise<Campaign \| null>` | admin/campaigns.ts route, studioService.getStudioState() |
| `listCampaigns(filters?)` | `(CampaignFilters?) → Promise<Campaign[]>` | admin/campaigns.ts route |
| `activateCampaign(id)` | `(string) → Promise<Campaign>` | admin/campaigns.ts route, toggleCampaign() |
| `deactivateCampaign(id)` | `(string) → Promise<Campaign>` | admin/campaigns.ts route, toggleCampaign() |
| `toggleCampaign(id)` | `(string) → Promise<Campaign>` | admin/campaigns.ts route |
| `archiveCampaign(id)` | `(string) → Promise<Campaign>` | admin/campaigns.ts route |
| `linkTaskToCampaign(campaignId, input)` | `(string, LinkTaskInput) → Promise<CampaignTask>` | admin/campaigns.ts route |
| `createExclusiveTask(campaignId, input)` | `(string, CreateExclusiveTaskInput) → Promise<CampaignTask>` | admin/campaigns.ts route |
| `updateCampaignTask(taskId, data)` | `(string, data) → Promise<CampaignTask>` | admin/campaigns.ts route |
| `unlinkTask(campaignId, taskId)` | `(string, string) → void` | admin/campaigns.ts route |
| `getCampaignTasks(campaignId)` | `(string) → Promise<CampaignTask[]>` | admin/campaigns.ts route |
| `updateCampaignImages(id, images)` | `(string, images) → Promise<Campaign>` | aiImageService.generateCampaignImages(), aiImageService.regenerateImage() |
| `markEmailSent(id)` | `(string) → Promise<Campaign>` | (not directly called externally — stub) |
| `markChatPosted(id)` | `(string) → Promise<Campaign>` | (not directly called externally — stub) |
| `getThemePresets()` | `() → Record<string, CampaignTheme>` | admin/campaigns.ts route |
| `updateCampaignStatuses()` | `() → void` | admin/campaigns.ts route |

### campaignDistributionService.ts
**Location**: `backend/src/services/campaignDistributionService.ts`
(Mostly stubs)

| Function | Depended On By |
|----------|----------------|
| `sendCampaignEmail(campaignId, recipientType)` | admin/campaigns.ts route |
| `postToGoogleChat(campaignId, spaceId)` | admin/campaigns.ts route |
| `getDistributionStatus(campaignId)` | admin/campaigns.ts route |
| `getDownloadableAssets(campaignId)` | admin/campaigns.ts route |

### googleChatService.ts
**Location**: `backend/src/services/googleChatService.ts`

| Function | Calls | Depended On By |
|----------|-------|----------------|
| `handleEvent(rawEvent)` | normalizeEvent(), getEventType(), handleCardClicked(), createAuditLog(), findEmployeeByEmail(), executeBalance/Award/Transfer(), updateAuditLog(), isDmAvailable(), sendDirectMessage(), buildPublicAwardCard(), buildPrivateBudgetCard(), buildPrivateTransferBalanceCard(), buildAwardAmountPickerCard(), buildTextResponse() | googleChat.ts route (webhook). **Award wizard now sends picker card via DM (not public), returns "Check your DMs" text to space** (2026-02-10). |
| `handleCardClicked(rawEvent)` | createAuditLog(), updateAuditLog(), executeAward(), postMessageToSpace(), buildPublicAwardCard(), buildPrivateBudgetCard(), buildErrorCard() | handleEvent() (CARD_CLICKED delegation). **`award_dm_execute` handler: single-click award from DM, posts public card to space, updates DM with budget. Legacy `award_select_amount`/`award_confirm` return "expired" message** (2026-02-10). |
| `postMessageToSpace(spaceName, message)` | googleapis (Google Chat API) | handleCardClicked() (posts public award card to original space after DM wizard completes). **Added 2026-02-10**. |
| `sendDirectMessage(userEmail, message)` | googleapis (Google Chat API) | handleEvent() (fire-and-forget for award picker DM + transfer balance DM) |
| `isDmAvailable()` | env.GOOGLE_CHAT_SERVICE_ACCOUNT_KEY | handleEvent() |
| `executeBalance(userEmail)` | findEmployeeByEmail(), transactionService.getAccountBalance() | handleEvent() |
| `executeAward(managerEmail, targetEmail, amount, desc)` | findEmployeeByEmail(), allotmentService.canAward(), allotmentService.awardCoins(), allotmentService.getCurrentAllotment() | handleEvent(), handleCardClicked() |
| `executeTransfer(senderEmail, targetEmail, amount, message?)` | findEmployeeByEmail(), transactionService.getAccountBalance() (pre-check + post-transfer remaining) + direct Prisma ops | handleEvent(). **Now returns `remainingBalance` in result data** (2026-02-10). |
| `createAuditLog(...)` | — (Prisma direct) | handleEvent(), handleCardClicked() |
| `updateAuditLog(auditId, status, error?, txId?)` | — (Prisma direct) | handleEvent(), handleCardClicked() |
| `findEmployeeByEmail(email)` | — (Prisma direct) | handleEvent(), handleCardClicked(), executeBalance(), executeAward(), executeTransfer() |

### emailTemplateService.ts
**Location**: `backend/src/services/emailTemplateService.ts`

| Function | Depended On By |
|----------|----------------|
| `renderTemplate(key, variables)` | emailService (all send methods) |
| `listEmailTemplates()` | admin/emailTemplates.ts route |
| `upsertEmailTemplate(key, data)` | admin/emailTemplates.ts route |
| `getDefaultTemplates()` | listEmailTemplates() |
| `isTemplateKey(key)` | (internal validation) |

### bulkImportService.ts
**Location**: `backend/src/services/bulkImportService.ts`

| Function | Depended On By |
|----------|----------------|
| `parseSpreadsheet(buffer, filename)` | admin/bulkImport.ts route (upload, preview) |
| `getColumnHeaders(data)` | admin/bulkImport.ts route (upload) |
| `extractBalanceData(data, mapping)` | admin/bulkImport.ts route (preview). **amountColumn is optional since 2026-02-12** — defaults to 0 for user-only imports. |
| `mergeDataFiles(balanceData, emailData)` | admin/bulkImport.ts route (preview) |
| `validateImportData(rows)` | admin/bulkImport.ts route (validate) |
| `createImportJob(params)` | admin/bulkImport.ts route (create) |
| `claimPendingImportBalances(recipientEmail)` | config/auth.ts (on login) |
| `sendInvitationEmail(pendingId)` | admin/bulkImport.ts route, sendBulkInvitations() |
| `sendBulkInvitations(jobId)` | admin/bulkImport.ts route |
| `expirePendingBalance(pendingId)` | admin/bulkImport.ts route |
| `getImportJobs(options?)` | admin/bulkImport.ts route |
| `getImportJob(jobId)` | admin/bulkImport.ts route |
| `getPendingBalances(options?)` | admin/bulkImport.ts route |

### studioService.ts
**Location**: `backend/src/services/studioService.ts`

| Function | Depended On By |
|----------|----------------|
| `getSettings()` | admin/studio.ts route, getStudioState() |
| `getStudioState()` | admin/studio.ts route, getCurrentTheme() |
| `setThemeMode(mode)` | admin/studio.ts route, activateCampaignFull() |
| `setManualTheme(theme, switchToManualMode?)` | admin/studio.ts route, setBackgroundImage() |
| `setBackgroundImage(imageUrl)` | admin/banners.ts route (activate-background, deactivate-background) |
| `getCurrentTheme()` | admin/studio.ts route, setBackgroundImage() |
| `activateCampaignFull(campaignId, options?)` | admin/studio.ts route |

### aiImageService.ts
**Location**: `backend/src/services/aiImageService.ts`

| Function | Depended On By |
|----------|----------------|
| `generateCampaignImages(campaignId, customPrompt?, options?)` | admin/campaigns.ts route |
| `regenerateImage(campaignId, imageType, customPrompt?)` | admin/campaigns.ts route |
| `getCampaignAssets(campaignId)` | admin/campaigns.ts route |
| `generateBannerImage(bannerId, position, options)` | admin/banners.ts route |
| `generateUnified(imageType, options)` | generateBannerImage(), internal use |

### auditService.ts
**Location**: `backend/src/services/auditService.ts`

| Function | Depended On By |
|----------|----------------|
| `log(action, context)` | All other audit methods |
| `logTransaction(action, txId, context)` | (available for routes, not widely called yet) |
| `logBalanceAdjustment(accountId, amount, reason, context)` | (available for routes) |
| `logRoleChange(employeeId, changes, context)` | (available for routes) |
| `logPurchase(action, purchaseOrderId, context)` | (available for routes) |
| `logWellnessReview(action, submissionId, context)` | (available for routes) |
| `logSettingsChange(settingType, changes, context)` | (available for routes) |
| `logSecurityEvent(action, context)` | (available for routes) |
| `getAuditLogs(options)` | (no route currently) |

### bannerService.ts
**Location**: `backend/src/services/bannerService.ts`

| Function | Signature | Depended On By |
|----------|-----------|----------------|
| `listBanners(filters)` | `({position?, campaignId?, isActive?}) → Promise<Banner[]>` | admin/banners.ts route |
| `getBannerById(id)` | `(string) → Promise<Banner>` | admin/banners.ts route |
| `createBanner(data)` | `(Record<string, unknown>) → Promise<Banner>` | admin/banners.ts route |
| `updateBanner(id, data)` | `(string, Record<string, unknown>) → Promise<Banner>` | admin/banners.ts route |
| `updateBannerImage(id, imageUrl, isAiGenerated, aiPromptUsed?)` | `(string, string, boolean, string?) → Promise<Banner>` | admin/banners.ts route |
| `deleteBanner(id)` | `(string) → Promise<void>` | admin/banners.ts route |
| `toggleBanner(id)` | `(string) → Promise<Banner>` | admin/banners.ts route (deactivates other bg banners when activating) |
| `getActiveBackground()` | `() → Promise<Banner \| null>` | (available) |

### games.ts (gameEngine, jackpotService)
- See service files for current signatures

### fileService.ts
**Location**: `backend/src/services/fileService.ts`

| Export | Depended On By |
|--------|----------------|
| `upload` (multer middleware) | wellness.ts route, admin/wellness.ts route |
| `publicUpload` (multer middleware) | admin/store.ts route |
| `verifyUploadedFile` (middleware) | (available, not applied to all routes) |
| `getFileUrl(filename)` | wellness.ts route, admin/wellness.ts route |
| `getPublicFileUrl(filename)` | admin/store.ts route |
| `getPublicUploadDir()` | admin/store.ts route |

---

## 5. BACKEND ROUTES

### Auth Routes (`/api/auth`)

| Method | Path | Middleware | Service Calls |
|--------|------|-----------|---------------|
| GET | `/api/auth/google` | requireOAuthConfig | passport.authenticate('google') |
| GET | `/api/auth/google/callback` | requireOAuthConfig, passport | session.regenerate(), redirect |
| GET | `/api/auth/me` | requireAuth | (returns req.user) |
| POST | `/api/auth/logout` | — | req.logout(), session.destroy() |
| POST | `/api/auth/setup-admins` | — (secret-based) | prisma.employee.upsert() |

### Account Routes (`/api/accounts`)

| Method | Path | Middleware | Service Calls |
|--------|------|-----------|---------------|
| GET | `/api/accounts/balance` | requireAuth | transactionService.getAccountBalance() |
| GET | `/api/accounts/full-balance` | requireAuth | transactionService.getAccountBalance(), allotmentService.getCurrentAllotment(). **Returns empty defaults (not 404) when no account** (2026-02-10). |
| GET | `/api/accounts/transactions` | requireAuth, validate | transactionService.getTransactionHistory(). **Returns empty `{transactions:[], total:0}` (not 404) when no account. Uses `parseInt()` for limit/offset** (2026-02-10). |
| GET | `/api/accounts/pending` | requireAuth | transactionService.getPendingTransactions(). **Returns `[]` (not 404) when no account** (2026-02-10). |

### Manager Routes (`/api/manager`)

| Method | Path | Middleware | Service Calls |
|--------|------|-----------|---------------|
| GET | `/api/manager/award-presets` | requireAuth | prisma.awardPreset.findMany (active only) |
| GET | `/api/manager/allotment` | requireManager | allotmentService.getCurrentAllotment() |
| POST | `/api/manager/award` | requireManager, validate | allotmentService.awardCoins(), emailService.sendManagerAwardNotification(), emailService.sendManagerAwardSentNotification() |
| GET | `/api/manager/history` | requireManager, validate | allotmentService.getAwardHistory(). **Uses `parseInt()` for limit/offset** (2026-02-10). |

### Transfer Routes (`/api/transfers`)

| Method | Path | Middleware | Service Calls |
|--------|------|-----------|---------------|
| GET | `/api/transfers/limits` | requireAuth | prisma.peerTransferLimit (direct), prisma.ledgerTransaction.aggregate. **Normalizes `maxAmount` Decimal→Number** (2026-02-10). |
| POST | `/api/transfers/send` | requireAuth, validate | transactionService.createPendingTransaction() OR pendingTransferService.createPendingTransfer(), emailService.sendPeerTransfer*() |
| GET | `/api/transfers/history` | requireAuth | transactionService.getTransactionHistory() |
| GET | `/api/transfers/pending` | requireAuth | prisma.pendingTransfer.findMany (direct) |
| POST | `/api/transfers/:id/cancel` | requireAuth | pendingTransferService.cancelPendingTransfer() |

### Wellness Routes (`/api/wellness`)

| Method | Path | Middleware | Service Calls |
|--------|------|-----------|---------------|
| GET | `/api/wellness/tasks` | requireAuth | prisma.wellnessTask.findMany (direct) |
| GET | `/api/wellness/tasks/:id` | requireAuth | prisma.wellnessTask.findUnique (direct) |
| POST | `/api/wellness/submit` | requireAuth, upload.single | transactionService.createPendingTransaction() |
| GET | `/api/wellness/submissions` | requireAuth | prisma.wellnessSubmission.findMany (direct) |

### Store Routes (`/api/store`)

| Method | Path | Middleware | Service Calls |
|--------|------|-----------|---------------|
| GET | `/api/store/products` | requireAuth | prisma.storeProduct.findMany (direct) |
| GET | `/api/store/amazon-image` | requireAuth | (proxy fetch) |
| POST | `/api/store/purchase` | requireAuth, validate | transactionService.getAccountBalance(), transactionService.postTransaction() |
| GET | `/api/store/purchases` | requireAuth | prisma.storePurchaseOrder.findMany (direct) |
| POST | `/api/store/wishlist/:id` | requireAuth | prisma.wishlistItem.upsert (direct) |
| DELETE | `/api/store/wishlist/:id` | requireAuth | prisma.wishlistItem.delete (direct) |
| GET | `/api/store/wishlist` | requireAuth | prisma.wishlistItem.findMany (direct) |
| POST | `/api/store/goals` | requireAuth, validate | prisma.goal.create (direct) |
| GET | `/api/store/goals` | requireAuth | prisma.goal.findMany (direct) |
| DELETE | `/api/store/goals/:id` | requireAuth | prisma.goal.delete (direct) |
| GET | `/api/store/goals/check-achievements` | requireAuth | transactionService.getAccountBalance() |

### Admin Wellness (`/api/admin/wellness`)

| Method | Path | Middleware | Service Calls |
|--------|------|-----------|---------------|
| POST | `/api/admin/wellness/tasks` | requireAuth, upload | prisma.wellnessTask.create (direct) |
| GET | `/api/admin/wellness/tasks` | requireAuth | prisma.wellnessTask.findMany (direct) |
| DELETE | `/api/admin/wellness/tasks/:id` | requireAuth | prisma.wellnessTask.update (soft delete) |
| GET | `/api/admin/wellness/users` | requireAuth | prisma.employee.findMany (direct) |
| GET | `/api/admin/wellness/users/:id/submissions` | requireAuth | prisma.wellnessSubmission.findMany (direct) |
| GET | `/api/admin/wellness/pending` | requireAuth | prisma.wellnessSubmission.findMany (direct) |
| POST | `/api/admin/wellness/:id/approve` | requireAuth, validate | transactionService.postTransaction(), emailService.sendWellnessApprovalNotification(), accountService.getOrCreateAccountForEmployee() |
| POST | `/api/admin/wellness/:id/reject` | requireAuth, validate | transactionService.rejectTransaction(), emailService.sendWellnessRejectionNotification() |

### Admin Users (`/api/admin/users`)

| Method | Path | Middleware | Service Calls |
|--------|------|-----------|---------------|
| GET | `/api/admin/users` | requireAuth | prisma.employee.findMany (direct) |
| POST | `/api/admin/users` | requireAuth, validate | prisma.employee.create, accountService.getOrCreateAccount(), emailService.sendRoleAssignedNotification() |
| PUT | `/api/admin/users/:id/roles` | requireAuth, validate | prisma.employee.update, emailService.sendRoleAssignedNotification() |
| GET | `/api/admin/balances-report` | requireAuth | (complex aggregation query) |
| POST | `/api/admin/users/:id/allotment/deposit` | requireAuth, validate | allotmentService.depositAllotment(), allotmentService.getCurrentAllotment(), emailService.sendAllotmentDepositNotification() |
| GET | `/api/admin/users/:id/allotment` | requireAuth | allotmentService.getCurrentAllotment(), .getDepositHistory(), .getAwardHistory() |
| PUT | `/api/admin/users/:id/allotment/recurring` | requireAuth, validate | allotmentService.setRecurringBudget() |
| POST | `/api/admin/users/:id/balance/adjust` | requireAuth, validate | prisma.$transaction (Serializable): ledgerTransaction.create, account.update (increment), auditService.logBalanceAdjustment() |

### Admin Store (`/api/admin/store`)

| Method | Path | Middleware | Service Calls |
|--------|------|-----------|---------------|
| POST | `/api/admin/store/products/custom` | requireAdmin, upload | prisma.storeProduct.create (direct) |
| POST | `/api/admin/store/products/seed` | requireAdmin | prisma.storeProduct.create (direct) |
| POST | `/api/admin/store/products/amazon` | requireAdmin, validate | amazonImportService.fetchAmazonProductDetails() |
| POST | `/api/admin/store/products/amazon-list` | requireAdmin, validate | amazonImportService.fetchAmazonListAsins(), .fetchAmazonProductDetails() |
| GET | `/api/admin/store/products` | requireAdmin | prisma.storeProduct.findMany (direct) |
| PATCH | `/api/admin/store/products/:id/toggle` | requireAdmin | prisma.storeProduct.update (direct) |
| DELETE | `/api/admin/store/products/:id` | requireAdmin | prisma.storeProduct.update/delete (direct) |

### Admin Purchases (`/api/admin/purchases`)

| Method | Path | Middleware | Service Calls |
|--------|------|-----------|---------------|
| GET | `/api/admin/purchases/pending` | requireAuth | prisma.storePurchaseOrder.findMany (direct) |
| GET | `/api/admin/purchases` | requireAuth | prisma.storePurchaseOrder.findMany (direct) |
| POST | `/api/admin/purchases/:id/fulfill` | requireAuth, validate | prisma.storePurchaseOrder.update, emailService.sendPurchaseFulfilledNotification() |

### Admin Campaigns (`/api/admin/campaigns`)
(30+ endpoints — see Section 2 breakage map for key dependencies)

Key service calls: campaignService.*, aiImageService.*, campaignDistributionService.*

### Admin Other Routes

| Route Group | Key Service Calls |
|-------------|-------------------|
| `/api/admin/award-presets` | prisma.awardPreset (direct CRUD) |
| `/api/admin/email-templates` | emailTemplateService.listEmailTemplates(), .upsertEmailTemplate() |
| `/api/admin/google-chat` | prisma.chatCommandAudit (direct) |
| `/api/admin/banners` | bannerService.*, aiImageService.generateBannerImage(), studioService.setBackgroundImage() |
| `/api/files/banners/:filename` | (serves static banner images from uploads/banners/) |
| `/api/admin/games` | prisma.gameConfig/game/gameStats (direct), gameEngine.*, jackpotService.* |
| `/api/admin/studio` | studioService.* |
| `/api/admin/settings/smtp` | prisma.smtpSettings (direct) |
| `/api/admin/reports/stats` | GET — aggregated transaction/gaming analytics (prisma.ledgerTransaction.groupBy, prisma.gameStats.aggregate, prisma.jackpot.aggregate) |
| `/api/admin/users/bulk` | POST — bulk create employees from CSV/Excel (multer + xlsx) |

### Integration Routes

| Method | Path | Service Calls |
|--------|------|---------------|
| POST | `/api/integrations/google-chat/webhook` | googleChatService.handleEvent(). **Format detection: old-format `CARD_CLICKED` (type at top level) uses bare Message response; only `chat.cardClickedPayload` uses hostAppDataAction wrapper. `actionResponse` stripped before wrapping** (2026-02-10). |

---

## 6. BACKEND MIDDLEWARE

### Request Pipeline Order (server.ts)

```
1. Trust Proxy (app.set('trust proxy', 1))
2. HTTPS Protocol Fix (production only)
3. Helmet (CSP headers)
4. CORS (FRONTEND_URL origin, credentials: true)
5. Body Parser (JSON + URL-encoded)
6. Session (PostgreSQL store, 24h max age)
7. Passport (initialize + session)
8. CSRF (double-submit cookie, exempt: auth/google, google-chat webhook)
9. Rate Limiting (disabled by default, opt-in via RATE_LIMIT_ENABLED=true; 500/15min production default) (2026-02-10)
10. Auth Rate Limiting (10/15min on /api/auth, also gated by RATE_LIMIT_ENABLED) (2026-02-10)
```

### Auth Middleware (`middleware/auth.ts`)

| Middleware | Checks | Used By |
|-----------|--------|---------|
| `requireAuth` | req.isAuthenticated() → 401 | Most routes |
| `requireManager` | requireAuth + req.user.isManager → 403 | manager.ts routes |
| `requireAdmin` | requireAuth + req.user.isAdmin → 403 | admin/store.ts, admin/campaigns.ts, admin/banners.ts, admin/bulkImport.ts |

### Validation Middleware (`middleware/validation.ts`)

| Middleware | Purpose |
|-----------|---------|
| `validate(schema: ZodSchema)` | Validates req.body/query/params against Zod schema → 400 on failure |

### Error Handler (`middleware/errorHandler.ts`)

| Middleware | Purpose |
|-----------|---------|
| `errorHandler` | Global error handler — normalizes Prisma/Zod errors, logs with requestId |
| `notFoundHandler` | Returns 404 for unmatched `/api` routes |

### Rate Limiter (`middleware/rateLimiter.ts`)

| Export | Config |
|--------|--------|
| `createRateLimiter()` | 100 req/15min (memory or Redis) |
| `authRateLimiter()` | 10 req/15min |
| `sensitiveOpLimiter()` | 30 req/15min |

---

## 7. BACKEND CONFIGURATION

### config/auth.ts
- Google OAuth strategy (passport-google-oauth20)
- Auto-admin emails: `shanes@guinco.com`, `landonm@guinco.com`
- On login: finds Employee first → if exists, skips domain check (whitelisted via import/manual add) → if not, checks domain → creates Employee + Account, claims pending transfers + import balances
- **Domain exception (2026-02-12)**: Existing employees bypass `GOOGLE_WORKSPACE_DOMAIN` check. Unknown non-domain emails are still blocked.
- **If modified**: Affects all authentication, new user creation, pending claim logic

### config/database.ts
- Exports singleton `PrismaClient` instance
- Dev logging: query, error, warn. Prod: error only
- **If modified**: Affects every service and route that uses Prisma

### config/email.ts
- Priority: DB SmtpSettings → env vars → JSON transport (console)
- Caches transporter, invalidates on config change
- Exports: `getTransporter()`, `getFromEmail()`, `getFromName()`, `checkEmailConfigured()`, `clearTransporterCache()`
- **If modified**: Affects all emailService send methods

### config/env.ts
- Zod validation of all environment variables
- Required: DATABASE_URL, SESSION_SECRET
- Production requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FRONTEND_URL (URL), SESSION_SECRET (32+ chars)
- `RATE_LIMIT_ENABLED` defaults to `false` (opt-in with `'true'`) (2026-02-10)
- **If modified**: Affects server startup, any code referencing `env.*`

### config/constants.ts
- `SESSION_MAX_AGE_MS` = 86,400,000 (24 hours)
- **If modified**: Affects session expiration

### config/swagger.ts
- OpenAPI 3.0 spec for `/api-docs`

---

## 8. FRONTEND API CLIENT

**Location**: `frontend/src/services/api.ts`

### Axios Configuration
- Base URL: `/api` (relative, proxied by Vite in dev)
- Timeout: 30 seconds
- Credentials: included (cookies)
- CSRF: Extracts `XSRF-TOKEN` from cookies, sends as `X-XSRF-TOKEN` header

### Function → Backend Endpoint Map

| Frontend Function | HTTP | Backend Path | Used By |
|-------------------|------|-------------|---------|
| `getCurrentUser()` | GET | /auth/me | Login, Dashboard, ManagerPortal, Transfers, Wellness, Store, AdminPortal |
| `logout()` | POST | /auth/logout | Layout |
| `getBalance()` | GET | /accounts/balance | Transfers, Store |
| `getFullBalance()` | GET | /accounts/full-balance | Dashboard |
| `getTransactions(params)` | GET | /accounts/transactions | Dashboard |
| `getPendingTransactions()` | GET | /accounts/pending | (available) |
| `getAwardPresets()` | GET | /manager/award-presets | AwardForm (preset chips) |
| `getAdminAwardPresets()` | GET | /admin/award-presets | AdminPortal (AwardPresetsPanel) |
| `createAwardPreset(data)` | POST | /admin/award-presets | AdminPortal (AwardPresetsPanel) |
| `updateAwardPreset(id, data)` | PUT | /admin/award-presets/{id} | AdminPortal (AwardPresetsPanel) |
| `deleteAwardPreset(id)` | DELETE | /admin/award-presets/{id} | AdminPortal (AwardPresetsPanel) |
| `getManagerAllotment()` | GET | /manager/allotment | ManagerPortal |
| `awardCoins(data)` | POST | /manager/award | ManagerPortal |
| `getAwardHistory(params)` | GET | /manager/history | ManagerPortal |
| `getTransferLimits()` | GET | /transfers/limits | Transfers |
| `sendTransfer(data)` | POST | /transfers/send | Transfers |
| `getTransferHistory()` | GET | /transfers/history | Transfers |
| `getPendingTransfers()` | GET | /transfers/pending | Transfers |
| `cancelTransfer(id)` | POST | /transfers/{id}/cancel | Transfers |
| `getWellnessTasks()` | GET | /wellness/tasks | Wellness |
| `getWellnessTask(id)` | GET | /wellness/tasks/{id} | (available) |
| `submitWellness(formData)` | POST | /wellness/submit | Wellness (WellnessTaskModal) |
| `getWellnessSubmissions()` | GET | /wellness/submissions | Wellness |
| `getStoreProducts()` | GET | /store/products | Store |
| `purchaseProduct(data)` | POST | /store/purchase | Store |
| `getPurchases()` | GET | /store/purchases | (available) |
| `addToWishlist(productId)` | POST | /store/wishlist/{id} | Store |
| `removeFromWishlist(productId)` | DELETE | /store/wishlist/{id} | Store |
| `getWishlist()` | GET | /store/wishlist | Store |
| `createGoal(data)` | POST | /store/goals | Store |
| `getGoals()` | GET | /store/goals | Dashboard, Store |
| `deleteGoal(goalId)` | DELETE | /store/goals/{id} | Dashboard |
| `checkGoalAchievements()` | GET | /store/goals/check-achievements | Dashboard |
| `getPendingSubmissions()` | GET | /admin/wellness/pending | AdminPortal |
| `approveSubmission(id)` | POST | /admin/wellness/{id}/approve | AdminPortal |
| `rejectSubmission(id, reason)` | POST | /admin/wellness/{id}/reject | AdminPortal |
| `createWellnessTask(formData)` | POST | /admin/wellness/tasks | AdminPortal |
| `getAllWellnessTasks()` | GET | /admin/wellness/tasks | AdminPortal |
| `deleteWellnessTask(id)` | DELETE | /admin/wellness/tasks/{id} | AdminPortal |
| `getAllUsersWithSubmissions()` | GET | /admin/wellness/users | AdminPortal |
| `getEmailTemplates()` | GET | /admin/email-templates | AdminPortal |
| `updateEmailTemplate(key, data)` | PUT | /admin/email-templates/{key} | AdminPortal |
| `getAdminStoreProducts()` | GET | /admin/store/products | AdminPortal |
| `createCustomProduct(formData)` | POST | /admin/store/products/custom | AdminPortal |
| `importAmazonProduct(url)` | POST | /admin/store/products/amazon | AdminPortal |
| `importAmazonList(url, limit)` | POST | /admin/store/products/amazon-list | AdminPortal |
| `toggleProductStatus(id)` | PATCH | /admin/store/products/{id}/toggle | AdminPortal |
| `deleteProduct(id)` | DELETE | /admin/store/products/{id} | AdminPortal |
| `getPendingPurchases()` | GET | /admin/purchases/pending | AdminPortal |
| `getAllPurchases(status)` | GET | /admin/purchases | AdminPortal |
| `fulfillPurchase(id, data)` | POST | /admin/purchases/{id}/fulfill | AdminPortal |
| `getAllEmployees()` | GET | /admin/users | AdminPortal |
| `createEmployee(data)` | POST | /admin/users | AdminPortal |
| `updateEmployeeRoles(id, data)` | PUT | /admin/users/{id}/roles | AdminPortal |
| `getBalanceReport()` | GET | /admin/users/balances-report | AdminPortal, BalanceReport |
| `getReportStats()` | GET | /admin/reports/stats | BalanceReport |
| `adjustUserBalance(id, data)` | POST | /admin/users/{id}/balance/adjust | AdminPortal (via SettingsTab) |
| `getManagerAllotmentDetails(id)` | GET | /admin/users/{id}/allotment | AdminPortal |
| `depositAllotment(id, data)` | POST | /admin/users/{id}/allotment/deposit | AdminPortal |
| `setRecurringBudget(id, data)` | PUT | /admin/users/{id}/allotment/recurring | AdminPortal |
| `getGoogleChatAuditLogs(params)` | GET | /admin/google-chat/audit-logs | AdminPortal |
| `getGoogleChatStats()` | GET | /admin/google-chat/stats | AdminPortal |
| `getCampaigns(params)` | GET | /admin/campaigns | AdminPortal |
| `getActiveCampaign()` | GET | /admin/campaigns/active | AdminPortal |
| `getCampaign(id)` | GET | /admin/campaigns/{id} | AdminPortal |
| `createCampaign(data)` | POST | /admin/campaigns | AdminPortal |
| `updateCampaign(id, data)` | PUT | /admin/campaigns/{id} | AdminPortal |
| `deleteCampaign(id)` | DELETE | /admin/campaigns/{id} | AdminPortal |
| `activateCampaign(id)` | POST | /admin/campaigns/{id}/activate | AdminPortal |
| `toggleCampaign(id)` | POST | /admin/campaigns/{id}/toggle | AdminPortal |
| `getCampaignTasks(id)` | GET | /admin/campaigns/{id}/tasks | AdminPortal |
| `linkTaskToCampaign(id, data)` | POST | /admin/campaigns/{id}/tasks | AdminPortal |
| `getThemePresets()` | GET | /admin/campaigns/theme-presets | AdminPortal |
| `generateCampaignImages(id, data)` | POST | /admin/campaigns/{id}/generate-images | AdminPortal |
| `regenerateCampaignImage(id, type, prompt)` | POST | /admin/campaigns/{id}/regenerate/{type} | AdminPortal |
| `getCampaignAssets(id)` | GET | /admin/campaigns/{id}/assets | AdminPortal |
| `sendCampaignEmail(id, type)` | POST | /admin/campaigns/{id}/send-email | AdminPortal |
| `postCampaignToChat(id, url)` | POST | /admin/campaigns/{id}/post-chat | AdminPortal |
| `getStudioState()` | GET | /admin/studio/state | AdminPortal |
| `setThemeMode(mode)` | PATCH | /admin/theme/mode | AdminPortal |
| `setManualTheme(theme)` | PATCH | /admin/theme/manual | AdminPortal |
| `getCurrentTheme()` | GET | /admin/theme/current | ThemeContext |
| `activateCampaignFull(id, options)` | POST | /admin/campaigns/{id}/activate-full | AdminPortal |
| `getBackgrounds()` | GET | /admin/banners?position=background | AdminPortal (BackgroundsTab) |
| `generateBackground(prompt)` | POST | /admin/banners/generate-background | AdminPortal (BackgroundsTab) |
| `activateBackground(bannerId)` | POST | /admin/banners/{id}/activate-background | AdminPortal (BackgroundsTab) |
| `deactivateBackground()` | POST | /admin/banners/deactivate-background | AdminPortal (BackgroundsTab) |
| `deleteBackground(bannerId)` | DELETE | /admin/banners/{id} | AdminPortal (BackgroundsTab) |
| `getSmtpSettings()` | GET | /admin/settings/smtp | AdminPortal (SettingsTab) |
| `updateSmtpSettings(data)` | PUT | /admin/settings/smtp | AdminPortal (SettingsTab) |
| `testSmtpConnection(email)` | POST | /admin/settings/smtp/test | AdminPortal (SettingsTab) |
| `bulkCreateEmployees(formData)` | POST | /admin/users/bulk | AdminPortal (SettingsTab → Role Management) |

---

## 9. FRONTEND PAGES

### Login (`pages/Login.tsx`)
- **API**: getCurrentUser()
- **Behavior**: Checks auth → redirects to dashboard or shows login button
- **Renders**: Login button pointing to `/api/auth/google`

### OAuthCallback (`pages/OAuthCallback.tsx`)
- **API**: None (reads URL params)
- **Behavior**: Redirects to /dashboard or /login

### Dashboard (`pages/Dashboard.tsx`)
- **API**: getCurrentUser(), getFullBalance(), getTransactions({limit:10}), getGoals(), checkGoalAchievements()
- **Components**: Layout, GuincoinCard (personal variant), TransactionList
- **Features**: Confetti on goal achievement, goal deletion, dual balance display (personal + allotment), flip-to-hide card

### ManagerPortal (`pages/ManagerPortal.tsx`)
- **API**: getCurrentUser(), getManagerAllotment(), getAwardHistory({limit:20}), awardCoins()
- **Components**: Layout, GuincoinCard (manager variant), AwardForm, AwardHistory
- **Guard**: Redirects non-managers to dashboard

### Transfers (`pages/Transfers.tsx`)
- **API**: getCurrentUser(), getTransferLimits(), getTransferHistory(), getPendingTransfers(), getBalance(), sendTransfer(), cancelTransfer()
- **Components**: Layout, TransferLimits, TransferForm, TransactionList
- **Features**: Shows personal balance, "Switch to Manager Portal" button for managers

### Wellness (`pages/Wellness.tsx`)
- **API**: getCurrentUser(), getWellnessTasks(), getWellnessSubmissions()
- **Components**: Layout, WellnessTaskList (→ WellnessTaskModal), WellnessSubmissions

### Store (`pages/Store.tsx`)
- **API**: getCurrentUser(), getStoreProducts(), getBalance(), getWishlist(), purchaseProduct(), addToWishlist(), removeFromWishlist(), createGoal()
- **Components**: Layout, inline product cards
- **Features**: Tab switching (store/wishlist), purchase modal, goal creation

### AdminPortal (`pages/AdminPortal.tsx`)
- **API**: 40+ API calls covering all admin operations
- **Components**: Layout, PendingSubmissionsList, BackgroundsTab, StoreTab, GoogleChatTab, SettingsTab, GamesTab
- **Features**: Multi-tab interface, nested settings tabs, balanceError state surfaces load failures
- **Size**: ~1460 lines (largest component)

### BalanceReport (`pages/BalanceReport.tsx`)
- **Route**: `/admin/balances`
- **API**: getCurrentUser(), getBalanceReport(), getReportStats()
- **Components**: Layout, recharts (PieChart, AreaChart, BarChart)
- **Features**: Summary cards (totals), transaction pie chart, 30-day activity area chart, Guincoin leaderboard (searchable), top 10 earners bar chart, manager allotment usage table, gaming overview
- **Auth**: Admin-only (redirects non-admins)

---

## 10. FRONTEND CONTEXTS & COMPONENTS

### AccountContext (`contexts/AccountContext.tsx`)
- **State**: accountMode ('personal'|'allotment'), isManager
- **Persists**: to localStorage
- **Consumers**: (prepared for future use, not widely consumed)

### ThemeContext (`contexts/ThemeContext.tsx`)
- **State**: activeCampaign, theme, isLoading, error, daysRemaining, isCampaignActive
- **API**: getCurrentTheme()
- **Features**: 5-min cache (localStorage), applies CSS variables to document root
- **Consumers**: All pages via ThemeProvider

### Layout (`components/Layout.tsx`)
- **Props**: children, user? ({name, isManager, isAdmin})
- **API**: logout()
- **Renders**: Nav bar, conditional links (Dashboard, Transfers, Store, Wellness, Manager Portal, Admin)
- **Dynamic background**: Root div uses `var(--campaign-bg-image)` CSS variable (set by ThemeContext) for site-wide AI-generated backgrounds

### Toast (`components/Toast.tsx`)
- **Context**: addToast(message, type), confirm(message) → Promise<boolean>
- **Used By**: All pages for notifications/confirmations

### GuincoinCard (`components/GuincoinCard.tsx`)
- **Props**: variant ('personal'|'manager'), holderName, balance?, allotmentBalance?, isManager?, allotment?
- **Sub-components**: ChipSVG, PersonalFront, ManagerFront, CardBack
- **Features**: CSS flip animation (card-scene/card-flipper), embossed text, keyboard accessible (Enter/Space), reduced-motion support
- **Used By**: Dashboard (personal variant), ManagerPortal (manager variant)
- **Supersedes**: BalanceCard, AllotmentStatus (originals preserved with deprecation comments)

### Component Hierarchy
```
App (Router + ErrorBoundary + ToastProvider + ThemeProvider)
├── Login
├── OAuthCallback
├── Dashboard → Layout → GuincoinCard (personal), TransactionList
├── ManagerPortal → Layout → GuincoinCard (manager), AwardForm, AwardHistory
├── Transfers → Layout → TransferLimits, TransferForm, TransactionList
├── Wellness → Layout → WellnessTaskList (→ WellnessTaskModal), WellnessSubmissions
├── Store → Layout → (inline product cards, modals)
└── AdminPortal → Layout → PendingSubmissionsList, BackgroundsTab, StoreTab,
                            GoogleChatTab, SettingsTab, GamesTab
```

---

## 11. COMMON TASKS GUIDE

### Adding a new transaction type
1. Add value to `TransactionType` enum in `schema.prisma`
2. Run `npx prisma migrate dev`
3. Update `transactionService.postTransaction()` — add balance logic (credit vs debit) for the new type
4. Update frontend `TransactionList.tsx` — add label in `getTransactionTypeLabel()`
5. If needed: create a new service function that creates transactions of this type

### Adding a new API endpoint
1. Create or edit route file in `backend/src/routes/`
2. Add middleware: requireAuth/requireManager/requireAdmin + validate(schema)
3. Add service function if business logic is needed
4. Mount route in `server.ts` if new file
5. Add API function in `frontend/src/services/api.ts`
6. Call from appropriate page/component

### Adding a new Prisma model
1. Add model to `schema.prisma` with relations
2. Run `npx prisma migrate dev`
3. Create service in `backend/src/services/` if needed
4. Add routes in `backend/src/routes/`
5. Add API functions in frontend
6. Update this CODE_MAP.md

### Adding a new frontend page
1. Create page in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add nav link in `frontend/src/components/Layout.tsx`
4. Add API functions in `frontend/src/services/api.ts` if needed

### Modifying the Employee model
**HIGH RISK** — Employee is referenced by nearly everything:
1. Check ALL services that query Employee (accountService, allotmentService, transactionService, pendingTransferService, bulkImportService, googleChatService, emailService)
2. Check ALL routes that reference employee fields
3. Check `config/auth.ts` (creates employees on login)
4. Check frontend User interface in `api.ts`
5. Run migration
6. Update all affected queries and types

### Modifying transactionService.postTransaction()
**CRITICAL** — This is the core financial function:
1. Called by: allotmentService, pendingTransferService, bulkImportService, admin/wellness route, store route, googleChatService
2. Handles: balance credit/debit logic per transaction type
3. Uses: Prisma transaction isolation (Serializable in callers)
4. Must preserve: negative balance prevention, status update, postedAt timestamp

### Changing email templates
1. Modify defaults in `emailTemplateService.ts` (defaultTemplates array)
2. DB overrides take priority (via EmailTemplate model)
3. Variables are interpolated with `{{variableName}}` syntax
4. HTML is escaped in renderTemplate() to prevent XSS

### Changing session/auth behavior
1. Session config in `server.ts` (middleware order 6-8)
2. OAuth strategy in `config/auth.ts`
3. CSRF in `server.ts` (middleware order 9)
4. Cookie settings affect: secure, httpOnly, sameSite, domain, maxAge
5. Frontend CSRF handling in `api.ts` (axios interceptors)

---

## END OF CODE MAP

> When modifying any code, always search this document first for the function/model name.
> Follow the Safe Change Protocol: Trace → List → Preserve → Change → Verify.
