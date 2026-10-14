# Market Endgames

A browser game about rescuing an inherited account. Place orders before the next observation, protect the equity floor, and reduce the position before the deadline. After settlement, change up to two decisions and compare the complete original and revised accounts. No sign-in, live orders, or data upload.

## Play

Open [the public game](https://zheyuliu328.github.io/market-endgames-web/) and select **Intraday challenges** or **Daily challenges**. Choose a challenge, read the position and mandate, then take over the account. Enter an order quantity, buy or reduce the position, and watch fills. Timed mode runs at the declared fixed speed with simulated order routing and no manual pause. Practice mode permits pause and speed controls. Finish the interval, open **Review decisions**, compare a revised quantity (zero skips an order), and download the report.

The report includes source attribution and hashes, original observations, execution assumptions, orders, per-fill cash/position reconciliation, original and revised results, affected later orders, and limitations. Changing a revision clears stale results. Repeated attempts are known-history practice.

## Fourteen challenges

| Market | Historical input | Cadence |
| --- | --- | --- |
| U.S. equities | SPY and QQQ on December 24, 2018; March 16, 2020; June 11, 2020 | Six sampled IEX venue-quote challenges |
| A-share | 600900.XSHG, May 6, 2026; 600519.SSE, September 30–October 15, 2024 | One original L1 snapshot challenge; seven daily closes |
| Hong Kong | HSBC, October 20–31, 2008 | Ten actual daily closes |
| FX | EURUSD, March 7, 2022; EUR/CHF, January 12–23, 2015; GBP/EUR, June 20–July 1, 2016 | One original price-tick challenge; two daily ECB challenges |
| Commodity | NSW electricity, June 12, 2022; upland cotton, March 1–April 29, 2011 | One AEMO five-minute clearing challenge; forty-three daily cotton references |

Daily dates are observation-date coordinates, not historical publication or quote-arrival timestamps. The 2/5/10-second reveal timer is a game convention. Orders use the next unseen reference and a shared fictional capacity. No quotes are invented between dates. A-share orders use 100-share lots and a simplified next-observation resale restriction; HSBC uses a disclosed historical 400-share lot assumption. These are funded long-only accounts, not full reproductions of exchange or broker rules. Cotton represents virtual cash inventory in net pounds, not futures.

## Code and data rights

The HTML/CSS, interaction layer, integer accounting and replay core are independently authored. Original code is MIT; TradingView Lightweight Charts 5.2.1 retains Apache-2.0 LICENSE/NOTICE and visible attribution. The old unlicensed FX Kurumi runtime and tapes are excluded. This public repository starts from the verified current original-code tree. The separate Sites source repository retains its private deployment history. That prior history is not included here.

Each dataset has separate terms and transformation notices in its package, the on-page **Data & rules** view, report, and [credits](dist/credits.html): IEX HIST, AEMO attribution permission, the INFINITECH/JRC publisher's CC BY compilation grant, cooronxon's primary DATA MIT grant, SSE EOD redistribution policy, David Webb's CC BY numerical compilation, ECB accurate-reproduction permission, and USDA AMS reuse policy. The Webb permission does not license original HKEX report pages. No private/client/academic material is bundled.

Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to the [IEX Historical Data Terms of Use](https://www.iex.io/legal/hist-data-terms). IEX-only quotes are not consolidated U.S. quotes or NBBO; quote candles are not trade OHLC. Wide venue spreads can drive losses and do not describe a consolidated-market crash.

## Reproduce and verify

Serve `dist/` using `python3 tools/serve-preview.py`. Run the accounting, order-lot, review, report, quote-chapter and reference-chapter checks in `tools/verify-*.mjs`; run `python3 tools/verify-public.py` to check dependencies, English content, admitted source files, notices and hashes. The reference-record checker independently audits actual exported accounting JSON against source rows using Decimal arithmetic.

IEX intake: `tools/download-iex.py`, `tools/import-iex.py`, and `tools/build-chapters.py` use explicit dates and intervals; raw captures remain in an external evidence directory. Reference intake: `tools/build-reference-chapters.py` takes the separately verified source-evidence directory and materializes admitted date subsets with their original decimals and transformations. It preserves the six existing quote IDs/files. Original source request URLs and hashes are retained; large raw archives and local independent audit receipts are not deployed.

See [PROVENANCE.md](PROVENANCE.md) for rights boundaries and [ACCEPTANCE.md](ACCEPTANCE.md) for actual browser tasks and repairs. Local checks, production publication and anonymous-browser acceptance are distinct gates. This is a historical challenge game with fictional execution: no exchange queue, inferred historical liquidity, guaranteed fills, human adoption, production brokerage compliance, or demonstrated trading skill.


## Continuous timing and electricity

The intraday entry now offers fixed-speed timed challenges with explicit simulation routing delay and no manual pause. Real source records determine every price and fill; the clock advances between records without inventing prices. Hidden-tab interruptions require explicit resumption and are reported as assistance. Practice retains pause/speed controls and zero added routing delay. Replaying quantities retains order, cancellation and routing times. A click flushes elapsed time under the speed already in effect before any order or speed change.

The seventh intraday chapter uses actual AEMO NSW five-minute electricity settlement prices during the 2022 energy crisis. It is a fictional cash-settled exposure, not physical inventory or executable exchange quotes. Starting equity follows a fixed 80% exposure formula; the closing floor is 90% of that equity. Actual prices, five-minute cadence and adjustment flags are retained. EURUSD uses 714 original published single-price ticks with 238 preceding chart-only observations. The publisher grants CC BY 4.0; timezone, quote side and originating API feed are unreported, so the page/report use a floating source clock and fictional next-tick cash settlement. No bid/ask, volume or missing records are invented. Rebuild the exact ZIP with tools/build-fx-price.py. The initially requested February 24 window was empty because the member omits February; the March 7 replacement was selected by coverage, with the same account/route rules.

These additions establish a price-tick FX exercise and five-minute electricity clearing exercise. An A-share morning chapter now uses 600900.XSHG original publisher L1 snapshots at their observed 2/3/4-second cadence. The primary author DATA card grants MIT for its numerical compilation; author attribution, full standard terms, pinned card/source hashes and residual originating-feed uncertainty are preserved. This is not direct exchange/vendor clearance or independently exchange-authenticated history. The known ordinary morning is not presented as a black-swan event. Rebuild with tools/build-ashare-quotes.py and pyarrow.

The funded A-share case uses 100-share order lots. Its inherited shares can be sold, but shares bought during the same-day chapter never replenish sellable inventory. This models the within-day consequence of T+1, without modeling next-day release, auctions or full broker fees. Reports explain partial rejection of newly bought shares; the ticket shows total, eligible and locked holdings.

Hong Kong still has only a daily chapter: named original intraday coverage with a usable public grant remains unmet. Anonymous stock returns are excluded. Fourteen chapters retain their separate explicit data types and originating-rights limits; they are not fourteen authenticated executable quote streams.


## Public hosting

GitHub Pages serves dist/ as a static game. CI checks original synthetic accounting, replay, timing and resale-lock fixtures, actual admitted packages, source-specific licences, hashes and English content before deployment. No server, account, upload or real order endpoint is used. The separate earlier Sites URL remains on version7 until its desktop archive-upload transport recovers; it is not the current intraday release. Remote verification and deployment succeeded for source f0ce567f46019c57f0959fa15bed4cf3fdaf079a. [CI receipt](https://github.com/zheyuliu328/market-endgames-web/actions/runs/38542609275). Anonymous requests match every published manifest entry; a fresh no-sign-in browser completed take-over, buy/sell, settlement, revision and report download. The captured original/revised accounts independently reconcile against the published source. No human adoption or enjoyment is inferred.


Latest interface repair: source c86b36eb7c89ee653eed9b887053b2aa7d6849d0, [successful CI/deployment](https://github.com/zheyuliu328/market-endgames-web/actions/runs/38544988076). Returning from another challenge now restores the correct timing briefing; actual public navigation and published app/manifest hashes pass. Account engine and licensed source data are unchanged from the complete guest numerical acceptance.
