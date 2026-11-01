# Graph Report - atlys-clone  (2026-10-31)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1545 nodes · 5659 edges · 84 communities (60 shown, 24 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0a2164a2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66

## God Nodes (most connected - your core abstractions)
1. `t()` - 131 edges
2. `sql()` - 103 edges
3. `next` - 81 edges
4. `isArabicLocale()` - 72 edges
5. `react` - 71 edges
6. `href()` - 63 edges
7. `getSiteSettings()` - 49 edges
8. `tf()` - 48 edges
9. `Page` - 45 edges
10. `requireAdmin()` - 43 edges

## Surprising Connections (you probably didn't know these)
- `updateProfile()` --calls--> `sql()`  [EXTRACTED]
  src/lib/auth/index.ts → src/lib/data/db.ts
- `generateMetadata()` --calls--> `localizedMetadata()`  [EXTRACTED]
  src/app/[locale]/(pages)/account/page.tsx → src/lib/seo.ts
- `generateMetadata()` --calls--> `localizedMetadata()`  [EXTRACTED]
  src/app/[locale]/(pages)/contact/page.tsx → src/lib/seo.ts
- `generateMetadata()` --calls--> `localizedMetadata()`  [EXTRACTED]
  src/app/[locale]/(pages)/on-time-guaranteed/page.tsx → src/lib/seo.ts
- `generateMetadata()` --calls--> `localizedMetadata()`  [EXTRACTED]
  src/app/[locale]/(pages)/privacy/page.tsx → src/lib/seo.ts

## Import Cycles
- None detected.

## Communities (84 total, 24 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (53): DestinationEditor(), empty, Field(), fileLabel(), fromDestination(), MediaTile(), missingMediaKinds(), Picked (+45 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (51): stripe, dynamic, normalizePaymobBody(), POST(), POST(), PaymobFailedPage(), PaymobResultPage(), PaymentSuccessPage() (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (55): adminAddEvent(), adminDeclineRefund(), adminDeleteDestination(), adminDeleteFaq(), adminDeleteHoliday(), adminDeleteIssuedVisa(), adminDeletePage(), adminDeleteReview() (+47 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (42): canEdit(), deleteDocumentAction(), goToStepAction(), lockedResult(), owned(), saveTravelersAction(), startPaymentAction(), uploadDocumentAction() (+34 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (45): dependencies, @base-ui/react@^1.8.0, clsx@^2.1.1, cmdk@^1.1.1, cn@^0.4.0, date-fns@^4.4.0, fflate@^0.8.3, framer-motion@^13.4.6 (+37 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (34): application_events, application_events_app_idx, applications, applications_user_idx, destinations, documents, events, faqs (+26 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (34): adminSaveCitizenships(), AdminAuditPage(), metadata, AdminFeesPage(), metadata, GrowthPage(), labels, metadata (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (35): leaflet, lucide-react, EmergencyIcon(), PassportIcon(), TicketsIcon(), DestinationCard(), DestinationGrid(), docsLabel() (+27 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (31): AdminQueuePage(), filters, metadata, ApplicationCard(), ApplicationTracker(), RefundRequestBox(), statusKeys, statusLabel() (+23 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (35): Tabs(), TabsContent(), TabsList(), tabsListVariants, TabsTrigger(), ApplyDialog(), NearbyStrip(), Reveal() (+27 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (34): framer-motion, ApprovalRing(), TrustBand(), c(), copy, CopyKey, dayPart(), longDate() (+26 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (19): errors, link, shot, playwright@^1.63.0, playwright, pages, outDir, pages (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (30): startApplicationAction(), AccountNotification, AccountProfileSummary, AccountStats, IssuedVisaRow, UserFileRow, UserPaymentRow, addEvent() (+22 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (28): markNotificationsRead(), googleAction(), sendCodeAction(), verifyCodeAction(), GET(), GET(), SignInPage(), SignInForm() (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (25): uploadProfileDocumentAction(), fileHref(), ProfileForm(), TravelerForm(), LocaleContext, useLocale(), useT(), RejectionPicker() (+17 more)

### Community 15 - "Community 15"
Cohesion: 0.14
Nodes (22): generateMetadata(), generateMetadata(), EmergencyPage(), generateMetadata(), generateMetadata(), NewsroomPage(), generateMetadata(), PartnersPage() (+14 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (16): next, completeMockAction(), generateMetadata(), RootLayout(), viewport, MockPaymentPage(), NotFound(), MockCheckout() (+8 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (26): adminSaveDestination(), AdminFaqsPage(), metadata, AdminHolidaysPage(), metadata, AdminReviewsPage(), metadata, createDestination() (+18 more)

### Community 18 - "Community 18"
Cohesion: 0.20
Nodes (22): adminSendCustomerNote(), requestRefundAction(), GET(), AdminApplicationPage(), ApplicationDetailPage(), ApplyPage(), requireUser(), getApplication() (+14 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (20): AdminLayout(), cairo, lato, AdminShell(), groups, NavLink(), SidebarBody(), SearchIcon() (+12 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (23): AdminPagesPage(), metadata, CustomPage(), dynamic, paths, sitemap(), BUILTIN_PAGES, BUILTIN_SLUGS (+15 more)

### Community 21 - "Community 21"
Cohesion: 0.14
Nodes (26): AccountDashboard(), choose(), canReapply(), closedStatuses, Details(), docStatusKeys, fileHref(), Files() (+18 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (22): adminCreateUser(), adminDeleteUser(), adminSetUserBanned(), adminUpdateUser(), GET(), AdminUsersPage(), metadata, fields() (+14 more)

### Community 23 - "Community 23"
Cohesion: 0.18
Nodes (21): copy(), VisaPhotoPage(), copy(), speedMatch, VisaRequirementsPage(), HomeFaq(), faqsAr, faqsEn (+13 more)

### Community 24 - "Community 24"
Cohesion: 0.18
Nodes (21): WallOfLovePage(), StarRow(), HomeReviews(), FaqSection(), HowItWorks(), rejectionIcon(), Rejections(), ReviewsCarousel() (+13 more)

### Community 25 - "Community 25"
Cohesion: 0.16
Nodes (14): class-variance-authority@^0.7.1, class-variance-authority, cn, react, Button(), buttonVariants, Calendar(), CalendarDayButton() (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.17
Nodes (19): cell(), GET(), AdminApplicationsPage(), FilterLink(), metadata, AdminDestinationsPage(), metadata, AdminEventsPage() (+11 more)

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (18): AdminCitizenshipsPage(), metadata, HomePage(), PagesLayout(), generateMetadata(), VisaPage(), FooterGate(), MobileBottomNav() (+10 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (20): AccountPage(), generateMetadata(), accountStats(), listApplicationsForUser(), listDocumentsForUser(), listIssuedVisasForUser(), listPaymentsForUser(), staffChecks() (+12 more)

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (12): CommandDialog(), CommandInput(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader(), DialogOverlay(), DialogPortal() (+4 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (20): eslintConfig, devDependencies, eslint@^9, eslint-config-next@16.3.7, tailwindcss@^4, @tailwindcss/postcss@^4, @types/leaflet@^1.9.22, @types/node@^20 (+12 more)

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (14): @electric-sql/pglite@^0.5.8, @electric-sql/pglite, codes, missing, [{ n }], OfficialSource, officialSources, createDb() (+6 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (6): @base-ui/react, Badge(), badgeVariants, Progress(), ProgressIndicator(), ProgressTrack()

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (12): signOutAction(), ProfileGlyph(), UserMenu(), DropdownMenu(), DropdownMenuContent(), DropdownMenuGroup(), DropdownMenuItem(), DropdownMenuLabel() (+4 more)

### Community 35 - "Community 35"
Cohesion: 0.20
Nodes (14): EditorialPolicyPage(), generateMetadata(), PrivacyPage(), generateMetadata(), TermsPage(), FeeChangePage(), generateMetadata(), generateMetadata() (+6 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (18): BoltBadge(), ChevronIcon(), DocBadge(), P, PlaneBadge(), UmbrellaBadge(), countDelivery(), countDocs() (+10 more)

### Community 37 - "Community 37"
Cohesion: 0.16
Nodes (17): LangToggle(), LocaleSwitch(), rememberLocale(), useLocaleHref(), allowed, FaceBox, faceCount(), fileIssue() (+9 more)

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib (+11 more)

### Community 39 - "Community 39"
Cohesion: 0.16
Nodes (17): AdminHome(), metadata, AdminAreaChart(), applicationsByDay(), applicationStats(), queueCounts(), chargedTotal(), getDefaultVisaOption() (+9 more)

### Community 40 - "Community 40"
Cohesion: 0.26
Nodes (12): FilterMenu(), CitizenshipButton(), CitizenshipDialog(), CountryList(), Flag(), setCitizenshipCookie(), useCitizenship(), Dialog() (+4 more)

### Community 41 - "Community 41"
Cohesion: 0.20
Nodes (13): dynamic, GET(), deleteDestination(), clearDestinationMedia(), DestinationMediaKind, folder(), imageTypes, kinds (+5 more)

### Community 42 - "Community 42"
Cohesion: 0.26
Nodes (9): LocaleLayout(), readConsent(), SiteAnalytics(), choose(), writeConsent(), LiveCallWidget(), LocaleHtml(), PublicOnly() (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.43
Nodes (13): arabicFileCount(), button(), copy, esc(), lang(), manualCustomerMail(), row(), shell() (+5 more)

### Community 44 - "Community 44"
Cohesion: 0.24
Nodes (11): adminSaveSettingsForm(), AdminSettingsPage(), metadata, AdminField(), Check(), Field(), LogoField(), SettingsForm() (+3 more)

### Community 45 - "Community 45"
Cohesion: 0.30
Nodes (5): nextConfig, onRouterTransitionStart, onRequestError, register(), sentrySharedOptions()

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (12): scripts, build, db:migrate, db:reseed, db:seed-sql, dev, lint, ref:capture (+4 more)

### Community 47 - "Community 47"
Cohesion: 0.29
Nodes (7): POST(), GET(), recordFunnel(), aliases, FunnelEvent, funnelEvents, funnelName()

### Community 48 - "Community 48"
Cohesion: 0.29
Nodes (10): adminDeleteMessage(), adminReplyMessage(), adminSetMessageRead(), recordAudit(), AdminMessagesPage(), metadata, MessageList(), deleteContactMessage() (+2 more)

### Community 49 - "Community 49"
Cohesion: 0.35
Nodes (6): server-only, @supabase/ssr, useLiveApplication(), env, supabaseEnabled, getSupabaseBrowserClient()

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (8): searchHelpAction(), AskCatalog(), Diamond(), Footer(), FooterCol(), ReviewAvatars(), publicReviewStats(), searchHelp()

### Community 51 - "Community 51"
Cohesion: 0.29
Nodes (9): adminDeleteTravelEvent(), adminSaveTravelEvent(), countriesFor(), Country, empty, EventEditor(), EventForm(), deleteTravelEvent() (+1 more)

### Community 52 - "Community 52"
Cohesion: 0.27
Nodes (8): dynamic, GET(), dir, diskName(), mimes, readBrandLogo(), StoredLogo, types

### Community 53 - "Community 53"
Cohesion: 0.31
Nodes (7): Asterisk(), generateMetadata(), OnTimePage(), Logo(), COLORS, KEYS, OnTimeCircles()

### Community 54 - "Community 54"
Cohesion: 0.24
Nodes (3): SelectContent(), SelectScrollDownButton(), SelectScrollUpButton()

### Community 55 - "Community 55"
Cohesion: 0.36
Nodes (8): defaultExtras(), fromConfig(), knownCountries, normalizeCitizenshipCodes(), rate(), readExtras(), saveSiteSettings(), safePublicUrl()

### Community 56 - "Community 56"
Cohesion: 0.38
Nodes (8): Db, filesIn(), importDestinationMedia(), importLeftoverFiles(), importLogo(), importUploads(), mediaKinds, mimes

### Community 58 - "Community 58"
Cohesion: 0.38
Nodes (6): cards, docKey(), fix(), geo, out, slugOverrides

### Community 59 - "Community 59"
Cohesion: 0.53
Nodes (4): sendContactAction(), ContactPage(), generateMetadata(), ContactForm()

### Community 60 - "Community 60"
Cohesion: 0.33
Nodes (5): arabicFont, displayFont, fontVariables, sansFont, serifFont

## Knowledge Gaps
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Community 25` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 13`, `Community 14`, `Community 16`, `Community 17`, `Community 19`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 29`, `Community 33`, `Community 34`, `Community 36`, `Community 37`, `Community 40`, `Community 42`, `Community 44`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 53`, `Community 54`, `Community 57`, `Community 59`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05874125874125874 - nodes in this community are weakly interconnected._
- **Why does `next` connect `Community 16` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 34`, `Community 37`, `Community 39`, `Community 40`, `Community 42`, `Community 45`, `Community 47`, `Community 49`, `Community 50`, `Community 60`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07191961924907457 - nodes in this community are weakly interconnected._
- **Why does `t()` connect `Community 14` to `Community 1`, `Community 3`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 15`, `Community 16`, `Community 18`, `Community 19`, `Community 21`, `Community 23`, `Community 24`, `Community 27`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 40`, `Community 50`, `Community 53`, `Community 59`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0929281122150789 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10904255319148937 - nodes in this community are weakly interconnected._