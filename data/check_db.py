import sqlite3
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

db = sqlite3.connect(r'D:\Work\MentorX\vibeid\data\resume_material_library.db')
db.row_factory = sqlite3.Row

# 表列表
print("=== DATABASE TABLES ===")
tables = db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
for table in tables:
    count = db.execute(f"SELECT COUNT(*) FROM {table[0]}").fetchone()[0]
    print(f"  {table[0]}: {count} rows")

# Mentors 结构
print("\n=== MENTORS COLUMNS ===")
cols = db.execute("PRAGMA table_info(mentors)").fetchall()
mentor_cols = [c[1] for c in cols]
print(mentor_cols)
print(f"Total: {len(mentor_cols)} columns")

# Mentors 样本
print("\n=== SAMPLE MENTOR ===")
mentor = db.execute("SELECT * FROM mentors LIMIT 1").fetchone()
if mentor:
    print(json.dumps(dict(mentor), indent=2, ensure_ascii=False))

# Students 结构
print("\n=== STUDENTS COLUMNS ===")
cols = db.execute("PRAGMA table_info(students)").fetchall()
student_cols = [c[1] for c in cols]
print(student_cols)
print(f"Total: {len(student_cols)} columns")

# Students 样本
print("\n=== SAMPLE STUDENT ===")
student = db.execute("SELECT * FROM students LIMIT 1").fetchone()
if student:
    print(json.dumps(dict(student), indent=2, ensure_ascii=False))

# Sessions 结构
print("\n=== SESSIONS COLUMNS ===")
cols = db.execute("PRAGMA table_info(sessions)").fetchall()
session_cols = [c[1] for c in cols]
print(session_cols)
print(f"Total: {len(session_cols)} columns")

# Sessions 样本
print("\n=== SAMPLE SESSION ===")
session = db.execute("SELECT * FROM sessions LIMIT 1").fetchone()
if session:
    print(json.dumps(dict(session), indent=2, ensure_ascii=False))

# Segments 结构
print("\n=== SEGMENTS COLUMNS ===")
cols = db.execute("PRAGMA table_info(segments)").fetchall()
segment_cols = [c[1] for c in cols]
print(segment_cols)
print(f"Total: {len(segment_cols)} columns")

# Segments 样本（展示核心字段）
print("\n=== SAMPLE SEGMENT (KEY FIELDS) ===")
segment = db.execute("SELECT * FROM segments LIMIT 1").fetchone()
if segment:
    seg_dict = dict(segment)
    # 只显示关键字段，避免太长
    key_fields = ['id', 'session_id', 'segment_id', 'L1', 'L2', 'L3', 
                  'A_action', 'E_example', 'generality', 'confidence', 'industry_fit']
    important = {k: seg_dict.get(k, '(null)') for k in key_fields if k in seg_dict}
    print(json.dumps(important, indent=2, ensure_ascii=False))

# before_after_pairs 结构
print("\n=== BEFORE_AFTER_PAIRS COLUMNS ===")
cols = db.execute("PRAGMA table_info(before_after_pairs)").fetchall()
ba_cols = [c[1] for c in cols]
print(ba_cols)
print(f"Total: {len(ba_cols)} columns")

# before_after_pairs 样本
print("\n=== SAMPLE BEFORE_AFTER_PAIR ===")
ba = db.execute("SELECT * FROM before_after_pairs LIMIT 1").fetchone()
if ba:
    ba_dict = dict(ba)
    # 截断长字符串
    for key in ['before_text', 'after_text', 'explanation']:
        if key in ba_dict and ba_dict[key] and len(str(ba_dict[key])) > 200:
            ba_dict[key] = str(ba_dict[key])[:200] + "..."
    print(json.dumps(ba_dict, indent=2, ensure_ascii=False))

db.close()
