import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set")
    exit(1)

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=RealDictCursor)

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
        FROM vibeid.before_after_pairs ba
        JOIN vibeid.sessions s ON ba.session_id = s.id
        JOIN vibeid.mentors m ON s.mentor_id = m.id
        ORDER BY ba.id DESC
        LIMIT 20
    """

    cursor.execute(query)
    rows = cursor.fetchall()

    print(f"\n📊 Found {len(rows)} before/after pairs\n")

    for index, row in enumerate(rows, 1):
        print("=" * 100)
        print(f"【ID: {row['id']}】 Pair Order: {row['pair_order']}")
        print(f"导师: {row['mentor_name']} @ {row['company']}")
        print(f"Session ID: {row['session_id']}")
        if row['issue_tags']:
            print(f"问题标签: {row['issue_tags']}")
        if row['L3_tag']:
            print(f"L3标签: {row['L3_tag']}")
        if row['freq_stat']:
            print(f"频率统计: {row['freq_stat']}")

        print(f"\n📝 Before:")
        print(f"  {row['before_text']}")

        print(f"\n✨ After:")
        print(f"  {row['after_text']}")

        print(f"\n💡 Reason:")
        print(f"  {row['reason']}")

        if row['mentor_quote']:
            print(f"\n💬 Mentor Quote:")
            print(f'  "{row["mentor_quote"]}"')

        print()

    print("=" * 100)
    cursor.close()
    conn.close()

except Exception as e:
    print(f"ERROR: {e}")
    exit(1)
