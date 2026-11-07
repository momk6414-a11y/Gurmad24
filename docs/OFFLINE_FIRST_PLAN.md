
# GURMAD 24 — Offline-First Development Plan

## Goal
Improve GURMAD 24 so users can access essential public information when internet connectivity is weak or unavailable.

## 1. Offline App Access
- Cache the application shell, CSS, JavaScript, icons and manifest.
- Allow the application to open when offline.
- Display a clear offline status indicator.
- Show when the app was last updated.

## 2. Public Hospital Directory
- Allow users to view previously loaded public hospital information offline.
- Display the last update date.
- Clearly warn users that availability and contact information may have changed.
- Never claim that a hospital has confirmed availability without a live check.

## 3. Safe Offline Drafts
- Allow users to prepare non-sensitive requests as drafts.
- Label every offline draft: "QABYO — LAMA DIRIN".
- Do not automatically send drafts when connectivity returns.
- Require the user to review and confirm before submission.

## 4. Patient Privacy and Security
- Never cache sensitive medical records or personal patient information in the service worker.
- Do not store passwords, session tokens or confidential information in browser storage.
- Protect all API endpoints with authentication and role-based access control.
- Use HTTPS for all production communication.

## 5. Emergency Safety
- Offline emergency requests must never appear as successfully submitted.
- Clearly display: "Internet ma jiro — codsiga lama dirin."
- Direct users to contact local emergency services by phone.
- Do not claim that an ambulance has been dispatched unless a real dispatch integration confirms it.

## 6. Reliable Synchronization
- Synchronize approved drafts only after the user confirms.
- Show pending, successful and failed submission states.
- Prevent duplicate submissions.
- Keep an audit trail for important actions.
- Allow users to review failed submissions.

## 7. Testing
- Test offline app startup.
- Test slow and unstable internet connections.
- Test failed API requests.
- Test authentication and role permissions.
- Test duplicate submission prevention.
- Test that private medical information is not cached.

## 8. Production Requirements
Before public launch:
- Complete security and privacy review.
- Obtain hospital and ambulance service agreements.
- Configure real payment provider integrations.
- Configure production HTTPS and persistent storage.
- Set up backups, monitoring and recovery procedures.
- Obtain the necessary medical, legal and institutional approvals.

## Important
GURMAD 24 must not present demo features as real emergency services.
Patient safety, privacy, reliability and transparency are mandatory.
