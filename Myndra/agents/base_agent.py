from datetime import datetime, timezone
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from memory.memory_module import SharedMemory


class BaseAgent:
    """Abstract base class for all Myndra agents.
    
    Agents are responsible for executing tasks and storing results in shared memory.
    Subclasses must implement the `act()` method.
    """
    
    def __init__(self, name: str, role: str, memory: "SharedMemory") -> None:
        self.name = name
        self.role = role
        self.memory = memory

    def act(self, task: Any) -> Any:
        """Perform the assigned task. Override this in subclasses."""
        raise NotImplementedError("Each agent must implement its own act() method.")

    def reflect(self, result: Any) -> None:
        """Store the result and metadata into shared memory."""
        entry = {
            "agent_id": self.name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "content": f"[{self.role}] {result}"
        }
        self.memory.write(self.name, entry["content"])

    def __repr__(self):
        return f"<Agent {self.name} ({self.role})>"