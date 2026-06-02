def build_prompt_with_cot(
    student_meta: dict, 
    rag_context: str, 
    student_query: str, 
    subject_name_en: str, 
    subject_name_vi: str, 
    locale: str = "vi",
    reasoning_technique: str = "step_by_step"
) -> str:
    """
    Constructs a highly structured reasoning system prompt directing the model
    to perform step-by-step Chain of Thought encapsulated in tags, specializing
    dynamically in the student's active course/subject.
    """
    subject_name = subject_name_vi if locale == "vi" else subject_name_en
    lang_instruction = "Respond entirely in Vietnamese." if locale == "vi" else "Respond entirely in English."
    reasoning_instruction = build_reasoning_instruction(reasoning_technique)
    
    prompt = f"""
You are Anhoc, a friendly, intelligent {subject_name} tutor chatbot helping kids from grades 1-9 learn {subject_name}.
{lang_instruction}

---
STUDENT INFO (Use this to customize your vocabulary and tone. Adapt to their level):
- Name: {student_meta.get('username', 'Student')}
- Current Course Level: {student_meta.get('level', 1)}
- XP Points: {student_meta.get('total_xp', 0)}
---

---
CURRICULUM CONTEXT (RAG - Injected from our lessons. Use this mathematical or course information directly to answer if applicable):
{rag_context}
---

INSTRUCTIONS:
1. Use this reasoning technique privately before answering: {reasoning_instruction}
2. Put only a concise reasoning summary inside the '<thought>' block. Do not reveal hidden chain-of-thought, exhaustive internal reasoning, or private deliberation.
3. After the closing '</thought>' tag, provide the final friendly, encouraging, and clear answer for the student. Use clean markdown.
4. Keep the language fun, engaging, and clear for school kids. Explain academic steps with examples.

Student Question: {student_query}

Follow this exact structural layout:
<thought>
[Your step-by-step Chain-of-Thought reasoning goes here]
</thought>
[Your friendly student-facing tutor explanation goes here]
"""
    return prompt


def build_reasoning_instruction(reasoning_technique: str) -> str:
    techniques = {
        "step_by_step": (
            "Step-by-step decomposition. Identify the known values, choose the relevant rule or formula, "
            "solve in ordered steps, and summarize the key reason each step works."
        ),
        "plan_solve_check": (
            "Plan-Solve-Check. First choose a plan, then solve the problem, then verify the result against "
            "the original question and note any common mistake to avoid."
        ),
        "socratic": (
            "Socratic tutoring. Guide the student with short guiding questions and reveal the solution "
            "progressively instead of jumping directly to the final result."
        ),
        "worked_example": (
            "Worked example. Solve the given problem as a model example, label each operation clearly, "
            "and finish with a quick pattern the student can reuse."
        ),
    }

    return techniques.get(reasoning_technique, techniques["step_by_step"])
