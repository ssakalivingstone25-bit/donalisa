# Firestore Security Specification & Payload-First TDD (Phase 0)

This security specification details the Data Invariants, the "Dirty Dozen" malicious payloads, and the validation tests designed to harden the Firestore security rules.

## 1. Data Invariants

Our application implements a zero-trust model. The database consists of 23 primary collections, partitioned into:
- **Streaming Portal Collections** (users, movies, active_viewers, comments, comment_likes, ratings, favorites, watchlist, watchHistory, notifications, settings, broadcast, webrtc_signals)
- **BizLink Uganda (Kampala Digital Arcade) Collections** (biz_shops, biz_products, biz_transactions, biz_wallets, merchant_applications, shop_templates, biz_orders, marketplace_logs)

### Secure Invariant Rules:
1. **Identity Integrity**: For all write operations, any user ID field (`userId`, `customerId`, `uid`, `ownerId`) must strictly match `request.auth.uid`. No client can spoof their identity.
2. **Strict RBAC**: Only the Super Admin (`ssakalivingstone25@gmail.com`) can create/edit/delete `shop_templates`, approve/reject `merchant_applications`, and manage overall global `settings`.
3. **Tenant Sandboxing**: Approved merchants can ONLY edit their own `biz_shops`, add/edit/delete their own `biz_products` within their specific shop, and view orders belonging to their shop. They cannot modify other shops or wallets.
4. **Read Access Enforcement**: Blanket reads are forbidden. Users can only query comments, ratings, and active viewers with secure filters. Personally identifiable user profiles and private watch histories are restricted to the owner or super admin.
5. **Terminal State Locking**: Once a merchant application status is marked as `APPROVED` or `REJECTED`, or an order is marked as `COMPLETED`, only the Super Admin can override it; regular users cannot change terminal states.
6. **Temporal & Immortality Integrity**: Core timestamp fields (`createdAt`, `addedAt`) must match `request.time` exactly. Fields like `createdAt` and `originalOwnerId` are immutable.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following are 12 specific JSON payloads designed to attack the laws of Identity, Integrity, and State, which MUST be rejected with `PERMISSION_DENIED` by the security rules:

### Payload 1: Privilege Escalation (Self-Promoting to Admin)
- **Target Path**: `/users/attacker_uid`
- **Attack Intent**: A regular subscriber attempts to elevate their role from "viewer" to "admin".
```json
{
  "uid": "attacker_uid",
  "email": "attacker@gmail.com",
  "displayName": "Sneaky Attacker",
  "role": "admin",
  "createdAt": "2026-07-08T10:00:00Z"
}
```

### Payload 2: Unauthorized Catalog Injection
- **Target Path**: `/movies/malicious_movie_123`
- **Attack Intent**: A regular user attempts to inject a spam video/song into the streaming catalog bypassing administrative approval.
```json
{
  "id": "malicious_movie_123",
  "title": "Malicious Phishing Stream",
  "description": "Click here for free bitcoin!",
  "videoUrl": "https://malicious-site.com/stream.mp4",
  "posterUrl": "https://malicious-site.com/image.jpg",
  "rating": "G",
  "categories": ["Action"],
  "uploadedBy": "attacker_uid",
  "createdAt": "2026-07-08T10:00:00Z",
  "type": "movie"
}
```

### Payload 3: Spoofed Rating (Skewing Reviews)
- **Target Path**: `/ratings/attacker_movie_rating`
- **Attack Intent**: An attacker attempts to submit a 5-star rating on behalf of another user ID.
```json
{
  "id": "attacker_movie_rating",
  "userId": "innocent_victim_uid",
  "movieId": "target_movie_id",
  "rating": 5,
  "ratedAt": "2026-07-08T10:00:00Z"
}
```

### Payload 4: Orphaned Comment Injection
- **Target Path**: `/comments/comment_orphan_999`
- **Attack Intent**: Attacker posts a comment with a mismatched `userId` to impersonate a high-profile subscriber.
```json
{
  "id": "comment_orphan_999",
  "movieId": "inception_movie_id",
  "userId": "celebrity_uid",
  "userEmail": "celebrity@donalisa.com",
  "userName": "Celebrity",
  "text": "This movie is terrible!",
  "createdAt": "2026-07-08T10:00:00Z"
}
```

### Payload 5: Comment Like Hijacking
- **Target Path**: `/comment_likes/attacker_like_id`
- **Attack Intent**: Attacker tries to create a upvote record on behalf of another active user.
```json
{
  "id": "attacker_like_id",
  "userId": "innocent_victim_uid",
  "commentId": "comment_456",
  "likedAt": "2026-07-08T10:00:00Z"
}
```

### Payload 6: Non-Admin Template Creation
- **Target Path**: `/shop_templates/malicious_template_abc`
- **Attack Intent**: A malicious tenant or customer attempts to register their own template to sell unauthorized items on the platform.
```json
{
  "id": "malicious_template_abc",
  "name": "Dark Web Stall",
  "style": "brutalist",
  "description": "Unauthorized digital template",
  "basePrice": 999999
}
```

### Payload 7: Fake Merchant Application Approval (Self-Approval)
- **Target Path**: `/merchant_applications/applicant_uid`
- **Attack Intent**: An applicant modifies their status field from `PENDING` to `APPROVED` directly to bypass paying the landlord.
```json
{
  "status": "APPROVED",
  "landlordComments": "Bypassed security successfully!",
  "approvedAt": "2026-07-08T10:00:00Z"
}
```

### Payload 8: Illegal Shop Seizure (Landlord Bypass)
- **Target Path**: `/biz_shops/premium_shop_stalls`
- **Attack Intent**: A merchant modifies the shop's `ownerId` to seize a premium digital shop template without making a payment.
```json
{
  "ownerId": "attacker_uid",
  "ownerEmail": "attacker@gmail.com",
  "status": "OCCUPIED"
}
```

### Payload 9: Wallet Tampering & Earnings Theft
- **Target Path**: `/biz_wallets/merchant_wallet_xyz`
- **Attack Intent**: A merchant tries to write directly to their digital wallet collection, inflating their balance by 10,000,000 UGX.
```json
{
  "id": "merchant_wallet_xyz",
  "merchantId": "attacker_uid",
  "balance": 10000000,
  "lastTransactionId": "fake_tx_111",
  "updatedAt": "2026-07-08T10:00:00Z"
}
```

### Payload 10: Unauthorized Product Hijack / Deletion
- **Target Path**: `/biz_products/another_merchant_product_888`
- **Attack Intent**: Attacker attempts to modify or delete a product listing belonging to an entirely different shop.
```json
{
  "title": "Defaced Product Listing",
  "price": 100,
  "shopId": "victim_shop_id"
}
```

### Payload 11: Customer Order Status Spoofing
- **Target Path**: `/biz_orders/customer_order_777`
- **Attack Intent**: A customer tries to change the order's payment status to `PAID` without actually executing a Mobile Money transaction.
```json
{
  "paymentStatus": "PAID",
  "txId": "forged_mtn_reference_555"
}
```

### Payload 12: Private System Setting Manipulation
- **Target Path**: `/settings/global`
- **Attack Intent**: An unauthenticated malicious crawler attempts to write to global platform configuration or social links.
```json
{
  "facebook": "https://facebook.com/hacker_page",
  "twitter": "https://x.com/hacker_handle"
}
```

---

## 3. The Test Runner Configuration

The following TypeScript code utilizes the `@firebase/rules-unit-testing` framework to prove that all "Dirty Dozen" payloads are safely restricted, maintaining absolute zero-trust.

```typescript
// firestore.rules.test.ts
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import * as fs from 'fs';

let testEnv: RulesTestEnvironment;

describe("Zero-Trust Firestore Security Rule Suite", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "donalisa-streaming-portal",
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
        host: "localhost",
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it("should block Payload 1: Privilege Escalation (Self-Promoting to Admin)", async () => {
    const context = testEnv.authenticatedContext("attacker_uid", { email: "attacker@gmail.com" });
    const db = context.firestore();
    const docRef = doc(db, "users", "attacker_uid");
    
    await expect(
      setDoc(docRef, {
        uid: "attacker_uid",
        email: "attacker@gmail.com",
        displayName: "Sneaky Attacker",
        role: "admin",
        createdAt: new Date().toISOString()
      })
    ).rejects.toThrow("PERMISSION_DENIED");
  });

  it("should block Payload 7: Fake Merchant Application Approval (Self-Approval)", async () => {
    const context = testEnv.authenticatedContext("applicant_uid", { email: "applicant@gmail.com" });
    const db = context.firestore();
    const docRef = doc(db, "merchant_applications", "applicant_uid");
    
    await expect(
      updateDoc(docRef, {
        status: "APPROVED",
        landlordComments: "Bypassed security successfully!",
        approvedAt: new Date().toISOString()
      })
    ).rejects.toThrow("PERMISSION_DENIED");
  });

  it("should block Payload 9: Wallet Tampering & Earnings Theft", async () => {
    const context = testEnv.authenticatedContext("attacker_uid", { email: "attacker@gmail.com" });
    const db = context.firestore();
    const docRef = doc(db, "biz_wallets", "merchant_wallet_xyz");
    
    await expect(
      setDoc(docRef, {
        id: "merchant_wallet_xyz",
        merchantId: "attacker_uid",
        balance: 10000000,
        lastTransactionId: "fake_tx_111",
        updatedAt: new Date().toISOString()
      })
    ).rejects.toThrow("PERMISSION_DENIED");
  });
});
```
