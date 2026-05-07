import sqlite3
import json

db_path = r"C:\Users\viviy\OneDrive\文件\GitHub\vibeid\data\resume_material_library.db"

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

query = """
SELECT
  ba.id,
  ba.session_id,
  ba.pair_order,
  ba.before_text,
  ba.after_text,
  ba.reason,
  ba.issue_tags,
  ba.mentor_quote,
  ba.L3_tag,
  ba.freq_stat,
  m.name as mentor_name,
  m.company
FROM before_after_pairs ba
LEFT JOIN sessions s ON ba.session_id = s.id
LEFT JOIN mentors m ON s.mentor_id = m.id
ORDER BY ba.id DESC
LIMIT 20
"""

cursor.execute(query)
rows = cursor.fetchall()

print(f"\n📊 Found {len(rows)} before/after pairs\n")

for index, row in enumerate(rows, 1):
    print("=" * 100)
    print(f"【ID: {row['id']}】 Pair Order: {row['pair_order']}")
    if row['mentor_name']:
        print(f"导师: {row['mentor_name']} @ {row['company']}")
    print(f"Session ID: {row['session_id']}")
    if row['issue_tags']:
        print(f"问题标签: {row['issue_tags']}")
    if row['L3_tag']:
        print(f"L3标签: {row['L3_tag']}")
    if row['freq_stat']:
        print(f"频率统计: {row['freq_stat']}")

    print(f"\n📝 Before:")
    before = row['before_text']
    if before:
        # Truncate if too long
        if len(before) > 150:
            print(f"  {before[:150]}...")
        else:
            print(f"  {before}")
    else:
        print("  (empty)")

    print(f"\n✨ After:")
    after = row['after_text']
    if after:
        if len(after) > 150:
            print(f"  {after[:150]}...")
        else:
            print(f"  {after}")
    else:
        print("  (empty)")

    print(f"\n💡 Reason:")
    reason = row['reason']
    if reason:
        if len(reason) > 100:
            print(f"  {reason[:100]}...")
        else:
            print(f"  {reason}")
    else:
        print("  (empty)")

    if row['mentor_quote']:
        print(f"\n💬 Mentor Quote:")
        quote = row['mentor_quote']
        if len(quote) > 100:
            print(f'  "{quote[:100]}..."')
        else:
            print(f'  "{quote}"')

    print()

print("=" * 100)
print(f"\n✅ Total: {len(rows)} before/after pairs\n")

cursor.close()
conn.close()
