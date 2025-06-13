import sys
import os
from pathlib import Path

# Add the backend directory to Python path
ROOT_DIR = Path(__file__).parent
sys.path.append(str(ROOT_DIR))

from fastapi import FastAPI, APIRouter, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging
import asyncio
from typing import List, Optional
from datetime import datetime

# Import our models and services
from models import (
    Contact, ContactCreate, ContactUpdate, ContactStatus, LeadSource,
    Interaction, InteractionCreate,
    Campaign, CampaignCreate, CampaignStatus,
    EmailTemplate, EmailTemplateCreate,
    EmailSequence, EmailSequenceCreate,
    DashboardStats, LeadSourceStats, ContactStatusStats, RecentActivity
)
from crm_service import CRMService
from campaign_service import CampaignService
from email_service import email_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize services
crm_service = CRMService(db)
campaign_service = CampaignService(db, crm_service)

# Create the main app
app = FastAPI(
    title="OpsVantage CRM & Email Marketing API",
    description="Comprehensive CRM and Email Marketing System for OpsVantage Digital",
    version="1.0.0"
)

# Create API router
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# CONTACT MANAGEMENT ENDPOINTS
# ============================================================================

@api_router.post("/contacts", response_model=Contact)
async def create_contact(contact_data: ContactCreate):
    """Create a new contact"""
    try:
        contact = await crm_service.create_contact(contact_data)
        return contact
    except Exception as e:
        logger.error(f"Failed to create contact: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[ContactStatus] = None,
    lead_source: Optional[LeadSource] = None,
    search: Optional[str] = None
):
    """Get contacts with filtering and pagination"""
    try:
        contacts = await crm_service.get_contacts(
            skip=skip, 
            limit=limit, 
            status=status, 
            lead_source=lead_source,
            search=search
        )
        return contacts
    except Exception as e:
        logger.error(f"Failed to get contacts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/contacts/search")
async def search_contacts(q: str, limit: int = Query(20, ge=1, le=100)):
    """Search contacts"""
    try:
        contacts = await crm_service.search_contacts(q, limit)
        return contacts
    except Exception as e:
        logger.error(f"Failed to search contacts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/contacts/{contact_id}", response_model=Contact)
async def get_contact(contact_id: str):
    """Get a specific contact"""
    contact = await crm_service.get_contact(contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@api_router.put("/contacts/{contact_id}", response_model=Contact)
async def update_contact(contact_id: str, update_data: ContactUpdate):
    """Update a contact"""
    contact = await crm_service.update_contact(contact_id, update_data)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    """Delete a contact"""
    success = await crm_service.delete_contact(contact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted successfully"}

@api_router.get("/contacts/{contact_id}/interactions", response_model=List[Interaction])
async def get_contact_interactions(contact_id: str, limit: int = Query(50, ge=1, le=200)):
    """Get interactions for a contact"""
    interactions = await crm_service.get_contact_interactions(contact_id, limit)
    return interactions

# ============================================================================
# INTERACTION ENDPOINTS
# ============================================================================

@api_router.post("/interactions", response_model=Interaction)
async def create_interaction(interaction_data: InteractionCreate):
    """Create a new interaction"""
    try:
        interaction = await crm_service.create_interaction(interaction_data)
        return interaction
    except Exception as e:
        logger.error(f"Failed to create interaction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# EMAIL TEMPLATE ENDPOINTS
# ============================================================================

@api_router.post("/templates", response_model=EmailTemplate)
async def create_template(template_data: EmailTemplateCreate):
    """Create an email template"""
    try:
        template = await campaign_service.create_template(template_data)
        return template
    except Exception as e:
        logger.error(f"Failed to create template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/templates", response_model=List[EmailTemplate])
async def get_templates():
    """Get all email templates"""
    try:
        templates = await campaign_service.get_templates()
        return templates
    except Exception as e:
        logger.error(f"Failed to get templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/templates/{template_id}", response_model=EmailTemplate)
async def get_template(template_id: str):
    """Get a specific email template"""
    template = await campaign_service.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    """Delete an email template"""
    success = await campaign_service.delete_template(template_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}

# ============================================================================
# CAMPAIGN ENDPOINTS
# ============================================================================

@api_router.post("/campaigns", response_model=Campaign)
async def create_campaign(campaign_data: CampaignCreate):
    """Create an email campaign"""
    try:
        campaign = await campaign_service.create_campaign(campaign_data)
        return campaign
    except Exception as e:
        logger.error(f"Failed to create campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/campaigns", response_model=List[Campaign])
async def get_campaigns():
    """Get all campaigns"""
    try:
        campaigns = await campaign_service.get_campaigns()
        return campaigns
    except Exception as e:
        logger.error(f"Failed to get campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str):
    """Get a specific campaign"""
    campaign = await campaign_service.get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@api_router.post("/campaigns/{campaign_id}/send")
async def send_campaign(campaign_id: str):
    """Send a campaign"""
    try:
        result = await campaign_service.send_campaign(campaign_id)
        return result
    except Exception as e:
        logger.error(f"Failed to send campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# EMAIL SEQUENCE ENDPOINTS
# ============================================================================

@api_router.post("/sequences", response_model=EmailSequence)
async def create_sequence(sequence_data: EmailSequenceCreate):
    """Create an email sequence"""
    try:
        sequence = await campaign_service.create_sequence(sequence_data)
        return sequence
    except Exception as e:
        logger.error(f"Failed to create sequence: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/sequences", response_model=List[EmailSequence])
async def get_sequences():
    """Get all email sequences"""
    try:
        sequences = await campaign_service.get_sequences()
        return sequences
    except Exception as e:
        logger.error(f"Failed to get sequences: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/sequences/{sequence_id}", response_model=EmailSequence)
async def get_sequence(sequence_id: str):
    """Get a specific email sequence"""
    sequence = await campaign_service.get_sequence(sequence_id)
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return sequence

@api_router.post("/sequences/{sequence_id}/enroll/{contact_id}")
async def enroll_contact_in_sequence(sequence_id: str, contact_id: str):
    """Enroll a contact in an email sequence"""
    try:
        enrollment = await campaign_service.enroll_contact_in_sequence(contact_id, sequence_id)
        return {"message": "Contact enrolled successfully", "enrollment_id": enrollment.id}
    except Exception as e:
        logger.error(f"Failed to enroll contact: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================

@api_router.get("/analytics/dashboard", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        stats = await crm_service.get_dashboard_stats()
        return stats
    except Exception as e:
        logger.error(f"Failed to get dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analytics/lead-sources", response_model=List[LeadSourceStats])
async def get_lead_source_stats():
    """Get lead source statistics"""
    try:
        stats = await crm_service.get_lead_source_stats()
        return stats
    except Exception as e:
        logger.error(f"Failed to get lead source stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analytics/contact-status", response_model=List[ContactStatusStats])
async def get_contact_status_stats():
    """Get contact status statistics"""
    try:
        stats = await crm_service.get_contact_status_stats()
        return stats
    except Exception as e:
        logger.error(f"Failed to get contact status stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analytics/recent-activity", response_model=List[RecentActivity])
async def get_recent_activity(limit: int = Query(10, ge=1, le=50)):
    """Get recent activity"""
    try:
        activity = await crm_service.get_recent_activity(limit)
        return activity
    except Exception as e:
        logger.error(f"Failed to get recent activity: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# SYSTEM ENDPOINTS
# ============================================================================

@api_router.get("/")
async def root():
    """API health check"""
    return {
        "message": "OpsVantage CRM & Email Marketing API",
        "status": "operational",
        "version": "1.0.0",
        "timestamp": datetime.utcnow()
    }

@api_router.post("/system/initialize")
async def initialize_system():
    """Initialize the system with default templates and sequences"""
    try:
        await campaign_service.create_default_templates()
        await campaign_service.create_default_sequences()
        return {"message": "System initialized successfully"}
    except Exception as e:
        logger.error(f"Failed to initialize system: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/system/process-sequences")
async def process_sequences(background_tasks: BackgroundTasks):
    """Process email sequences (normally run by scheduler)"""
    try:
        background_tasks.add_task(campaign_service.process_sequence_emails)
        return {"message": "Sequence processing started"}
    except Exception as e:
        logger.error(f"Failed to process sequences: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# EMAIL TESTING ENDPOINTS
# ============================================================================

@api_router.post("/email/test")
async def send_test_email(
    to_email: str, 
    subject: str = "Test Email from OpsVantage CRM", 
    template_type: str = "welcome"
):
    """Send a test email"""
    try:
        if template_type == "welcome":
            template = email_service.get_welcome_email_template()
        elif template_type == "followup":
            template = email_service.get_follow_up_email_template()
        else:
            raise HTTPException(status_code=400, detail="Invalid template type")
        
        result = await email_service.send_email(
            to_email=to_email,
            subject=subject,
            html_content=template['html_content'],
            text_content=template['text_content']
        )
        
        return result
    except Exception as e:
        logger.error(f"Failed to send test email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Background task to process email sequences
async def schedule_sequence_processing():
    """Background task to process email sequences every 10 minutes"""
    while True:
        try:
            await campaign_service.process_sequence_emails()
            logger.info("Processed email sequences")
        except Exception as e:
            logger.error(f"Error processing email sequences: {str(e)}")
        
        # Wait 10 minutes before next processing
        await asyncio.sleep(600)

@app.on_event("startup")
async def startup_event():
    """Application startup event"""
    logger.info("OpsVantage CRM & Email Marketing API starting up...")
    
    # Start background sequence processing
    asyncio.create_task(schedule_sequence_processing())
    
    logger.info("API startup complete")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Cleanup on shutdown"""
    logger.info("Shutting down...")
    client.close()
