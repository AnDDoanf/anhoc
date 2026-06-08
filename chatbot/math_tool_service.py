import re
from dataclasses import dataclass, field

import sympy as sp
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)


@dataclass
class MathToolResult:
    tool_used: str | None = None
    topic: str | None = None
    steps: list[str] = field(default_factory=list)
    final_answer: str | None = None
    hint: str | None = None
    explanation_seed: str | None = None


def normalize_math_text(text: str) -> str:
    normalized = (text or "").lower().strip()
    normalized = normalized.replace("×", "*")
    normalized = normalized.replace("÷", "/").replace("^", "**")
    normalized = normalized.replace("–", "-").replace("−", "-")
    return normalized


def _safe_sympify(expression: str):
    transformations = standard_transformations + (implicit_multiplication_application, convert_xor)
    return parse_expr(normalize_math_text(expression), transformations=transformations, evaluate=True)


def calculate_expression(expression: str):
    return _safe_sympify(expression).evalf()


def solve_equation(equation: str, variable: str = "x"):
    symbol = sp.Symbol(variable)
    left, right = equation.split("=")
    result = sp.solve(sp.Eq(_safe_sympify(left), _safe_sympify(right)), symbol)
    return result


def simplify_expression(expression: str):
    return sp.simplify(_safe_sympify(expression))


def check_equivalent(expr_a: str, expr_b: str):
    return sp.simplify(_safe_sympify(expr_a) - _safe_sympify(expr_b)) == 0


def _format_number(value) -> str:
    simplified = sp.nsimplify(value)
    if simplified.is_Integer:
        return str(int(simplified))
    return str(simplified)


def _coerce_number(value: str) -> float | int:
    parsed = float(value)
    if parsed.is_integer():
        return int(parsed)
    return parsed


def solve_compare_question(message: str) -> MathToolResult | None:
    normalized = normalize_math_text(message)
    match = re.search(r"(?:so sánh|so sanh|compare)\s+(.+?)\s+(?:và|va|and)\s+(.+)$", normalized)
    if not match:
        match = re.search(r"(.+?)\s*(?:>|<)\s*(.+)", normalized)
        if not match:
            return None

    left_expr = match.group(1).strip(" ?")
    right_expr = match.group(2).strip(" ?")

    try:
        left_value = sp.N(_safe_sympify(left_expr))
        right_value = sp.N(_safe_sympify(right_expr))
    except Exception:
        return None

    if left_value < right_value:
        comparator = "<"
    elif left_value > right_value:
        comparator = ">"
    else:
        comparator = "="

    return MathToolResult(
        tool_used="sympy_compare",
        topic="comparison",
        steps=[
            f"{left_expr} = {_format_number(left_value)}",
            f"{right_expr} = {_format_number(right_value)}",
            f"{_format_number(left_value)} {comparator} {_format_number(right_value)}",
        ],
        final_answer=f"{left_expr} {comparator} {right_expr}",
        hint="Tính giá trị của từng vế rồi so sánh." if "so" in normalized else "Evaluate each side, then compare them.",
        explanation_seed="Compare by evaluating both expressions first.",
    )


def solve_linear_equation_question(message: str) -> MathToolResult | None:
    normalized = normalize_math_text(message)
    equation_match = re.search(r"([0-9a-z+\-*/^ ().]+=[0-9a-z+\-*/^ ().]+)", normalized)
    if not equation_match:
        return None

    equation = equation_match.group(1).replace(" ", "")
    if "x" not in equation:
        return None

    try:
        result = solve_equation(equation, "x")
    except Exception:
        return None

    if not result:
        return None

    answer = _format_number(result[0])
    left, right = equation.split("=")
    return MathToolResult(
        tool_used="sympy_equation_solver",
        topic="linear-equation",
        steps=[
            f"{left} = {right}",
            "Chuyển các hạng tử để cô lập x." if "giai" in normalized or "tinh" in normalized else "Rearrange to isolate x.",
            f"x = {answer}",
        ],
        final_answer=f"x = {answer}",
        hint="Hãy đưa x về một vế rồi chia hệ số của x." if "x" in equation else None,
        explanation_seed="Solve by isolating x on one side.",
    )


def solve_vietnamese_word_equation_question(message: str) -> MathToolResult | None:
    normalized = normalize_math_text(message)
    compact = re.sub(r"\s+", " ", normalized)
    pattern = re.compile(
        r"x\s*(?:nhan|\*)\s*(-?\d+(?:\.\d+)?)\s*"
        r"(?:cong|\+)\s*(-?\d+(?:\.\d+)?)\s*"
        r"(?:duoc|bang|=)\s*(-?\d+(?:\.\d+)?)"
    )
    match = pattern.search(compact)
    if not match:
        pattern = re.compile(
            r"x\s*(?:chia|/)\s*(-?\d+(?:\.\d+)?)\s*"
            r"(?:cong|\+)\s*(-?\d+(?:\.\d+)?)\s*"
            r"(?:duoc|bang|=)\s*(-?\d+(?:\.\d+)?)"
        )
        match = pattern.search(compact)
        if not match:
            return None

        divisor = _coerce_number(match.group(1))
        addend = _coerce_number(match.group(2))
        total = _coerce_number(match.group(3))
        x_value = (total - addend) * divisor
        return MathToolResult(
            tool_used="word_equation_solver",
            topic="linear-equation",
            steps=[
                f"x / {divisor} + {addend} = {total}",
                f"x / {divisor} = {total} - {addend} = {_format_number(total - addend)}",
                f"x = {_format_number(total - addend)} x {divisor} = {_format_number(x_value)}",
            ],
            final_answer=f"x = {_format_number(x_value)}",
            hint="Em trừ số cộng trước, rồi nhân lại với số đang chia.",
            explanation_seed="Convert the Vietnamese word equation to symbols, then isolate x.",
        )

    multiplier = _coerce_number(match.group(1))
    addend = _coerce_number(match.group(2))
    total = _coerce_number(match.group(3))
    x_value = (total - addend) / multiplier
    return MathToolResult(
        tool_used="word_equation_solver",
        topic="linear-equation",
        steps=[
            f"x x {multiplier} + {addend} = {total}",
            f"x x {multiplier} = {total} - {addend} = {_format_number(total - addend)}",
            f"x = {_format_number(total - addend)} / {multiplier} = {_format_number(x_value)}",
        ],
        final_answer=f"x = {_format_number(x_value)}",
        hint="Em trừ 1 trước, rồi chia cho 9.",
        explanation_seed="Convert the Vietnamese word equation to symbols, then isolate x.",
    )


def solve_arithmetic_question(message: str) -> MathToolResult | None:
    normalized = normalize_math_text(message)
    expression_match = re.search(r"([-+*/()0-9.\s*]{3,})", normalized)
    if not expression_match:
        return None

    expression = expression_match.group(1).strip()
    if not re.search(r"\d", expression):
        return None

    try:
        simplified = simplify_expression(expression)
        numeric = sp.N(simplified)
    except Exception:
        return None

    final_answer = _format_number(numeric)
    return MathToolResult(
        tool_used="sympy_calculator",
        topic="arithmetic",
        steps=[
            f"{expression} = {_format_number(simplified)}",
            f"Kết quả là {final_answer}" if "tinh" in normalized else f"The result is {final_answer}",
        ],
        final_answer=final_answer,
        hint="Thử nhóm thừa số chung hoặc rút gọn trước khi bấm máy." if "nhanh" in normalized else None,
        explanation_seed="Use symbolic calculation to verify the arithmetic.",
    )


def solve_arithmetic_series_question(message: str) -> MathToolResult | None:
    normalized = normalize_math_text(message)
    match = re.search(r"(\d+)\s*\+\s*(\d+)\s*\+\s*(\d+)\s*\+\s*\.\.\.\s*\+\s*(\d+)", normalized)
    if not match:
        return None

    first = int(match.group(1))
    second = int(match.group(2))
    third = int(match.group(3))
    last = int(match.group(4))
    step = second - first

    if third - second != step or step == 0:
        return None

    n = ((last - first) // step) + 1
    if first + (n - 1) * step != last or n <= 0:
        return None

    total = n * (first + last) // 2
    series_text = f"{first} + {second} + {third} + ... + {last}"

    return MathToolResult(
        tool_used="arithmetic_series_formula",
        topic="arithmetic-series",
        steps=[
            f"So hang dau la {first}, so hang cuoi la {last}, cong sai la {step}",
            f"So hang co tat ca la n = {n}",
            f"S = n x (so dau + so cuoi) / 2 = {n} x ({first} + {last}) / 2",
            f"S = {total}",
        ],
        final_answer=str(total),
        hint="Day la cap so cong, em co the dung cong thuc tong cap so cong.",
        explanation_seed=f"Use the arithmetic series sum formula for {series_text}.",
    )


def solve_with_tools(message: str) -> MathToolResult | None:
    for solver in (
        solve_compare_question,
        solve_vietnamese_word_equation_question,
        solve_linear_equation_question,
        solve_arithmetic_series_question,
        solve_arithmetic_question,
    ):
        result = solver(message)
        if result:
            return result
    return None


def check_student_answer(question: str, student_answer: str) -> tuple[bool, str | None]:
    tool_result = solve_with_tools(question)
    if not tool_result or not tool_result.final_answer:
        return False, None

    normalized_student = normalize_math_text(student_answer).replace(" ", "")
    normalized_correct = normalize_math_text(tool_result.final_answer).replace(" ", "")

    if normalized_student == normalized_correct:
        return True, tool_result.final_answer

    if "=" in normalized_correct and "=" in normalized_student:
        student_rhs = normalized_student.split("=")[-1]
        correct_rhs = normalized_correct.split("=")[-1]
        try:
            if check_equivalent(student_rhs, correct_rhs):
                return True, tool_result.final_answer
        except Exception:
            pass
    else:
        try:
            if check_equivalent(normalized_student, normalized_correct):
                return True, tool_result.final_answer
        except Exception:
            pass

    return False, tool_result.final_answer
