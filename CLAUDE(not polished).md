# VerifAI — Claude Code Context

## What this project is

VerifAI is an AI-powered dispute arbitration system built on blockchain. The core idea is simple but powerful: when two parties have a disagreement (say, a freelancer and a client disputing whether work was delivered), both sides submit their evidence into a system where it gets locked immutably on-chain. An AI then reads that locked evidence and issues a binding ruling, which triggers automatic payment release.

The key innovation — and what makes this different from anything that exists today — is that evidence is cryptographically frozen *before* the AI ever sees it. Neither party can edit, add to, or game their submission once the window closes. The AI is therefore ruling on tamper-proof facts, not on whoever wrote the better last-minute argument.

## The problem it solves

Traditional dispute resolution (courts, arbitration firms, even platforms like PayPal disputes) is slow, expensive, biased toward whoever has better lawyers or more leverage, and entirely centralised. Existing blockchain arbitration products like Kleros use token voting, which is slow and requires coordinating a jury of strangers. VerifAI cuts that down to under 60 seconds using AI, while keeping the trustless, tamper-proof guarantees that blockchain provides.

## Hackathon context — read this carefully

This project is being built at **AI London 2026**, a 48-hour hackathon at the Encode Hub in Shoreditch, London. The event runs from Friday 20 March to Sunday 22 March 2026. Demos happen Sunday at 4pm GMT.

This means the codebase is being built rapidly under time pressure by a team of 5 people working in parallel on different components. Code should therefore prioritise working demos over perfect architecture. If there is a choice between a clean abstraction that takes 3 hours and a hardcoded shortcut that takes 20 minutes and still demonstrates the concept, choose the shortcut and leave a TODO comment. The goal is a live, end-to-end demo on stage — not production-ready software.

We are entering two tracks simultaneously: **Onchain AI** (primary) and **AI Agents** (secondary). Onchain AI judges care about whether the blockchain is *essential* to the product — it is here, because without on-chain evidence locking, the AI ruling means nothing. AI Agents judges care about autonomy and usefulness. Both are satisfied by this architecture.

Sponsors we are building with: **Base** (the blockchain), **Anthropic/Claude** (the AI), **Vercel** (frontend deployment). Lean on free tiers and hackathon credits. Do not over-engineer infrastructure.

## Full application flow

The application has five distinct phases. Understanding all of them before writing any code is essential.

**Phase 1 — Dispute creation.** Two parties connect their crypto wallets to the frontend. Party A initiates a dispute by depositing funds into the smart contract and specifying Party B's wallet address. Party B then also deposits a stake. The Solidity contract holds both deposits in escrow and records the dispute as open. Neither party can withdraw until a ruling is issued. The contract also starts a countdown timer — the evidence submission window.

**Phase 2 — Evidence submission.** Within the time window (24 hours in production; set to 5 minutes for the demo), both parties upload their evidence files through the frontend. The frontend uploads each file to IPFS and receives back a CID — a Content Identifier, which is a cryptographic hash of the file contents. That CID is then written to the smart contract as an on-chain transaction. The blockchain now has a permanent, timestamped record of exactly what each party submitted.

**Phase 3 — Window closes.** Once the timer expires, the contract enters a locked state. Any further calls to `submitEvidence` will revert. This is the critical moment — from here, nobody can alter what the AI is going to read. The evidence is frozen.

**Phase 4 — AI ruling.** The agent service fetches both CIDs from the contract, retrieves the actual files from IPFS, and assembles them into a structured prompt for Claude. Claude reads both submissions and streams a ruling back in real time. This streaming output is displayed live in the frontend so users can watch the AI reason through the case. Once complete, the ruling text is hashed (SHA-256) and that hash is written back to the contract — so the ruling itself is also immutable and on-chain.

**Phase 5 — Payout.** The smart contract reads the ruling, identifies the winner, and automatically releases the escrowed funds to the winning party. Both the ruling hash and the outcome are permanently recorded on-chain as a precedent record.

## Repository structure

```
verifai/
├── contracts/        # Solidity smart contracts (Hardhat)
├── ipfs/             # Evidence upload/retrieval pipeline
├── agent/            # Claude API integration and ruling logic
├── frontend/         # Next.js app — the UI users interact with
└── scripts/          # Deployment, seeding, and demo helper scripts
```

## Tech stack

**Blockchain — Base (Sepolia testnet).** Base is an Ethereum Layer 2 with low gas fees, standard Solidity/EVM tooling, and is a hackathon sponsor. Always deploy to Base Sepolia — never use real money or mainnet.

**AI — Claude claude-sonnet-4-20250514.** Use streaming so the ruling appears word-by-word in the UI. Do not use a smaller model; reasoning quality matters for the judges.

**Frontend — Next.js with wagmi + viem.** Use wagmi's `useContractWrite` and `useContractRead` hooks for all contract interaction. Use ConnectKit or RainbowKit for wallet connection — both set up in under 30 minutes.

**IPFS — Pinata or web3.storage.** Use their hosted REST APIs. Do not attempt to run a local IPFS node.

## Smart contract

The contract is the backbone of the system. It needs to hold escrow funds, store IPFS CIDs, enforce the time window, accept the ruling hash from the oracle wallet, and release funds. Keep it as simple as possible — one contract, one dispute at a time is fine for the demo.

```solidity
function openDispute(address partyB) external payable;
function submitEvidence(bytes32 disputeId, string calldata ipfsCid) external;
function closeWindow(bytes32 disputeId) external;
function submitRuling(bytes32 disputeId, bytes32 rulingHash, address winner) external onlyOracle;
function releaseFunds(bytes32 disputeId) external;
```

The `submitRuling` function must be protected by an `onlyOracle` modifier — only the agent's wallet can write the ruling. This is important for the security story when pitching.

## Agent prompt structure

The agent fetches both evidence files from IPFS and builds the following prompt. The framing — that evidence is cryptographically immutable — is both accurate and makes for a compelling demo narrative.

```
You are an impartial arbitration agent. The evidence below was submitted on-chain
by both parties within a fixed time window. It is cryptographically immutable —
neither party has been able to alter it since the window closed.

DISPUTE ID: {disputeId}

PARTY A EVIDENCE (verified IPFS CID: {cidA}):
{evidenceTextA}

PARTY B EVIDENCE (verified IPFS CID: {cidB}):
{evidenceTextB}

Review both submissions and issue a ruling. Your response must include:
1. A summary of each party's position
2. Your assessment of the strength of each submission
3. Your final ruling — who wins, and why
4. End with exactly one of: RULING: PARTY_A or RULING: PARTY_B

Your ruling will be hashed and written permanently to the blockchain.
```

The `RULING: PARTY_A` / `RULING: PARTY_B` line is machine-parsed to determine who receives the funds. Everything before it is reasoning, displayed live in the UI.

## Frontend screens required

Three screens are needed for the demo to function. First, a dispute creation screen where Party A connects their wallet, enters Party B's address, and deposits funds. Second, an evidence submission screen (shared by both parties) where they upload a file, see it pinned to IPFS, and confirm the CID is written on-chain. Third, a ruling screen showing the countdown timer, a "trigger ruling" button (can be manual for the demo), the live Claude streaming output, and a final payout confirmation.

For the demo, have a pre-seeded dispute ready in `scripts/seed.ts` so you do not waste stage time on wallet setup. The seed script should create a dispute and submit evidence from both sides programmatically.

## Environment variables

```
ANTHROPIC_API_KEY=
ORACLE_PRIVATE_KEY=              # agent wallet — signs the ruling transaction
RPC_URL=                         # https://sepolia.base.org
PINATA_API_KEY=
PINATA_SECRET=
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_RPC_URL=
```

Never commit `.env` to git. Add it to `.gitignore` immediately.

## What a winning demo looks like

The judges see a 3-minute pitch and live demo. The five moments that must land cleanly, in order: funds visibly locked in the contract (show Basescan), evidence CIDs written on-chain (show the transaction), the window closing and a late submission reverting, Claude's ruling streaming live word by word, and the payout transaction firing automatically. If all five land, this wins.

Pitch hook: *"Courts take months and cost thousands. VerifAI locks evidence on-chain so nobody can tamper with it, then an AI reads it and issues a binding ruling in under 60 seconds. The contract executes itself."*

## Common pitfalls

IPFS retrieval can be slow — cache evidence text locally after first fetch rather than re-fetching. Claude streaming needs CORS handled correctly; proxy through a Next.js API route rather than calling the Anthropic API directly from the browser. Hardhat's local node resets on restart — use Base Sepolia for anything that needs to persist across the weekend. Gas estimation can fail on Base Sepolia under congestion; add a manual `gasLimit` override on critical transactions as a fallback.