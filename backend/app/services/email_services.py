
import os
import logging
import json
import urllib.request
import urllib.error
from html import escape

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def _send_email(to, subject, html):
    """
    Send an email using the Resend API.
    Returns True on success and False on failure.
    """

    api_key = os.getenv("RESEND_API_KEY")
    from_email = os.getenv("RESEND_FROM_EMAIL")

    if not api_key or not from_email:
        logger.warning("Resend email configuration is missing.")
        return False

    payload = {
        "from": from_email,
        "to": [to],
        "subject": subject,
        "html": html,
    }

    request = urllib.request.Request(
        RESEND_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return 200 <= response.status < 300

    except urllib.error.HTTPError as error:
        logger.error(
            "Resend API error: %s - %s",
            error.code,
            error.read().decode("utf-8", errors="replace"),
        )
        return False

    except Exception:
        logger.exception("Unable to send email.")
        return False


def send_contact_notification(message):
    """Notify the portfolio owner about a new contact submission."""

    recipient = os.getenv("CONTACT_NOTIFICATION_EMAIL")

    if not recipient:
        logger.warning("CONTACT_NOTIFICATION_EMAIL is not configured.")
        return False

    name = escape(str(message.get("name", "")))
    email = escape(str(message.get("email", "")))
    subject = escape(str(message.get("subject", "New contact message")))
    content = escape(str(message.get("message", ""))).replace("\n", "<br>")

    html = f"""
    <h2>New Portfolio Contact Message</h2>
    <p><strong>Name:</strong> {name}</p>
    <p><strong>Email:</strong> {email}</p>
    <p><strong>Subject:</strong> {subject}</p>
    <hr>
    <p>{content}</p>
    """

    return _send_email(
        recipient,
        f"Portfolio Contact: {subject}",
        html,
    )


def send_auto_reply(message):
    """Send an acknowledgement to the person who submitted the form."""

    recipient = message.get("email")

    if not recipient:
        return False

    name = escape(str(message.get("name", "there")))

    html = f"""
    <h2>Thank you for reaching out!</h2>
    <p>Hello {name},</p>
    <p>Thank you for contacting me through my portfolio.</p>
    <p>Your message has been received successfully. I will
    review it and get back to you as soon as possible.</p>
    <p>Best regards,<br>Victor Macharia</p>
    """

    return _send_email(
        recipient,
        "Thank you for contacting me",
        html,
    )
