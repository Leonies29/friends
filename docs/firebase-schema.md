# Firebase Schema

Istanbul Quest is a private travel game platform. Every gameplay document must carry a `groupId` and every query should be scoped to the active group.

## Collections

- `users/{uid}`: account profile, `groupIds`, `activeGroupId`, global display fields, and lightweight stats.
- `groups/{groupId}`: canonical trip group document. The current app also mirrors this to `friendGroups/{groupId}` for backwards compatibility.
- `groupMembers/{groupId_uid}`: source of truth for membership, participant claiming, and roles. Fields: `groupId`, `userId`, `role`, `nickname`, `participantSlotId`, `status`.
- `games/{gameId}`: generic game configuration with `title`, `description`, `icon`, `category`, `enabled`, `visible`, `archived`, `status`, `xpRules`.
- `gameSessions/{sessionId}`: scheduled or active runtime state for a game.
- `challenges/{challengeId}`: group challenge records with owner, proof, status, schedule, and XP.
- `quests/{questId}` and `questRelics/{groupId_key}`: reusable quest definitions and current collected item progress.
- `photos/{photoId}`: group gallery metadata. Storage path format: `groups/{groupId}/photos/{userId}/{timestamp}-{filename}`.
- `photoReactions/{photoId_userId}` and `photoComments/{commentId}`: per-user reactions and comments.
- `leaderboards/{groupId_uid}`: denormalized XP summary for fast rankings.
- `scheduleEvents/{eventId}`: shared planning events with `attendance.{uid}` values: `ready`, `late`, `unavailable`.
- `notifications/{notificationId}`: group or user-targeted notices.
- `badges/{badgeId}`: badge definitions or group-specific rewards.
- `xpTransactions/{transactionId}`: immutable XP ledger, including admin corrections.

## Recommended Indexes

- `groups`: `inviteCode`
- `groupMembers`: `groupId`, `status`
- `games`: `groupId`, `order`
- `scheduleEvents`: `groupId`, `date`, `startTime`
- `photos`: `groupId`, `createdAt`
- `challenges`: `groupId`, `status`
- `xpTransactions`: `groupId`, `weekKey`

## Rules Guidance

Client-side role checks improve UX only. Firestore rules should enforce:

- A user can read a group only if they have an active `groupMembers/{groupId_uid}` document.
- Only one user can claim each participant slot.
- `OWNER` can delete groups and manage settings/members/games.
- `ADMIN` can manage games, scores, and planning.
- `PLAYER` can play games, upload/delete their own photos, react/comment, and view rankings.
- All writes to group-scoped collections must validate `request.resource.data.groupId`.

Storage rules should require authenticated membership for `groups/{groupId}/photos/**`, and only the owner or an admin should delete a photo object.
