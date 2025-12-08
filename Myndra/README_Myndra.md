# Myndra - Multi-Agent RL Framework

**Version:** 2.0  
**Author:** Yosef Shammout (Wayne State University)

---

## Overview

Myndra is a research framework for **planner-aware multi-agent reinforcement learning (MARL)**. It demonstrates how lightweight goal decomposition from a deterministic planner can be injected into agent observations to improve coordination.

### Key Capabilities

1. **Multi-Agent Orchestration** - LLM-driven task decomposition and agent coordination
2. **MARL Research** - PPO-based training with planner context injection
3. **Radiology Pipelines** - Pneumonia and cardiomegaly detection using DenseNet121

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR                            │
│  ┌─────────┐   ┌────────┐   ┌─────────┐   ┌─────────┐          │
│  │  Plan   │ → │ Assign │ → │ Execute │ → │  Adapt  │          │
│  └─────────┘   └────────┘   └─────────┘   └─────────┘          │
│       ↓                          ↓                              │
│  ┌─────────┐              ┌──────────────┐                      │
│  │ Planner │              │    Agents    │                      │
│  │ (LLM)   │              │ (Data/Analyst│                      │
│  └─────────┘              │  /Summarizer)│                      │
│                           └──────────────┘                      │
│                                  ↓                              │
│                          ┌──────────────┐                       │
│                          │Shared Memory │                       │
│                          │(Episodic+KG) │                       │
│                          └──────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Installation

```bash
cd Myndra
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

### Run Orchestrator Demo

```bash
python main.py
```

### Run MARL Training

```bash
# Baseline IPPO
python scripts/run_marl.py --env simple_spread_v3 --method ippo --seeds 3 --steps 5000

# Planner-aware Myndra-MAPPO
python scripts/run_marl.py --env simple_spread_v3 --method myndra_mappo --seeds 3 --steps 5000 --interval 32
```

### Run Radiology API

```bash
uvicorn backend.main:app --reload --port 8000
```

### Run Tests

```bash
pytest tests/ -v
```

---

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `agents/` | Agent implementations (Base, Data, Analyst, Summarizer, etc.) |
| `backend/` | FastAPI radiology API |
| `domains/` | Domain-specific pipelines (radiology) |
| `marl/` | Multi-agent RL training (PPO, environment wrapper) |
| `memory/` | Shared memory (Episodic + Knowledge Graph) |
| `orchestrator/` | Central planning and coordination |
| `scripts/` | CLI entry points for experiments |
| `systems/` | Infrastructure (profiler, async runtime) |
| `tests/` | Unit and integration tests |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for LLM planner | Required |
| `MYNDRA_USE_LLM` | Enable LLM-based planning | `0` |
| `MYNDRA_PLANNER_MODEL` | Model for LLM planner | `gpt-4o-mini` |
| `MYNDRA_DEVICE` | Device for inference (cpu/cuda) | `cpu` |

---

## Relationship to LoopGuard

This repository is part of the **AstraHealth** mono-repo:

```
AstraHealth/
├── Myndra/        # This project - MARL research framework
└── loopguard/     # Clinical workflow app (separate project)
```

Myndra and LoopGuard are **independent projects** that share:
- Common testing patterns (pytest)
- Configuration approach (python-dotenv)
- Infrastructure utilities (profiler)

There are **no direct code dependencies** between them.

---

## License

MIT License - See LICENSE file for details.

---

*For detailed implementation notes, see [MYNDRA_NOTES.md](./MYNDRA_NOTES.md)*
