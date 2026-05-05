"""
Quick database inspection - 检查简历材料库数据库
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

        print("📊 简历材料库数据库检查")
        print("=" * 50)

        # 1. 表概览
        print("\n1️⃣ 表概览:")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]

        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"   • {table}: {count:,} 行")

        # 2. 表结构检查
        print("\n2️⃣ 关键表结构:")

        for table in ['mentors', 'students', 'sessions', 'segments']:
            print(f"\n   {table.upper()} 表结构:")
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            for col in columns:
                nullable = "NULL" if not col[3] else "NOT NULL"
                print(f"     - {col[1]} ({col[2]}) {nullable}")

        # 3. 数据质量检查
        print("\n3️⃣ 数据质量检查:")

        # 检查 segments 的 A_action 字段
        cursor.execute("SELECT COUNT(*) FROM segments WHERE A_action IS NULL OR A_action = ''")
        empty_actions = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM segments")
        total_segments = cursor.fetchone()[0]
        print(f"   • Segments 表: {total_segments} 条记录")
        print(f"   • 缺少 A_action 的记录: {empty_actions} ({empty_actions/total_segments*100:.1f}%)")

        # 检查外键完整性
        cursor.execute("""
            SELECT COUNT(*) FROM segments s
            LEFT JOIN sessions sess ON s.session_id = sess.id
            WHERE sess.id IS NULL
        """)
        orphan_segments = cursor.fetchone()[0]
        print(f"   • 孤立的 segments (无对应 session): {orphan_segments}")

        # 4. 分类统计
        print("\n4️⃣ 分类统计:")

        cursor.execute("SELECT L1, COUNT(*) as cnt FROM segments WHERE L1 IS NOT NULL GROUP BY L1 ORDER BY cnt DESC LIMIT 5")
        l1_stats = cursor.fetchall()
        print("   L1 分类 (前5):")
        for l1, cnt in l1_stats:
            print(f"     • {l1}: {cnt}")

        cursor.execute("SELECT confidence, COUNT(*) FROM segments GROUP BY confidence")
        conf_stats = cursor.fetchall()
        print("\n   Confidence 分布:")
        for conf, cnt in conf_stats:
            print(f"     • {conf}: {cnt}")

        # 5. 样本数据
        print("\n5️⃣ 样本数据:")

        print("\n   示例导师:")
        cursor.execute("SELECT name, company, title FROM mentors LIMIT 2")
        mentors = cursor.fetchall()
        for mentor in mentors:
            print(f"     • {mentor[0]} ({mentor[1]}, {mentor[2]})")

        print("\n   示例学生:")
        cursor.execute("SELECT name_en, target_roles FROM students LIMIT 2")
        students = cursor.fetchall()
        for student in students:
            print(f"     • {student[0]} - {student[1] or '无目标职位'}")

        print("\n   示例建议段落:")
        cursor.execute("SELECT L1, L2, A_action FROM segments WHERE A_action IS NOT NULL LIMIT 2")
        segments = cursor.fetchall()
        for i, seg in enumerate(segments, 1):
            action = seg[2][:80] + "..." if len(seg[2]) > 80 else seg[2]
            print(f"     {i}. [{seg[0]} > {seg[1]}] {action}")

        cursor.close()
        conn.close()

        print("\n✅ 检查完成!")

    except Exception as e:
        print(f"❌ 错误: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
