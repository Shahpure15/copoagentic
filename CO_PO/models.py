import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Float, Integer, Text, DateTime,
    ForeignKey, UniqueConstraint, CheckConstraint, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Institution(Base):
    __tablename__ = "institutions"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    departments = relationship("Department", back_populates="institution")


class Department(Base):
    __tablename__ = "departments"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    institution_id = Column(UUID(as_uuid=False), ForeignKey("institutions.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False)
    __table_args__ = (UniqueConstraint("institution_id", "code"),)
    institution = relationship("Institution", back_populates="departments")
    teachers = relationship("Teacher", back_populates="department")
    subjects = relationship("Subject", back_populates="department")


class Teacher(Base):
    __tablename__ = "teachers"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    department_id = Column(UUID(as_uuid=False), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(Text, nullable=False)
    role = Column(String(20), default="teacher")  # teacher | hod | admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    department = relationship("Department", back_populates="teachers")
    sessions = relationship("Session", back_populates="teacher")


class Subject(Base):
    __tablename__ = "subjects"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    department_id = Column(UUID(as_uuid=False), ForeignKey("departments.id"), nullable=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("department_id", "code"),)
    department = relationship("Department", back_populates="subjects")
    sessions = relationship("Session", back_populates="subject")
    co_history = relationship("COHistory", back_populates="subject")


class Session(Base):
    __tablename__ = "sessions"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    teacher_id = Column(UUID(as_uuid=False), ForeignKey("teachers.id"))
    subject_id = Column(UUID(as_uuid=False), ForeignKey("subjects.id"), nullable=True)
    academic_year = Column(String(20), nullable=False)
    year_of_study = Column(String(10), nullable=False)  # FY | SY | TY
    status = Column(String(30), default="setup")
    current_phase = Column(Integer, default=1)
    level1_threshold = Column(Float, default=55.0)
    level2_threshold = Column(Float, default=65.0)
    level3_threshold = Column(Float, default=75.0)
    syllabus_text = Column(Text, nullable=True)
    teaching_philosophy = Column(Text, nullable=True)
    is_locked = Column(Boolean, default=False)
    excel_report_path = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    teacher = relationship("Teacher", back_populates="sessions")
    subject = relationship("Subject", back_populates="sessions")
    course_outcomes = relationship("CourseOutcome", back_populates="session", cascade="all, delete-orphan")
    program_outcomes = relationship("ProgramOutcome", back_populates="session", cascade="all, delete-orphan")
    mappings = relationship("COPOMapping", back_populates="session", cascade="all, delete-orphan")
    co_attainments = relationship("COAttainment", back_populates="session", cascade="all, delete-orphan")
    po_attainments = relationship("POAttainment", back_populates="session", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="session", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="session", cascade="all, delete-orphan")
    mediator_chats = relationship("MediatorChat", back_populates="session", cascade="all, delete-orphan")


class CourseOutcome(Base):
    __tablename__ = "course_outcomes"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    session_id = Column(UUID(as_uuid=False), ForeignKey("sessions.id", ondelete="CASCADE"))
    co_id = Column(String(10), nullable=False)
    statement = Column(Text, nullable=False)
    blooms_level = Column(Integer, nullable=False)
    blooms_keyword = Column(String(50), nullable=False)
    confidence_score = Column(Float, default=0.0)
    validation_status = Column(String(20), default="pending")
    rejection_reason = Column(Text, nullable=True)
    version = Column(Integer, default=1)
    is_current = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    session = relationship("Session", back_populates="course_outcomes")


class ProgramOutcome(Base):
    __tablename__ = "program_outcomes"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    session_id = Column(UUID(as_uuid=False), ForeignKey("sessions.id", ondelete="CASCADE"))
    po_id = Column(String(10), nullable=False)
    statement = Column(Text, nullable=False)
    session = relationship("Session", back_populates="program_outcomes")


class COPOMapping(Base):
    __tablename__ = "co_po_mappings"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    session_id = Column(UUID(as_uuid=False), ForeignKey("sessions.id", ondelete="CASCADE"))
    co_id = Column(String(10), nullable=False)
    po_id = Column(String(10), nullable=False)
    strength = Column(Integer, nullable=False)
    reasoning = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0)
    validated = Column(Boolean, default=False)
    manually_overridden = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)
    __table_args__ = (
        UniqueConstraint("session_id", "co_id", "po_id"),
        CheckConstraint("strength BETWEEN 0 AND 3"),
    )
    session = relationship("Session", back_populates="mappings")


class COAttainment(Base):
    __tablename__ = "co_attainment"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    session_id = Column(UUID(as_uuid=False), ForeignKey("sessions.id", ondelete="CASCADE"))
    co_id = Column(String(10), nullable=False)
    avg_percentage = Column(Float, nullable=False)
    level_1_students_pct = Column(Float, nullable=False)
    level_2_students_pct = Column(Float, nullable=False)
    level_3_students_pct = Column(Float, nullable=False)
    achieved_level = Column(Integer, nullable=False)
    threshold_used = Column(JSON, nullable=False)
    __table_args__ = (UniqueConstraint("session_id", "co_id"),)
    session = relationship("Session", back_populates="co_attainments")


class POAttainment(Base):
    __tablename__ = "po_attainment"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    session_id = Column(UUID(as_uuid=False), ForeignKey("sessions.id", ondelete="CASCADE"))
    po_id = Column(String(10), nullable=False)
    weighted_attainment = Column(Float, nullable=False)
    contributing_cos = Column(JSON, nullable=False)
    is_weak = Column(Boolean, nullable=False)
    weakness_reason = Column(Text, nullable=True)
    __table_args__ = (UniqueConstraint("session_id", "po_id"),)
    session = relationship("Session", back_populates="po_attainments")


class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    session_id = Column(UUID(as_uuid=False), ForeignKey("sessions.id", ondelete="CASCADE"))
    target = Column(String(20), nullable=False)
    issue = Column(Text, nullable=False)
    suggestion = Column(Text, nullable=False)
    priority = Column(String(10), nullable=False)
    accepted = Column(Boolean, nullable=True)
    teacher_note = Column(Text, nullable=True)
    implemented = Column(Boolean, default=False)
    session = relationship("Session", back_populates="recommendations")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    session_id = Column(UUID(as_uuid=False), ForeignKey("sessions.id", ondelete="CASCADE"))
    agent = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    detail = Column(Text, nullable=True)
    log_metadata = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    session = relationship("Session", back_populates="audit_logs")


class COHistory(Base):
    __tablename__ = "co_history"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    subject_id = Column(UUID(as_uuid=False), ForeignKey("subjects.id"))
    academic_year = Column(String(20), nullable=False)
    co_id = Column(String(10), nullable=False)
    statement = Column(Text, nullable=False)
    blooms_level = Column(Integer, nullable=False)
    avg_attainment = Column(Float, nullable=True)
    achieved_level = Column(Integer, nullable=True)
    was_weak = Column(Boolean, default=False)
    contributing_po_ids = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    subject = relationship("Subject", back_populates="co_history")


class MediatorChat(Base):
    __tablename__ = "mediator_chats"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    session_id = Column(UUID(as_uuid=False), ForeignKey("sessions.id", ondelete="CASCADE"))
    phase = Column(Integer, nullable=False)
    role = Column(String(10), nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    pending_changes = Column(JSON, nullable=True)
    changes_applied = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    session = relationship("Session", back_populates="mediator_chats")
