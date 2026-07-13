"""Count embedding tokens and keep API spending visible to the user."""

from __future__ import annotations

from dataclasses import dataclass

import tiktoken


# USD per one million input tokens. Keep pricing in one explicit place.
PRICE_PER_MILLION_TOKENS: dict[str, float] = {
    "text-embedding-3-small": 0.02,
    "text-embedding-3-large": 0.13,
}


def count_tokens(text: str, model: str) -> int:
    """Count tokens using the model tokenizer, with a safe recent fallback."""
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))


def estimate_cost(tokens: int, model: str) -> float:
    """Convert a token count to an estimated cost in US dollars."""
    return tokens / 1_000_000 * PRICE_PER_MILLION_TOKENS.get(model, 0.0)


def format_usd(amount: float) -> str:
    """Show enough decimals for the tiny cost of individual embeddings."""
    if amount == 0:
        return "$0.00"
    return f"${amount:.8f}" if amount < 0.01 else f"${amount:.4f}"


@dataclass
class CostTracker:
    """Accumulate actual token usage and estimated cost for one run."""

    model: str
    total_tokens: int = 0
    total_cost: float = 0.0
    papers_counted: int = 0

    def record(self, tokens: int, paper_count: int) -> None:
        self.total_tokens += tokens
        self.total_cost += estimate_cost(tokens, self.model)
        self.papers_counted += paper_count

    def summary(self) -> str:
        return (
            "-- Cost summary for this run --\n"
            f"  Model:             {self.model}\n"
            f"  Papers embedded:   {self.papers_counted}\n"
            f"  Tokens sent:       {self.total_tokens:,}\n"
            f"  Estimated cost:    {format_usd(self.total_cost)}"
        )
