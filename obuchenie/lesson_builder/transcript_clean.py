"""Rule-based cleanup for speech-to-text output (no external API)."""

from __future__ import annotations

import re
from typing import Any

# Standalone filler tokens (case-insensitive, word boundaries).
FILLER_WORDS = {
    "э",
    "ээ",
    "эээ",
    "м",
    "мм",
    "ммм",
    "аа",
    "ааа",
    "ну",
    "типа",
    "значит",
    "короче",
    "собственно",
    "вообще",
    "буквально",
    "реально",
    "ладно",
    "окей",
    "okay",
    "um",
    "uh",
    "like",
}

# Multi-word fillers removed as phrases before single-word pass.
FILLER_PHRASES = (
    "ну вот",
    "вот так",
    "вот это",
    "как бы",
    "типа того",
    "так сказать",
    "в общем",
    "в общем-то",
    "в принципе",
    "это самое",
    "дело в том что",
    "получается что",
    "смотрите вот",
    "смотрите",
    "слушайте",
    "значит так",
)


def _collapse_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _strip_fillers(text: str) -> str:
    result = text
    for phrase in sorted(FILLER_PHRASES, key=len, reverse=True):
        result = re.sub(rf"\b{re.escape(phrase)}\b", " ", result, flags=re.IGNORECASE)
    for word in sorted(FILLER_WORDS, key=len, reverse=True):
        result = re.sub(rf"\b{re.escape(word)}\b", " ", result, flags=re.IGNORECASE)
    return _collapse_spaces(result)


def _dedupe_words(text: str) -> str:
    words = text.split()
    if not words:
        return ""
    deduped = [words[0]]
    for word in words[1:]:
        if word.lower() == deduped[-1].lower():
            continue
        deduped.append(word)
    return " ".join(deduped)


def _fix_punctuation(text: str) -> str:
    text = re.sub(r"\s+([,.!?;:])", r"\1", text)
    text = re.sub(r"([,.!?;:])([^\s])", r"\1 \2", text)
    text = re.sub(r"([,.!?;:])\s*([,.!?;:])+", r"\1", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip(" ,.;:")


def _capitalize_sentences(text: str) -> str:
    if not text:
        return text

    def upper_first(match: re.Match[str]) -> str:
        return match.group(1) + match.group(2).upper()

    text = text[0].upper() + text[1:]
    return re.sub(r"(^|[.!?]\s+)([a-zа-яё])", upper_first, text, flags=re.IGNORECASE)


def _is_meaningful(text: str) -> bool:
    cleaned = _strip_fillers(text)
    if len(cleaned) < 2:
        return False
    alpha = re.sub(r"[^\wа-яё]", "", cleaned, flags=re.IGNORECASE)
    return len(alpha) >= 2


def clean_segment_text(text: str) -> str:
    raw = _collapse_spaces(text or "")
    if not raw:
        return ""
    cleaned = _strip_fillers(raw)
    cleaned = _dedupe_words(cleaned)
    cleaned = _fix_punctuation(cleaned)
    cleaned = _capitalize_sentences(cleaned)
    return cleaned.strip()


def clean_transcript(transcript: dict[str, Any]) -> dict[str, Any]:
    """Return transcript with cleaned segment texts and rebuilt fullText."""
    segments: list[dict[str, Any]] = []
    parts: list[str] = []

    for segment in transcript.get("segments") or []:
        raw = str(segment.get("text") or "").strip()
        if not raw:
            continue
        cleaned = clean_segment_text(raw)
        if not cleaned or not _is_meaningful(cleaned):
            continue
        entry = {**segment, "text": cleaned, "rawText": raw}
        segments.append(entry)
        parts.append(cleaned)

    return {
        **transcript,
        "segments": segments,
        "fullText": " ".join(parts),
        "cleaned": True,
    }
