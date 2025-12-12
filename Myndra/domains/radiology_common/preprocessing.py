"""Preprocessing utilities for chest X-ray images."""

import numpy as np
import torch
import torchxrayvision as xrv
from pathlib import Path
from skimage.io import imread
from skimage.transform import resize

def load_cxr(
    image_path: str,
    size: int = 224,
) -> torch.Tensor:
    """Load and preprocess a chest X-ray using torchxrayvision's official method."""
    img_path = Path(image_path)
    if not img_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")
    
    # Load image
    img = imread(image_path)
    
    # Convert RGB to grayscale
    if len(img.shape) == 3:
        img = img.mean(axis=2)
    
    # Ensure float32
    img = img.astype(np.float32)
    
    # Use torchxrayvision's normalize: scales to [-1024, 1024]
    img = xrv.datasets.normalize(img, img.max())
    
    # Resize to model input size
    img = resize(img, (size, size), preserve_range=True, anti_aliasing=True)
    
    # Add channel and batch dimensions: (H,W) -> (1, 1, H, W)
    img = img[None, None, :, :]
    
    # Convert to tensor
    tensor = torch.from_numpy(img).float()
    
    return tensor
