from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum
import uuid

# Enums for contact management
class ContactStatus(str, Enum):
    NEW = "new"
    QUALIFIED = "qualified"
    ENGAGED = "engaged"
    CUSTOMER = "customer"
    INACTIVE = "inactive"

class LeadSource(str, Enum):
    WEBSITE = "website"
    BLOG = "blog"
    SOCIAL_MEDIA = "social_media"
    REFERRAL = "referral"
    EMAIL_CAMPAIGN = "email_campaign"
    PAID_ADS = "paid_ads"
    COLD_OUTREACH = "cold_outreach"
    EVENT = "event"
    WEBINAR = "webinar"
    OTHER = "other"

class InteractionType(str, Enum):
    EMAIL_SENT = "email_sent"
    EMAIL_OPENED = "email_opened"
    EMAIL_CLICKED = "email_clicked"
    WEBSITE_VISIT = "website_visit"
    FORM_SUBMITTED = "form_submitted"
    MEETING_SCHEDULED = "meeting_scheduled"
    MEETING_COMPLETED = "meeting_completed"
    PHONE_CALL = "phone_call"
    NOTE_ADDED = "note_added"

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENT = "sent"
    PAUSED = "paused"
    COMPLETED = "completed"

class AutomationStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"

# CRM Models
class Contact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    
    # Lead management
    status: ContactStatus = ContactStatus.NEW
    lead_source: LeadSource = LeadSource.WEBSITE
    lead_score: int = 0  # 0-100 points
    
    # Location
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    
    # Engagement tracking
    last_contact_date: Optional[datetime] = None
    next_follow_up_date: Optional[datetime] = None
    email_subscribed: bool = True
    
    # Custom fields and tags
    tags: List[str] = []
    custom_fields: Dict[str, Any] = {}
    notes: str = ""
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Analytics
    total_interactions: int = 0
    last_interaction_date: Optional[datetime] = None
    email_opens: int = 0
    email_clicks: int = 0
    website_visits: int = 0

class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    lead_source: LeadSource = LeadSource.WEBSITE
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    tags: List[str] = []
    notes: str = ""

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    status: Optional[ContactStatus] = None
    lead_source: Optional[LeadSource] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    next_follow_up_date: Optional[datetime] = None
    email_subscribed: Optional[bool] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Interaction tracking
class Interaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contact_id: str
    type: InteractionType
    description: str
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None  # User who created the interaction

class InteractionCreate(BaseModel):
    contact_id: str
    type: InteractionType
    description: str
    metadata: Dict[str, Any] = {}

# Email Marketing Models
class EmailTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    subject: str
    html_content: str
    text_content: Optional[str] = None
    is_default: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class EmailTemplateCreate(BaseModel):
    name: str
    subject: str
    html_content: str
    text_content: Optional[str] = None
    is_default: bool = False

class Campaign(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    subject: str
    html_content: str
    text_content: Optional[str] = None
    
    # Audience
    target_tags: List[str] = []  # Target contacts with these tags
    target_status: List[ContactStatus] = []  # Target contacts with these statuses
    exclude_tags: List[str] = []  # Exclude contacts with these tags
    
    # Scheduling
    status: CampaignStatus = CampaignStatus.DRAFT
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    
    # Analytics
    total_recipients: int = 0
    emails_sent: int = 0
    emails_delivered: int = 0
    emails_opened: int = 0
    emails_clicked: int = 0
    emails_bounced: int = 0
    unsubscribes: int = 0
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CampaignCreate(BaseModel):
    name: str
    subject: str
    html_content: str
    text_content: Optional[str] = None
    target_tags: List[str] = []
    target_status: List[ContactStatus] = []
    exclude_tags: List[str] = []
    scheduled_at: Optional[datetime] = None

# Automation Models
class EmailSequence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    trigger_tags: List[str] = []  # Tags that trigger this sequence
    trigger_status: List[ContactStatus] = []  # Status changes that trigger this sequence
    
    # Sequence steps
    emails: List[Dict[str, Any]] = []  # List of email steps with delay, subject, content
    
    status: AutomationStatus = AutomationStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class EmailSequenceCreate(BaseModel):
    name: str
    description: str
    trigger_tags: List[str] = []
    trigger_status: List[ContactStatus] = []
    emails: List[Dict[str, Any]] = []

# Sequence enrollment
class SequenceEnrollment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contact_id: str
    sequence_id: str
    current_step: int = 0
    enrolled_at: datetime = Field(default_factory=datetime.utcnow)
    next_email_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    is_active: bool = True

# Analytics Models
class ContactAnalytics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contact_id: str
    date: date
    email_opens: int = 0
    email_clicks: int = 0
    website_visits: int = 0
    form_submissions: int = 0
    meetings_scheduled: int = 0
    score_change: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CampaignAnalytics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    date: date
    emails_sent: int = 0
    emails_delivered: int = 0
    emails_opened: int = 0
    emails_clicked: int = 0
    emails_bounced: int = 0
    unsubscribes: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Dashboard Analytics Response Models
class DashboardStats(BaseModel):
    total_contacts: int
    new_contacts_this_month: int
    qualified_leads: int
    customers: int
    total_campaigns: int
    active_automations: int
    avg_open_rate: float
    avg_click_rate: float

class LeadSourceStats(BaseModel):
    source: str
    count: int
    percentage: float

class ContactStatusStats(BaseModel):
    status: str
    count: int
    percentage: float

class RecentActivity(BaseModel):
    type: str
    description: str
    contact_name: str
    contact_id: str
    timestamp: datetime
