import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import (
    Contact, ContactCreate, ContactUpdate, ContactStatus, LeadSource,
    Interaction, InteractionCreate, InteractionType,
    ContactAnalytics, DashboardStats, LeadSourceStats, ContactStatusStats, RecentActivity
)
from email_service import email_service

logger = logging.getLogger(__name__)

class CRMService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.contacts = db.contacts
        self.interactions = db.interactions
        self.contact_analytics = db.contact_analytics
        
    async def create_contact(self, contact_data: ContactCreate) -> Contact:
        """Create a new contact with initial lead scoring"""
        contact_dict = contact_data.dict()
        contact_dict['id'] = str(uuid.uuid4())
        contact_dict['created_at'] = datetime.utcnow()
        contact_dict['updated_at'] = datetime.utcnow()
        
        # Calculate initial lead score
        initial_score = self._calculate_initial_lead_score(contact_data)
        contact_dict['lead_score'] = initial_score
        
        # Insert into database
        await self.contacts.insert_one(contact_dict)
        
        # Create welcome interaction
        await self._create_interaction(
            contact_dict['id'],
            InteractionType.NOTE_ADDED,
            f"Contact created from {contact_data.lead_source}"
        )
        
        # Trigger welcome email if subscribed
        if contact_dict.get('email_subscribed', True):
            asyncio.create_task(self._send_welcome_email(contact_dict))
        
        return Contact(**contact_dict)
    
    async def get_contact(self, contact_id: str) -> Optional[Contact]:
        """Get a contact by ID"""
        contact_data = await self.contacts.find_one({"id": contact_id})
        return Contact(**contact_data) if contact_data else None
    
    async def get_contacts(self, 
                          skip: int = 0, 
                          limit: int = 100,
                          status: Optional[ContactStatus] = None,
                          lead_source: Optional[LeadSource] = None,
                          tags: Optional[List[str]] = None,
                          search: Optional[str] = None) -> List[Contact]:
        """Get contacts with filtering and pagination"""
        query = {}
        
        if status:
            query['status'] = status
        if lead_source:
            query['lead_source'] = lead_source
        if tags:
            query['tags'] = {"$in": tags}
        if search:
            query['$or'] = [
                {"first_name": {"$regex": search, "$options": "i"}},
                {"last_name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"company": {"$regex": search, "$options": "i"}}
            ]
        
        cursor = self.contacts.find(query).sort("created_at", -1).skip(skip).limit(limit)
        contacts = await cursor.to_list(length=limit)
        return [Contact(**contact) for contact in contacts]
    
    async def update_contact(self, contact_id: str, update_data: ContactUpdate) -> Optional[Contact]:
        """Update a contact and recalculate lead score"""
        existing_contact = await self.get_contact(contact_id)
        if not existing_contact:
            return None
        
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict['updated_at'] = datetime.utcnow()
        
        # Recalculate lead score if relevant fields changed
        if any(field in update_dict for field in ['status', 'company', 'position', 'tags']):
            # Get current interactions for scoring
            interactions = await self.get_contact_interactions(contact_id)
            new_score = self._calculate_lead_score(existing_contact, interactions, update_dict)
            update_dict['lead_score'] = new_score
        
        await self.contacts.update_one(
            {"id": contact_id},
            {"$set": update_dict}
        )
        
        # Log status change if applicable
        if 'status' in update_dict and update_dict['status'] != existing_contact.status:
            await self._create_interaction(
                contact_id,
                InteractionType.NOTE_ADDED,
                f"Status changed from {existing_contact.status} to {update_dict['status']}"
            )
        
        updated_contact = await self.get_contact(contact_id)
        return updated_contact
    
    async def delete_contact(self, contact_id: str) -> bool:
        """Delete a contact and all related data"""
        result = await self.contacts.delete_one({"id": contact_id})
        if result.deleted_count > 0:
            # Delete related interactions
            await self.interactions.delete_many({"contact_id": contact_id})
            await self.contact_analytics.delete_many({"contact_id": contact_id})
            return True
        return False
    
    async def create_interaction(self, interaction_data: InteractionCreate) -> Interaction:
        """Create a new interaction and update contact lead score"""
        interaction_dict = interaction_data.dict()
        interaction_dict['id'] = str(uuid.uuid4())
        interaction_dict['created_at'] = datetime.utcnow()
        
        await self.interactions.insert_one(interaction_dict)
        
        # Update contact interaction counts and lead score
        await self._update_contact_engagement(interaction_data.contact_id, interaction_data.type)
        
        return Interaction(**interaction_dict)
    
    async def get_contact_interactions(self, contact_id: str, limit: int = 50) -> List[Interaction]:
        """Get interactions for a contact"""
        cursor = self.interactions.find({"contact_id": contact_id}).sort("created_at", -1).limit(limit)
        interactions = await cursor.to_list(length=limit)
        return [Interaction(**interaction) for interaction in interactions]
    
    async def _create_interaction(self, contact_id: str, interaction_type: InteractionType, description: str, metadata: Dict[str, Any] = None):
        """Internal method to create interactions"""
        interaction_data = InteractionCreate(
            contact_id=contact_id,
            type=interaction_type,
            description=description,
            metadata=metadata or {}
        )
        await self.create_interaction(interaction_data)
    
    async def _update_contact_engagement(self, contact_id: str, interaction_type: InteractionType):
        """Update contact engagement metrics and lead score"""
        contact = await self.get_contact(contact_id)
        if not contact:
            return
        
        # Update interaction counts
        update_fields = {
            'total_interactions': contact.total_interactions + 1,
            'last_interaction_date': datetime.utcnow()
        }
        
        # Update specific engagement metrics
        if interaction_type == InteractionType.EMAIL_OPENED:
            update_fields['email_opens'] = contact.email_opens + 1
        elif interaction_type == InteractionType.EMAIL_CLICKED:
            update_fields['email_clicks'] = contact.email_clicks + 1
        elif interaction_type == InteractionType.WEBSITE_VISIT:
            update_fields['website_visits'] = contact.website_visits + 1
        
        # Recalculate lead score
        interactions = await self.get_contact_interactions(contact_id)
        new_score = self._calculate_lead_score(contact, interactions)
        update_fields['lead_score'] = new_score
        
        await self.contacts.update_one(
            {"id": contact_id},
            {"$set": update_fields}
        )
    
    def _calculate_initial_lead_score(self, contact_data: ContactCreate) -> int:
        """Calculate initial lead score for new contact"""
        score = 0
        
        # Source scoring
        source_scores = {
            LeadSource.REFERRAL: 25,
            LeadSource.WEBINAR: 20,
            LeadSource.EVENT: 20,
            LeadSource.EMAIL_CAMPAIGN: 15,
            LeadSource.WEBSITE: 10,
            LeadSource.BLOG: 10,
            LeadSource.SOCIAL_MEDIA: 8,
            LeadSource.PAID_ADS: 5,
            LeadSource.COLD_OUTREACH: 3,
        }
        score += source_scores.get(contact_data.lead_source, 0)
        
        # Company information bonus
        if contact_data.company:
            score += 10
        if contact_data.position:
            position_lower = contact_data.position.lower()
            if any(title in position_lower for title in ['ceo', 'cto', 'cfo', 'director', 'vp', 'president']):
                score += 15
            elif any(title in position_lower for title in ['manager', 'lead', 'head']):
                score += 10
            else:
                score += 5
        
        # Phone number bonus
        if contact_data.phone:
            score += 5
        
        return min(score, 100)  # Cap at 100
    
    def _calculate_lead_score(self, contact: Contact, interactions: List[Interaction], updates: Dict[str, Any] = None) -> int:
        """Calculate comprehensive lead score based on contact data and interactions"""
        score = 0
        
        # Get current or updated values
        def get_value(field, default=None):
            if updates and field in updates:
                return updates[field]
            return getattr(contact, field, default)
        
        # Base score from initial calculation
        score += self._calculate_initial_lead_score(ContactCreate(
            first_name=get_value('first_name'),
            last_name=get_value('last_name'),
            email=get_value('email'),
            phone=get_value('phone'),
            company=get_value('company'),
            position=get_value('position'),
            lead_source=get_value('lead_source')
        ))
        
        # Engagement scoring
        email_opens = get_value('email_opens', 0)
        email_clicks = get_value('email_clicks', 0)
        website_visits = get_value('website_visits', 0)
        
        # Email engagement (max 25 points)
        score += min(email_opens * 2, 15)  # 2 points per open, max 15
        score += min(email_clicks * 5, 25)  # 5 points per click, max 25
        
        # Website engagement (max 15 points)
        score += min(website_visits * 3, 15)  # 3 points per visit, max 15
        
        # Interaction diversity bonus
        interaction_types = set(interaction.type for interaction in interactions)
        score += len(interaction_types) * 2  # 2 points per unique interaction type
        
        # Recent engagement bonus
        recent_interactions = [
            i for i in interactions 
            if i.created_at > datetime.utcnow() - timedelta(days=30)
        ]
        if len(recent_interactions) >= 5:
            score += 10
        elif len(recent_interactions) >= 3:
            score += 5
        
        # Status bonus
        status = get_value('status')
        status_scores = {
            ContactStatus.CUSTOMER: 25,
            ContactStatus.ENGAGED: 15,
            ContactStatus.QUALIFIED: 10,
            ContactStatus.NEW: 0,
            ContactStatus.INACTIVE: -10
        }
        score += status_scores.get(status, 0)
        
        return max(0, min(score, 100))  # Ensure score is between 0-100
    
    async def _send_welcome_email(self, contact_data: Dict[str, Any]):
        """Send welcome email to new contact"""
        try:
            template = email_service.get_welcome_email_template()
            
            result = await email_service.send_email(
                to_email=contact_data['email'],
                subject=template['subject'],
                html_content=template['html_content'],
                text_content=template['text_content']
            )
            
            if result['success']:
                # Log email sent interaction
                await self._create_interaction(
                    contact_data['id'],
                    InteractionType.EMAIL_SENT,
                    "Welcome email sent",
                    {"email_type": "welcome", "message_id": result.get('message_id')}
                )
            
        except Exception as e:
            logger.error(f"Failed to send welcome email to {contact_data['email']}: {str(e)}")
    
    async def get_dashboard_stats(self) -> DashboardStats:
        """Get comprehensive dashboard statistics"""
        # Total contacts
        total_contacts = await self.contacts.count_documents({})
        
        # New contacts this month
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_contacts_this_month = await self.contacts.count_documents({
            "created_at": {"$gte": start_of_month}
        })
        
        # Contacts by status
        qualified_leads = await self.contacts.count_documents({"status": ContactStatus.QUALIFIED})
        customers = await self.contacts.count_documents({"status": ContactStatus.CUSTOMER})
        
        # Campaign stats (placeholder - will be updated when campaigns are implemented)
        total_campaigns = 0
        active_automations = 0
        
        # Email engagement averages
        pipeline = [
            {"$match": {"email_opens": {"$gt": 0}, "total_interactions": {"$gt": 0}}},
            {"$group": {
                "_id": None,
                "avg_open_rate": {"$avg": {"$divide": ["$email_opens", "$total_interactions"]}},
                "avg_click_rate": {"$avg": {"$divide": ["$email_clicks", "$total_interactions"]}}
            }}
        ]
        
        engagement_stats = await self.contacts.aggregate(pipeline).to_list(length=1)
        avg_open_rate = engagement_stats[0]['avg_open_rate'] if engagement_stats else 0.0
        avg_click_rate = engagement_stats[0]['avg_click_rate'] if engagement_stats else 0.0
        
        return DashboardStats(
            total_contacts=total_contacts,
            new_contacts_this_month=new_contacts_this_month,
            qualified_leads=qualified_leads,
            customers=customers,
            total_campaigns=total_campaigns,
            active_automations=active_automations,
            avg_open_rate=round(avg_open_rate * 100, 2),
            avg_click_rate=round(avg_click_rate * 100, 2)
        )
    
    async def get_lead_source_stats(self) -> List[LeadSourceStats]:
        """Get lead source distribution statistics"""
        pipeline = [
            {"$group": {"_id": "$lead_source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        results = await self.contacts.aggregate(pipeline).to_list(length=None)
        total_contacts = sum(result['count'] for result in results)
        
        return [
            LeadSourceStats(
                source=result['_id'],
                count=result['count'],
                percentage=round((result['count'] / total_contacts) * 100, 2) if total_contacts > 0 else 0
            )
            for result in results
        ]
    
    async def get_contact_status_stats(self) -> List[ContactStatusStats]:
        """Get contact status distribution statistics"""
        pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        results = await self.contacts.aggregate(pipeline).to_list(length=None)
        total_contacts = sum(result['count'] for result in results)
        
        return [
            ContactStatusStats(
                status=result['_id'],
                count=result['count'],
                percentage=round((result['count'] / total_contacts) * 100, 2) if total_contacts > 0 else 0
            )
            for result in results
        ]
    
    async def get_recent_activity(self, limit: int = 10) -> List[RecentActivity]:
        """Get recent interactions across all contacts"""
        pipeline = [
            {"$lookup": {
                "from": "contacts",
                "localField": "contact_id",
                "foreignField": "id",
                "as": "contact"
            }},
            {"$unwind": "$contact"},
            {"$sort": {"created_at": -1}},
            {"$limit": limit},
            {"$project": {
                "type": "$type",
                "description": "$description",
                "contact_name": {"$concat": ["$contact.first_name", " ", "$contact.last_name"]},
                "contact_id": "$contact_id",
                "timestamp": "$created_at"
            }}
        ]
        
        results = await self.interactions.aggregate(pipeline).to_list(length=limit)
        return [RecentActivity(**result) for result in results]
    
    async def search_contacts(self, query: str, limit: int = 20) -> List[Contact]:
        """Advanced contact search"""
        search_query = {
            "$or": [
                {"first_name": {"$regex": query, "$options": "i"}},
                {"last_name": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}},
                {"company": {"$regex": query, "$options": "i"}},
                {"position": {"$regex": query, "$options": "i"}},
                {"tags": {"$in": [{"$regex": query, "$options": "i"}]}}
            ]
        }
        
        cursor = self.contacts.find(search_query).sort("lead_score", -1).limit(limit)
        contacts = await cursor.to_list(length=limit)
        return [Contact(**contact) for contact in contacts]

import uuid  # Add this import at the top
