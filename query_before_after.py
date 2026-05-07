"""
View before_after_pairs table content
"""

import sqlite3
import sys

# Configure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

db_path = r'C:\Users\viviy\OneDrive\文件\GitHub\vibeid\data\resume_material_library.db'

try:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("\n" + "=" * 120)
    print("📊 Before/After Pairs Content")
    print("=" * 120 + "\n")

    # Get count first
    cursor.execute("SELECT COUNT(*) FROM before_after_pairs")
    total_count = cursor.fetchone()[0]
    print(f"Total before_after_pairs: {total_count}\n")

    # Get detailed content
    cursor.execute("""
        SELECT
            b.id,
            b.session_id,
            b.pair_order,
            b.before_text,
            b.after_text,
            b.reason,
            b.issue_tags,
            b.mentor_quote,
            b.L3_tag,
            b.freq_stat,
            m.name as mentor_name,
            m.company,
            st.name_en as student_name
        FROM before_after_pairs b
        JOIN sessions s ON b.session_id = s.id
        JOIN mentors m ON s.mentor_id = m.id
        JOIN students st ON s.student_id = st.id
        ORDER BY b.id
        LIMIT 30
    """)
    pairs = cursor.fetchall()

    for i, pair in enumerate(pairs, 1):
        print(f"\n{'─' * 120}")
        print(f"【{i}】 ID: {pair['id']} | Pair Order: {pair['pair_order']} | Session: {pair['session_id']}")
        print(f"👨‍🏫 Mentor: {pair['mentor_name']} @ {pair['company']}")
        print(f"👨‍🎓 Student: {pair['student_name']}")

        if pair['issue_tags']:
            print(f"🏷️  Issue Tags: {pair['issue_tags']}")
        if pair['L3_tag']:
            print(f"📍 L3 Tag: {pair['L3_tag']}")
        if pair['freq_stat']:
            print(f"📈 Freq Stat: {pair['freq_stat']}")

        print(f"\n📝 BEFORE:")
        before = pair['before_text']
        if before:
            print(f"   {before}")
        else:
            print("   (empty)")

        print(f"\n✨ AFTER:")
        after = pair['after_text']
        if after:
            print(f"   {after}")
        else:
            print("   (empty)")

        print(f"\n💡 REASON:")
        reason = pair['reason']
        if reason:
            print(f"   {reason}")
        else:
            print("   (empty)")

        if pair['mentor_quote']:
            print(f"\n💬 MENTOR QUOTE:")
            print(f"   \"{pair['mentor_quote']}\"")

    print("\n" + "=" * 120)
    print(f"✅ Displayed {len(pairs)} pairs out of {total_count} total\n")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
