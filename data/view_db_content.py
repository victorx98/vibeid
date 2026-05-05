"""
Direct Database Content Viewer - 直接查看数据库内容
"""

import sqlite3
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def main():
    db_path = r'D:\Work\MentorX\vibeid\data\resume_material_library.db'

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        print("🔍 简历材料库数据库内容查看")
        print("=" * 60)

        # 1. 导师列表
        print("\n👨‍🏫 导师列表 (11 位):")
        cursor.execute("SELECT id, name, company, title FROM mentors ORDER BY id")
        mentors = cursor.fetchall()
        for mentor in mentors:
            print(f"   {mentor[0]}. {mentor[1]} - {mentor[2]}, {mentor[3]}")

        # 2. 学生列表
        print("\n👨‍🎓 学生列表 (11 位):")
        cursor.execute("SELECT id, name_en, target_roles FROM students ORDER BY id")
        students = cursor.fetchall()
        for student in students:
            target = student[2] or "未指定"
            print(f"   {student[0]}. {student[1]} - {target[:50]}{'...' if len(target) > 50 else ''}")

        # 3. 会话列表
        print("\n📅 会话记录 (21 场):")
        cursor.execute("""
            SELECT s.id, s.session_date, m.name as mentor, st.name_en as student, s.target_job_title
            FROM sessions s
            JOIN mentors m ON s.mentor_id = m.id
            JOIN students st ON s.student_id = st.id
            ORDER BY s.id
        """)
        sessions = cursor.fetchall()
        for session in sessions:
            mentor = session[2]
            student = session[3]
            target = session[4] or "未指定"
            print(f"   {session[0]}. {session[1]} - {mentor} → {student} ({target})")

        # 4. 建议段落分类统计
        print("\n📊 建议段落分类统计 (164 条):")
        cursor.execute("SELECT L1, COUNT(*) as cnt FROM segments GROUP BY L1 ORDER BY cnt DESC")
        categories = cursor.fetchall()
        for cat, cnt in categories:
            print(f"   • {cat}: {cnt} 条")

        # 5. 置信度分布
        print("\n🎯 置信度分布:")
        cursor.execute("SELECT confidence, COUNT(*) FROM segments GROUP BY confidence")
        confidences = cursor.fetchall()
        for conf, cnt in confidences:
            print(f"   • {conf}: {cnt} 条")

        # 6. 详细查看 segments 内容
        print("\n📝 建议段落详情 (前 10 条):")
        cursor.execute("""
            SELECT s.id, s.segment_id, s.L1, s.L2, s.A_action,
                   m.name as mentor, st.name_en as student
            FROM segments s
            JOIN sessions sess ON s.session_id = sess.id
            JOIN mentors m ON sess.mentor_id = m.id
            JOIN students st ON sess.student_id = st.id
            ORDER BY s.id
            LIMIT 10
        """)
        segments = cursor.fetchall()

        for i, seg in enumerate(segments, 1):
            print(f"\n   {i}. 段落 ID: {seg[1]}")
            print(f"      分类: {seg[2]} > {seg[3]}")
            print(f"      导师: {seg[5]} → 学生: {seg[6]}")
            action = seg[4] or "无具体行动"
            if len(action) > 100:
                action = action[:100] + "..."
            print(f"      建议: {action}")

        # 7. 前后对比示例
        print("\n🔄 改写前后对比示例 (前 3 条):")
        cursor.execute("""
            SELECT b.id, b.before_text, b.after_text, b.reason,
                   m.name as mentor, st.name_en as student
            FROM before_after_pairs b
            JOIN sessions s ON b.session_id = s.id
            JOIN mentors m ON s.mentor_id = m.id
            JOIN students st ON s.student_id = st.id
            ORDER BY b.id
            LIMIT 3
        """)
        examples = cursor.fetchall()

        for i, ex in enumerate(examples, 1):
            print(f"\n   {i}. {ex[4]} → {ex[5]}")
            print(f"      修改原因: {ex[3][:80]}{'...' if len(ex[3]) > 80 else ''}")
            print(f"      改前: {ex[1][:60]}{'...' if len(ex[1]) > 60 else ''}")
            print(f"      改后: {ex[2][:60]}{'...' if len(ex[2]) > 60 else ''}")

        # 8. 数据质量检查
        print("\n✅ 数据质量检查:")
        cursor.execute("SELECT COUNT(*) FROM segments WHERE A_action IS NULL OR A_action = ''")
        empty_actions = cursor.fetchone()[0]
        print(f"   • 缺少行动建议的段落: {empty_actions} 条")

        cursor.execute("SELECT COUNT(*) FROM segments s LEFT JOIN sessions sess ON s.session_id = sess.id WHERE sess.id IS NULL")
        orphan_segments = cursor.fetchone()[0]
        print(f"   • 孤立的段落: {orphan_segments} 条")

        cursor.execute("SELECT COUNT(*) FROM segments WHERE confidence = 'high'")
        high_conf = cursor.fetchone()[0]
        print(f"   • 高置信度段落: {high_conf} 条")

        cursor.close()
        conn.close()

        print("\n🎉 数据库内容查看完成!")

    except Exception as e:
        print(f"❌ 错误: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
