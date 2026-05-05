"""
Extract mentor sessions from transcripts and import into Postgres KB.
Scans all meeting_metadata.json + meeting_transcript.txt pairs.
Generates segments in PLAIH structure, before_after pairs, and SQL insert.
"""

import json
import os
import re
import sys
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, asdict

sys.stdout.reconfigure(encoding='utf-8')

# Configuration
SOURCE_DIR = Path(r"D:\Work\MentorX - Other\From Eric\Resume fix source data\Resume fix source data")
OUTPUT_DIR = Path(r"D:\Work\MentorX\vibeid\data\extracted_sessions")

@dataclass
class Mentor:
    name: str
    company: str
    title: str
    industry_expertise: list
    coaching_positions: list
    credibility_signal: str
    career_path: Optional[str] = None
    tech_skills: list = None
    
    def __post_init__(self):
        if self.tech_skills is None:
            self.tech_skills = []

@dataclass
class Student:
    name_en: str
    name_zh: Optional[str]
    target_role: Optional[str]
    background_summary: Optional[str] = None

@dataclass
class Segment:
    session_id: str
    segment_id: str
    L1: Optional[str]
    L2: Optional[str]
    L3: Optional[str]
    topic: Optional[str]
    P_mentor: Optional[str]
    L_logic: Optional[str]
    A_action: Optional[str]
    I_insight: Optional[str]
    E_example: Optional[str]
    H_hook: Optional[str]
    HR_os: Optional[str]
    confidence: str = "medium"
    generality: str = "universal"
    resume_section: Optional[str] = None
    advice_type: Optional[str] = None

@dataclass
class BeforeAfterPair:
    session_id: str
    pair_order: int
    before_text: str
    after_text: str
    reason: str
    issue_tags: Optional[list] = None

class TranscriptAnalyzer:
    def __init__(self):
        self.sessions = []
        self.mentors_map = {}
        self.students_map = {}
        self.segments = []
        self.before_after_pairs = []
        self.errors = []
        
    def scan_directories(self):
        """扫描所有 meeting_metadata.json 和 meeting_transcript.txt"""
        print(f"Scanning: {SOURCE_DIR}")
        found_pairs = 0
        
        for folder in SOURCE_DIR.iterdir():
            if not folder.is_dir():
                continue
                
            metadata_file = folder / "meeting_metadata.json"
            transcript_file = folder / "meeting_transcript.txt"
            
            if metadata_file.exists() and transcript_file.exists():
                found_pairs += 1
                self.process_session(metadata_file, transcript_file, folder.name)
        
        print(f"✓ Found {found_pairs} session pairs")
        return found_pairs
    
    def process_session(self, metadata_path: Path, transcript_path: Path, folder_name: str):
        """处理单个 session"""
        try:
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            with open(transcript_path, 'r', encoding='utf-8') as f:
                transcript_text = f.read()
            
            # 提取基本信息
            meeting_info = metadata.get('meeting', {})
            session_info = metadata.get('session', {})
            mentor_info = metadata.get('mentor', {})
            student_info = metadata.get('student', {})
            
            session_id = session_info.get('id', meeting_info.get('id'))
            session_date = session_info.get('scheduledAt', '')[:10]
            
            # 构建导师对象
            mentor = Mentor(
                name=mentor_info.get('displayName', 'Unknown'),
                company=mentor_info.get('company', {}).get('displayName', 'Unknown'),
                title=mentor_info.get('jobTitle', 'Unknown'),
                industry_expertise=[],
                coaching_positions=mentor_info.get('jobTitles', []),
                credibility_signal=mentor_info.get('briefIntro', ''),
                career_path=None,
                tech_skills=[]
            )
            
            # 构建学生对象
            job_titles = student_info.get('jobTitles', [])
            target_role = None
            if job_titles:
                # jobTitles 可能是列表或单个字符串
                if isinstance(job_titles, list) and job_titles:
                    target_role = job_titles[0].get('displayName') if isinstance(job_titles[0], dict) else job_titles[0]
                elif isinstance(job_titles, str):
                    target_role = job_titles
            
            student = Student(
                name_en=student_info.get('nameEn', 'Unknown'),
                name_zh=student_info.get('nameZh'),
                target_role=target_role,
                background_summary=None
            )
            
            # 存储基本信息
            self.mentors_map[mentor.name] = mentor
            self.students_map[student.name_en] = student
            
            # 分析 transcript 提取 segments
            self.extract_segments_from_transcript(
                session_id=session_id,
                transcript=transcript_text,
                mentor_name=mentor.name,
                student_name=student.name_en,
                target_role=student.target_role,
                session_date=session_date,
                folder_name=folder_name
            )
            
            print(f"✓ Processed: {folder_name}")
            
        except Exception as e:
            self.errors.append(f"{folder_name}: {str(e)}")
            print(f"✗ Error: {folder_name} - {str(e)}")
    
    def extract_segments_from_transcript(self, session_id: str, transcript: str, 
                                        mentor_name: str, student_name: str,
                                        target_role: Optional[str],
                                        session_date: str, folder_name: str):
        """从 transcript 中提取建议段落"""
        
        # 检测关键短语来划分段落
        action_patterns = [
            r'(?:你应该|建议你|可以|try to|需要)(.*?)(?:\.|\。|下一个|next)',
            r'(?:问题是|问题在于|The issue|关键点)(.*?)(?:\.|\。|所以|so)',
            r'(?:记住|Remember|one suggestion|一个建议)(.*?)(?:\.|\。|下一个|next)',
        ]
        
        segment_count = 0
        
        # 简单的分段策略：按照导师的讲话段落
        # 这里用换行符分割（后续可优化为更智能的NLP分割）
        lines = transcript.split('\n')
        current_segment = []
        
        for i, line in enumerate(lines):
            if line.strip():
                current_segment.append(line)
            
            # 如果遇到明显的分割点或达到字符数限制，创建一个 segment
            if (len('\n'.join(current_segment)) > 300 or 
                (line.strip() and any(keyword in line for keyword in ['下一个', 'next', '还有', '另外']))):
                
                if current_segment:
                    segment_count += 1
                    segment_text = '\n'.join(current_segment)
                    
                    # 从段落中提取 PLAIH 信息
                    segment = self.parse_segment_content(
                        segment_text=segment_text,
                        session_id=session_id,
                        segment_order=segment_count,
                        mentor_name=mentor_name,
                        target_role=target_role
                    )
                    
                    if segment.A_action:  # 只保存有 action 的
                        self.segments.append(segment)
                    
                    current_segment = []
        
        # 处理最后的段落
        if current_segment:
            segment_count += 1
            segment_text = '\n'.join(current_segment)
            segment = self.parse_segment_content(
                segment_text=segment_text,
                session_id=session_id,
                segment_order=segment_count,
                mentor_name=mentor_name,
                target_role=target_role
            )
            if segment.A_action:
                self.segments.append(segment)
    
    def parse_segment_content(self, segment_text: str, session_id: str, 
                            segment_order: int, mentor_name: str,
                            target_role: Optional[str]) -> Segment:
        """从段落文本提取 PLAIH 结构信息"""
        
        # 提取关键信息（简化版，后续可用 Claude 改进）
        lines = [l.strip() for l in segment_text.split('\n') if l.strip()]
        
        # 尝试识别建议内容
        action_text = None
        for line in lines:
            if any(keyword in line for keyword in ['你应该', '可以', '可以试试', 'try', 'suggestion']):
                action_text = line
                break
        
        if not action_text:
            action_text = ' '.join(lines[-2:]) if len(lines) >= 2 else (lines[0] if lines else None)
        
        # 确定分类（简化版本）
        L1 = "简历优化"
        L2 = "内容改进"
        
        if target_role:
            if any(word in target_role.lower() for word in ['data', '分析']):
                L1 = "数据相关"
            elif any(word in target_role.lower() for word in ['business', '商业']):
                L1 = "商业类"
        
        return Segment(
            session_id=session_id,
            segment_id=f"T{session_id[:8]}-S{segment_order:03d}",
            L1=L1,
            L2=L2,
            L3=None,
            topic=' '.join(lines[0].split()[:5]) if lines else None,
            P_mentor=lines[0] if lines else None,
            L_logic=None,
            A_action=action_text,
            I_insight=None,
            E_example=None,
            H_hook=' '.join(lines) if lines else None,
            HR_os=None,
            confidence="medium",
            generality="universal",
            resume_section=self._guess_resume_section(segment_text),
            advice_type="resume_revision"
        )
    
    def _guess_resume_section(self, text: str) -> Optional[str]:
        """根据内容猜测简历的哪个部分"""
        text_lower = text.lower()
        
        section_keywords = {
            'experience': ['experience', '经历', 'internship', 'work', '工作'],
            'skills': ['skill', '技能', 'programming', 'tool', '工具'],
            'education': ['education', '教育', 'degree', 'university', '大学'],
            'projects': ['project', '项目', 'build', 'develop'],
            'summary': ['summary', '总结', 'overview', 'profile'],
        }
        
        for section, keywords in section_keywords.items():
            if any(kw in text_lower for kw in keywords):
                return section
        
        return None
    
    def generate_sql(self):
        """生成 SQL INSERT 语句"""
        if not self.segments:
            return None
        
        sql_lines = [
            "-- Auto-generated segments from transcript extraction",
            "USE vibeid;",
            "",
            "INSERT INTO segments (session_id, segment_id, L1, L2, A_action, H_hook, confidence, generality, resume_section, advice_type) VALUES"
        ]
        
        insert_values = []
        for i, seg in enumerate(self.segments):
            values = (
                f"('{seg.session_id}', '{seg.segment_id}', "
                f"'{seg.L1}', '{seg.L2}', "
                f"'{self._escape_sql(seg.A_action)}', "
                f"'{self._escape_sql(seg.H_hook)}', "
                f"'{seg.confidence}', '{seg.generality}', "
                f"'{seg.resume_section or ''}', "
                f"'{seg.advice_type}')"
            )
            insert_values.append(values)
        
        sql_lines.append(',\n'.join(insert_values) + ";")
        return '\n'.join(sql_lines)
    
    def _escape_sql(self, text: Optional[str]) -> str:
        """转义SQL字符串"""
        if not text:
            return ""
        return text.replace("'", "''")
    
    def export_json(self):
        """导出为 JSON 格式"""
        output = {
            "metadata": {
                "total_sessions": len(set(s.session_id for s in self.segments)),
                "total_segments": len(self.segments),
                "total_mentors": len(self.mentors_map),
                "total_students": len(self.students_map),
                "extraction_date": "2026-05-04"
            },
            "mentors": {name: asdict(m) for name, m in self.mentors_map.items()},
            "students": {name: asdict(s) for name, s in self.students_map.items()},
            "segments": [asdict(s) for s in self.segments],
            "errors": self.errors
        }
        return output

def main():
    # 创建输出目录
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # 创建分析器
    analyzer = TranscriptAnalyzer()
    
    # 扫描和处理
    print("=" * 60)
    print("TRANSCRIPT EXTRACTION & KB IMPORT")
    print("=" * 60)
    
    found = analyzer.scan_directories()
    
    if found == 0:
        print("✗ No session pairs found!")
        return
    
    # 生成输出
    print("\n" + "=" * 60)
    print("EXPORT RESULTS")
    print("=" * 60)
    
    # JSON 导出
    json_data = analyzer.export_json()
    json_path = OUTPUT_DIR / "extracted_sessions.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)
    print(f"✓ JSON exported: {json_path}")
    
    # SQL 导出
    sql = analyzer.generate_sql()
    if sql:
        sql_path = OUTPUT_DIR / "import_segments.sql"
        with open(sql_path, 'w', encoding='utf-8') as f:
            f.write(sql)
        print(f"✓ SQL exported: {sql_path}")
    
    # 统计信息
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Sessions processed: {len(set(s.session_id for s in analyzer.segments))}")
    print(f"Segments extracted: {len(analyzer.segments)}")
    print(f"Mentors indexed: {len(analyzer.mentors_map)}")
    print(f"Students indexed: {len(analyzer.students_map)}")
    
    if analyzer.errors:
        print(f"\nErrors ({len(analyzer.errors)}):")
        for error in analyzer.errors[:5]:
            print(f"  - {error}")
        if len(analyzer.errors) > 5:
            print(f"  ... and {len(analyzer.errors) - 5} more")

if __name__ == '__main__':
    main()
