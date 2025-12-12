"""Pneumonia detection model loader."""

import os
import torch
import torchxrayvision as xrv
from typing import Tuple, Optional

_PNEUMONIA_MODEL = None

def load_model(device: Optional[str] = None) -> Tuple[torch.nn.Module, Optional[int], str]:
    """Load RSNA pneumonia-specific model for better pneumonia detection.
    
    Uses densenet121-res224-rsna weights trained specifically on 
    RSNA Pneumonia Detection Challenge data.
    """
    global _PNEUMONIA_MODEL
    device = device or os.getenv("MYNDRA_DEVICE", "cpu")
    
    if _PNEUMONIA_MODEL is None:
        # Use RSNA weights - trained specifically for pneumonia detection
        _PNEUMONIA_MODEL = xrv.models.DenseNet(weights="densenet121-res224-rsna")
        _PNEUMONIA_MODEL.eval().to(device)
    
    # RSNA model has different pathology list - find pneumonia index
    idx = None
    pathologies = list(_PNEUMONIA_MODEL.pathologies)
    for i, p in enumerate(pathologies):
        if "pneumonia" in p.lower() or "lung opacity" in p.lower():
            idx = i
            break
    
    # Fallback to index 0 if not found - but log warning
    if idx is None:
        print(f"[WARNING] 'pneumonia'/'lung opacity' not found in model pathologies: {pathologies}")
        print(f"[WARNING] Falling back to index 0: '{pathologies[0] if pathologies else 'NONE'}'")
        idx = 0
    else:
        print(f"[INFO] Pneumonia detection using pathology '{pathologies[idx]}' at index {idx}")
    
    return _PNEUMONIA_MODEL, idx, device
