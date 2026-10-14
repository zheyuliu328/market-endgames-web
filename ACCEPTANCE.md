# Public replacement acceptance — 2026-10-14

Earlier sections preserve release history. The daily-expansion section supersedes their earlier two/six-chapter scope limitations; publication and anonymous access are recorded separately.

## Selected release

Independent terminal and authored account/replay core; unmodified Lightweight Charts5.2.1 with Apache2.0 notices and visible attribution; IEX HIST data with required attribution/terms. Original FX Kurumi runtime and prior market files excluded from dist. Previous deployment assets and checks preserved outside the checkout. Public source for the old derivative is not being distributed.

Two instruments in one U.S. equity event family: SPY and QQQ, March16,2020 14:00–14:30UTC. Original file:1,299,255,388bytes. Independent fullread:35,418,954packets,35,715,971messages;one session;no sequence/offsetgaps or transport time regressions;gzipCRC and O/S/R/M/E/C system events verified. No trade-break messages. Quote-only execution and candles; no fabricated trade volume or consolidated quotes.

SPY:53,671raw/eligiblequotes,1,623retained,maxgap~2.210s. QQQ:21,677rawquotes,20,395eligible;1,282one-sidedexcluded;1,411retained,maxgap~5.287s after upward millisecond rounding. AAPL rejected:119retained,maxgap185.060s,lastquote70.6s before interval end. It is absent from the public catalog.

## Actual browser tasks

Desktop SPY: invalid0.5shares rejected; corrected35-share doubleclick created only one order, followed by30 and15. Opening QQQ preview and returning preserved original account/clock/orders and SPY identity. Original closed cash25,099.30 +20shares*245.79 =30,015.10USD, mandate missed. Change firstquantity35→45:10shares,30,013.40USD, mandate met despite1.70USD lower equity. Twochanges45/50:zero shares,30,011.70USD; unchanged thirdorder15filled5,rejectedremainder. Thirdedit and blankinput rejected, oldcomparison cleared, downloadreverted to original-only. Downloaded original/revised ledgers independently reconciled with Decimal, perfill cent rounding and actual finalmark.

At390x844, QQQ1x:90-share sale doubleclick produced one order. Pause stopped marketclock; resume continued. Subsequent90-share buy filled10, then remaining80cancelled. Entire20-share position sale completed. Stop0rejected; corrected100trigger queued and expired untriggered. Original finalcash/equity25,029.70USD,zero shares. Skip cancelledbuy in review:25,030.80USD,stillmetmandate; later20-share sale onlyfilled10and rejectedremainder. Export verified independently against original source row bid/ask, later observation/time eligibility, shared10-sharecapacity and cancelled-order cutoff.12fills reconciled exactly.

No page/dialog horizontaloverflow at390px. Actual narrow UI inspected. Ticketquantity/type/stop preserved when previewing another chapter and returning. Completed QQQ account/report remained available after SPY preview and Escape.

## Observed failures and repairs

- Partial downloads stopped on interruption; resumed bounded ranges, verified direct storage prefix against official index link, merged exactbytes and passed fullgzipCRC.
- Initial whole-day admission blocked on AAPL; independent audit confirmed real lowcoverage. Excluded, never interpolated.
- Initial chapter rules omitted baseAsset/quoteAsset; standalone session rejected mismatch. Explicit assets added and checks passed.
- Preview restoration lost ticketinput/identity; both now restored. Completed session also retained. Pending network results invalidated on Back/Escape.
- Fetch had no deadline; now bounded20s with actionable retry, no synthetic fallback.
- Duplicate click/input errors:500ms identical-order guard and persistent inputerror separated from async execution feedback.
- Real pendingorder during quote gap was mislabeled as future decision on closed account. decisionStatus now uses not-reached label only for completed accounts; regression and repeated live pending task passed.

## Checks and evidence

Passed meaningful checks: ten independently constructed PCAPNG intake cases; quoteaccounting; wholelots; original/revisedreport; replaycascade/input validation; both actual chapter packages/independentcashsum/no futurechartpoints/tamperrejection; public package dependencies, English content, sourcehashes and rightsnotices.

Local evidence: ResearchValidation/2026-10-12-Public-Release/ independent-raw-audit.json, independent-window-audit.json, chapter-accounting-check.json, desktop-comparison.json, desktop-report.txt, desktop-independent-accounting.json, mobile-original.json, mobile-report.txt, mobile-independent-accounting.json, desktop-rework.png, mobile-rework.png. These tasks were operated by an agent; no human enjoyment/adoption or trading-profit claim.

## Residual scope

One venue, sampled quotes, fixed fictional capacity, no exchange queue/market impact or guaranteed execution. Two known-history equity challenges, not a multi-market release. No licensed HK/A-share/FX/commodity/options chapters yet. No live orders, accounts or leaderboard. Public deployment and anonymous access evidence are recorded separately after publication.


## Expansion acceptance — 2026-10-14

Native Chrome Incognito completed an unauthenticated public version5 SPY task, with no sign-in: take over, pause/resume, sell90, settle, revise90→80, compare, download the report. Original equity29862.10USD =27404.20cash+2457.90position; revised29880.70=24964.90+4915.80. The original meets the mandate; revised misses the position limit despite higher equity. Download completion was observed in Chrome; independent Decimal/source-row reconciliation passed9original and8revised fills. Evidence: anonymous-chrome-review.txt, anonymous-independent-accounting.json, anonymous-chrome-replay.png in ResearchValidation/2026-10-14-Chapter-Expansion. This closes the old guest-access gate for version5; the expansion publication is checked separately.

Four additional SPY/QQQ chapters were built without overwriting original IDs/files. December24,2018 window14:45–15:15UTC: archive539586078bytes,1480SPY/1362QQQ rows, maxgaps3.588s/4.297s. June11,2020 window13:45–14:15UTC: archive848542593bytes,1585SPY/1399QQQ rows,maxgaps2.404s/6.022s. Independent full-file parsers verified exact ten-field retained rows, sourcehashes, gzipEOF/CRC, global sequence/offset/send-time continuity and full-day system events. All retainedQflags0 and trading/operational statesT/N. Independent scripts and receipts are retained outside the public checkout. Mandates/windows were fixed before extracting either price path; narrative wording was updated after the quality audit without changing rules or prices.

The independent audit found genuine venue-local wide quotes. JuneQQQ has85retained spreads above1% ofbid; maximum absolute spread29.13USD. DecemberQQQ has63,max2.72USD. There is no documented extra non-firm flag and no parser mismatch. Quotes remain unchanged. The JuneQQQ brief explicitly says bid-marked losses do not describe a consolidatedQQQcrash. No price filtering or parameter adjustment was applied to improve outcomes.

Actual desktop DecemberSPY task:90-share doubleclick produced one order; settlement29982.70USD =27606.40cash+10*237.63. Revising to80 gives29976.50=25223.90+20*237.63 and misses the position limit. Actual narrow JuneQQQ task:0.5rejected; corrected90doubleclick produced one order; settled30025.40=27594.30+10*243.11. Revising to80 gives30040.10=25177.90+20*243.11 and misses the limit. Both downloaded reports passed independent Decimal/source-row audits. At390x844 browser override, page/client widths375, review scroll/client widths334; no horizontal overflow. Actual mobile screenshot reviewed. Report names capture and selected interval for new packages.

Meaningful quote/account/replay/report/intake checks passed for the added dates. This is six U.S.venue-specific equity chapters across three event dates. A-share/HK/FX/commodity chapters remain separate unfinished work; identified daily references are not represented as intraday quotes. No remote GitHubCI, human adoption, enjoyment, consolidated-market replay or live-trading claim is made.

## Daily expansion: actual local acceptance

Five admitted reference challenges add A-share, Hong Kong, CHF, GBP and cotton. Reference observations, dates, units, original decimals, source hashes and transformations passed independent source checks. No bid/ask, volume or minute-candle claim is made. Date-only reveal and fictional next-observation settlement are visible in the picker, chart, ticket and report.

Actual desktop A-share task: sell1,000, buy100 and sell100 at October9. The buy fills October10; resale remains pending until October11. Original equity1,907,574CNY with zero shares. Revise the first sale to800: equity1,902,895 =1,592,045cash+200*1,554.25, failing the position limit. Unedited order3 can now fill October10 because inherited shares remain. The updated browser comparison and downloaded report explicitly name this timing cascade; independent source-row/Decimal audit passed.

Actual 390x844 Hong Kong task:401 rejected against400-share lots;800 doubleclick created one order; first400 filled; remaining400 cancelled with completed fills preserved. A subsequent400 sale completed. Original192,680HKD =155,880cash+400*92. Skip the second sale:187,960 =114,360+800*92, missing both constraints. Picker-return preserves account identity, source and pending orders. Narrow dialog/page had no horizontal overflow.

Actual CHF task:9,000EUR sale fills in two batches. Automatic five-game-second reveals progressed through actual dates; pause and manual finish worked. Original19,780.60CHF =18,799cash+1,000*0.9816. Revise to4,000:18,683.60 =12,794+6,000*0.9816. GBP at390px: original19,991.87EUR =18,798.98+1,000*1.192889; revised4,000 yields19,444.66 =12,287.32+6,000*1.192889 with per-fill cent rounding. Blank revision gives an order-specific error, clears the prior table/curve and restores original-only export.

Actual cotton at390px:9,000-net-lb doubleclick creates one order; five later observations fill2,000/2,000/2,000/2,000/1,000. Original31,016.50USD =29,415.60cash+1,000*1.6009. Skip the sale:27,088 =11,079+10,000*1.6009, missing both constraints. Complete report/JSON downloaded; source-row, FIFO cap, later-date eligibility, cash/position curve and rounding independently reconciled. Page widths375/375 and dialog334/334, no horizontal overflow.

Repairs found during this phase: unsafe/NaN/fractional initial money is rejected; huge ticket input no longer crashes notional formatting; later order timing is included in affected-decision detection even when requested/filled quantity and status do not change; missing initial catalog cannot open an empty picker or create an unhandled rejection. One automated wait missed a transient CHF date while the game correctly kept advancing; one test selector used Sell instead of the visible Sell / reduce. Both operation failures were recorded and corrected, not reported as financial defects.

Evidence: external daily-browser directory contains all five text reports, accounting JSON, independent-record audit receipts and desktop/narrow screenshots; SSE final evidence uses the -current suffix after the cascade fix. Independent audit scripts/receipts preserve failed inputs and corrected outcomes. All tasks are agent-operated; human enjoyment and unassisted-user acceptance are not established.

Residual limits: daily data has no executable spread/arrival time or historical size; caps, fees (zero), orders and filled accounts are fictional. A-share resale/lot and HK lot assumptions are partial rules, not complete market microstructure. Commodity inventory is not futures and omits logistics/grading/storage. A shared date timer does not recreate second-by-second trading in these markets. Intraday capability remains the six IEX quote challenges. No public release of old derivative source history, live prices, options, broker accounts, leaderboard or production-compliance claim.


## Continuous intraday source candidate — October 14, 2026

This stage extends the earlier version7 scope to six IEX venue-quote chapters, one AEMO five-minute clearing chapter, one JRC published FX single-price tick chapter and five daily reference chapters. Daily A-share and Hong Kong chapters remain daily: identified original intraday equity coverage is still unmet. The user explicitly rejected anonymous stock-return/rebased-index alternatives, which are not bundled. None of the staged counts is proof of public publication by itself.

Action timing was challenged independently: elapsed wall time is flushed under the previous speed before order/cancel/speed actions, preventing backdated submissions or erasing fills that have already occurred. Fixed-speed timed mode adds disclosed routing delay and disables manual pause/speed/challenge switching while running. Hidden-tab interruption pauses safely, requires explicit resumption and marks assistance. Practice pause/preview/resume retains account/orders; reopening the picker before the first takeover respects the selected timed mode. Source-clock and literal-price tampering reject, and chart context ends before takeover.

AEMO source acceptance matches all37 RRP literals, interval-ending timestamps/keys/flags and original archive/member hashes. Six fixed account cases independently match Decimal fills, curves, routing, cancellation, expiry and report totals. Actual60x browser task:45MWh once despite doubleclick, five capped fills, closing cash35126.75AUD +5MWh marked1134.57 =36261.32AUD. Revision35MWh closes32421.47AUD. The simulated account is cash-settled positive-price electricity exposure, not executable quotes or physical inventory.

Actual390x844 SPY timed task: invalid0.5 shares rejected and recovered; first90-share order canceled before route arrival;80-share order filled; full playback; blank revision cleared stale conclusions, then90-share revision compared/downloaded. Original30033.30USD with20SPY misses the position cap; revised30033.10USD with10SPY meets it. Downloaded ledgers independently match source prices and per-fill Decimal cents. Page375/375 and review334/334 widths: no horizontal overflow.

FX original archive/member digests and all714 challenge +238 preceding context rows independently match published prices, literal times, original row ordinals and hashes. Eight fixed account cases independently challenge1000EUR lots,10000EUR shared FIFO capacity,6historical-second routing, late/exact deadline eligibility, cancellation/revision effects and full account curves/reports. The predeclared February24 window was empty and February is absent; the March7 same-clock alternate was selected for coverage without changing rule formulas. This failure is retained. Source timezone, quote side and originating API feed remain unreported; floating source time, scoped publisher CC grant and fictional next-tick execution are explicit throughout the UI/report.

Actual narrow FX12x uninterrupted task:1500EUR rejected,90000EUR doubleclick created one order, nine subsequent capped fills. Cash125247USD +10000EUR at1.09030 =136150USD, mandate met. Revision80000EUR:114355USD cash +20000EUR at1.09030 =136161USD, mandate missed despite11USD higher equity. The actual readable comparison report and complete account JSON were downloaded. Source/account independent reconciliation, screenshot and console evidence are retained outside the checkout under ResearchValidation/2026-10-14-Intraday-Expansion/browser. The one live browser task preceded the lot-shortcut patch; its manually entered valid quantities and financial result are unaffected. Latest shortcut verification is separate.

An initial regression pass exposed hardcoded four-decimal synthetic display expectations after instrument-specific price precision was added; numeric assertions were repaired and initial failure evidence preserved. No timing or monetary failure was hidden. Half-position shortcuts now round down to actual order lots, and revision fields use the declared lot increment.

Public source allowlist, exact source terms/hashes, English runtime, license notices and upstream-asset exclusion are checked by verify-public.py. Original synthetic route/action/pressure, quote/lot/replay/report and daily-reference regressions are distinct from actual browser acceptance. This repository has no remote GitHubCI workflow; no successful remote CI is claimed. Public packaging/pushed commit, deployment status, exact asset verification and fresh guest playthrough are recorded separately in the external stage release receipt after they actually occur. Source correctness and one controlled task do not establish human enjoyment, adoption, broker compliance or all-market completion.


## Named A-share continuous chapter — source acceptance

This stage supersedes the earlier candidate's A-share coverage gap: the catalogue has six IEX quote, one named600900.XSHG L1, one AEMO clearing, one FX price-tick and five daily-reference chapters. Hong Kong original intraday coverage remains unmet. The A-share author DATA-card MIT compilation grant is independently corroborated, with pinned card/hash and originating-vendor/direct-exchange-authentication residuals disclosed. All600 observations and13800 original fields match the published Parquet. No anonymous or transformed price substitute.

The intradayBuyLock rule defaults false for existing cases and requires a funded quote account within one UTC+8 date. Initial inherited units are eligible; every sell reduces eligibility and new buys never replenish it. An oversized sell fills only eligible inventory and explicitly rejects newly bought remainder. Fourteen original synthetic behavioral cases cover flag/funding/date negatives, FIFO, cancellation/routing, lots, replay and compatibility. Five actual-source fixed cases match independent Decimal fills, complete600-point curves and CNY reports.

Actual desktop12x task:150-share input rejected/recovered;1000-share buy doubleclick creates one order;11000-share sell fills10000 inherited and rejects locked remainder. Final cash313050CNY +1000shares*27.15 =340200CNY, mandate met. Revising the buy to2000 shares closes285860CNY cash +2000*27.15 =340160CNY, mandate missed because2000 shares remain locked. Both full600-point curves and11/12 fills independently match original bid/ask,6-second route readiness,1000-share cap, eligibility and actual downloaded report. Maximum declines1520/1540CNY; equity bridge-40 =cash-27190+marked-position27150. No interruption recorded. Screenshot/console/account/export evidence is retained outside this tree.

The final quote-fill table now labels Quote record ID instead of Trade ID; the original captured report predates this header-only clarification. Monetary or route results are unchanged.

Sites publication currently fails before version saving at the desktop file-upload transport to chatgpt.com/backend-api/files. The13-chapter source was pushed and packaged, but no new saved/deployed version was created. Shell endpoint reachability and process-proxy checks do not identify the underlying authenticated-upload failure. Existing Sites version7 remains public and unchanged. This limitation is distinct from code, data or account correctness. A separately verified original-code snapshot is prepared for authorized public GitHub Pages publication; actual remoteCI/deployment/guest results are recorded only after success. No private history, raw personal/academic/client material or restricted legacy terminal is included in the public snapshot.


## GitHub Pages public release — completed

Public original-code snapshot: github.com/zheyuliu328/market-endgames-web. GitHub Pages: https://zheyuliu328.github.io/market-endgames-web/. Deployed source f0ce567f46019c57f0959fa15bed4cf3fdaf079a; Actions38542609275 verify and deploy jobs both succeeded. This supersedes the earlier remoteCI-not-configured state for this public snapshot only.

Anonymous HTTP GETs matched all39 listed static assets and the exact release manifest. Fresh public IAB guest completed full12x take-over,1000-share buy,11000-share sell, settlement,2000-share revised buy, comparison and actual report download, without sign-in. Original312930CNY cash +1000*27.15 =340080CNY, mandate met; revised285640 +2000*27.15 =339940CNY, mandate missed. Both600-point curves and11/12 fills independently match raw Parquet, bid/ask prices, order routing/indices, shared cap and inherited/new inventory. Eligible0 and locked1000/2000. Bridge-140 =cash-27290 +mark27150. Recorded uninterrupted12x; no captured console warning/error. Evidence and independent receipts remain outside this tree under ResearchValidation/2026-10-14-Intraday-Expansion. FX and AEMO public entry packages also loaded with their correct data type/units; their completed local tasks and exact online byte checks are distinct from the full A-share public playthrough.

The existing Sites address remains version7 because its desktop upload failed before saving a new version. Public visitors should use the GitHub Pages address for this intraday release. Named original Hong Kong intraday coverage and further black-swan cases remain open. This closes the current source/account/remoteCI/publication/guest gates; it does not close all-market coverage or human playability/adoption gates.


## Final picker-timing repair

A public navigation check found stale60x/60-second briefing text after previewing the electricity chapter and returning to the completed12x/6-second A-share account. Account timing and previously audited financial results were unchanged. openBrief and Return/Escape restoration now recompute timing text for the restored selection. Two original synthetic actual-handler cases reproduce both failures on the prior code and pass on the repair, preserving original account JSON and selection. This UI-only patch requires fresh CI/public navigation acceptance; earlier full guest/Decimal evidence remains applicable to the unchanged engine/data.


Final picker repair publication passed: deployed source c86b36eb7c89ee653eed9b887053b2aa7d6849d0, Actions38544988076 verify/deploy success. Anonymous app/manifest bytes match; all other previously verified static/core/data files are unchanged. Actual public AEMO-preview→ReturnAshare→reopen shows12x/6-second help correctly. The full guest numerical gate remains the separate unchanged-core evidence above. Local preview has been stopped.
