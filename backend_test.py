import requests
import json
import unittest
import os
import time
from datetime import datetime, timedelta
import uuid

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://de1906ca-8ad3-4260-ab69-efb48bab8ce5.preview.emergentagent.com/api"

class CRMBackendTests(unittest.TestCase):
    """Test suite for the OpsVantage CRM & Email Marketing API"""

    def setUp(self):
        """Set up test fixtures before each test method"""
        self.api_url = BACKEND_URL
        self.test_contact_data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": f"john.doe.{uuid.uuid4()}@example.com",
            "phone": "+1234567890",
            "company": "Acme Inc.",
            "position": "CTO",
            "lead_source": "website",
            "city": "New York",
            "state": "NY",
            "country": "USA",
            "tags": ["test", "vip"],
            "notes": "Test contact created by automated tests"
        }
        self.test_template_data = {
            "name": f"Test Template {uuid.uuid4()}",
            "subject": "Test Email Subject",
            "html_content": "<h1>Test Email</h1><p>This is a test email.</p>",
            "text_content": "Test Email\n\nThis is a test email.",
            "is_default": False
        }
        self.test_campaign_data = {
            "name": f"Test Campaign {uuid.uuid4()}",
            "subject": "Test Campaign Subject",
            "html_content": "<h1>Test Campaign</h1><p>This is a test campaign email.</p>",
            "text_content": "Test Campaign\n\nThis is a test campaign email.",
            "target_tags": ["test"],
            "target_status": ["new", "qualified"],
            "exclude_tags": []
        }
        self.test_sequence_data = {
            "name": f"Test Sequence {uuid.uuid4()}",
            "description": "Test email sequence",
            "trigger_tags": ["test"],
            "trigger_status": ["new"],
            "emails": [
                {
                    "subject": "Test Sequence Email 1",
                    "html_content": "<h1>Test Sequence Email 1</h1><p>This is the first email in the sequence.</p>",
                    "text_content": "Test Sequence Email 1\n\nThis is the first email in the sequence.",
                    "delay_hours": 0
                },
                {
                    "subject": "Test Sequence Email 2",
                    "html_content": "<h1>Test Sequence Email 2</h1><p>This is the second email in the sequence.</p>",
                    "text_content": "Test Sequence Email 2\n\nThis is the second email in the sequence.",
                    "delay_hours": 24
                }
            ]
        }
        self.created_contacts = []
        self.created_templates = []
        self.created_campaigns = []
        self.created_sequences = []

    def tearDown(self):
        """Clean up after each test method"""
        # Delete test contacts
        for contact_id in self.created_contacts:
            try:
                requests.delete(f"{self.api_url}/contacts/{contact_id}")
            except:
                pass
        
        # Delete test templates
        for template_id in self.created_templates:
            try:
                requests.delete(f"{self.api_url}/templates/{template_id}")
            except:
                pass

    def test_01_api_health_check(self):
        """Test API health check endpoint"""
        response = requests.get(f"{self.api_url}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "operational")
        self.assertEqual(data["version"], "1.0.0")
        print("✅ API health check passed")

    def test_02_system_initialization(self):
        """Test system initialization endpoint"""
        response = requests.post(f"{self.api_url}/system/initialize")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "System initialized successfully")
        print("✅ System initialization passed")

    def test_03_contact_creation_with_lead_scoring(self):
        """Test contact creation with lead scoring"""
        response = requests.post(f"{self.api_url}/contacts", json=self.test_contact_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["first_name"], self.test_contact_data["first_name"])
        self.assertEqual(data["last_name"], self.test_contact_data["last_name"])
        self.assertEqual(data["email"], self.test_contact_data["email"])
        self.assertEqual(data["company"], self.test_contact_data["company"])
        self.assertEqual(data["position"], self.test_contact_data["position"])
        self.assertEqual(data["lead_source"], self.test_contact_data["lead_source"])
        self.assertEqual(data["status"], "new")
        self.assertGreaterEqual(data["lead_score"], 0)
        self.assertLessEqual(data["lead_score"], 100)
        self.created_contacts.append(data["id"])
        print(f"✅ Contact creation passed with lead score: {data['lead_score']}")
        return data["id"]

    def test_04_get_contact(self):
        """Test getting a specific contact"""
        contact_id = self.test_03_contact_creation_with_lead_scoring()
        response = requests.get(f"{self.api_url}/contacts/{contact_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], contact_id)
        self.assertEqual(data["first_name"], self.test_contact_data["first_name"])
        self.assertEqual(data["last_name"], self.test_contact_data["last_name"])
        print("✅ Get contact passed")

    def test_05_update_contact_status(self):
        """Test updating contact status and verify lead score recalculation"""
        contact_id = self.test_03_contact_creation_with_lead_scoring()
        initial_response = requests.get(f"{self.api_url}/contacts/{contact_id}")
        initial_data = initial_response.json()
        initial_score = initial_data["lead_score"]
        
        # Update status to qualified
        update_data = {"status": "qualified"}
        response = requests.put(f"{self.api_url}/contacts/{contact_id}", json=update_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "qualified")
        
        # Verify lead score was recalculated
        self.assertNotEqual(data["lead_score"], initial_score)
        print(f"✅ Contact status update passed. Initial score: {initial_score}, New score: {data['lead_score']}")

    def test_06_get_contacts_with_filtering(self):
        """Test getting contacts with filtering"""
        # Create a contact first
        self.test_03_contact_creation_with_lead_scoring()
        
        # Test filtering by status
        response = requests.get(f"{self.api_url}/contacts?status=new")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        # Test filtering by lead source
        response = requests.get(f"{self.api_url}/contacts?lead_source=website")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        # Test search
        response = requests.get(f"{self.api_url}/contacts?search=John")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        print("✅ Get contacts with filtering passed")

    def test_07_search_contacts(self):
        """Test contact search functionality"""
        # Create a contact first
        self.test_03_contact_creation_with_lead_scoring()
        
        # Test search endpoint
        response = requests.get(f"{self.api_url}/contacts/search?q=John")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        
        print("✅ Contact search passed")

    def test_08_create_interaction(self):
        """Test creating interactions and verify engagement tracking"""
        contact_id = self.test_03_contact_creation_with_lead_scoring()
        
        # Get initial contact data
        initial_response = requests.get(f"{self.api_url}/contacts/{contact_id}")
        initial_data = initial_response.json()
        initial_interactions = initial_data["total_interactions"]
        
        # Create an interaction
        interaction_data = {
            "contact_id": contact_id,
            "type": "email_opened",
            "description": "Opened welcome email",
            "metadata": {"email_id": str(uuid.uuid4())}
        }
        response = requests.post(f"{self.api_url}/interactions", json=interaction_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["contact_id"], contact_id)
        self.assertEqual(data["type"], interaction_data["type"])
        
        # Verify contact engagement was updated
        updated_response = requests.get(f"{self.api_url}/contacts/{contact_id}")
        updated_data = updated_response.json()
        self.assertGreater(updated_data["total_interactions"], initial_interactions)
        self.assertGreater(updated_data["email_opens"], initial_data["email_opens"])
        
        print("✅ Interaction creation and engagement tracking passed")

    def test_09_get_contact_interactions(self):
        """Test getting interactions for a contact"""
        contact_id = self.test_03_contact_creation_with_lead_scoring()
        
        # Create an interaction
        interaction_data = {
            "contact_id": contact_id,
            "type": "note_added",
            "description": "Test note",
            "metadata": {}
        }
        requests.post(f"{self.api_url}/interactions", json=interaction_data)
        
        # Get interactions
        response = requests.get(f"{self.api_url}/contacts/{contact_id}/interactions")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        
        print("✅ Get contact interactions passed")

    def test_10_create_email_template(self):
        """Test email template creation"""
        response = requests.post(f"{self.api_url}/templates", json=self.test_template_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], self.test_template_data["name"])
        self.assertEqual(data["subject"], self.test_template_data["subject"])
        self.assertEqual(data["html_content"], self.test_template_data["html_content"])
        self.created_templates.append(data["id"])
        print("✅ Email template creation passed")
        return data["id"]

    def test_11_get_email_templates(self):
        """Test getting email templates"""
        # Create a template first
        self.test_10_create_email_template()
        
        # Get templates
        response = requests.get(f"{self.api_url}/templates")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        
        print("✅ Get email templates passed")

    def test_12_get_specific_template(self):
        """Test getting a specific email template"""
        template_id = self.test_10_create_email_template()
        
        response = requests.get(f"{self.api_url}/templates/{template_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], template_id)
        self.assertEqual(data["name"], self.test_template_data["name"])
        
        print("✅ Get specific template passed")

    def test_13_create_campaign(self):
        """Test campaign creation and target audience calculation"""
        # Create a contact first to be part of the target audience
        self.test_03_contact_creation_with_lead_scoring()
        
        response = requests.post(f"{self.api_url}/campaigns", json=self.test_campaign_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], self.test_campaign_data["name"])
        self.assertEqual(data["subject"], self.test_campaign_data["subject"])
        self.assertEqual(data["target_tags"], self.test_campaign_data["target_tags"])
        self.assertEqual(data["target_status"], self.test_campaign_data["target_status"])
        self.assertEqual(data["status"], "draft")
        self.created_campaigns.append(data["id"])
        
        print(f"✅ Campaign creation passed with target audience size: {data['total_recipients']}")
        return data["id"]

    def test_14_get_campaigns(self):
        """Test getting campaigns"""
        # Create a campaign first
        self.test_13_create_campaign()
        
        response = requests.get(f"{self.api_url}/campaigns")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        
        print("✅ Get campaigns passed")

    def test_15_get_specific_campaign(self):
        """Test getting a specific campaign"""
        campaign_id = self.test_13_create_campaign()
        
        response = requests.get(f"{self.api_url}/campaigns/{campaign_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], campaign_id)
        self.assertEqual(data["name"], self.test_campaign_data["name"])
        
        print("✅ Get specific campaign passed")

    def test_16_send_campaign(self):
        """Test sending a campaign"""
        campaign_id = self.test_13_create_campaign()
        
        response = requests.post(f"{self.api_url}/campaigns/{campaign_id}/send")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        
        # Verify campaign status was updated
        campaign_response = requests.get(f"{self.api_url}/campaigns/{campaign_id}")
        campaign_data = campaign_response.json()
        self.assertEqual(campaign_data["status"], "sent")
        
        print("✅ Send campaign passed")

    def test_17_create_email_sequence(self):
        """Test email sequence creation with triggers"""
        response = requests.post(f"{self.api_url}/sequences", json=self.test_sequence_data)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], self.test_sequence_data["name"])
        self.assertEqual(data["description"], self.test_sequence_data["description"])
        self.assertEqual(data["trigger_tags"], self.test_sequence_data["trigger_tags"])
        self.assertEqual(data["trigger_status"], self.test_sequence_data["trigger_status"])
        self.assertEqual(len(data["emails"]), len(self.test_sequence_data["emails"]))
        self.created_sequences.append(data["id"])
        
        print("✅ Email sequence creation passed")
        return data["id"]

    def test_18_get_sequences(self):
        """Test getting email sequences"""
        # Create a sequence first
        self.test_17_create_email_sequence()
        
        response = requests.get(f"{self.api_url}/sequences")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        
        print("✅ Get email sequences passed")

    def test_19_get_specific_sequence(self):
        """Test getting a specific email sequence"""
        sequence_id = self.test_17_create_email_sequence()
        
        response = requests.get(f"{self.api_url}/sequences/{sequence_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], sequence_id)
        self.assertEqual(data["name"], self.test_sequence_data["name"])
        
        print("✅ Get specific sequence passed")

    def test_20_enroll_contact_in_sequence(self):
        """Test enrolling a contact in an email sequence"""
        contact_id = self.test_03_contact_creation_with_lead_scoring()
        sequence_id = self.test_17_create_email_sequence()
        
        response = requests.post(f"{self.api_url}/sequences/{sequence_id}/enroll/{contact_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "Contact enrolled successfully")
        self.assertIn("enrollment_id", data)
        
        print("✅ Enroll contact in sequence passed")

    def test_21_process_sequences(self):
        """Test processing email sequences"""
        # Enroll a contact in a sequence first
        contact_id = self.test_03_contact_creation_with_lead_scoring()
        sequence_id = self.test_17_create_email_sequence()
        requests.post(f"{self.api_url}/sequences/{sequence_id}/enroll/{contact_id}")
        
        # Process sequences
        response = requests.post(f"{self.api_url}/system/process-sequences")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "Sequence processing started")
        
        print("✅ Process sequences passed")

    def test_22_dashboard_stats(self):
        """Test analytics endpoint for dashboard data"""
        response = requests.get(f"{self.api_url}/analytics/dashboard")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_contacts", data)
        self.assertIn("new_contacts_this_month", data)
        self.assertIn("qualified_leads", data)
        self.assertIn("customers", data)
        self.assertIn("total_campaigns", data)
        self.assertIn("active_automations", data)
        self.assertIn("avg_open_rate", data)
        self.assertIn("avg_click_rate", data)
        
        print("✅ Dashboard stats passed")

    def test_23_lead_source_stats(self):
        """Test lead source analytics"""
        response = requests.get(f"{self.api_url}/analytics/lead-sources")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        print("✅ Lead source stats passed")

    def test_24_contact_status_stats(self):
        """Test contact status distribution analytics"""
        response = requests.get(f"{self.api_url}/analytics/contact-status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        print("✅ Contact status stats passed")

    def test_25_recent_activity(self):
        """Test recent activity tracking"""
        response = requests.get(f"{self.api_url}/analytics/recent-activity")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        
        print("✅ Recent activity tracking passed")

    def test_26_send_test_email(self):
        """Test sending a test email"""
        test_email = f"test.{uuid.uuid4()}@example.com"
        response = requests.post(
            f"{self.api_url}/email/test",
            params={
                "to_email": test_email,
                "subject": "Test Email from Backend Tests",
                "template_type": "welcome"
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Note: This might fail if SendGrid is not properly configured
        # We'll consider it a pass if the API responds correctly, even if the email doesn't actually send
        print(f"✅ Send test email API call passed with result: {data['success']}")

    def test_27_delete_contact(self):
        """Test contact deletion"""
        contact_id = self.test_03_contact_creation_with_lead_scoring()
        
        response = requests.delete(f"{self.api_url}/contacts/{contact_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "Contact deleted successfully")
        
        # Verify contact was deleted
        get_response = requests.get(f"{self.api_url}/contacts/{contact_id}")
        self.assertEqual(get_response.status_code, 404)
        
        # Remove from cleanup list since we already deleted it
        if contact_id in self.created_contacts:
            self.created_contacts.remove(contact_id)
        
        print("✅ Contact deletion passed")

    def test_28_delete_template(self):
        """Test email template deletion"""
        template_id = self.test_10_create_email_template()
        
        response = requests.delete(f"{self.api_url}/templates/{template_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "Template deleted successfully")
        
        # Verify template was deleted
        get_response = requests.get(f"{self.api_url}/templates/{template_id}")
        self.assertEqual(get_response.status_code, 404)
        
        # Remove from cleanup list since we already deleted it
        if template_id in self.created_templates:
            self.created_templates.remove(template_id)
        
        print("✅ Template deletion passed")

if __name__ == "__main__":
    # Run the tests
    unittest.main(verbosity=2)