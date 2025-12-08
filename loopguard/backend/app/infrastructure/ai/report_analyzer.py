"""
Report Text Analyzer using LLM capabilities.

Parses radiology report impressions to extract follow-up recommendations.
Inspired by Myndra's LLMPlanner architecture.
"""

import os
import json
import re
from dataclasses import dataclass
from typing import List, Optional

from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()


@dataclass
class ExtractedRecommendation:
    """Structured follow-up recommendation extracted from report text."""
    modality: str
    body_region: str
    interval_months: int
    finding: str
    urgency: str  # routine, urgent, stat
    guideline: Optional[str] = None
    confidence: float = 0.0


class ReportAnalyzer:
    """
    Uses LLM to extract follow-up recommendations from radiology report text.
    
    Inspired by Myndra's LLMPlanner pattern:
    - Structured JSON output
    - Confidence scoring
    - Fallback handling
    """
    
    def __init__(self):
        self.model = os.getenv("LOOPGUARD_LLM_MODEL", "gpt-4o-mini")
        api_key = os.getenv("OPENAI_API_KEY")
        print(f"[AI] Model: {self.model}, API Key loaded: {'YES' if api_key else 'NO'}")
        try:
            if api_key:
                self.client = OpenAI(api_key=api_key)
            else:
                print("[AI] WARNING: No OPENAI_API_KEY found, falling back to regex")
                self.client = None
        except Exception as e:
            print(f"[AI] OpenAI client init failed: {e}")
            self.client = None
    
    def _parse_json_response(self, text: str) -> List[dict]:
        """Parse JSON from LLM output, handling common formatting issues."""
        # Remove code fences if present
        text = re.sub(r"^```json\s*|```$", "", text.strip(), flags=re.MULTILINE)
        
        # Replace smart quotes
        text = text.replace(""", '"').replace(""", '"')
        
        # Remove trailing commas
        text = re.sub(r",(\s*[\]}])", r"\1", text)
        
        parsed = json.loads(text)
        
        # Handle both direct array and wrapped object
        if isinstance(parsed, list):
            return parsed
        elif isinstance(parsed, dict):
            for key in ("recommendations", "followups", "items", "results"):
                if key in parsed and isinstance(parsed[key], list):
                    return parsed[key]
            return []
        return []
    
    async def analyze_report(self, impression_text: str) -> List[ExtractedRecommendation]:
        """
        Parse report impression and extract follow-up recommendations.
        
        Example input:
        "8mm pulmonary nodule in RLL. Recommend CT chest in 3 months 
         per Fleischner guidelines. 2cm hepatic cyst, benign, no follow-up needed."
        
        Returns list of structured recommendations.
        """
        if not self.client:
            return self._fallback_extraction(impression_text)
        
        prompt = f"""You are a radiology report analyzer. Extract ALL imaging follow-up recommendations from this report impression.

For each recommendation found, provide:
- modality: The imaging modality (CT, MRI, US, XR, PET, MG, etc.)
- body_region: Anatomical region (Chest, Abdomen, Brain, Pelvis, Neck, Spine, etc.)
- interval_months: Number of months until follow-up (integer). Use 0 if no follow-up needed.
- finding: Brief description of the finding requiring follow-up
- urgency: Priority level (routine, urgent, stat)
- guideline: Referenced guideline if mentioned (e.g., "Fleischner 2017", "ACR TI-RADS")
- confidence: Your confidence in this extraction (0.0 to 1.0)

Return a JSON object with a "recommendations" array. If no follow-up recommendations are found, return {{"recommendations": []}}.

REPORT IMPRESSION:
{impression_text}

Respond with only the JSON object, no additional text."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            
            text = response.choices[0].message.content.strip()
            print(f"[AI] Raw LLM response: {text[:500]}")  # Debug
            
            recommendations = self._parse_json_response(text)
            print(f"[AI] Parsed {len(recommendations)} recommendations")  # Debug
            
            results = [
                ExtractedRecommendation(
                    modality=r.get("modality", "CT"),
                    body_region=r.get("body_region", "Unknown"),
                    interval_months=int(r.get("interval_months", 3)),
                    finding=r.get("finding", ""),
                    urgency=r.get("urgency", "routine"),
                    guideline=r.get("guideline"),
                    confidence=float(r.get("confidence", 0.8)),
                )
                for r in recommendations
            ]
            print(f"[AI] Returning {len(results)} results")  # Debug
            return results
            
        except Exception as e:
            print(f"LLM analysis failed: {e}")
            return self._fallback_extraction(impression_text)
    
    def _fallback_extraction(self, text: str) -> List[ExtractedRecommendation]:
        """
        Simple regex-based fallback when LLM is unavailable.
        Looks for common follow-up patterns.
        """
        recommendations = []
        text_lower = text.lower()
        
        # Pattern: "recommend/suggest [modality] in [N] months/weeks"
        patterns = [
            r"recommend(?:ed)?\s+(?:follow[- ]?up\s+)?(\w+)\s+(?:in\s+)?(\d+)\s+(month|week|year)",
            r"follow[- ]?up\s+(\w+)\s+in\s+(\d+)\s+(month|week|year)",
            r"repeat\s+(\w+)\s+in\s+(\d+)\s+(month|week|year)",
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text_lower)
            for match in matches:
                modality = match.group(1).upper()
                interval = int(match.group(2))
                unit = match.group(3)
                
                # Convert to months
                if unit.startswith("week"):
                    interval = max(1, interval // 4)
                elif unit.startswith("year"):
                    interval = interval * 12
                
                # Map common modality terms
                modality_map = {
                    "CT": "CT", "CAT": "CT", "COMPUTED": "CT",
                    "MRI": "MRI", "MR": "MRI", "MAGNETIC": "MRI",
                    "ULTRASOUND": "US", "US": "US", "SONOGRAPHY": "US",
                    "XRAY": "XR", "X-RAY": "XR", "RADIOGRAPH": "XR",
                    "PET": "PET", "MAMMOGRAM": "MG", "MAMMOGRAPHY": "MG",
                }
                modality = modality_map.get(modality, modality)
                
                recommendations.append(ExtractedRecommendation(
                    modality=modality,
                    body_region="Unknown",
                    interval_months=interval,
                    finding="Extracted from report text",
                    urgency="routine",
                    confidence=0.5,  # Lower confidence for regex extraction
                ))
        
        return recommendations


class PriorStudySummarizer:
    """
    Summarizes prior imaging findings for a patient.
    
    Inspired by Myndra's SummarizerAgent pattern.
    Provides context when reviewing new studies.
    """
    
    def __init__(self):
        self.model = os.getenv("LOOPGUARD_LLM_MODEL", "gpt-4o-mini")
        try:
            self.client = OpenAI()
        except Exception:
            self.client = None
    
    async def summarize_history(
        self,
        patient_name: str,
        prior_studies: List[dict],
    ) -> dict:
        """
        Generate a concise summary of patient's imaging history.
        
        Args:
            patient_name: Patient identifier
            prior_studies: List of prior study records with findings
            
        Returns:
            Summary with key findings, timeline, and recommendations
        """
        if not self.client or not prior_studies:
            return self._fallback_summary(patient_name, prior_studies)
        
        # Format prior studies for context
        studies_text = "\n".join([
            f"- {s.get('date', 'Unknown date')}: {s.get('modality', '')} {s.get('body_region', '')} - {s.get('impression', 'No impression')}"
            for s in prior_studies[:10]  # Limit to recent 10
        ])
        
        prompt = f"""You are a radiology assistant. Summarize this patient's imaging history for a radiologist reviewing a new study.

PATIENT: {patient_name}

PRIOR STUDIES:
{studies_text}

Provide a JSON response with:
- "summary": 2-3 sentence overview of imaging history
- "key_findings": Array of important findings to be aware of
- "pending_followups": Any mentioned but not yet completed follow-ups
- "trend": Whether findings are stable, improving, or worsening (if applicable)
- "attention_items": Specific things the radiologist should look for

Be concise and clinically relevant."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            print(f"Prior study summary failed: {e}")
            return self._fallback_summary(patient_name, prior_studies)
    
    def _fallback_summary(self, patient_name: str, prior_studies: List[dict]) -> dict:
        """Simple fallback when LLM unavailable."""
        return {
            "summary": f"{patient_name} has {len(prior_studies)} prior imaging studies.",
            "key_findings": [],
            "pending_followups": [],
            "trend": "unknown",
            "attention_items": ["Review prior studies manually"],
        }
