"""Convert paper text into semantic vectors through a replaceable provider."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from openai import OpenAI


DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_EMBEDDING_DIMENSIONS = 1536


@dataclass
class EmbeddingResult:
    """Vectors returned by a provider and the API-reported token usage."""

    vectors: list[list[float]]
    tokens_used: int


class EmbeddingProvider(ABC):
    """Contract implemented by any embedding service.

    The rest of the pipeline depends on this small interface rather than on
    OpenAI directly, so another provider can be added without rewriting storage,
    graph construction, clustering, or layout code.
    """

    @property
    @abstractmethod
    def model_name(self) -> str: ...

    @property
    @abstractmethod
    def dimensions(self) -> int: ...

    @abstractmethod
    def embed_batch(self, texts: list[str]) -> EmbeddingResult: ...


_BATCH_SIZE = 100


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """Generate embeddings with OpenAI's embeddings API."""

    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_EMBEDDING_MODEL,
        dimensions: int = DEFAULT_EMBEDDING_DIMENSIONS,
    ) -> None:
        # Automatic retries handle temporary rate limits and service overloads.
        self._client = OpenAI(api_key=api_key, max_retries=6)
        self._model = model
        self._dimensions = dimensions

    @property
    def model_name(self) -> str:
        return self._model

    @property
    def dimensions(self) -> int:
        return self._dimensions

    def embed_batch(self, texts: list[str]) -> EmbeddingResult:
        if not texts:
            return EmbeddingResult(vectors=[], tokens_used=0)

        all_vectors: list[list[float]] = []
        total_tokens = 0
        for start in range(0, len(texts), _BATCH_SIZE):
            batch = texts[start : start + _BATCH_SIZE]
            response = self._client.embeddings.create(
                model=self._model,
                input=batch,
                dimensions=self._dimensions,
            )
            items = sorted(response.data, key=lambda item: item.index)
            if len(items) != len(batch):
                raise RuntimeError(
                    f"Embedding provider returned {len(items)} vectors for {len(batch)} texts."
                )
            for item in items:
                if len(item.embedding) != self._dimensions:
                    raise RuntimeError(
                        f"Embedding provider returned {len(item.embedding)} dimensions; "
                        f"expected {self._dimensions}."
                    )
                all_vectors.append(item.embedding)
            total_tokens += response.usage.total_tokens
        return EmbeddingResult(vectors=all_vectors, tokens_used=total_tokens)
