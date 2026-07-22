"""Network-free tests for the embedding provider response contract."""

from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from embeddings import OpenAIEmbeddingProvider


class EmbeddingProviderTests(unittest.TestCase):
    def test_requests_and_validates_explicit_dimensions(self) -> None:
        with patch("embeddings.OpenAI") as openai:
            client = openai.return_value
            client.embeddings.create.return_value = SimpleNamespace(
                data=[SimpleNamespace(index=0, embedding=[1.0, 0.0, 0.0])],
                usage=SimpleNamespace(total_tokens=4),
            )
            provider = OpenAIEmbeddingProvider("test-key", model="test-model", dimensions=3)
            result = provider.embed_batch(["text"])

        client.embeddings.create.assert_called_once_with(
            model="test-model", input=["text"], dimensions=3
        )
        self.assertEqual(result.vectors, [[1.0, 0.0, 0.0]])
        self.assertEqual(result.tokens_used, 4)

    def test_rejects_unexpected_vector_shape(self) -> None:
        with patch("embeddings.OpenAI") as openai:
            openai.return_value.embeddings.create.return_value = SimpleNamespace(
                data=[SimpleNamespace(index=0, embedding=[1.0, 0.0])],
                usage=SimpleNamespace(total_tokens=4),
            )
            provider = OpenAIEmbeddingProvider("test-key", dimensions=3)
            with self.assertRaisesRegex(RuntimeError, "returned 2 dimensions"):
                provider.embed_batch(["text"])
