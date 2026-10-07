import re
from typing import Optional

class CodeExtractor:
    """
    Heuristic verification code parser for inbound SMS.
    Extracts 4-8 digit OTPs, Google/Microsoft style prefixed codes (e.g., G-123456),
    and verification numbers.
    """

    PATTERNS = [
        # Explicit phrases
        re.compile(r'(?:verification|security|confirmation|login|auth|one-time|otp|code|pin)(?:\s+is|\s*:|\s*#)?\s*[:\s-]?\s*([0-9]{4,8})\b', re.IGNORECASE),
        re.compile(r'\b([0-9]{4,8})\s+(?:is\s+your\s+(?:verification|security|confirmation|login|auth|otp|code))', re.IGNORECASE),
        # Prefixed codes like G-123456 or MS-123456
        re.compile(r'\b(?:G|MS|ID|VK|FB)-([0-9]{4,8})\b', re.IGNORECASE),
        # Isolated standalone 4-8 digit code with keywords nearby
        re.compile(r'\b([0-9]{6})\b'),
        re.compile(r'\b([0-9]{4})\b'),
    ]

    @classmethod
    def extract_code(cls, text: str) -> Optional[str]:
        if not text:
            return None

        # Try high-confidence patterns first
        for pattern in cls.PATTERNS[:3]:
            match = pattern.search(text)
            if match:
                return match.group(1)

        # Fallback keyword proximity check for 6-digit or 4-digit codes
        lowered = text.lower()
        if any(w in lowered for w in ["code", "verify", "verification", "otp", "pin", "password", "confirm", "secret"]):
            for pattern in cls.PATTERNS[3:]:
                match = pattern.search(text)
                if match:
                    return match.group(1)

        return None
