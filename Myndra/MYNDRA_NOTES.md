# Myndra Project Notes & Cleanup Plan

**Date:** December 2024  
**Purpose:** Phase 0 discovery summary for LoopGuard integration project  
**Author:** Architecture Review

---

## 1. Project Overview

Myndra is a **planner-aware multi-agent reinforcement learning (MARL) framework** that combines:
- LLM-based planners for goal decomposition
- Policy actors (PPO agents) for decision-making
- Graph-based memory for long-term reasoning
- Radiology domain pipelines (pneumonia/cardiomegaly detection)

The project demonstrates two main capabilities:
1. **Multi-agent orchestration** with LLM-driven planning and agent coordination
2. **MARL research** with planner context injection, multi-actor rollouts, and ablation studies

---

## 2. Folder Structure

```
Myndra/
├── agents/                    # Agent implementations
│   ├── base_agent.py          # Abstract base class for all agents
│   ├── agent_registry.py      # Factory pattern for agent creation
│   ├── analyst_agent.py       # Analysis-focused agent
│   ├── data_agent.py          # Data gathering agent
│   ├── summarizer_agent.py    # LLM-powered summarization agent
│   ├── general_agent.py       # Fallback general-purpose agent
│   └── moldable_agent.py      # Adaptive agent variant
│
├── backend/                   # FastAPI radiology API
│   ├── main.py                # FastAPI app with radiology endpoints
│   ├── schemas/               # Pydantic response models
│   └── services/              # Myndra runner integration
│
├── domains/                   # Domain-specific pipelines
│   ├── radiology_common/      # Shared preprocessing, model loading
│   ├── radiology_pneumonia/   # Pneumonia detection pipeline
│   └── radiology_cardiomegaly/# Cardiomegaly detection pipeline
│
├── interface/                 # (Empty) CLI/UI placeholders
│   ├── cli.py
│   └── ui.py
│
├── logs/                      # Runtime logs
│
├── marl/                      # Multi-Agent RL module
│   ├── env_wrapper.py         # PettingZoo environment wrapper
│   └── train_ppo.py           # PPO agent + training loop
│
├── memory/                    # Shared memory system
│   ├── memory_module.py       # EpisodicMemory, KnowledgeGraph, SharedMemory
│   └── memory_types.py        # Constants, helpers, EdgeType enum
│
├── orchestrator/              # Central orchestration logic
│   ├── orchestrator.py        # Plan → Assign → Execute → Adapt pipeline
│   └── planner.py             # Rule-based + LLM planner adapters
│
├── results/                   # Experiment outputs (CSV, JSON, PNG)
│
├── scripts/                   # Entry point scripts
│   ├── run_marl.py            # CLI for MARL experiments
│   ├── plot_curves.py         # Learning curve visualization
│   ├── plot_scaling.py        # Actor scaling analysis
│   ├── plot_ablations.py      # Method comparison plots
│   └── analyze_image.py       # Image analysis utility
│
├── systems/                   # Infrastructure utilities
│   ├── profiler.py            # Timing and metrics collection
│   └── async_runtime.py       # Async batch execution
│
├── tests/                     # Test suite
│   ├── test_episodic.py       # Episodic memory tests
│   ├── test_kg.py             # Knowledge graph tests
│   ├── test_shared.py         # SharedMemory integration tests
│   ├── test_env.py            # Environment wrapper tests
│   └── test_radiology_pipeline.py
│
├── .github/workflows/         # CI/CD
│   └── python-tests.yml       # pytest on push/PR
│
├── main.py                    # Orchestrator demo entry point
├── test_pipeline.py           # Radiology pipeline smoke test
├── requirements.txt           # Python dependencies
├── README.md                  # v2 documentation
└── MYNDRA_V2_SUMMARY.md       # Implementation summary
```

---

## 3. Main Components

### 3.1 Orchestrator (`orchestrator/`)
- **Orchestrator class:** Central pipeline: `plan() → assign() → execute() → adapt()`
- **PlannerAdapter:** Switches between rule-based and LLM-based planning
- **LLMPlanner:** GPT-powered task decomposition with JSON schema enforcement
- Uses profiler for latency tracking at each stage

### 3.2 Agents (`agents/`)
- **BaseAgent:** Abstract class with `act()` and `reflect()` methods
- **Specialized agents:** DataAgent, AnalystAgent, SummarizerAgent, GeneralAgent, MoldableAgent
- **Registry pattern:** `get_agent()` factory with alias mapping

### 3.3 Memory System (`memory/`)
- **EpisodicMemory:** Per-agent event buffer with FIFO eviction
- **KnowledgeGraph:** NetworkX-based directed graph for semantic relationships
- **SharedMemory:** Facade combining both with hybrid search scoring

### 3.4 MARL Module (`marl/`)
- **MyndraEnvWrapper:** PettingZoo wrapper with planner context injection
- **PPOAgent:** Actor-critic with clipped surrogate loss
- **StubPlanner:** Lightweight deterministic context generator
- Supports multi-actor rollouts, AMP, torch.compile()

### 3.5 Radiology Domain (`domains/`, `backend/`)
- Pre-trained DenseNet121 models (torchxrayvision)
- Pipelines for pneumonia and cardiomegaly detection
- FastAPI backend for image upload and analysis
- CAM-based heatmap generation

### 3.6 Infrastructure (`systems/`)
- **Profiler:** Context-managed timing + GPU utilization sampling
- **AsyncRuntime:** Asyncio-based concurrent agent execution

---

## 4. Key Entry Points

| Entry Point | Purpose |
|-------------|---------|
| `main.py` | Demo orchestration pipeline with sample goal |
| `scripts/run_marl.py` | CLI for MARL experiments (--env, --method, --seeds, etc.) |
| `test_pipeline.py` | Smoke test for radiology pipelines |
| `backend/main.py` | FastAPI server (run with uvicorn) |
| `pytest tests/` | Run unit test suite |

---

## 5. Reusable Infrastructure for LoopGuard

The following components can be extracted or referenced:

| Component | Location | Reuse Strategy |
|-----------|----------|----------------|
| **Profiler** | `systems/profiler.py` | Copy to shared `libs/` module |
| **Config pattern** | `.env` + `python-dotenv` | Same pattern for LoopGuard |
| **BaseAgent pattern** | `agents/base_agent.py` | Reference for domain service interfaces |
| **CI workflow** | `.github/workflows/` | Extend for LoopGuard |
| **FastAPI patterns** | `backend/main.py` | Reference (needs refactoring for clean architecture) |
| **Testing patterns** | `tests/` | pytest fixtures, structure |

---

## 6. Identified Issues

### 6.1 Dead Code / Unused Modules
- [ ] `interface/cli.py` - Empty file (0 bytes)
- [ ] `interface/ui.py` - Empty file (0 bytes)
- [ ] `agents/Planner` class in `planner.py` - Unused (superseded by LLMPlanner)

### 6.2 Type Hints
- [ ] `BaseAgent.__init__()` - Missing type annotations for parameters
- [ ] `Orchestrator.__init__()` - `registry` parameter is unused (always None)
- [ ] `SharedMemory.write()` - Return type not annotated
- [ ] `PPOAgent` methods - Missing return type hints

### 6.3 SOLID Violations
- **SRP:** `backend/main.py` mixes routing, business logic, metrics, and storage
- **DIP:** `Orchestrator` directly instantiates `PlannerAdapter` instead of accepting interface
- **OCP:** Agent registry uses hard-coded dict instead of auto-discovery or plugins

### 6.4 Code Quality
- [ ] Duplicate metrics updates in `backend/main.py` (both in `_store_case` and endpoint handlers)
- [ ] `LLMPlanner.parse_llm_json()` has inline `import re` (should be at module top)
- [ ] `PPOAgent.update()` has inline `import numpy as np` (already imported at top)
- [ ] Some docstrings use inconsistent formats

### 6.5 Potential Bugs
- [ ] `datetime.utcnow()` is deprecated in Python 3.12+ (use `datetime.now(timezone.utc)`)
- [ ] Thread-safety: `system_metrics` dict mutations in `backend/main.py` are not fully protected

---

## 7. Proposed Cleanup Plan (Phase 1)

### 7.1 Safe Refactors (No Behavioral Changes)
1. **Remove dead code:**
   - Delete empty `interface/cli.py` and `interface/ui.py`
   - Remove or mark `Planner` class as deprecated

2. **Add type hints:**
   - `BaseAgent.__init__(self, name: str, role: str, memory: SharedMemory)`
   - `Orchestrator.__init__(self, registry: Any, memory: SharedMemory, use_llm: bool = False)`
   - Key method return types in memory and agents

3. **Fix inline imports:**
   - Move `import re` to top of `planner.py`
   - Remove duplicate `import numpy as np` in `train_ppo.py`

4. **Consolidate metrics updates:**
   - Fix duplicate counter increments in `backend/main.py`

5. **Deprecation fixes:**
   - Replace `datetime.utcnow()` with `datetime.now(timezone.utc)`

### 7.2 README Updates
- Create `README_Myndra.md` with:
  - Architecture summary
  - Run/test instructions
  - Relationship to LoopGuard in mono-repo

### 7.3 Test Coverage
- Verify existing tests pass
- Add minimal smoke tests for:
  - Orchestrator.run() with mocked LLM
  - Agent registry factory

---

## 8. Relationship to LoopGuard

```
AstraHealth/
├── Myndra/                    # Existing MARL + Radiology framework
│   └── (unchanged core logic)
│
├── loopguard/                 # NEW: Radiology follow-up tracking
│   ├── backend/               # FastAPI + Clean Architecture
│   └── frontend/              # React + TypeScript + Supabase
│
├── libs/                      # (Optional) Shared utilities
│   └── profiler.py            # Extracted from Myndra
│
├── docker-compose.yml         # LoopGuard local dev
├── DEPLOYMENT.md              # Deployment guide
└── README.md                  # Mono-repo overview
```

**Key Separation:**
- Myndra remains a standalone research framework
- LoopGuard is a production-focused clinical workflow app
- No direct code dependencies between them
- Shared patterns only (logging, config, testing conventions)

---

## 9. Next Steps

1. ✅ **Phase 0 Complete:** This document summarizes Myndra
2. → **Phase 1:** Apply safe cleanup refactors
3. → **Phase 2:** Create LoopGuard project structure
4. → Continue through remaining phases...

---

*End of Phase 0 Notes*
