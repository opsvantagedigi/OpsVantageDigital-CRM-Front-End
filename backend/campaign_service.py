import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import (
    Campaign, CampaignCreate, CampaignStatus, ContactStatus,
    EmailTemplate, EmailTemplateCreate,
    EmailSequence, EmailSequenceCreate, SequenceEnrollment,
    Contact, InteractionType
)
from email_service import email_service
import uuid

logger = logging.getLogger(__name__)

class CampaignService:
    def __init__(self, db: AsyncIOMotorDatabase, crm_service):
        self.db = db
        self.crm_service = crm_service
        self.campaigns = db.campaigns
        self.templates = db.email_templates
        self.sequences = db.email_sequences
        self.enrollments = db.sequence_enrollments
        self.contacts = db.contacts
    
    # Email Template Management
    async def create_template(self, template_data: EmailTemplateCreate) -> EmailTemplate:
        """Create a new email template"""
        template_dict = template_data.dict()
        template_dict['id'] = str(uuid.uuid4())
        template_dict['created_at'] = datetime.utcnow()
        template_dict['updated_at'] = datetime.utcnow()
        
        await self.templates.insert_one(template_dict)
        return EmailTemplate(**template_dict)
    
    async def get_templates(self) -> List[EmailTemplate]:
        """Get all email templates"""
        cursor = self.templates.find({}).sort("created_at", -1)
        templates = await cursor.to_list(length=None)
        return [EmailTemplate(**template) for template in templates]
    
    async def get_template(self, template_id: str) -> Optional[EmailTemplate]:
        """Get a specific email template"""
        template_data = await self.templates.find_one({"id": template_id})
        return EmailTemplate(**template_data) if template_data else None
    
    async def delete_template(self, template_id: str) -> bool:
        """Delete an email template"""
        result = await self.templates.delete_one({"id": template_id})
        return result.deleted_count > 0
    
    # Campaign Management
    async def create_campaign(self, campaign_data: CampaignCreate) -> Campaign:
        """Create a new email campaign"""
        campaign_dict = campaign_data.dict()
        campaign_dict['id'] = str(uuid.uuid4())
        campaign_dict['created_at'] = datetime.utcnow()
        campaign_dict['updated_at'] = datetime.utcnow()
        
        # Calculate target audience size
        target_count = await self._count_campaign_audience(
            campaign_data.target_tags,
            campaign_data.target_status,
            campaign_data.exclude_tags
        )
        campaign_dict['total_recipients'] = target_count
        
        await self.campaigns.insert_one(campaign_dict)
        return Campaign(**campaign_dict)
    
    async def get_campaigns(self) -> List[Campaign]:
        """Get all campaigns"""
        cursor = self.campaigns.find({}).sort("created_at", -1)
        campaigns = await cursor.to_list(length=None)
        return [Campaign(**campaign) for campaign in campaigns]
    
    async def get_campaign(self, campaign_id: str) -> Optional[Campaign]:
        """Get a specific campaign"""
        campaign_data = await self.campaigns.find_one({"id": campaign_id})
        return Campaign(**campaign_data) if campaign_data else None
    
    async def send_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """Send a campaign to its target audience"""
        campaign = await self.get_campaign(campaign_id)
        if not campaign:
            return {"success": False, "error": "Campaign not found"}
        
        if campaign.status != CampaignStatus.DRAFT and campaign.status != CampaignStatus.SCHEDULED:
            return {"success": False, "error": "Campaign cannot be sent"}
        
        # Get target audience
        audience = await self._get_campaign_audience(
            campaign.target_tags,
            campaign.target_status,
            campaign.exclude_tags
        )
        
        if not audience:
            return {"success": False, "error": "No contacts found for target audience"}
        
        # Update campaign status
        await self.campaigns.update_one(
            {"id": campaign_id},
            {"$set": {
                "status": CampaignStatus.SENT,
                "sent_at": datetime.utcnow(),
                "emails_sent": len(audience)
            }}
        )
        
        # Send emails in background
        asyncio.create_task(self._send_campaign_emails(campaign, audience))
        
        return {
            "success": True,
            "message": f"Campaign sent to {len(audience)} contacts",
            "recipient_count": len(audience)
        }
    
    async def _get_campaign_audience(self, target_tags: List[str], target_status: List[ContactStatus], exclude_tags: List[str]) -> List[Dict[str, Any]]:
        """Get the audience for a campaign based on targeting criteria"""
        query = {"email_subscribed": True}
        
        # Build targeting query
        and_conditions = []
        
        # Target tags (contacts must have at least one of these tags)
        if target_tags:
            and_conditions.append({"tags": {"$in": target_tags}})
        
        # Target status (contacts must have one of these statuses)
        if target_status:
            and_conditions.append({"status": {"$in": target_status}})
        
        # Exclude tags (contacts must not have any of these tags)
        if exclude_tags:
            and_conditions.append({"tags": {"$nin": exclude_tags}})
        
        if and_conditions:
            query["$and"] = and_conditions
        
        # If no targeting criteria, send to all subscribed contacts
        cursor = self.contacts.find(query)
        contacts = await cursor.to_list(length=None)
        
        return contacts
    
    async def _count_campaign_audience(self, target_tags: List[str], target_status: List[ContactStatus], exclude_tags: List[str]) -> int:
        """Count the audience size for a campaign"""
        audience = await self._get_campaign_audience(target_tags, target_status, exclude_tags)
        return len(audience)
    
    async def _send_campaign_emails(self, campaign: Campaign, audience: List[Dict[str, Any]]):
        """Send campaign emails to the audience"""
        try:
            # Prepare email data for bulk send
            email_list = []
            for contact in audience:
                email_list.append({
                    'email': contact['email'],
                    'first_name': contact.get('first_name', ''),
                    'last_name': contact.get('last_name', ''),
                    'company': contact.get('company', ''),
                    'position': contact.get('position', ''),
                    'city': contact.get('city', ''),
                    'state': contact.get('state', ''),
                    'country': contact.get('country', ''),
                })
            
            # Send bulk emails
            results = await email_service.send_bulk_emails(
                email_list=email_list,
                subject=campaign.subject,
                html_content=campaign.html_content,
                text_content=campaign.text_content
            )
            
            # Process results and update campaign analytics
            delivered_count = sum(1 for result in results if result.get('success', False))
            failed_count = len(results) - delivered_count
            
            await self.campaigns.update_one(
                {"id": campaign.id},
                {"$set": {
                    "emails_delivered": delivered_count,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            # Log interactions for successful sends
            for i, result in enumerate(results):
                if result.get('success', False):
                    contact = audience[i]
                    await self.crm_service._create_interaction(
                        contact['id'],
                        InteractionType.EMAIL_SENT,
                        f"Campaign email sent: {campaign.name}",
                        {
                            "campaign_id": campaign.id,
                            "message_id": result.get('message_id'),
                            "subject": campaign.subject
                        }
                    )
            
            logger.info(f"Campaign {campaign.id} sent: {delivered_count} delivered, {failed_count} failed")
            
        except Exception as e:
            logger.error(f"Failed to send campaign {campaign.id}: {str(e)}")
            await self.campaigns.update_one(
                {"id": campaign.id},
                {"$set": {"status": CampaignStatus.DRAFT}}
            )
    
    # Email Automation Sequences
    async def create_sequence(self, sequence_data: EmailSequenceCreate) -> EmailSequence:
        """Create a new email automation sequence"""
        sequence_dict = sequence_data.dict()
        sequence_dict['id'] = str(uuid.uuid4())
        sequence_dict['created_at'] = datetime.utcnow()
        sequence_dict['updated_at'] = datetime.utcnow()
        
        await self.sequences.insert_one(sequence_dict)
        return EmailSequence(**sequence_dict)
    
    async def get_sequences(self) -> List[EmailSequence]:
        """Get all email sequences"""
        cursor = self.sequences.find({}).sort("created_at", -1)
        sequences = await cursor.to_list(length=None)
        return [EmailSequence(**sequence) for sequence in sequences]
    
    async def get_sequence(self, sequence_id: str) -> Optional[EmailSequence]:
        """Get a specific email sequence"""
        sequence_data = await self.sequences.find_one({"id": sequence_id})
        return EmailSequence(**sequence_data) if sequence_data else None
    
    async def enroll_contact_in_sequence(self, contact_id: str, sequence_id: str) -> SequenceEnrollment:
        """Enroll a contact in an email sequence"""
        # Check if contact is already enrolled
        existing = await self.enrollments.find_one({
            "contact_id": contact_id,
            "sequence_id": sequence_id,
            "is_active": True
        })
        
        if existing:
            return SequenceEnrollment(**existing)
        
        enrollment_dict = {
            'id': str(uuid.uuid4()),
            'contact_id': contact_id,
            'sequence_id': sequence_id,
            'current_step': 0,
            'enrolled_at': datetime.utcnow(),
            'is_active': True
        }
        
        # Calculate next email time based on sequence first step
        sequence = await self.get_sequence(sequence_id)
        if sequence and sequence.emails:
            first_email = sequence.emails[0]
            delay_hours = first_email.get('delay_hours', 0)
            enrollment_dict['next_email_at'] = datetime.utcnow() + timedelta(hours=delay_hours)
        
        await self.enrollments.insert_one(enrollment_dict)
        
        # Log enrollment interaction
        await self.crm_service._create_interaction(
            contact_id,
            InteractionType.NOTE_ADDED,
            f"Enrolled in email sequence: {sequence.name if sequence else sequence_id}",
            {"sequence_id": sequence_id}
        )
        
        return SequenceEnrollment(**enrollment_dict)
    
    async def process_sequence_emails(self):
        """Process and send due sequence emails (should be called periodically)"""
        now = datetime.utcnow()
        
        # Find enrollments that are due for next email
        due_enrollments = await self.enrollments.find({
            "is_active": True,
            "next_email_at": {"$lte": now}
        }).to_list(length=None)
        
        for enrollment_data in due_enrollments:
            try:
                enrollment = SequenceEnrollment(**enrollment_data)
                await self._process_sequence_step(enrollment)
            except Exception as e:
                logger.error(f"Failed to process sequence enrollment {enrollment_data['id']}: {str(e)}")
    
    async def _process_sequence_step(self, enrollment: SequenceEnrollment):
        """Process a single step in an email sequence"""
        sequence = await self.get_sequence(enrollment.sequence_id)
        contact = await self.crm_service.get_contact(enrollment.contact_id)
        
        if not sequence or not contact:
            return
        
        if enrollment.current_step >= len(sequence.emails):
            # Sequence completed
            await self.enrollments.update_one(
                {"id": enrollment.id},
                {"$set": {
                    "is_active": False,
                    "completed_at": datetime.utcnow()
                }}
            )
            return
        
        # Get current email step
        email_step = sequence.emails[enrollment.current_step]
        
        # Send email
        contact_data = {
            'email': contact.email,
            'first_name': contact.first_name,
            'last_name': contact.last_name,
            'company': contact.company or '',
            'position': contact.position or '',
            'city': contact.city or '',
            'state': contact.state or '',
            'country': contact.country or '',
        }
        
        result = await email_service.send_email(
            to_email=contact.email,
            subject=email_step['subject'],
            html_content=email_step['html_content'],
            text_content=email_step.get('text_content')
        )
        
        if result['success']:
            # Log interaction
            await self.crm_service._create_interaction(
                contact.id,
                InteractionType.EMAIL_SENT,
                f"Sequence email sent: {email_step['subject']}",
                {
                    "sequence_id": sequence.id,
                    "step": enrollment.current_step,
                    "message_id": result.get('message_id')
                }
            )
        
        # Update enrollment to next step
        next_step = enrollment.current_step + 1
        update_data = {
            "current_step": next_step,
        }
        
        # Calculate next email time if there are more steps
        if next_step < len(sequence.emails):
            next_email = sequence.emails[next_step]
            delay_hours = next_email.get('delay_hours', 24)  # Default 24 hours
            update_data["next_email_at"] = datetime.utcnow() + timedelta(hours=delay_hours)
        else:
            # No more steps, mark as completed
            update_data["is_active"] = False
            update_data["completed_at"] = datetime.utcnow()
        
        await self.enrollments.update_one(
            {"id": enrollment.id},
            {"$set": update_data}
        )
    
    async def trigger_sequences_for_contact(self, contact: Contact, trigger_type: str = "status_change"):
        """Check and trigger sequences for a contact based on their attributes"""
        # Find sequences that should be triggered for this contact
        query = {"status": "active"}
        
        # Check trigger conditions
        if contact.tags:
            tag_sequences = await self.sequences.find({
                "status": "active",
                "trigger_tags": {"$in": contact.tags}
            }).to_list(length=None)
            
            for sequence_data in tag_sequences:
                sequence = EmailSequence(**sequence_data)
                await self.enroll_contact_in_sequence(contact.id, sequence.id)
        
        # Check status-based triggers
        status_sequences = await self.sequences.find({
            "status": "active",
            "trigger_status": contact.status
        }).to_list(length=None)
        
        for sequence_data in status_sequences:
            sequence = EmailSequence(**sequence_data)
            await self.enroll_contact_in_sequence(contact.id, sequence.id)
    
    async def create_default_templates(self):
        """Create default email templates for OpsVantage"""
        # Welcome email template
        welcome_template = email_service.get_welcome_email_template()
        await self.create_template(EmailTemplateCreate(
            name="Welcome Email - OpsVantage",
            subject=welcome_template['subject'],
            html_content=welcome_template['html_content'],
            text_content=welcome_template['text_content'],
            is_default=True
        ))
        
        # Follow-up email template
        followup_template = email_service.get_follow_up_email_template()
        await self.create_template(EmailTemplateCreate(
            name="Follow-up Email - OpsVantage",
            subject=followup_template['subject'],
            html_content=followup_template['html_content'],
            text_content=followup_template['text_content'],
            is_default=True
        ))
    
    async def create_default_sequences(self):
        """Create default email sequences for OpsVantage"""
        # Welcome sequence for new contacts
        welcome_sequence = EmailSequenceCreate(
            name="Welcome Sequence - New Contacts",
            description="Automated welcome sequence for new contacts",
            trigger_tags=["new_subscriber"],
            trigger_status=[ContactStatus.NEW],
            emails=[
                {
                    "subject": "Welcome to OpsVantage Digital, {{first_name}}!",
                    "html_content": email_service.get_welcome_email_template()['html_content'],
                    "text_content": email_service.get_welcome_email_template()['text_content'],
                    "delay_hours": 0  # Send immediately
                },
                {
                    "subject": "Getting started with digital transformation",
                    "html_content": """
                    <h2>Hi {{first_name}},</h2>
                    <p>Now that you're part of the OpsVantage Digital community, let's dive into how we can help transform your operations.</p>
                    <p>Here are some key areas where we help businesses like {{company}}:</p>
                    <ul>
                        <li>Process automation and optimization</li>
                        <li>Digital workflow implementation</li>
                        <li>Performance analytics and insights</li>
                        <li>Strategic technology planning</li>
                    </ul>
                    <p>Ready to explore? <a href="https://opsvantage.com/consultation">Schedule a free consultation</a></p>
                    """,
                    "delay_hours": 72  # Send 3 days later
                }
            ]
        )
        await self.create_sequence(welcome_sequence)
        
        # Follow-up sequence for qualified leads
        followup_sequence = EmailSequenceCreate(
            name="Follow-up Sequence - Qualified Leads",
            description="Nurture sequence for qualified leads",
            trigger_status=[ContactStatus.QUALIFIED],
            emails=[
                {
                    "subject": "Following up on your interest, {{first_name}}",
                    "html_content": email_service.get_follow_up_email_template()['html_content'],
                    "text_content": email_service.get_follow_up_email_template()['text_content'],
                    "delay_hours": 24  # Send 1 day later
                },
                {
                    "subject": "Case study: How {{company}} could benefit",
                    "html_content": """
                    <h2>Hi {{first_name}},</h2>
                    <p>I wanted to share a relevant case study that might interest you.</p>
                    <p>We recently helped a company similar to {{company}} achieve:</p>
                    <ul>
                        <li>30% reduction in operational costs</li>
                        <li>50% faster process completion times</li>
                        <li>99.9% accuracy in automated workflows</li>
                    </ul>
                    <p>I'd love to discuss how we could achieve similar results for {{company}}.</p>
                    <p><a href="https://calendly.com/opsvantage/consultation">Book a 15-minute call</a></p>
                    """,
                    "delay_hours": 120  # Send 5 days later
                }
            ]
        )
        await self.create_sequence(followup_sequence)
