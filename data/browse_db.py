"""
Interactive Database Browser - 简历材料库数据库浏览器
允许用户直接查询和浏览数据库内容
"""

import sqlite3
import json
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = Path(r"D:\Work\MentorX\vibeid\data\resume_material_library.db")

class DatabaseBrowser:
    def __init__(self):
        self.conn = None
        self.current_table = None

    def connect(self):
        """连接数据库"""
        if not DB_PATH.exists():
            print(f"❌ 数据库文件不存在: {DB_PATH}")
            return False

        try:
            self.conn = sqlite3.connect(str(DB_PATH))
            self.conn.row_factory = sqlite3.Row
            print(f"✅ 已连接到数据库: {DB_PATH}")
            return True
        except Exception as e:
            print(f"❌ 连接失败: {e}")
            return False

    def get_tables(self) -> List[str]:
        """获取所有表名"""
        cursor = self.conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]
        cursor.close()
        return tables

    def get_table_info(self, table_name: str) -> Dict[str, Any]:
        """获取表信息"""
        cursor = self.conn.cursor()

        # 行数
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]

        # 列信息
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()

        cursor.close()

        return {
            'count': count,
            'columns': [{'name': col[1], 'type': col[2], 'nullable': not col[3]}
                       for col in columns]
        }

    def query_table(self, table_name: str, limit: int = 10, offset: int = 0,
                   where: str = "", order_by: str = "") -> List[Dict[str, Any]]:
        """查询表数据"""
        cursor = self.conn.cursor()

        query = f"SELECT * FROM {table_name}"
        if where:
            query += f" WHERE {where}"
        if order_by:
            query += f" ORDER BY {order_by}"
        query += f" LIMIT {limit} OFFSET {offset}"

        try:
            cursor.execute(query)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except Exception as e:
            print(f"❌ 查询错误: {e}")
            return []
        finally:
            cursor.close()

    def search_segments(self, keyword: str, limit: int = 10) -> List[Dict[str, Any]]:
        """在 segments 表中搜索关键词"""
        cursor = self.conn.cursor()

        query = """
        SELECT id, segment_id, L1, L2, A_action, H_hook
        FROM segments
        WHERE A_action LIKE ? OR H_hook LIKE ? OR topic LIKE ?
        ORDER BY id
        LIMIT ?
        """

        search_pattern = f"%{keyword}%"
        try:
            cursor.execute(query, (search_pattern, search_pattern, search_pattern, limit))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except Exception as e:
            print(f"❌ 搜索错误: {e}")
            return []
        finally:
            cursor.close()

    def get_statistics(self) -> Dict[str, Any]:
        """获取数据库统计信息"""
        cursor = self.conn.cursor()
        stats = {}

        try:
            # 表统计
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]

            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                stats[table] = cursor.fetchone()[0]

            # Segments 分类统计
            cursor.execute("SELECT L1, COUNT(*) FROM segments WHERE L1 IS NOT NULL GROUP BY L1 ORDER BY COUNT(*) DESC")
            stats['l1_categories'] = dict(cursor.fetchall())

            cursor.execute("SELECT confidence, COUNT(*) FROM segments GROUP BY confidence")
            stats['confidence_dist'] = dict(cursor.fetchall())

        except Exception as e:
            print(f"❌ 获取统计信息错误: {e}")
        finally:
            cursor.close()

        return stats

    def execute_sql(self, sql: str) -> List[Dict[str, Any]]:
        """执行任意 SQL 查询"""
        cursor = self.conn.cursor()

        try:
            cursor.execute(sql)
            if sql.strip().upper().startswith(('SELECT', 'PRAGMA')):
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
            else:
                self.conn.commit()
                return [{"affected_rows": cursor.rowcount}]
        except Exception as e:
            print(f"❌ SQL 执行错误: {e}")
            return []
        finally:
            cursor.close()

    def show_help(self):
        """显示帮助信息"""
        print("\n" + "="*60)
        print("📚 数据库浏览器帮助")
        print("="*60)
        print("基本命令:")
        print("  help          - 显示此帮助")
        print("  tables        - 列出所有表")
        print("  info TABLE    - 显示表信息")
        print("  select TABLE [LIMIT] [WHERE] - 查询表数据")
        print("  search KEYWORD - 在 segments 中搜索关键词")
        print("  stats         - 显示数据库统计")
        print("  sql QUERY     - 执行任意 SQL 查询")
        print("  exit          - 退出")
        print()
        print("示例:")
        print("  select segments 5")
        print("  select mentors where name like '%Amazon%'")
        print("  search marketing")
        print("  sql SELECT L1, COUNT(*) FROM segments GROUP BY L1")
        print("="*60)

    def format_row(self, row: Dict[str, Any], max_width: int = 80) -> str:
        """格式化行显示"""
        items = []
        for key, value in row.items():
            if value is None:
                val_str = "NULL"
            elif isinstance(value, str) and len(value) > max_width:
                val_str = value[:max_width-3] + "..."
            else:
                val_str = str(value)
            items.append(f"{key}={val_str}")
        return " | ".join(items)

    def run_interactive(self):
        """运行交互式界面"""
        print("🎯 简历材料库数据库浏览器")
        print("="*60)

        if not self.connect():
            return

        self.show_help()

        while True:
            try:
                cmd = input("\n📊 DB> ").strip()
                if not cmd:
                    continue

                parts = cmd.split()
                command = parts[0].lower()

                if command == 'exit':
                    break
                elif command == 'help':
                    self.show_help()
                elif command == 'tables':
                    tables = self.get_tables()
                    print(f"\n📋 数据库表 ({len(tables)} 个):")
                    for table in tables:
                        info = self.get_table_info(table)
                        print(f"  • {table}: {info['count']:,} 行")
                elif command == 'info':
                    if len(parts) < 2:
                        print("❌ 用法: info TABLE")
                        continue
                    table = parts[1]
                    info = self.get_table_info(table)
                    print(f"\n📋 {table} 表信息:")
                    print(f"  行数: {info['count']:,}")
                    print("  列:")
                    for col in info['columns']:
                        nullable = "NULL" if col['nullable'] else "NOT NULL"
                        print(f"    - {col['name']} ({col['type']}) {nullable}")
                elif command == 'select':
                    if len(parts) < 2:
                        print("❌ 用法: select TABLE [LIMIT] [WHERE condition]")
                        continue

                    table = parts[1]
                    limit = 10
                    where = ""

                    # 解析参数
                    for i, part in enumerate(parts[2:], 2):
                        if part.isdigit():
                            limit = int(part)
                        elif part.upper() == 'WHERE':
                            where = ' '.join(parts[i+1:])
                            break

                    rows = self.query_table(table, limit=limit, where=where)
                    print(f"\n📋 {table} 查询结果 (前 {limit} 行):")
                    if rows:
                        print(f"  共 {len(rows)} 行")
                        for i, row in enumerate(rows, 1):
                            print(f"  {i}. {self.format_row(row, 60)}")
                    else:
                        print("  无结果")
                elif command == 'search':
                    if len(parts) < 2:
                        print("❌ 用法: search KEYWORD")
                        continue
                    keyword = ' '.join(parts[1:])
                    rows = self.search_segments(keyword)
                    print(f"\n🔍 搜索 '{keyword}' 的结果:")
                    if rows:
                        for i, row in enumerate(rows, 1):
                            print(f"  {i}. [{row.get('L1', '')} > {row.get('L2', '')}] {row.get('A_action', '')[:80]}...")
                    else:
                        print("  无结果")
                elif command == 'stats':
                    stats = self.get_statistics()
                    print("\n📊 数据库统计:")
                    print(f"  总表数: {len([k for k in stats.keys() if k not in ['l1_categories', 'confidence_dist']])}")
                    for table, count in stats.items():
                        if table not in ['l1_categories', 'confidence_dist']:
                            print(f"  • {table}: {count:,} 行")

                    if 'l1_categories' in stats:
                        print(f"\n  L1 分类 (前5):")
                        for cat, count in list(stats['l1_categories'].items())[:5]:
                            print(f"    • {cat}: {count}")

                    if 'confidence_dist' in stats:
                        print(f"\n  置信度分布:")
                        for conf, count in stats['confidence_dist'].items():
                            print(f"    • {conf}: {count}")
                elif command == 'sql':
                    if len(parts) < 2:
                        print("❌ 用法: sql QUERY")
                        continue
                    sql_query = ' '.join(parts[1:])
                    results = self.execute_sql(sql_query)
                    print(f"\n💻 SQL 执行结果:")
                    if results:
                        if len(results) == 1 and 'affected_rows' in results[0]:
                            print(f"  影响行数: {results[0]['affected_rows']}")
                        else:
                            print(f"  返回 {len(results)} 行:")
                            for i, row in enumerate(results[:10], 1):
                                print(f"    {i}. {self.format_row(row, 60)}")
                            if len(results) > 10:
                                print(f"    ... 还有 {len(results) - 10} 行")
                    else:
                        print("  无结果")
                else:
                    print(f"❌ 未知命令: {command} (输入 'help' 查看帮助)")

            except KeyboardInterrupt:
                print("\n👋 再见!")
                break
            except Exception as e:
                print(f"❌ 错误: {e}")

        if self.conn:
            self.conn.close()
            print("🔌 数据库连接已关闭")

def main():
    browser = DatabaseBrowser()
    browser.run_interactive()

if __name__ == '__main__':
    main()
