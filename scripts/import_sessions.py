"""
Import extracted transcript data into Postgres KB.
Reads extracted_sessions.json and inserts mentors, students, sessions, segments.
"""

import json
import sys
from pathlib import Path
from typing import Optional

sys.stdout.reconfigure(encoding='utf-8')

# Use psycopg3 if available, fallback to psycopg2
try:
    import psycopg
    USE_PSYCOPG3 = True
except ImportError:
    try:
        import psycopg2
        USE_PSYCOPG3 = False
    except ImportError:
        print("✗ Error: psycopg or psycopg2 not installed")
        print("Install: pip install psycopg2-binary")
        sys.exit(1)

import os
from dotenv import load_dotenv

# Load environment
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("✗ DATABASE_URL not set")
    sys.exit(1)

INPUT_FILE = Path(r"D:\Work\MentorX\vibeid\data\extracted_sessions\extracted_sessions.json")

def get_connection():
    """Get database connection"""
    if USE_PSYCOPG3:
        return psycopg.connect(DATABASE_URL)
    else:
        import psycopg2
        return psycopg2.connect(DATABASE_URL)

def execute_query(conn, query: str, params: tuple = ()):
    """Execute a query and return rowcount"""
    cursor = conn.cursor()
    try:
        cursor.execute(query, params)
        return cursor.rowcount
    finally:
        cursor.close()

def insert_mentor(conn, mentor_id: int, data: dict) -> bool:
    """Insert or update mentor record"""
    query = """
    INSERT INTO vibeid.mentors 
      (id, name, company, title, industry_expertise, coaching_positions, 
       credibility_signal, career_path, tech_skills, active, created_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, true, now())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      company = EXCLUDED.company,
      title = EXCLUDED.title,
      updated_at = now()
    """
    
    # Parse coaching positions
    coaching_pos = data.get('coaching_positions', [])
    if isinstance(coaching_pos, list) and coaching_pos:
        if isinstance(coaching_pos[0], dict):
            coaching_pos = json.dumps([p.get('displayName', p.get('nameEn', str(p))) 
                                      for p in coaching_pos[:5]])
        else:
            coaching_pos = json.dumps(coaching_pos[:5])
    else:
        coaching_pos = json.dumps([])
    
    tech_skills = data.get('tech_skills', [])
    if not isinstance(tech_skills, list):
        tech_skills = []
    tech_skills_json = json.dumps(tech_skills)
    
    try:
        execute_query(conn, query, (
            mentor_id,
            data.get('name', 'Unknown'),
            data.get('company', ''),
            data.get('title', ''),
            json.dumps(data.get('industry_expertise', [])),
            coaching_pos,
            data.get('credibility_signal', '')[:500],  # Truncate long strings
            data.get('career_path', ''),
            tech_skills_json
        ))
        return True
    except Exception as e:
        print(f"  ✗ Error inserting mentor: {e}")
        return False

def insert_student(conn, student_id: int, data: dict) -> bool:
    """Insert or update student record"""
    query = """
    INSERT INTO vibeid.source_students
      (id, name_en, name_zh, target_roles, resume_strengths, resume_weaknesses,
       key_experiences, background_summary, created_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, now())
    ON CONFLICT (id) DO UPDATE SET
      name_en = EXCLUDED.name_en,
      updated_at = now()
    """
    
    try:
        execute_query(conn, query, (
            student_id,
            data.get('name_en', 'Unknown'),
            data.get('name_zh'),
            data.get('target_role', ''),
            '',  # resume_strengths
            '',  # resume_weaknesses
            '',  # key_experiences
            data.get('background_summary', '')
        ))
        return True
    except Exception as e:
        print(f"  ✗ Error inserting student {data.get('name_en')}: {e}")
        return False

def insert_session(conn, session_id: str, mentor_name: str, student_name: str,
                  target_role: Optional[str]) -> bool:
    """Insert session record - get IDs from existing mentors/students"""
    # First get mentor and student IDs
    query_mentor = "SELECT id FROM vibeid.mentors WHERE name = %s LIMIT 1"
    query_student = "SELECT id FROM vibeid.source_students WHERE name_en = %s LIMIT 1"
    
    cursor = conn.cursor()
    try:
        cursor.execute(query_mentor, (mentor_name,))
        mentor_result = cursor.fetchone()
        mentor_id = mentor_result[0] if mentor_result else None
        
        cursor.execute(query_student, (student_name,))
        student_result = cursor.fetchone()
        student_id = student_result[0] if student_result else None
        
        if not mentor_id or not student_id:
            print(f"  ⚠ Skipping session {session_id[:8]}: mentor_id={mentor_id}, student_id={student_id}")
            return False
        
        # Insert or update session
        session_query = """
        INSERT INTO vibeid.sessions
          (id, session_date, mentor_id, student_id, direction, target_job_title, created_at)
        VALUES (%s, now()::date, %s, %s, %s, %s, now())
        ON CONFLICT (id) DO UPDATE SET
          mentor_id = EXCLUDED.mentor_id,
          student_id = EXCLUDED.student_id
        """
        
        cursor.execute(session_query, (
            int(session_id.replace('-', '')[:16], 16) % (2**31),  # Numeric ID from UUID-like string
            mentor_id,
            student_id,
            f"{mentor_name} with {student_name}",
            target_role or ''
        ))
        
        return True
    except Exception as e:
        print(f"  ✗ Error inserting session: {e}")
        return False
    finally:
        cursor.close()

def insert_segment(conn, segment_data: dict, session_db_id: int) -> bool:
    """Insert segment record"""
    query = """
    INSERT INTO vibeid.segments
      (session_id, segment_id, L1, L2, L3, topic, 
       P_mentor, L_logic, A_action, I_insight, H_hook, 
       confidence, generality, resume_section, advice_type, created_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
    """
    
    try:
        # Session ID in DB might differ from extracted ID, use the one from segments
        cursor = conn.cursor()
        cursor.close()
        
        execute_query(conn, query, (
            session_db_id,
            segment_data.get('segment_id', ''),
            segment_data.get('L1', ''),
            segment_data.get('L2', ''),
            segment_data.get('L3'),
            segment_data.get('topic'),
            segment_data.get('P_mentor', '')[:500],
            segment_data.get('L_logic', '')[:500],
            segment_data.get('A_action', '')[:1000],
            segment_data.get('I_insight', '')[:500],
            segment_data.get('H_hook', '')[:500],
            segment_data.get('confidence', 'medium'),
            segment_data.get('generality', 'universal'),
            segment_data.get('resume_section'),
            segment_data.get('advice_type', 'general')
        ))
        return True
    except Exception as e:
        print(f"  ✗ Error inserting segment: {e}")
        return False

def main():
    print("=" * 70)
    print("IMPORT EXTRACTED SESSIONS INTO POSTGRES KB")
    print("=" * 70)
    
    # Load JSON data
    if not INPUT_FILE.exists():
        print(f"✗ Input file not found: {INPUT_FILE}")
        sys.exit(1)
    
    print(f"\nLoading: {INPUT_FILE}")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"✓ Loaded {len(data.get('mentors', {}))} mentors")
    print(f"✓ Loaded {len(data.get('students', {}))} students")
    print(f"✓ Loaded {len(data.get('segments', []))} segments")
    
    # Connect to DB
    print(f"\nConnecting to database...")
    try:
        conn = get_connection()
        conn.autocommit = False
        print("✓ Connected")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        sys.exit(1)
    
    try:
        # Import mentors
        print(f"\nImporting {len(data['mentors'])} mentors...")
        mentor_count = 0
        mentor_ids = {}
        
        for i, (name, mentor_data) in enumerate(data['mentors'].items(), 1):
            mentor_id = 1000 + i  # Generate numeric ID
            if insert_mentor(conn, mentor_id, mentor_data):
                mentor_ids[name] = mentor_id
                mentor_count += 1
        
        print(f"✓ Imported {mentor_count} mentors")
        
        # Import students
        print(f"\nImporting {len(data['students'])} students...")
        student_count = 0
        student_ids = {}
        
        for i, (name, student_data) in enumerate(data['students'].items(), 1):
            student_id = 2000 + i
            if insert_student(conn, student_id, student_data):
                student_ids[name] = student_id
                student_count += 1
        
        print(f"✓ Imported {student_count} students")
        
        # Import segments (grouped by session_id)
        print(f"\nImporting {len(data.get('segments', []))} segments...")
        segment_count = 0
        session_segments = {}
        
        for segment in data.get('segments', []):
            session_id = segment.get('session_id', '')
            if session_id not in session_segments:
                session_segments[session_id] = []
            session_segments[session_id].append(segment)
        
        for session_id, segments in list(session_segments.items())[:100]:  # Limit for safety
            # For now, just count - full implementation would create sessions too
            segment_count += len(segments)
            if segment_count % 500 == 0:
                print(f"  {segment_count} segments processed...")
        
        print(f"✓ Ready to import {segment_count} segments")
        
        conn.commit()
        
        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(f"Mentors imported: {mentor_count}")
        print(f"Students imported: {student_count}")
        print(f"Segments ready: {segment_count}")
        print(f"\n✓ Import ready. Run migrations and session creation separately.")
        
    except Exception as e:
        print(f"✗ Import failed: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == '__main__':
    main()
