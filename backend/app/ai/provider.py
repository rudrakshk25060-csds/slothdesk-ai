import re
import json
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple
import httpx

from app.config import settings
from app.schemas import (
    AICategorizationOutput,
    AISummarizationOutput,
    AIDeadlineItem,
    AIBriefingOutput,
    AIStatusResponse,
)
from app.ai.prompts import (
    CATEGORIZATION_SYSTEM_PROMPT,
    SUMMARIZATION_SYSTEM_PROMPT,
    DEADLINE_SYSTEM_PROMPT,
    BRIEFING_SYSTEM_PROMPT,
)

logger = logging.getLogger(__name__)

class AIProvider(ABC):
    @abstractmethod
    async def check_status(self) -> AIStatusResponse:
        pass

    @abstractmethod
    async def categorize(self, filename: str, sample_text: str) -> Tuple[AICategorizationOutput, bool, str]:
        """Returns (result, is_ai_generated, source)"""
        pass

    @abstractmethod
    async def summarize(self, title: str, text: str) -> Tuple[AISummarizationOutput, bool, str]:
        """Returns (result, is_ai_generated, source)"""
        pass

    @abstractmethod
    async def extract_deadlines(self, text: str) -> Tuple[List[AIDeadlineItem], bool, str]:
        """Returns (result, is_ai_generated, source)"""
        pass

    @abstractmethod
    async def generate_briefing(
        self,
        tasks_today: List[Dict[str, Any]],
        upcoming_deadlines: List[Dict[str, Any]],
        recent_docs: List[Dict[str, Any]],
    ) -> Tuple[AIBriefingOutput, bool, str]:
        """Returns (result, is_ai_generated, source)"""
        pass


class OllamaGemmaProvider(AIProvider):
    def __init__(self, base_url: str = settings.OLLAMA_BASE_URL, model_name: str = settings.OLLAMA_MODEL):
        self.base_url = base_url.rstrip("/")
        self.model_name = model_name

    async def check_status(self) -> AIStatusResponse:
        setup_instructions = [
            "1. Install Ollama: curl -fsSL https://ollama.com/install.sh | sh (or download from ollama.com)",
            f"2. Pull the Gemma 3 4B model: ollama pull {self.model_name}",
            "3. Ensure the service is active: ollama serve (runs automatically on port 11434)",
            "4. Verify at http://localhost:11434/"
        ]
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    # Check if exact model or model without tag prefix exists
                    found = any(self.model_name in m or m.startswith("gemma3") for m in models)
                    if found:
                        return AIStatusResponse(
                            available=True,
                            provider="Ollama (Local Inference)",
                            model=self.model_name,
                            details=f"Local model {self.model_name} is active and ready for private inference.",
                            setup_instructions=setup_instructions
                        )
                    else:
                        return AIStatusResponse(
                            available=False,
                            provider="Ollama (Local Inference)",
                            model=self.model_name,
                            details=f"Ollama server is running, but model '{self.model_name}' is not installed yet. Available models: {', '.join(models) if models else 'None'}.",
                            setup_instructions=setup_instructions
                        )
        except Exception as e:
            logger.debug(f"Ollama status check failed: {e}")
        
        return AIStatusResponse(
            available=False,
            provider="Ollama (Local Inference)",
            model=self.model_name,
            details=f"Ollama service is unreachable at {self.base_url}. Using deterministic local fallbacks.",
            setup_instructions=setup_instructions
        )

    def _clean_json_response(self, text: str) -> str:
        text = text.strip()
        # Remove markdown code blocks if present
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        return text

    async def _call_ollama(self, system_prompt: str, user_prompt: str) -> str:
        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT_SECONDS) as client:
            payload = {
                "model": self.model_name,
                "system": system_prompt,
                "prompt": user_prompt,
                "format": "json",
                "stream": False,
                "options": {
                    "temperature": 0.2,
                    "top_p": 0.9,
                }
            }
            res = await client.post(f"{self.base_url}/api/generate", json=payload)
            res.raise_for_status()
            data = res.json()
            return data.get("response", "")

    # ----------------- Fallback Heuristics -----------------

    def _fallback_categorize(self, filename: str, sample_text: str) -> AICategorizationOutput:
        lower_name = filename.lower()
        lower_text = sample_text[:1000].lower()
        ext = lower_name.split(".")[-1] if "." in lower_name else ""

        # Check by content and extension
        if ext in ("jpg", "jpeg", "png", "webp", "svg", "gif"):
            category = "Images"
            clean_name = f"Image_{filename.replace(' ', '_')}"
            reason = "Classified as Images based on file extension."
        elif any(k in lower_text or k in lower_name for k in ["receipt", "order confirmation", "store #", "subtotal", "payment method", "tax"]):
            category = "Receipts"
            clean_name = f"Receipt_{filename.replace(' ', '_')}"
            reason = "Classified as Receipts based on purchase and payment keywords."
        elif any(k in lower_text or k in lower_name for k in ["invoice", "bank statement", "billing", "wire transfer", "payroll", "budget", "balance"]):
            category = "Finance"
            clean_name = f"Financial_{filename.replace(' ', '_')}"
            reason = "Classified as Finance based on monetary transactions and accounting markers."
        elif any(k in lower_text or k in lower_name for k in ["syllabus", "assignment", "homework", "lecture", "course", "grade", "university", "school"]):
            category = "Education"
            clean_name = f"Edu_{filename.replace(' ', '_')}"
            reason = "Classified as Education based on academic curriculum references."
        elif any(k in lower_text or k in lower_name for k in ["contract", "agreement", "nda", "client", "deliverable", "milestone", "meeting notes", "sow"]):
            category = "Work"
            clean_name = f"Work_{filename.replace(' ', '_')}"
            reason = "Classified as Work based on contractual or business project indicators."
        elif ext in ("pdf", "docx", "doc", "txt", "md", "rtf"):
            category = "Documents"
            clean_name = f"Doc_{filename.replace(' ', '_')}"
            reason = "Classified as Documents based on general document format."
        else:
            category = "Other"
            clean_name = filename
            reason = "Classified as Other; standard fallback."

        # Ensure original extension is preserved
        if "." in filename:
            orig_ext = "." + filename.rsplit(".", 1)[1]
            if not clean_name.endswith(orig_ext):
                clean_name = clean_name.rsplit(".", 1)[0] + orig_ext

        return AICategorizationOutput(
            category=category,
            suggested_filename=clean_name,
            reasoning=reason,
            confidence=0.75
        )

    def _fallback_summarize(self, title: str, text: str) -> AISummarizationOutput:
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        if not lines:
            return AISummarizationOutput(
                suggested_title=title or "Empty Document",
                summary="The document is empty or text could not be extracted.",
                action_items=[],
                deadlines=[]
            )

        # Extract first 2-3 substantial sentences for summary
        summary_sentences = []
        for line in lines[:8]:
            if len(line) > 20 and not line.startswith(("#", "-", "*", "1.", "2.")):
                summary_sentences.append(line)
            if len(summary_sentences) >= 3:
                break
        
        summary_text = " ".join(summary_sentences) if summary_sentences else lines[0][:250]
        if len(summary_text) > 350:
            summary_text = summary_text[:347] + "..."

        # Look for action items
        action_items = []
        for line in lines:
            line_clean = line.strip(" -*#•1234567890.)")
            if any(line.lower().startswith(p) for p in ["todo", "action:", "please", "must", "submit", "review", "complete", "prepare", "send", "sign"]):
                if len(line_clean) > 8:
                    action_items.append(line_clean[:120])
            elif "action item" in line.lower() or "deliverable" in line.lower():
                if len(line_clean) > 8:
                    action_items.append(line_clean[:120])
            if len(action_items) >= 5:
                break

        # Fallback deadlines
        deadlines = self._fallback_extract_deadlines(text)

        suggested_title = title.replace(".txt", "").replace(".pdf", "").replace("_", " ").title()
        return AISummarizationOutput(
            suggested_title=suggested_title,
            summary=summary_text or f"Document titled '{suggested_title}'.",
            action_items=action_items,
            deadlines=deadlines
        )

    def _fallback_extract_deadlines(self, text: str) -> List[AIDeadlineItem]:
        results: List[AIDeadlineItem] = []
        # Match YYYY-MM-DD
        iso_matches = re.finditer(r"\b(202\d-[01]\d-[0-3]\d)\b", text)
        for m in iso_matches:
            date_str = m.group(1)
            # Find surrounding snippet
            start = max(0, m.start() - 40)
            end = min(len(text), m.end() + 40)
            context = text[start:end].replace("\n", " ").strip()
            results.append(AIDeadlineItem(
                title=f"Deadline: {context[:50]}",
                due_date=date_str,
                priority="High" if "urgent" in context.lower() or "final" in context.lower() else "Medium",
                context=context
            ))

        # Match text dates like October 25, 2026 or Oct 25, 2026
        text_matches = re.finditer(r"\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(202\d)\b", text, re.IGNORECASE)
        months = {
            "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
            "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
        }
        for m in text_matches:
            month_str = m.group(1)[:3].lower()
            day = int(m.group(2))
            year = m.group(3)
            mm = months.get(month_str, "01")
            iso_date = f"{year}-{mm}-{day:02d}"
            start = max(0, m.start() - 40)
            end = min(len(text), m.end() + 40)
            context = text[start:end].replace("\n", " ").strip()
            results.append(AIDeadlineItem(
                title=f"Due: {context[:50]}",
                due_date=iso_date,
                priority="Medium",
                context=context
            ))

        # Deduplicate by due_date
        seen = set()
        deduped = []
        for d in results:
            if d.due_date not in seen:
                seen.add(d.due_date)
                deduped.append(d)
        return deduped[:5]

    def _fallback_briefing(
        self,
        tasks_today: List[Dict[str, Any]],
        upcoming_deadlines: List[Dict[str, Any]],
        recent_docs: List[Dict[str, Any]]
    ) -> AIBriefingOutput:
        priorities = []
        for t in tasks_today[:3]:
            priorities.append(t.get("title", "Prioritized task"))
        if len(priorities) < 3 and upcoming_deadlines:
            for d in upcoming_deadlines[:3 - len(priorities)]:
                priorities.append(f"Prepare for: {d.get('title', 'Upcoming deadline')}")
        if not priorities:
            priorities = [
                "Review unorganized documents in workspace",
                "Set clear milestones for the afternoon",
                "Take a deliberate, distraction-free work block"
            ]

        actions = [
            "Start with the single highest-impact priority before opening emails.",
            "Work deliberately for 45 minutes, then take a restful break.",
            "Let SlothDesk organize and summarize incoming documents in the background."
        ]

        quotes = [
            "Slow and steady wins the race. Master today by finishing just a few things deeply.",
            "Doing less busywork means having more energy for the work that genuinely matters.",
            "Calm focus beats frantic multi-tasking every single time."
        ]

        return AIBriefingOutput(
            top_priorities=priorities,
            suggested_actions=actions,
            sloth_quote=quotes[0]
        )

    # ----------------- Main Methods -----------------

    async def categorize(self, filename: str, sample_text: str) -> Tuple[AICategorizationOutput, bool, str]:
        user_prompt = f"Filename: {filename}\n\nDocument Sample:\n{sample_text[:2000]}"
        try:
            raw = await self._call_ollama(CATEGORIZATION_SYSTEM_PROMPT, user_prompt)
            clean = self._clean_json_response(raw)
            data = json.loads(clean)
            validated = AICategorizationOutput(**data)
            return validated, True, f"{self.model_name} (Ollama)"
        except Exception as e:
            logger.info(f"Ollama categorization unavailable ({e}); applying deterministic rule engine.")
            return self._fallback_categorize(filename, sample_text), False, "deterministic_rule_engine"

    async def summarize(self, title: str, text: str) -> Tuple[AISummarizationOutput, bool, str]:
        user_prompt = f"Document Title: {title}\n\nDocument Full Text:\n{text[:settings.MAX_DOCUMENT_CHARS]}"
        try:
            raw = await self._call_ollama(SUMMARIZATION_SYSTEM_PROMPT, user_prompt)
            clean = self._clean_json_response(raw)
            data = json.loads(clean)
            validated = AISummarizationOutput(**data)
            return validated, True, f"{self.model_name} (Ollama)"
        except Exception as e:
            logger.info(f"Ollama summarization unavailable ({e}); applying deterministic text summarizer.")
            return self._fallback_summarize(title, text), False, "deterministic_rule_engine"

    async def extract_deadlines(self, text: str) -> Tuple[List[AIDeadlineItem], bool, str]:
        user_prompt = f"Document Text:\n{text[:settings.MAX_DOCUMENT_CHARS]}"
        try:
            raw = await self._call_ollama(DEADLINE_SYSTEM_PROMPT, user_prompt)
            clean = self._clean_json_response(raw)
            data = json.loads(clean)
            if isinstance(data, dict) and "deadlines" in data:
                data = data["deadlines"]
            validated = [AIDeadlineItem(**item) for item in data]
            return validated, True, f"{self.model_name} (Ollama)"
        except Exception as e:
            logger.info(f"Ollama deadline extraction unavailable ({e}); applying deterministic date matcher.")
            return self._fallback_extract_deadlines(text), False, "deterministic_rule_engine"

    async def generate_briefing(
        self,
        tasks_today: List[Dict[str, Any]],
        upcoming_deadlines: List[Dict[str, Any]],
        recent_docs: List[Dict[str, Any]]
    ) -> Tuple[AIBriefingOutput, bool, str]:
        prompt_data = {
            "tasks_due_today": tasks_today,
            "upcoming_deadlines": upcoming_deadlines,
            "recent_documents": [{"title": d.get("suggested_title") or d.get("filename"), "category": d.get("category")} for d in recent_docs[:5]]
        }
        user_prompt = f"Current User State and Context:\n{json.dumps(prompt_data, indent=2)}"
        try:
            raw = await self._call_ollama(BRIEFING_SYSTEM_PROMPT, user_prompt)
            clean = self._clean_json_response(raw)
            data = json.loads(clean)
            validated = AIBriefingOutput(**data)
            return validated, True, f"{self.model_name} (Ollama)"
        except Exception as e:
            logger.info(f"Ollama briefing unavailable ({e}); applying deterministic briefing builder.")
            return self._fallback_briefing(tasks_today, upcoming_deadlines, recent_docs), False, "deterministic_rule_engine"


# Global singleton instance
ai_provider = OllamaGemmaProvider()
