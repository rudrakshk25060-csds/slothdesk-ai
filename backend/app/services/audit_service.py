import logging
from sqlalchemy.orm import Session
from app.models import Activity

logger = logging.getLogger(__name__)

class AuditService:
    @staticmethod
    def log(
        db: Session,
        action_type: str,
        title: str,
        details: str = "",
        status: str = "success"
    ) -> Activity:
        """
        Records an audit entry. Never logs raw sensitive document contents.
        """
        try:
            entry = Activity(
                action_type=action_type,
                title=title[:255],
                details=details[:500],
                status=status
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            return entry
        except Exception as e:
            logger.error(f"Failed to record audit activity: {e}")
            db.rollback()
            return None

audit_service = AuditService()
