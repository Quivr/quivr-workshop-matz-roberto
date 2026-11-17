# Competitor analysis: meet-people features

As of 17 Nov 2026. Researched from public sources (company sites, app stores, press, investor filings). Anything we could not verify is marked _unverified_. Context: we are considering a "meet people" feature for Ask Quivr, a student assistant built on Quivr data (schedule, restaurants, libraries, friends, events, student bars).

## Summary

- **Nodli** is the only direct competitor: a Leuven-only student app (KU Leuven and UCLL) for meeting people on campus. It is friendship-first, not a dating app, and very early (100+ downloads, no ratings).
- **Tinder, Bumble and Grindr** are large, mature, adult (18+) dating apps. All three are shrinking or plateauing on paying users (except Grindr, which is growing) and all three are pushing **AI** and **friend-group formats**.
- **No competitor connects meeting people to real campus data** (timetables, menus, libraries, events). Nodli comes closest, with an iCal agenda. This is Quivr's gap.

## Feature comparison

|                            | Nodli                                                                                                                      | Tinder                                                                       | Grindr                                                               | Bumble                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Audience**               | KU Leuven / UCLL students, 16+                                                                                             | Adults 18+, general                                                          | LGBTQ+ adults 18+                                                    | Adults 18+, general                                                                            |
| **Main goal**              | Friends, spontaneous hangouts, events                                                                                      | Dating, plus friend-group formats                                            | Dating and hookups, social                                           | Dating, plus BFF for friends                                                                   |
| **Matching**               | Suggestions by programme, interests and 3 personality questions. No swiping. Location, age and gender not used for ranking | Swipe, plus AI "Chemistry" daily pick                                        | Grid sorted by distance, filters and tags                            | Swipe, "Discover" daily picks. Swipe removal announced for some markets (_unverified_ if live) |
| **Group / event formats**  | Live Now (15 min to 2 h posts), small events, group chat, society events                                                   | Double Date, Group Hangouts (3 to 15 people, Sept 2026), Events in 56 cities | Right Now (1-hour posts, map)                                        | BFF app with Groups and events calendar                                                        |
| **Campus / student angle** | School-email sign-up, Aula Dots (see who in a lecture hall is open to company), agenda via iCal, societies                 | College Mode (student email, major, clubs). US-centred                       | None found                                                           | Student verification and school stickers (2024 source, current status _unverified_)            |
| **AI**                     | Photo moderation only                                                                                                      | Chemistry, Learning Mode, Tinder Connect (Spotify, Duolingo, Beli)           | gAI: Wingman, Smart Inbox, For You. Edge (Nov 2026)                  | Photo and bio feedback. "Bee" AI matchmaker (public launch _unverified_)                       |
| **Verification**           | School email (does not prove identity)                                                                                     | Face Check liveness selfie, optional World ID badge                          | Facial age estimation in UK, Australia, Brazil only                  | Selfie and optional ID plus selfie                                                             |
| **Safety tools**           | Live-location share with trusted contact and auto-SMS check-in, 24 h location retention, report with human review          | "Are You Sure?" and "Does This Bother You?" (LLM-based), Share My Date       | Discreet icon, PIN, hide distance, expiring photos, health reminders | Private Detector (blurs explicit images), Deception Detector, Share Date                       |
| **Monetisation**           | Free, no ads. Model unclear                                                                                                | Plus, Gold, Platinum, plus Boosts and Super Likes                            | Free with ads, XTRA, Unlimited, Edge ($120/mo)                       | Boost, Premium, Premium+, plus consumables. BFF free                                           |
| **Scale**                  | About 100+ downloads                                                                                                       | 630M+ downloads, 8.9M payers (Q3 2026)                                       | About 16M MAU, 1.4M payers                                           | About 3.1M payers, 100M+ downloads                                                             |
| **Store rating (iOS)**     | Too few to show                                                                                                            | 4.2 (1.8M ratings)                                                           | 4.4 (390K)                                                           | 4.3 (1.8M)                                                                                     |

## What each one teaches us

**Nodli** ([nodli.site](https://nodli.site), [UCLL news](https://newsroom.ucll.be/ucll-student-wint-internationale-start-upprijs-in-malta-met-sociale-studentenapp-nodli))

- Strong on privacy for a student startup: presence sharing is opt-in, short-lived and off by default, with stricter defaults for 16 to 17-year-olds. Chats are not read.
- Weak: tiny user base, two schools only, and its store listing and privacy policy disagree on whether the Campus feed is live. Photos are sent to a US AI service for moderation.
- Overlaps with Quivr on events, agenda and societies. It is competing for the same Leuven students.

**Tinder** ([press room](https://www.tinderpressroom.com), [Match Group Q3](https://ir.mtch.com))

- Moving from 1:1 swiping to friend-group formats, because Gen Z prefers lower-pressure social settings.
- Strongest anti-fake tooling, but biometric verification brought privacy exposure (Ireland's DPC fined Tinder's operator €11M on 13 Nov 2026, over data exports).
- Top complaints: bots and scammers, paywalled likes, bans with weak support.

**Grindr** ([grindr.com](https://www.grindr.com), [Q3 2026](https://www.fool.com/earnings/call-transcripts/2026/11/06/grindr-grnd-q3-2026-earnings-call-transcript/))

- The only one growing, thanks to high engagement and price rises.
- A cautionary tale on privacy: €5.5 to 6M Norwegian fine for sharing data with advertisers, and a £26M UK settlement over HIV-status sharing. Regulators treated being a user as special-category data in itself.
- Proximity sorting leaks location even when distance is hidden.

**Bumble** ([bumble.com](https://bumble.com), [Q2 2026](https://ir.bumble.com/news/news-details/2026/Bumble-Inc--Announces-Second-Quarter-2026-Results/default.aspx))

- In flux: dropped "women make the first move" on 11 Aug 2026, discontinued Bizz, and agreed a take-private on 13 Oct 2026 (closing _unverified_).
- BFF is now a standalone, free, groups-and-events friends app.
- Good trust and safety stack (ID verification, image blurring, scam detection).

## Opportunities for Ask Quivr

1. **Use the campus data nobody else has.** Quivr knows schedules, events, student bars, restaurants and libraries. "Who from my friends is free at 12:30 and wants lunch at Alma 3?" is something no competitor can answer. Operations that exist today: `friendList`, `friendSchedules` (only what friends share), `findFriend`, `fakbars`, event feeds.
2. **Go friends-first and group-first.** Tinder, Bumble and Nodli are all moving this way. A plan-something-together flow fits Quivr better than 1:1 romantic matching.
3. **Be the conversational layer.** Every competitor is adding AI (Chemistry, Bee, gAI, Wingman). Ask Quivr is already a chat assistant, so it can explain why someone is suggested, which the competitors' AI features mostly do not.
4. **Treat trust and safety as table stakes.** Verified student identity (Quivr already has it), block and report, opt-in visibility, short data retention, and a trusted-contact check-in like Nodli's.
5. **Keep it free and honest.** The most common complaints across Tinder, Bumble and Grindr are paywalls, bots and unexplained bans.

## Risks and things to avoid

- **Sensitive attributes.** Gender, orientation and health data are special-category or high-risk under GDPR. Do not infer them, do not send them to AI providers, and do not use them for ranking unless a user opted in.
- **Exact location.** Use campus zones and public venues (restaurants, bars, events), not distances.
- **Minors and age.** Nodli allows 16+. The big three are 18+. Decide the age policy early.
- **Real people.** Never recommend real students without their explicit opt-in.
- **Our own demo.** The fake `find_matches` tool in `apps/mcp/src/tools/` uses invented profiles with a `gender` field. That is fine for a demo, but a real version should match on shared interests and availability, and be opt-in.

## Suggested next steps

1. Decide the product angle: friendship and group plans (recommended) or romantic dating.
2. Prototype a tool around real, read-only Quivr data: "who is free when I am" using `friendSchedules`, and "what to do tonight" using events and `fakbars`.
3. Keep `find_matches` as a clearly labelled demo until opt-in profiles exist.
4. Watch Nodli: check its store listing and reviews again in a few weeks.

## Caveats

- Nodli facts come mostly from its own website, store listings and one university press release. Its user numbers are third-party estimates.
- Subscription prices for Tinder, Bumble and Grindr are mostly _unverified_ (apps publish them only in-app).
- Bumble's Q3 2026 figures and the take-private status come from secondary sources.
- The "Woof" feature on Grindr and Tinder's standalone video calling could not be confirmed.
