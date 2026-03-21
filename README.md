# VerifAI

We built a trustless Web3 freelance platform where gig deliverables uploaded to IPFS are evaluated by an autonomous AI arbitration engine (Mixture-of-Agents) to settle escrowed funds via smart contracts.

We use the Ethereum blockchain to handle payments, with wallet addresses as user identifiers. The platform works as follows:

A buyer deposits ETH into escrow via a smart contract, defining strict requirements for the freelance gig.
The freelancer completes the work and uploads deliverables (eg: code, images, documents) to IPFS, with content hashes stored on-chain to ensure immutability and prevent tampering.
The backend triggers a LangGraph pipeline, where a modality router extracts structured context from each file.
An orchestrator parses the buyer’s requirements, clusters them logically, and dynamically instantiates specialised sub-agents to evaluate fulfilment.
These agents assess assigned criteria in parallel against the submitted evidence. If the aggregated confidence score exceeds the threshold, the smart contract releases escrowed funds to the freelancer without human intervention.

This architecture removes the 15–20% commission fees typical of major freelance platforms and eliminates dispute delays. The Mixture-of-Agents (MoA) design reduces LLM hallucination, preventing buyers from rejecting valid work and sellers from submitting low-quality deliverables.

## Tech Stack

**Frontend:** [`Next.js 16 (Turbopack)`](https://nextjs.org/docs) · [`Tailwind CSS 4`](https://tailwindcss.com/docs) · [`shadcn/ui`](https://ui.shadcn.com/docs/components) · [`Lucide React`](https://lucide.dev/icons/) · [`Sonner`](https://sonner.emilkowal.ski/) · [`Motion`](https://motion.dev/docs/react)

**Backend:** [`FastAPI`](https://fastapi.tiangolo.com/) · `Python 3.13+`

**Linting:** [`Ruff`](https://docs.astral.sh/ruff/) (Python) · [`ESLint`](https://eslint.org/docs/latest/) (TypeScript)

**Package Managers:** [`pnpm`](https://pnpm.io/) (TypeScript) · [`uv`](https://docs.astral.sh/uv/) (Python)

## Prerequisites

- [pnpm](https://pnpm.io/installation) — fast Node.js package manager
- [uv](https://docs.astral.sh/uv/getting-started/installation/) — fast Python package manager

## Quick Start

```bash
# Install dependencies
pnpm install && uv sync

# Run frontend (localhost:3000)
pnpm dev

# Run backend (localhost:8000)
uv run fastapi dev backend/main.py
```

## Project Structure

```
app/            -> Next.js frontend
backend/        -> FastAPI backend
components/ui/  -> shadcn/ui components
```

## Commands

```bash
# Add shadcn component (from root directory)
pnpm dlx shadcn@latest add button

# Linting and formatting
uv run ruff check --fix backend/
uv run ruff format backend/
pnpm run lint --fix
```

## Licence

[MIT License](LICENSE)
