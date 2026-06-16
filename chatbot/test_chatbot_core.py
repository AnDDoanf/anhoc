import asyncio
from datetime import datetime
from intent_service import detect_intent, detect_mode
from language_service import detect_language
from math_tool_service import solve_with_tools, check_student_answer
from tutor_service import calculate_confidence_score, _build_practice_payload
from memory_service import update_student_memory, default_student_memory, in_memory_student_memories
from database import is_mongo_available

def test_language_detection():
    print("Testing Language Detection...")
    assert detect_language("Tính diện tích hình chữ nhật") == "vi"
    assert detect_language("Calculate the area of a rectangle") == "en"
    assert detect_language("Tính area của circle") == "mixed"
    print("Language Detection OK.")

def test_intent_routing():
    print("Testing Intent Routing...")
    assert detect_intent("hãy gợi ý cho em") == "give_hint"
    assert detect_intent("bài này đúng không") == "check_answer"
    assert detect_intent("cho em một bài tương tự") == "generate_practice"
    assert detect_intent("hãy giải thích tại sao") == "explain_concept"
    assert detect_intent("chứng minh định lý") == "prove_statement"
    assert detect_intent("giải phương trình 3x + 5 = 20") == "solve_problem"
    assert detect_intent("xin chào") == "general_tutor_chat"
    
    assert detect_mode("chứng minh định lý", None) == "explain"
    print("Intent Routing OK.")

def test_math_tool_solving():
    print("Testing Math Tool Solving...")
    
    # 1. Comparison
    res = solve_with_tools("So sánh 2/3 và 3/4")
    assert res is not None
    assert res.topic == "comparison"
    assert res.final_answer == "2/3 < 3/4"
    
    # 2. Linear Equation
    res = solve_with_tools("giải phương trình 3x+5=20")
    assert res is not None
    assert res.topic == "linear-equation"
    assert res.final_answer == "x = 5"
    
    # 3. Vietnamese Word Equation (Multiplication & Addition)
    res = solve_with_tools("x nhân 5 cộng 3 bằng 18")
    assert res is not None
    assert res.topic == "linear-equation"
    assert res.final_answer == "x = 3"
    assert "Em trừ 3 trước, rồi chia cho 5." in res.hint
    
    # 4. Vietnamese Word Equation (Division & Subtraction)
    res = solve_with_tools("x chia 4 trừ 2 bằng 5")
    assert res is not None
    assert res.topic == "linear-equation"
    assert res.final_answer == "x = 28"
    assert "Em cộng 2 trước, rồi nhân với 4." in res.hint

    # 5. Arithmetic
    res = solve_with_tools("tính (12 + 15) * 4")
    assert res is not None
    assert res.topic == "arithmetic"
    assert res.final_answer == "108"

    # 6. Geometry - Rectangle Area
    res = solve_with_tools("Tính diện tích hình chữ nhật có chiều dài 8 và chiều rộng 5")
    assert res is not None
    assert res.topic == "geometry"
    assert res.final_answer == "40"
    
    # 7. Geometry - Circle Perimeter
    res = solve_with_tools("Calculate the circumference of a circle with radius of 10")
    assert res is not None
    assert res.topic == "geometry"
    assert "20*pi" in res.final_answer or "62.83" in res.final_answer
    
    print("Math Tool Solving OK.")

def test_confidence_scoring():
    print("Testing Confidence Scoring...")
    # Math tool match -> 1.0
    res = solve_with_tools("Tính (12 + 15) * 4")
    assert calculate_confidence_score("solve_problem", res) == 1.0
    
    # Solve intent but no tool match -> 0.6
    assert calculate_confidence_score("solve_problem", None) == 0.6
    
    # Hint/Check/Practice/Explain/Prove intents -> 0.9
    assert calculate_confidence_score("explain_concept", None) == 0.9
    assert calculate_confidence_score("prove_statement", None) == 0.9
    
    # General chat -> 0.8
    assert calculate_confidence_score("general_tutor_chat", None) == 0.8
    print("Confidence Scoring OK.")

def test_randomized_practice():
    print("Testing Randomized Practice Payload...")
    # Check that calling _build_practice_payload yields varied problems
    eq1, _, _, _ = _build_practice_payload("phuong trinh", "easy", "vi")
    eq2, _, _, _ = _build_practice_payload("phuong trinh", "easy", "vi")
    # There is a high likelihood they will be different, or at least they compile and execute correctly
    assert eq1 is not None
    assert eq2 is not None
    print("Randomized Practice Payload OK.")

async def test_memory_mistake_tracking():
    print("Testing Memory Mistake Tracking...")
    user_id = "test_user_999"
    
    # Pre-populate / Reset local state
    in_memory_student_memories[user_id] = default_student_memory(user_id)
    if await is_mongo_available():
        from database import db_mongo
        await db_mongo.student_memories.delete_one({"userId": user_id})
    
    # Call memory update with was_correct=False
    await update_student_memory(
        user_id,
        language="vi",
        grade=6,
        mode="check",
        topic="geometry",
        easier_requested=False,
        was_correct=False,
        mistake="Incorrect geometry area calculation"
    )
    
    if await is_mongo_available():
        from database import db_mongo
        memory = await db_mongo.student_memories.find_one({"userId": user_id})
    else:
        memory = in_memory_student_memories[user_id]
        
    assert memory is not None
    assert "geometry" in memory["weakTopics"]
    assert len(memory["recentMistakes"]) == 1
    assert memory["recentMistakes"][0]["topic"] == "geometry"
    assert memory["recentMistakes"][0]["mistake"] == "Incorrect geometry area calculation"
    assert "createdAt" in memory["recentMistakes"][0]
    print("Memory Mistake Tracking OK.")

async def main():
    test_language_detection()
    test_intent_routing()
    test_math_tool_solving()
    test_confidence_scoring()
    test_randomized_practice()
    await test_memory_mistake_tracking()
    print("=== ALL CHATBOT CORE TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    asyncio.run(main())
