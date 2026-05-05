"""
Comprehensive database inspection script for resume_material_library.db
检查简历材料库数据库的完整工具
"""

import sqlite3
import json
import sys
from pathlib import Path
from typing import Dict, List, Any

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = Path(r"D:\Work\MentorX\vibeid\data\resume_material_library.db")

def connect_db():
    """连接数据库"""
    if not DB_PATH.exists():
        print(f"❌ 数据库文件不存在: {DB_PATH}")
        return None

    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"❌ 连接数据库失败: {e}")
        return None

def get_table_info(conn) -> Dict[str, Dict[str, Any]]:
    """获取所有表的信息"""
    tables = {}

    # 获取所有表
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    table_names = [row[0] for row in cursor.fetchall()]

    for table_name in table_names:
        # 表行数
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]

        # 表结构
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()

        tables[table_name] = {
            'count': count,
            'columns': [{'name': col[1], 'type': col[2], 'nullable': not col[3], 'default': col[4]}
                       for col in columns]
        }

    cursor.close()
    return tables

def get_sample_data(conn, table_name: str, limit: int = 3) -> List[Dict[str, Any]]:
    """获取表的样本数据"""
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit}")
    rows = cursor.fetchall()
    cursor.close()

    return [dict(row) for row in rows]

def analyze_segments(conn) -> Dict[str, Any]:
    """分析 segments 表的统计信息"""
    cursor = conn.cursor()

    # L1 分类统计
    cursor.execute("SELECT L1, COUNT(*) as count FROM segments WHERE L1 IS NOT NULL GROUP BY L1 ORDER BY count DESC")
    l1_stats = cursor.fetchall()

    # L2 分类统计
    cursor.execute("SELECT L2, COUNT(*) as count FROM segments WHERE L2 IS NOT NULL GROUP BY L2 ORDER BY count DESC")
    l2_stats = cursor.fetchall()

    # confidence 分布
    cursor.execute("SELECT confidence, COUNT(*) as count FROM segments GROUP BY confidence")
    confidence_stats = cursor.fetchall()

    # generality 分布
    cursor.execute("SELECT generality, COUNT(*) as count FROM segments GROUP BY generality")
    generality_stats = cursor.fetchall()

    # 检查 A_action 为空的记录
    cursor.execute("SELECT COUNT(*) FROM segments WHERE A_action IS NULL OR A_action = ''")
    empty_actions = cursor.fetchone()[0]

    cursor.close()

    return {
        'l1_categories': dict(l1_stats),
        'l2_categories': dict(l2_stats),
        'confidence_distribution': dict(confidence_stats),
        'generality_distribution': dict(generality_stats),
        'empty_actions': empty_actions
    }

def check_foreign_keys(conn) -> Dict[str, Any]:
    """检查外键完整性"""
    cursor = conn.cursor()

    issues = []

    # 检查 sessions 的外键
    cursor.execute("""
        SELECT s.id, s.mentor_id, s.student_id, m.name as mentor_name, st.name_en as student_name
        FROM sessions s
        LEFT JOIN mentors m ON s.mentor_id = m.id
        LEFT JOIN students st ON s.student_id = st.id
        WHERE m.id IS NULL OR st.id IS NULL
    """)
    invalid_sessions = cursor.fetchall()

    # 检查 segments 的外键
    cursor.execute("""
        SELECT seg.id, seg.session_id, s.id as session_exists
        FROM segments seg
        LEFT JOIN sessions s ON seg.session_id = s.id
        WHERE s.id IS NULL
    """)
    invalid_segments = cursor.fetchall()

    # 检查 before_after_pairs 的外键
    cursor.execute("""
        SELECT ba.id, ba.session_id, s.id as session_exists
        FROM before_after_pairs ba
        LEFT JOIN sessions s ON ba.session_id = s.id
        WHERE s.id IS NULL
    """)
    invalid_ba = cursor.fetchall()

    cursor.close()

    return {
        'invalid_sessions': len(invalid_sessions),
        'invalid_segments': len(invalid_segments),
        'invalid_before_after': len(invalid_ba),
        'details': {
            'invalid_sessions': invalid_sessions[:5],  # 只显示前5个
            'invalid_segments': invalid_segments[:5],
            'invalid_before_after': invalid_ba[:5]
        }
    }

def generate_report(conn):
    """生成完整的数据库报告"""
    print("=" * 80)
    print("📊 RESUME MATERIAL LIBRARY DATABASE INSPECTION REPORT")
    print("=" * 80)
    print(f"Database: {DB_PATH}")
    print(f"Size: {DB_PATH.stat().st_size:,} bytes ({DB_PATH.stat().st_size/1024/1024:.1f} MB)")
    print()

    # 表信息
    print("📋 TABLE OVERVIEW")
    print("-" * 40)
    tables = get_table_info(conn)

    for table_name, info in tables.items():
        print(f"• {table_name}: {info['count']:,} rows, {len(info['columns'])} columns")

    print()

    # 详细表结构
    print("🔍 TABLE STRUCTURES")
    print("-" * 40)

    for table_name, info in tables.items():
        print(f"\n{table_name.upper()} ({info['count']:,} rows)")
        for col in info['columns']:
            nullable = "NULL" if col['nullable'] else "NOT NULL"
            default = f" DEFAULT {col['default']}" if col['default'] else ""
            print(f"  - {col['name']} ({col['type']}) {nullable}{default}")

    print()

    # 样本数据
    print("💡 SAMPLE DATA")
    print("-" * 40)

    for table_name in ['mentors', 'students', 'sessions', 'segments', 'before_after_pairs']:
        if table_name in tables:
            print(f"\n{table_name.upper()} (first 2 rows):")
            samples = get_sample_data(conn, table_name, 2)
            for i, sample in enumerate(samples, 1):
                # 简化显示，避免太长
                simplified = {}
                for k, v in sample.items():
                    if isinstance(v, str) and len(v) > 100:
                        simplified[k] = v[:100] + "..."
                    else:
                        simplified[k] = v
                print(f"  Row {i}: {json.dumps(simplified, ensure_ascii=False, indent=None)}")

    print()

    # Segments 分析
    print("📈 SEGMENTS ANALYSIS")
    print("-" * 40)
    seg_analysis = analyze_segments(conn)

    print(f"L1 Categories ({len(seg_analysis['l1_categories'])}):")
    for cat, count in list(seg_analysis['l1_categories'].items())[:10]:
        print(f"  • {cat}: {count}")

    print(f"\nL2 Categories ({len(seg_analysis['l2_categories'])}):")
    for cat, count in list(seg_analysis['l2_categories'].items())[:10]:
        print(f"  • {cat}: {count}")

    print(f"\nConfidence Distribution:")
    for conf, count in seg_analysis['confidence_distribution'].items():
        print(f"  • {conf}: {count}")

    print(f"\nGenerality Distribution:")
    for gen, count in seg_analysis['generality_distribution'].items():
        print(f"  • {gen}: {count}")

    print(f"\nEmpty A_action fields: {seg_analysis['empty_actions']}")

    print()

    # 外键检查
    print("🔗 FOREIGN KEY INTEGRITY")
    print("-" * 40)
    fk_check = check_foreign_keys(conn)

    print(f"Invalid sessions: {fk_check['invalid_sessions']}")
    print(f"Invalid segments: {fk_check['invalid_segments']}")
    print(f"Invalid before_after_pairs: {fk_check['invalid_before_after']}")

    if fk_check['invalid_sessions'] > 0:
        print("\n⚠️  Found foreign key issues - this may affect data integrity")

    print()

    # 总结
    print("✅ INSPECTION COMPLETE")
    print("-" * 40)
    total_rows = sum(info['count'] for info in tables.values())
    print(f"Total tables: {len(tables)}")
    print(f"Total rows: {total_rows:,}")
    print(f"Database health: {'⚠️ ISSUES FOUND' if fk_check['invalid_sessions'] + fk_check['invalid_segments'] + fk_check['invalid_before_after'] > 0 else '✅ GOOD'}")

def interactive_query(conn):
    """交互式查询模式"""
    print("\n🔍 INTERACTIVE QUERY MODE")
    print("-" * 40)
    print("Available tables:", list(get_table_info(conn).keys()))
    print("Type 'exit' to quit, 'help' for commands")
    print()

    cursor = conn.cursor()

    while True:
        try:
            query = input("SQL> ").strip()
            if not query:
                continue

            if query.lower() in ['exit', 'quit', 'q']:
                break
            elif query.lower() == 'help':
                print("Commands:")
                print("  .tables          - Show all tables")
                print("  .schema TABLE    - Show table schema")
                print("  .count TABLE     - Count rows in table")
                print("  .sample TABLE N  - Show N sample rows")
                print("  exit             - Quit")
                print("  Any SQL query    - Execute query")
                continue
            elif query == '.tables':
                tables = get_table_info(conn)
                for name in tables.keys():
                    print(f"  {name} ({tables[name]['count']:,} rows)")
                continue
            elif query.startswith('.schema '):
                table = query.split()[1]
                info = get_table_info(conn)
                if table in info:
                    print(f"\n{table.upper()} schema:")
                    for col in info[table]['columns']:
                        nullable = "NULL" if col['nullable'] else "NOT NULL"
                        print(f"  {col['name']} ({col['type']}) {nullable}")
                else:
                    print(f"Table '{table}' not found")
                continue
            elif query.startswith('.count '):
                table = query.split()[1]
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"{table}: {count:,} rows")
                continue
            elif query.startswith('.sample '):
                parts = query.split()
                table = parts[1]
                limit = int(parts[2]) if len(parts) > 2 else 3
                samples = get_sample_data(conn, table, limit)
                for i, sample in enumerate(samples, 1):
                    print(f"Row {i}: {dict(sample)}")
                continue

            # Execute SQL query
            cursor.execute(query)
            if query.strip().upper().startswith('SELECT'):
                rows = cursor.fetchall()
                if rows:
                    # Print column headers
                    columns = [desc[0] for desc in cursor.description]
                    print(" | ".join(columns))
                    print("-" * (sum(len(c) for c in columns) + 3 * (len(columns) - 1)))

                    for row in rows[:20]:  # Limit output
                        values = []
                        for val in row:
                            if val is None:
                                values.append("NULL")
                            elif isinstance(val, str) and len(val) > 50:
                                values.append(val[:47] + "...")
                            else:
                                values.append(str(val))
                        print(" | ".join(values))

                    if len(rows) > 20:
                        print(f"... and {len(rows) - 20} more rows")
                else:
                    print("No results")
            else:
                print(f"Query executed. Rows affected: {cursor.rowcount}")

        except Exception as e:
            print(f"Error: {e}")

    cursor.close()

def main():
    conn = connect_db()
    if not conn:
        return

    try:
        # 生成报告
        generate_report(conn)

        # 交互式查询
        interactive_query(conn)

    finally:
        conn.close()

if __name__ == '__main__':
    main()
