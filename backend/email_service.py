import os
import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, From, To, Subject, HtmlContent, PlainTextContent
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.api_key = os.environ.get('SENDGRID_API_KEY')
        if not self.api_key:
            logger.warning("SENDGRID_API_KEY environment variable is not set. Email functionality will be limited.")
            self.sg = None
        else:
            self.sg = SendGridAPIClient(api_key=self.api_key)
        
        self.from_email = "noreply@opsvantage.com"  # OpsVantage default sender
        self.from_name = "OpsVantage Digital"
        
    async def send_email(self, 
                        to_email: str, 
                        subject: str, 
                        html_content: str, 
                        text_content: Optional[str] = None,
                        from_email: Optional[str] = None,
                        from_name: Optional[str] = None) -> Dict[str, Any]:
        """Send a single email using SendGrid"""
        try:
            if not self.sg:
                logger.warning(f"SendGrid not configured. Cannot send email to {to_email}")
                return {
                    "success": False,
                    "error": "SendGrid not configured",
                    "to_email": to_email,
                    "timestamp": datetime.utcnow()
                }
                
            sender_email = from_email or self.from_email
            sender_name = from_name or self.from_name
            
            message = Mail(
                from_email=From(sender_email, sender_name),
                to_emails=To(to_email),
                subject=Subject(subject),
                html_content=HtmlContent(html_content)
            )
            
            if text_content:
                message.plain_text_content = PlainTextContent(text_content)
                
            # Execute in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                response = await loop.run_in_executor(
                    executor, 
                    self.sg.send, 
                    message
                )
            
            logger.info(f"Email sent successfully to {to_email}, status: {response.status_code}")
            return {
                "success": True,
                "status_code": response.status_code,
                "message_id": response.headers.get('X-Message-Id'),
                "to_email": to_email,
                "timestamp": datetime.utcnow()
            }
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "to_email": to_email,
                "timestamp": datetime.utcnow()
            }
    
    async def send_bulk_emails(self, 
                              email_list: List[Dict[str, str]], 
                              subject: str, 
                              html_content: str, 
                              text_content: Optional[str] = None) -> List[Dict[str, Any]]:
        """Send bulk emails to multiple recipients"""
        results = []
        
        # Send emails in batches to avoid rate limiting
        batch_size = 10
        for i in range(0, len(email_list), batch_size):
            batch = email_list[i:i + batch_size]
            batch_tasks = []
            
            for email_data in batch:
                to_email = email_data.get('email')
                personalized_content = self._personalize_content(
                    html_content, 
                    email_data
                )
                personalized_subject = self._personalize_content(
                    subject, 
                    email_data
                )
                
                task = self.send_email(
                    to_email=to_email,
                    subject=personalized_subject,
                    html_content=personalized_content,
                    text_content=text_content
                )
                batch_tasks.append(task)
            
            # Execute batch
            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            results.extend(batch_results)
            
            # Add delay between batches to respect rate limits
            if i + batch_size < len(email_list):
                await asyncio.sleep(1)
        
        return results
    
    def _personalize_content(self, content: str, contact_data: Dict[str, Any]) -> str:
        """Replace placeholders in content with contact data"""
        personalized = content
        
        # Common personalizations
        placeholders = {
            '{{first_name}}': contact_data.get('first_name', ''),
            '{{last_name}}': contact_data.get('last_name', ''),
            '{{full_name}}': f"{contact_data.get('first_name', '')} {contact_data.get('last_name', '')}".strip(),
            '{{email}}': contact_data.get('email', ''),
            '{{company}}': contact_data.get('company', ''),
            '{{position}}': contact_data.get('position', ''),
            '{{city}}': contact_data.get('city', ''),
            '{{state}}': contact_data.get('state', ''),
            '{{country}}': contact_data.get('country', ''),
        }
        
        for placeholder, value in placeholders.items():
            if value:
                personalized = personalized.replace(placeholder, str(value))
            else:
                # Remove placeholder if no value
                personalized = personalized.replace(placeholder, '')
        
        return personalized
    
    def get_welcome_email_template(self) -> Dict[str, str]:
        """Get the default welcome email template for OpsVantage"""
        subject = "Welcome to OpsVantage Digital, {{first_name}}!"
        
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Welcome to OpsVantage Digital</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px 20px; }
                .cta-button { 
                    background: #2563eb; 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    display: inline-block; 
                    margin: 20px 0;
                }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to OpsVantage Digital!</h1>
                </div>
                <div class="content">
                    <h2>Hi {{first_name}},</h2>
                    <p>Thank you for joining OpsVantage Digital! We're excited to help you optimize your operations and drive growth.</p>
                    
                    <p>As a member of our community, you'll receive:</p>
                    <ul>
                        <li>📊 Industry insights and best practices</li>
                        <li>🚀 Digital transformation strategies</li>
                        <li>💡 Exclusive tips and resources</li>
                        <li>🎯 Personalized growth recommendations</li>
                    </ul>
                    
                    <p>Ready to get started? Check out our latest resources:</p>
                    <a href="https://opsvantage.com/resources" class="cta-button">Explore Resources</a>
                    
                    <p>If you have any questions, feel free to reach out to our team. We're here to help!</p>
                    
                    <p>Best regards,<br>
                    The OpsVantage Digital Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 OpsVantage Digital. All rights reserved.</p>
                    <p>You're receiving this email because you subscribed to our updates.</p>
                    <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="https://opsvantage.com">Visit our website</a></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = """
        Welcome to OpsVantage Digital!
        
        Hi {{first_name}},
        
        Thank you for joining OpsVantage Digital! We're excited to help you optimize your operations and drive growth.
        
        As a member of our community, you'll receive:
        - Industry insights and best practices
        - Digital transformation strategies  
        - Exclusive tips and resources
        - Personalized growth recommendations
        
        Ready to get started? Visit our resources at: https://opsvantage.com/resources
        
        If you have any questions, feel free to reach out to our team. We're here to help!
        
        Best regards,
        The OpsVantage Digital Team
        
        © 2024 OpsVantage Digital. All rights reserved.
        You're receiving this email because you subscribed to our updates.
        Unsubscribe: {{unsubscribe_url}} | Website: https://opsvantage.com
        """
        
        return {
            "subject": subject,
            "html_content": html_content,
            "text_content": text_content
        }
    
    def get_follow_up_email_template(self) -> Dict[str, str]:
        """Get a professional follow-up email template"""
        subject = "Following up on your interest, {{first_name}}"
        
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Follow Up - OpsVantage Digital</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px 20px; }
                .cta-button { 
                    background: #16a34a; 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    display: inline-block; 
                    margin: 20px 0;
                }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Let's Continue the Conversation</h1>
                </div>
                <div class="content">
                    <h2>Hi {{first_name}},</h2>
                    <p>I wanted to follow up on your recent interest in OpsVantage Digital's solutions.</p>
                    
                    <p>Many companies like {{company}} are looking for ways to:</p>
                    <ul>
                        <li>🔧 Streamline their operations</li>
                        <li>📈 Improve efficiency and productivity</li>
                        <li>💰 Reduce costs while scaling growth</li>
                        <li>⚡ Implement digital transformation strategies</li>
                    </ul>
                    
                    <p>I'd love to learn more about your specific challenges and see how we can help.</p>
                    
                    <a href="https://calendly.com/opsvantage/consultation" class="cta-button">Schedule a Free Consultation</a>
                    
                    <p>Or if you prefer, reply to this email with your availability and I'll work around your schedule.</p>
                    
                    <p>Looking forward to hearing from you!</p>
                    
                    <p>Best regards,<br>
                    The OpsVantage Digital Team</p>
                </div>
                <div class="footer">
                    <p>© 2024 OpsVantage Digital. All rights reserved.</p>
                    <p><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="https://opsvantage.com">Visit our website</a></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = """
        Let's Continue the Conversation
        
        Hi {{first_name}},
        
        I wanted to follow up on your recent interest in OpsVantage Digital's solutions.
        
        Many companies like {{company}} are looking for ways to:
        - Streamline their operations
        - Improve efficiency and productivity  
        - Reduce costs while scaling growth
        - Implement digital transformation strategies
        
        I'd love to learn more about your specific challenges and see how we can help.
        
        Schedule a free consultation: https://calendly.com/opsvantage/consultation
        
        Or if you prefer, reply to this email with your availability and I'll work around your schedule.
        
        Looking forward to hearing from you!
        
        Best regards,
        The OpsVantage Digital Team
        
        © 2024 OpsVantage Digital. All rights reserved.
        Unsubscribe: {{unsubscribe_url}} | Website: https://opsvantage.com
        """
        
        return {
            "subject": subject,
            "html_content": html_content,
            "text_content": text_content
        }

# Global email service instance
email_service = EmailService()
