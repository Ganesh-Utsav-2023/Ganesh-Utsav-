# Security Specification & Test Harness

## 1. Data Invariants
- A user document under `/users/{userId}` can only be created by the authenticated user whose `uid` matches `{userId}` or by an admin.
- Standard users cannot modify their own `role` property (roles are restricted to `user` or assigned by admin).
- A booking under `/bookings/{bookingId}` must be tied to `request.auth.uid` as `user_id`. Users can only view and update their own bookings, while admins can view and manage all bookings.
- `aarti_slots` under `/aarti_slots/{slotId}` can be read by any user, but created or updated only by admins.

## 2. Dirty Dozen Security Test Payloads
1. **Unauthenticated User Creation**: Create `/users/attackerId` without `request.auth`.
2. **Identity Spoofing**: User `uid1` creating document at `/users/uid2`.
3. **Role Escalation**: Standard user updating their `/users/{userId}` record to set `role: "admin"`.
4. **Orphaned Booking Write**: Authenticated user creating booking with `user_id` pointing to another user.
5. **PII Data Leak**: Standard user attempting to list or read another user's private document `/users/victimId`.
6. **Ghost Field Poisoning**: Inserting unexpected parameters (`isSuperAdmin: true`) during booking creation.
7. **Slot Modification by Devotee**: Standard user writing/updating `/aarti_slots/{slotId}`.
8. **Invalid Status Transition**: Devotee attempting to directly set booking status to `ACCEPTED`.
9. **Oversized String Injection**: Injecting 10,000 character strings into `devotee_name` or `address`.
10. **Client-side Timestamp Forgery**: Overriding `createdAt` with a historical client timestamp.
11. **Spoofed Email Admin Bypass**: Attempting admin actions with an unverified email token.
12. **Malicious Document ID**: Attempting path injection in `{bookingId}` using special characters.

## 3. Test Runner Specification
All dirty dozen payloads MUST be evaluated against `firestore.rules` and fail with `PERMISSION_DENIED`.
