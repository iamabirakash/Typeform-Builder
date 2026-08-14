import re
from collections import Counter
from typing import Any


STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "if", "for", "with", "from", "this", "that",
    "into", "about", "your", "you", "our", "we", "it", "is", "was", "are", "be", "to",
    "of", "on", "in", "at", "by", "as", "what", "when", "how", "why", "who", "did",
    "have", "has", "had", "do", "does", "did", "more", "most", "some", "their", "them",
    "would", "could", "should", "can", "will", "just", "not", "than", "then", "too",
}

POSITIVE_WORDS = {
    "easy", "smooth", "fast", "clear", "helpful", "friendly", "great", "love", "good",
    "positive", "quick", "simple", "useful", "excellent", "improved", "better", "happy",
    "confident", "strong", "valuable", "supportive", "intuitive", "smoothly", "satisfied"
}
NEGATIVE_WORDS = {
    "confusing", "slow", "hard", "frustrating", "expensive", "difficult", "poor", "bad",
    "unclear", "broken", "late", "painful", "issue", "problem", "missing", "buggy",
    "complex", "annoying", "worse", "slowly", "expensive", "confusing", "uncertain"
}


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "")).strip()


def _keywords_from_text(value: str) -> list[str]:
    words = re.findall(r"[a-zA-Z][a-zA-Z'-]+", (value or "").lower())
    return [word for word in words if word not in STOP_WORDS and len(word) > 3]


def _title_case(value: str) -> str:
    return " ".join(part.capitalize() for part in value.split())


def generate_form_from_prompt(prompt: str) -> dict[str, Any]:
    raw_prompt = _clean_text(prompt)
    lower_prompt = raw_prompt.lower()

    if "onboarding" in lower_prompt:
        title = "Onboarding Feedback Survey"
        description = "Collect feedback about the onboarding journey and uncover the main friction points in the first-time experience."
        questions = [
            {"type": "rating", "title": "How smooth was your onboarding experience?", "required": True, "settings": {"min": 1, "max": 5}},
            {"type": "short_text", "title": "What part of onboarding felt easiest?", "required": False},
            {"type": "long_text", "title": "What made the onboarding process harder than expected?", "required": False},
            {"type": "yes_no", "title": "Would you recommend this onboarding flow to a colleague?", "required": True},
        ]
        return {"title": title, "description": description, "questions": questions}

    if "event" in lower_prompt:
        title = "Event Feedback Form"
        description = "Capture attendee reactions, identify improvement opportunities, and understand what made the event memorable."
        questions = [
            {"type": "rating", "title": "How would you rate the event overall?", "required": True, "settings": {"min": 1, "max": 5}},
            {"type": "short_text", "title": "What stood out most for you?", "required": False},
            {"type": "long_text", "title": "What could we improve for the next event?", "required": False},
            {"type": "email", "title": "What email should we use for updates?", "required": False},
        ]
        return {"title": title, "description": description, "questions": questions}

    if "feedback" in lower_prompt or "customer" in lower_prompt or "product" in lower_prompt:
        title = "Customer Feedback Survey"
        description = "Learn what customers value most, identify pain points, and prioritize improvements based on real responses."
        questions = [
            {"type": "rating", "title": "How satisfied were you with your experience?", "required": True, "settings": {"min": 1, "max": 5}},
            {"type": "short_text", "title": "What did you find most valuable?", "required": False},
            {"type": "long_text", "title": "What could we improve to make this better?", "required": False},
            {"type": "yes_no", "title": "Would you use this again?", "required": True},
        ]
        return {"title": title, "description": description, "questions": questions}

    if "signup" in lower_prompt or "registration" in lower_prompt:
        title = "Signup & Registration Survey"
        description = "Capture the registration experience and identify what encourages signups or slows people down."
        questions = [
            {"type": "rating", "title": "How easy was it to sign up?", "required": True, "settings": {"min": 1, "max": 5}},
            {"type": "short_text", "title": "Why did you sign up?", "required": False},
            {"type": "long_text", "title": "What blocked or slowed down your registration?", "required": False},
            {"type": "email", "title": "What is your email address?", "required": False},
        ]
        return {"title": title, "description": description, "questions": questions}

    keywords = _keywords_from_text(raw_prompt)
    context = " ".join(keywords[:4]) if keywords else "experience"
    title = _title_case(f"{context} feedback survey")
    description = f"Collect thoughtful feedback about {context} and turn those insights into clear next steps."
    questions = [
        {"type": "rating", "title": f"How would you rate your {context} experience?", "required": True, "settings": {"min": 1, "max": 5}},
        {"type": "short_text", "title": "What stood out most for you?", "required": False},
        {"type": "long_text", "title": "What could we improve to make this better?", "required": False},
        {"type": "yes_no", "title": "Would you recommend this to someone else?", "required": True},
    ]
    return {"title": title, "description": description, "questions": questions}


def suggest_questions_for_goal(goal: str) -> list[dict[str, Any]]:
    cleaned = _clean_text(goal)
    lower = cleaned.lower()

    if "onboarding" in lower:
        return [
            {"type": "rating", "title": "How easy was the onboarding process?", "required": True, "settings": {"min": 1, "max": 5}},
            {"type": "short_text", "title": "Where did you get stuck during onboarding?", "required": False},
            {"type": "long_text", "title": "What would improve the onboarding experience?", "required": False},
            {"type": "yes_no", "title": "Was the setup clear and useful?", "required": True},
        ]

    if "feedback" in lower or "customer" in lower:
        return [
            {"type": "rating", "title": "How satisfied are you with your experience?", "required": True, "settings": {"min": 1, "max": 5}},
            {"type": "short_text", "title": "What do you value most about the product?", "required": False},
            {"type": "long_text", "title": "What could we improve to deliver a better experience?", "required": False},
            {"type": "dropdown", "title": "Which area matters most to you?", "required": False, "options": ["Pricing", "Support", "Ease of use", "Features", "Speed"]},
        ]

    if "event" in lower:
        return [
            {"type": "rating", "title": "How would you rate the event overall?", "required": True, "settings": {"min": 1, "max": 5}},
            {"type": "short_text", "title": "What was your favorite part of the event?", "required": False},
            {"type": "long_text", "title": "What event details should we improve next time?", "required": False},
            {"type": "yes_no", "title": "Would you attend again?", "required": True},
        ]

    return [
        {"type": "rating", "title": "How would you rate this experience?", "required": True, "settings": {"min": 1, "max": 5}},
        {"type": "short_text", "title": "What stood out most to you?", "required": False},
        {"type": "long_text", "title": "What could we improve?", "required": False},
        {"type": "dropdown", "title": "What matters most to you?", "required": False, "options": ["Ease of use", "Value", "Speed", "Support", "Other"]},
    ]


def analyze_open_text_responses(responses: list[str]) -> dict[str, Any]:
    cleaned = [sample.strip() for sample in responses if isinstance(sample, str) and sample.strip()]
    if not cleaned:
        return {
            "summary": "No open-text responses were collected yet.",
            "sentiment": {"overall": "neutral", "positive": 0, "negative": 0, "neutral": 0},
            "themes": [],
            "intent": [],
            "recommendations": ["Collect a few more responses to start spotting patterns."],
        }

    scores = []
    for response in cleaned:
        words = set(_keywords_from_text(response))
        score = 0
        for word in words:
            if word in POSITIVE_WORDS:
                score += 1
            if word in NEGATIVE_WORDS:
                score -= 1
        scores.append(score)

    positive_count = sum(1 for score in scores if score > 0)
    negative_count = sum(1 for score in scores if score < 0)
    neutral_count = len(cleaned) - positive_count - negative_count

    if positive_count >= negative_count and positive_count > 0:
        overall = "positive"
    elif negative_count > positive_count:
        overall = "negative"
    else:
        overall = "neutral"

    keywords = Counter()
    for response in cleaned:
        for word in _keywords_from_text(response):
            if word not in STOP_WORDS:
                keywords[word] += 1

    top_themes = [
        {"keyword": word, "count": count}
        for word, count in keywords.most_common(5)
        if word not in {"would", "could", "really", "just"}
    ]

    intent = []
    if positive_count > negative_count:
        intent.append("Respondents are generally satisfied and highlight positives.")
    if negative_count > 0:
        intent.append("Several responses point to friction or unmet expectations.")
    if neutral_count > 0:
        intent.append("A portion of responses are mixed or neutral, suggesting room for clarification.")

    if not intent:
        intent = ["Open-text feedback is balanced and needs more context to prioritize action."]

    if overall == "positive":
        summary = "Most feedback is favorable, with respondents highlighting what is working and where the experience is already strong."
    elif overall == "negative":
        summary = "Feedback points to several pain points, especially around clarity, speed, and overall experience quality."
    else:
        summary = "Feedback is mixed, suggesting that the experience has strengths but also a few clear opportunities for improvement."

    recommendations = []
    if any(theme["keyword"] in {"support", "slow", "confusing", "hard", "complex"} for theme in top_themes):
        recommendations.append("Simplify the most confusing steps and reduce friction in the user journey.")
    if any(theme["keyword"] in {"price", "pricing", "value", "cost"} for theme in top_themes):
        recommendations.append("Revisit pricing and value messaging to align expectations with perceived value.")
    if any(theme["keyword"] in {"speed", "fast", "quick", "easy"} for theme in top_themes):
        recommendations.append("Double down on the strongest experiences and use them as examples for future improvements.")
    if not recommendations:
        recommendations.extend([
            "Use the most common themes to refine messaging and reduce friction in key moments.",
            "Follow up with respondents who left mixed feedback to understand what would make the experience better.",
        ])

    return {
        "summary": summary,
        "sentiment": {
            "overall": overall,
            "positive": positive_count,
            "negative": negative_count,
            "neutral": neutral_count,
        },
        "themes": top_themes,
        "intent": intent,
        "recommendations": recommendations[:3],
    }
