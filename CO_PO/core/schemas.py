from pydantic import BaseModel
from typing import Optional

class CourseOutcome(BaseModel):
    co_id: str
    statement: str
    blooms_level: int
    blooms_keyword: str
    confidence_score: float = 0.0
    validation_status: str = "pending"  # pending/approved/rejected
    rejection_reason: Optional[str] = None

class ProgramOutcome(BaseModel):
    po_id: str
    statement: str

class MappingEntry(BaseModel):
    co_id: str
    po_id: str
    strength: int           # 0, 1, 2, 3
    reasoning: str          # WHY this strength was assigned
    confidence: float = 0.0
    validated: bool = False

class COAttainment(BaseModel):
    co_id: str
    avg_percentage: float
    level_1_students_pct: float
    level_2_students_pct: float
    level_3_students_pct: float
    achieved_level: int
    threshold_used: dict

class POAttainment(BaseModel):
    po_id: str
    weighted_attainment: float
    contributing_cos: list[str]
    is_weak: bool
    weakness_reason: Optional[str] = None

class Assignment(BaseModel):
    title: str
    description: str
    target_co_ids: list[str]
    target_po_ids: list[str]
    max_marks: float

class Recommendation(BaseModel):
    target: str             # CO or PO id
    issue: str
    suggestion: str
    priority: str           # High / Medium / Low

class ValidationReport(BaseModel):
    passed: bool
    issues: list[str]
    suggestions: list[str]
    retry_required: bool