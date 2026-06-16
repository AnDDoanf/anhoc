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
    equation_match = re.search(r"([0-9x+\-*/^ ().]+=[0-9x+\-*/^ ().]+)", normalized)
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
    
    # Match pattern: x [nhan|nhân|chia|*|/] [val1] [cong|cộng|tru|trừ|+|-] [val2] = [total]
    pattern = re.compile(
        r"x\s*(nhan|nhân|chia|\*|/)\s*(-?\d+(?:\.\d+)?)\s*"
        r"(cong|cộng|tru|trừ|\+|-)\s*(-?\d+(?:\.\d+)?)\s*"
        r"(?:duoc|được|bang|bằng|=)\s*(-?\d+(?:\.\d+)?)"
    )
    match = pattern.search(compact)
    if not match:
        return None

    op1 = match.group(1)
    val1 = _coerce_number(match.group(2))
    op2 = match.group(3)
    val2 = _coerce_number(match.group(4))
    total = _coerce_number(match.group(5))

    x = sp.Symbol('x')
    if op1 in {"nhan", "nhân", "*"}:
        expr = x * val1
        op1_sym = "x"
    else:
        expr = x / val1
        op1_sym = "/"

    if op2 in {"cong", "cộng", "+"}:
        expr = expr + val2
        op2_sym = "+"
        intermediate_total = total - val2
        inverse_op2_step = f"{total} - {val2}"
    else:
        expr = expr - val2
        op2_sym = "-"
        intermediate_total = total + val2
        inverse_op2_step = f"{total} + {val2}"

    try:
        sol = sp.solve(sp.Eq(expr, total), x)
        if not sol:
            return None
        x_value = _format_number(sol[0])
    except Exception:
        return None

    eq_str = f"x {op1_sym} {val1} {op2_sym} {val2} = {total}"
    term_str = f"x {op1_sym} {val1}"
    step2_str = f"{term_str} = {inverse_op2_step} = {_format_number(intermediate_total)}"

    if op1 in {"nhan", "nhân", "*"}:
        step3_str = f"x = {_format_number(intermediate_total)} / {val1} = {x_value}"
        hint = f"Em {('cộng' if op2_sym == '-' else 'trừ')} {val2} trước, rồi chia cho {val1}."
    else:
        step3_str = f"x = {_format_number(intermediate_total)} x {val1} = {x_value}"
        hint = f"Em {('cộng' if op2_sym == '-' else 'trừ')} {val2} trước, rồi nhân với {val1}."

    return MathToolResult(
        tool_used="word_equation_solver",
        topic="linear-equation",
        steps=[
            eq_str,
            step2_str,
            step3_str
        ],
        final_answer=f"x = {x_value}",
        hint=hint,
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


def solve_geometry_question(message: str) -> MathToolResult | None:
    normalized = normalize_math_text(message)

    # 1. Rectangle
    if "hình chữ nhật" in normalized or "rectangle" in normalized:
        length_match = re.search(r"(?:chiều dài|chieu dai|length)\s*(?:là|la|of)?\s*(\d+(?:\.\d+)?)", normalized)
        width_match = re.search(r"(?:chiều rộng|chieu rong|width)\s*(?:là|la|of)?\s*(\d+(?:\.\d+)?)", normalized)
        if length_match and width_match:
            l_val = _coerce_number(length_match.group(1))
            w_val = _coerce_number(width_match.group(1))
            if "diện tích" in normalized or "dien tich" in normalized or "area" in normalized:
                area = l_val * w_val
                return MathToolResult(
                    tool_used="sympy_geometry",
                    topic="geometry",
                    steps=[
                        f"S = dài x rộng = {l_val} x {w_val}",
                        f"S = {area}"
                    ],
                    final_answer=str(area),
                    hint="Diện tích hình chữ nhật bằng chiều dài nhân chiều rộng." if "diện tích" in message or "dien" in message else "Area of a rectangle is length times width.",
                    explanation_seed="Calculate the area of the rectangle by multiplying length and width."
                )
            elif "chu vi" in normalized or "perimeter" in normalized:
                perimeter = 2 * (l_val + w_val)
                return MathToolResult(
                    tool_used="sympy_geometry",
                    topic="geometry",
                    steps=[
                        f"P = 2 x (dài + rộng) = 2 x ({l_val} + {w_val})",
                        f"P = {perimeter}"
                    ],
                    final_answer=str(perimeter),
                    hint="Chu vi hình chữ nhật bằng hai lần tổng chiều dài và chiều rộng." if "chu vi" in message else "Perimeter of a rectangle is twice the sum of length and width.",
                    explanation_seed="Calculate the perimeter of the rectangle as 2 * (length + width)."
                )

    # 2. Square
    if "hình vuông" in normalized or "square" in normalized:
        side_match = re.search(r"(?:cạnh|canh|side)\s*(?:là|la|of)?\s*(\d+(?:\.\d+)?)", normalized)
        if side_match:
            s_val = _coerce_number(side_match.group(1))
            if "diện tích" in normalized or "dien tich" in normalized or "area" in normalized:
                area = s_val ** 2
                return MathToolResult(
                    tool_used="sympy_geometry",
                    topic="geometry",
                    steps=[
                        f"S = cạnh x cạnh = {s_val} x {s_val}",
                        f"S = {area}"
                    ],
                    final_answer=str(area),
                    hint="Diện tích hình vuông bằng bình phương độ dài cạnh." if "diện tích" in message or "dien" in message else "Area of a square is side squared.",
                    explanation_seed="Calculate the area of the square by squaring the side length."
                )
            elif "chu vi" in normalized or "perimeter" in normalized:
                perimeter = 4 * s_val
                return MathToolResult(
                    tool_used="sympy_geometry",
                    topic="geometry",
                    steps=[
                        f"P = 4 x cạnh = 4 x {s_val}",
                        f"P = {perimeter}"
                    ],
                    final_answer=str(perimeter),
                    hint="Chu vi hình vuông bằng độ dài cạnh nhân với 4." if "chu vi" in message else "Perimeter of a square is 4 times the side length.",
                    explanation_seed="Calculate the perimeter of the square as 4 * side."
                )

    # 3. Triangle
    if "hình tam giác" in normalized or "triangle" in normalized:
        base_match = re.search(r"(?:đáy|day|base)\s*(?:là|la|of)?\s*(\d+(?:\.\d+)?)", normalized)
        height_match = re.search(r"(?:chiều cao|chieu cao|height)\s*(?:là|la|of)?\s*(\d+(?:\.\d+)?)", normalized)
        if base_match and height_match:
            b_val = _coerce_number(base_match.group(1))
            h_val = _coerce_number(height_match.group(1))
            if "diện tích" in normalized or "dien tich" in normalized or "area" in normalized:
                area = 0.5 * b_val * h_val
                return MathToolResult(
                    tool_used="sympy_geometry",
                    topic="geometry",
                    steps=[
                        f"S = 0.5 x đáy x cao = 0.5 x {b_val} x {h_val}",
                        f"S = {_format_number(area)}"
                    ],
                    final_answer=_format_number(area),
                    hint="Diện tích hình tam giác bằng nửa tích độ dài đáy và chiều cao." if "diện tích" in message or "dien" in message else "Area of a triangle is half of base times height.",
                    explanation_seed="Calculate the area of the triangle as 0.5 * base * height."
                )

    # 4. Circle
    if "hình tròn" in normalized or "circle" in normalized:
        radius_match = re.search(r"(?:bán kính|ban kinh|radius)\s*(?:là|la|of)?\s*(\d+(?:\.\d+)?)", normalized)
        if radius_match:
            r_val = _coerce_number(radius_match.group(1))
            if "diện tích" in normalized or "dien tich" in normalized or "area" in normalized:
                area = sp.pi * (r_val ** 2)
                return MathToolResult(
                    tool_used="sympy_geometry",
                    topic="geometry",
                    steps=[
                        f"S = pi x r^2 = pi x {r_val}^2",
                        f"S = {sp.N(area, 4)}"
                    ],
                    final_answer=str(sp.N(area, 4)),
                    hint="Diện tích hình tròn bằng pi nhân bình phương bán kính." if "diện tích" in message or "dien" in message else "Area of a circle is pi times radius squared.",
                    explanation_seed="Calculate the area of the circle using formula pi * r^2."
                )
            elif "chu vi" in normalized or "perimeter" in normalized or "circumference" in normalized:
                perimeter = 2 * sp.pi * r_val
                return MathToolResult(
                    tool_used="sympy_geometry",
                    topic="geometry",
                    steps=[
                        f"C = 2 x pi x r = 2 x pi x {r_val}",
                        f"C = {sp.N(perimeter, 4)}"
                    ],
                    final_answer=str(sp.N(perimeter, 4)),
                    hint="Chu vi hình tròn bằng hai lần pi nhân bán kính." if "chu vi" in message else "Circumference of a circle is 2 * pi * radius.",
                    explanation_seed="Calculate the circumference of the circle using formula 2 * pi * r."
                )
    return None


def solve_with_tools(message: str) -> MathToolResult | None:
    for solver in (
        solve_compare_question,
        solve_vietnamese_word_equation_question,
        solve_linear_equation_question,
        solve_arithmetic_series_question,
        solve_geometry_question,
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
