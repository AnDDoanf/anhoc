from database import get_pg_connection

def fetch_student_context(user_id: str, locale: str = "vi") -> tuple:
    """
    Fetches student statistics, active course/subject context, and builds context (RAG)
    by pulling relevant lessons from PostgreSQL based on user preferred subject.
    """
    conn = get_pg_connection()
    if not conn:
        return {}, "No curriculum context available.", "general studies", "học tập chung"

    try:
        with conn.cursor() as cur:
            # 1. Fetch user stats and preferred subject
            cur.execute("""
                SELECT u.username, r.name as role, u.preferred_subject_id, s.level, s.total_xp, s.average_score
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                LEFT JOIN student_stats s ON u.id = s.user_id
                WHERE u.id = %s
            """, (user_id,))
            user_data = cur.fetchone()
            
            if not user_data:
                return {}, "No curriculum context available.", "general studies", "học tập chung"

            preferred_subject_id = user_data.get("preferred_subject_id")
            level = user_data.get("level") or 1
            
            subject_name_en = "general studies"
            subject_name_vi = "học tập chung"
            
            # Fetch preferred subject titles if exists
            if preferred_subject_id:
                cur.execute("""
                    SELECT title_en, title_vi FROM subjects WHERE id = %s
                """, (preferred_subject_id,))
                subj_data = cur.fetchone()
                if subj_data:
                    subject_name_en = subj_data.get("title_en") or "general studies"
                    subject_name_vi = subj_data.get("title_vi") or "học tập chung"

            # 2. Query relevant curriculum lessons based on preferred subject
            if preferred_subject_id:
                cur.execute("""
                    SELECT l.title_en, l.title_vi, l.content_markdown_en, l.content_markdown_vi, g.slug as grade_slug
                    FROM lessons l
                    JOIN grades g ON l.grade_id = g.id
                    WHERE l.subject_id = %s
                    LIMIT 3
                """, (preferred_subject_id,))
            else:
                cur.execute("""
                    SELECT l.title_en, l.title_vi, l.content_markdown_en, l.content_markdown_vi, g.slug as grade_slug
                    FROM lessons l
                    JOIN grades g ON l.grade_id = g.id
                    LIMIT 3
                """)
            lessons = cur.fetchall()

            # Format curriculum context string dynamically
            context_pieces = []
            for idx, lesson in enumerate(lessons):
                title = lesson["title_vi"] if locale == "vi" else lesson["title_en"]
                content = lesson["content_markdown_vi"] if locale == "vi" else lesson["content_markdown_en"]
                context_pieces.append(
                    f"Lesson {idx + 1}: {title} (Grade: {lesson['grade_slug']})\nContent: {content[:800]}..."
                )
            
            curriculum_context = "\n\n".join(context_pieces) if context_pieces else "No curriculum context found."
            
            metadata = {
                "username": user_data.get("username"),
                "role": user_data.get("role") or "student",
                "level": level,
                "total_xp": user_data.get("total_xp") or 0,
                "average_score": float(user_data.get("average_score") or 0)
            }
            return metadata, curriculum_context, subject_name_en, subject_name_vi

    except Exception as e:
        print(f"Error fetching student context: {e}")
        return {}, "Error loading context.", "general studies", "học tập chung"
    finally:
        conn.close()
