import httpx
import logging
import base64
from typing import Tuple, Optional
from app.models import CarrierConfig

logger = logging.getLogger("twilio_service")

class CarrierService:

    @classmethod
    async def send_sms(
        cls,
        config: Optional[CarrierConfig],
        from_number: str,
        to_number: str,
        body: str
    ) -> Tuple[bool, str]:
        """
        Sends an SMS message through Twilio REST API if configured,
        or accepts and simulates delivery if in dev mode.
        """
        if not config or not config.enabled or not config.account_sid or not config.auth_token:
            logger.info(f"Carrier not enabled; simulated SMS dispatch from {from_number} to {to_number}")
            return True, "Simulated dispatch (Carrier credentials not configured in Settings)"

        url = f"https://api.twilio.com/2010-04-01/Accounts/{config.account_sid}/Messages.json"
        auth = (config.account_sid, config.auth_token)
        data = {
            "From": from_number,
            "To": to_number,
            "Body": body
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, data=data, auth=auth)
                if res.status_code in (200, 201):
                    msg_data = res.json()
                    return True, msg_data.get("sid", "sent")
                else:
                    return False, f"Twilio API Error {res.status_code}: {res.text}"
        except Exception as e:
            logger.error(f"Failed to send SMS via Twilio: {e}")
            return False, str(e)

    @classmethod
    async def make_call(
        cls,
        config: Optional[CarrierConfig],
        from_number: str,
        to_number: str,
        twiml_url: str
    ) -> Tuple[bool, str]:
        """
        Initiates an outbound voice call through Twilio.
        """
        if not config or not config.enabled or not config.account_sid or not config.auth_token:
            logger.info(f"Carrier not enabled; simulated outbound call to {to_number}")
            return True, "simulated_call_sid"

        url = f"https://api.twilio.com/2010-04-01/Accounts/{config.account_sid}/Calls.json"
        auth = (config.account_sid, config.auth_token)
        data = {
            "From": from_number,
            "To": to_number,
            "Url": twiml_url
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, data=data, auth=auth)
                if res.status_code in (200, 201):
                    call_data = res.json()
                    return True, call_data.get("sid", "call_initiated")
                else:
                    return False, f"Twilio Call Error {res.status_code}: {res.text}"
        except Exception as e:
            logger.error(f"Failed to place call: {e}")
            return False, str(e)

    @classmethod
    def generate_twiml_stream(cls, stream_url: str, greeting: str = "Hello, connecting you to an AI agent.") -> str:
        """
        Generates standard TwiML containing <Say> and <Connect><Stream> for bi-directional audio.
        """
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">{greeting}</Say>
    <Connect>
        <Stream url="{stream_url}" />
    </Connect>
</Response>"""
