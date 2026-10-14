# Release provenance

The previous owner-private terminal is preserved outside this checkout at ResearchValidation/2026-10-12-Public-Release/previous-hosted-dist. Its FX Kurumi-derived HTML, styles, chart/UI/Game/Market scripts, images and prior market tapes are excluded from the new static runtime.

| Material | Origin | Release treatment |
| --- | --- | --- |
| index.html, daily.html, terminal.css, app.mjs, daily.mjs | Independently authored for this replacement | MIT, original code only |
| core engine, clock, review, report, tape validation, feedback, sizing | Previously independently authored endgame modules; added relative to upstream8ff281a | Migrated with original-core notice; report updated for selected IEX rights |
| core session | Standalone createSession portion of our module | Upstream Game/Market adapter removed |
| core chapter validation | Our chapter validator | Restricted-market registry removed |
| vendor/lightweight-charts.js | TradingView Lightweight Charts5.2.1 | Unmodified distribution; Apache2.0 LICENSE/NOTICE and visible attribution retained |
| Six IEX quote packages | Derived from IEX HIST TOPS1.6 December24,2018; March16,2020; June11,2020 | Subject to IEX HIST terms; no MIT relicensing |
| sse-2024-600519.json | Official SSE daily OHLC, selected seven closes | CIIS 2026 policy permits EOD redistribution after midnight; no intraday/SZSE/BSE permission inferred |
| webb-2008-hsbc.json | David Webb's numerical ccass.quotes compilation, ten closes | CC BY 4.0; author attribution, transformation and full WEBB-NOTICE retained; no original HKEX report pages published |
| ecb-2015-chf.json, ecb-2016-gbp.json | ECB EXR daily reference observations | Accurate reproduction with attribution and modification disclosure; GBP/EUR is the explicitly rounded reciprocal of source GBP per EUR |
| usda-2011-cotton.json | USDA AMS annual table 3, own seven-market spot average | AMS reuse policy; 43 own observations only; ICE/Cotlook content excluded |

IEX HIST attribution and terms: https://www.iex.io/legal/hist-data-terms
TradingView source/tag: https://github.com/tradingview/lightweight-charts/tree/v5.2.1

The private Sites source repository retains prior deployment history. Only the newly verified static package is published for visitors. This history is not offered as a public GitHub fork. No customer, academic, personal account or employment data is included.

Source admission: compressed file size/hash and gzip integrity; PCAPNG framing; Ethernet/IPv4/UDP lengths; IEX transport protocol, sequence/offset continuity; state spin and full-day system events; eligibility and interval coverage. Retained quotes preserve original event nanoseconds, transport availability nanoseconds and raw source sequence. The quote sampling interval is disclosed. No price interpolation or trade-volume inference.

Only independently authored application code is covered by ORIGINAL-CODE-LICENSE.txt. Each data source and chart dependency retain separate terms. Public access does not imply provider endorsement.

Daily packages retain the original reference decimal, observation date, exact source request URL when applicable, original source bytes/hash, normalized row hash, transformations and limitations. Observation dates are coordinates only; no historical publication or quote-arrival time is fabricated. Next-observation fills, shared caps, starting accounts, mandates and timer are authored game assumptions. Missing dates remain missing. The cotton window has no April 22 value; no interpolation is applied.

Admission evidence is retained outside this checkout in ResearchValidation/2026-10-14-Chapter-Expansion. SSE values were independently matched to original JSON; HK extraction was matched to an independent DQS selection (72 rows, eight fields); ECB values were checked against CSV and ZIP, and exact request byte hashes reproduced; USDA's 43 values were matched to ten contemporary weekly reports using independent extraction. Known-history daily mandates are disclosed as authored practice, not a pre-registered trading evaluation.


## Intraday electricity clearing data

AEMO public DISPATCHPRICE NSW1 RRP for June 12, 2022 17:00–20:00 AEST supplies 37 genuine five-minute market-clearing observations. The original month ZIP is SHA-256 f62b069ca97c585b5e36d07570d02a545dfcde201f9e67ce40a38c3b8b345721; its CSV member is 2fa7dabacbb9e6218f3e175e034e195bbfb0f298a80f8830f30dd702367fa47e. The original RRP literals are encoded exactly at 1e5 and per-fill money rounded to AUD cents. Source keys, LASTCHANGED and all APC flags are preserved; ten flag-16 values are loss-factor-scaled settlement prices. No suspended, intervention, manual, cap or floor flagged records are included. ROP is not substituted.

[AEMO attribution permission](https://www.aemo.com.au/privacy-and-legal-notices/copyright-permissions) supports reuse of its public self-created material; data is not re-licensed under MIT. Interval-ending AEST coordinates map exactly to UTC, but are not asserted to be first-publication or quote-arrival timestamps. The original archive was finalized July 13. Fictional cash-settled electricity exposure is not physical storage/delivery, futures or broker execution. All prices in this admitted window are positive; general negative-price accounting is unsupported. Rebuild from the exact public ZIP with tools/build-intraday-clearing.py.


## Original FX price-tick compilation

Georgios Fatouros (INNOV ACTS LTD) and Konstantina Tripodi (JRC Capital Management Consultancy & Research GmbH) publish High frequency (tick data) of historical FOREX prices, version 1.0.1, DOI [10.5281/zenodo.7411148](https://zenodo.org/records/7411148), under CC BY 4.0. Original-file version 7411078 has the same published file MD5. The full attribution, primary license link and changes are retained in data/JRC-CC-BY-NOTICE.txt, the package, credits and downloaded report. JRC is a private company, not the European Commission Joint Research Centre. The originating API feed is unreported; this admission uses the author's numerical-compilation grant and does not claim comprehensive underlying vendor-rights certification.

Archive SHA-256: f70ea586c4ea33453df4c3d56120bd96407a36fe402833ea9b0246dc5e07f41f. EURUSD member SHA-256: 42639a0b82f059512c9b39a772f1c0c3b9c30bd87ee13c5575cf3400b56f6d89. All 714 original prices at source-clock 2022-03-07 14:00:01–14:29:58 and 238 preceding context observations retain original five-decimal prices and source ordinals. Context is chart-only and ends before takeover. Source timezone and bid/ask side are unreported: numeric coordinates are floating clock coordinates, not UTC; Up/Down fields are not treated as traded volume. No interpolation or fabricated spread. Fixed capacity, funded cash exposure, zero fees and routing are game assumptions.

The preselected February 24 window was empty; the whole February 2022 member period is missing. This failed intake is preserved outside the repository. The March 7 same-clock replacement was selected for observed coverage, before reading its price path; account targets retained the same 80% exposure/90% equity-floor formulas. This is known-history practice, not a blind evaluation. Rebuild from the exact original ZIP with tools/build-fx-price.py.

Before the named A-share author-compilation stage below, named A-share/Hong Kong original intraday records had not been admitted. Internal historical-data purchases, delayed display, static-browser redistribution and report export are different rights. Original technical samples lack a complete playable interval and public redistribution authorization. No samples, anonymous stock-return data or unlicensed vendor tapes are published.


## Named A-share author compilation

Primary [cooronxon/AShareTickData](https://huggingface.co/datasets/cooronxon/AShareTickData) DATA card, pinned revision cf50faff46a1118524c83b386f32e47d710441f4, explicitly grants MIT. [Hugging Face documentation](https://huggingface.co/docs/hub/repositories-licenses) describes card metadata as code/data permission; the same author's Mirro-Ex publication corroborates this exact dataset. This is a scoped author numerical-compilation grant, not permission inferred from a separate code licence. No file-specific contrary originating restriction was identified. Originating vendor identity/authority and direct exchange authentication remain unverified; no exchange licence or exhaustive upstream-rights certification is claimed. Standard terms and source attribution are retained in data/ASHARE-MIT-NOTICE.txt; no software copyright holder/year is borrowed for the data.

Exact original600900.XSHG Parquet SHA-256: 0b724b9350926a3abc5ce1bdb84ec4e200923a57a41bf5d4fe0bc2bbca8fbef4; pinned card SHA-256 ff6c3a6f10448a5c7abc9942dabb37c4083a6c7de249b75f3e5cc3e9cfb5aa9e. All600 original records at2026-05-06 09:30:01–09:59:58 UTC+8 retain cent bid/ask prices, Unix millisecond timestamps, original Parquet row ordinals211–810, source sequences and five-level fields. Depth is provenance only, not guaranteed fill capacity or traded volume. No sampling, interpolation, adjusted-price reconstruction or anonymization. The publisher asserts original L1 provenance; this was independently matched to its actual Parquet, not to an exchange-authorized feed.

Account rules apply the existing80% exposure/90% floor formulas with10000 inherited shares,100-share lots,1000-share shared fictional cap,6historical-second route and12x clock. Newly acquired units cannot be resold within the single UTC+8 trading date; inherited sells reduce eligibility permanently. This is a funded one-day consequence ofT+1, not a cross-day settlement system or guarantee of broker execution. Fees/stamp duty are deliberately zero assumptions. Rebuild from the exact public Parquet with tools/build-ashare-quotes.py (pyarrow required).

The author-licensed Mendeley minute compilation remains excluded because its named cash-stock prices have unspecified transformations/adjustment and do not lie on the original0.01 CNY quote grid. Its values are not silently rounded into executable prices. Anonymous stock-return alternatives remain excluded by user requirement. Original named Hong Kong intraday data is still not admitted.
