"""
LLM module — Cloud Gateway model inference for Megan.
Provides drop-in replacements for local model loading.
"""

from llm.gateway_client import GatewayClient, gateway_client
from llm.inference import GatewayInferenceEngine, MockLoader, loader, engine

ModelLoader = MockLoader
InferenceEngine = GatewayInferenceEngine

__all__ = [
    "GatewayClient",
    "gateway_client",
    "GatewayInferenceEngine",
    "InferenceEngine",
    "MockLoader",
    "ModelLoader",
    "loader",
    "engine",
]
