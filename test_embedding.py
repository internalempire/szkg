"""Manual smoke test for embedding generation, caching, storage, and cost."""

from __future__ import annotations

from config import load_openai_api_key, load_zotero_config
from costs import CostTracker, count_tokens, estimate_cost, format_usd
from embeddings import OpenAIEmbeddingProvider
from store import PaperStore
from zotero_source import PyzoteroSource


SAMPLE_SIZE = 5


def main() -> None:
    print("-> Loading Zotero and OpenAI configuration...")
    papers, _version = PyzoteroSource(load_zotero_config()).fetch_all(limit=SAMPLE_SIZE)
    if not papers:
        print("No papers returned. Complete Zotero cloud synchronization first.")
        return

    provider = OpenAIEmbeddingProvider(api_key=load_openai_api_key())
    store = PaperStore(vector_dimensions=provider.dimensions)
    pending = [paper for paper in papers if paper.key not in store.existing_keys()]
    print(f"  Model: {provider.model_name} ({provider.dimensions} dimensions)")
    print(f"  Cached: {len(papers) - len(pending)}; to embed: {len(pending)}")
    if not pending:
        print("All sample papers are cached: zero API cost.")
        return

    texts = [paper.combined_text() for paper in pending]
    per_paper_tokens = [count_tokens(text, provider.model_name) for text in texts]
    print(f"  Estimated pre-request cost: {format_usd(estimate_cost(sum(per_paper_tokens), provider.model_name))}")
    result = provider.embed_batch(texts)
    tracker = CostTracker(provider.model_name)
    tracker.record(result.tokens_used, len(pending))
    store.add(pending, result.vectors, per_paper_tokens, provider.model_name)
    print("\n" + tracker.summary())
    print(f"  Vector dimensions returned: {len(result.vectors[0])}")


if __name__ == "__main__":
    main()
