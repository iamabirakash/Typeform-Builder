import unittest

from app.ai_service import analyze_open_text_responses, generate_form_from_prompt, suggest_questions_for_goal


class AIServiceTests(unittest.TestCase):
    def test_generate_form_from_prompt_creates_title_and_questions(self):
        result = generate_form_from_prompt("Collect product feedback from our beta users for a new onboarding flow")

        self.assertIn("Feedback", result["title"])
        self.assertTrue(result["description"]) 
        self.assertGreaterEqual(len(result["questions"]), 3)

    def test_suggest_questions_for_goal_returns_contextual_questions(self):
        result = suggest_questions_for_goal("collect customer feedback for SaaS onboarding")

        self.assertTrue(result)
        self.assertTrue(any("improve" in question["title"].lower() for question in result))

    def test_analyze_open_text_responses_creates_summary_and_recommendations(self):
        responses = [
            "The onboarding was smooth and easy to follow.",
            "I loved the dashboard, but the pricing feels too expensive.",
            "The support team was slow and the setup was confusing."
        ]

        result = analyze_open_text_responses(responses)

        self.assertIn(result["sentiment"]["overall"], {"positive", "neutral", "negative"})
        self.assertTrue(result["summary"])
        self.assertTrue(result["recommendations"])


if __name__ == "__main__":
    unittest.main()
