import logging
from celery import shared_task
from .models import Teacher

logger = logging.getLogger(__name__)


@shared_task
def lock_expired_teacher_accounts():
    try:
        expired_teachers = Teacher.objects.filter(must_change_password=True, user__is_active=True)
        locked_count = 0

        for teacher in expired_teachers:
            try:
                if teacher.is_password_change_expired():
                    teacher.lock_account()
                    locked_count += 1
                    logger.info(f"Locked account for teacher: {teacher.user.username}")

            except Exception as e:
                logger.error(
                    f"Failed to lock account for teacher: {teacher.user.username}. Error: {str(e)}"
                )
        return f"Locked {locked_count} expired accounts out of {expired_teachers.count()} scanned."

    except Exception as e:
        logger.critical(f"Failed to execute task: lock_expired_teacher_accounts. Error: {str(e)}")
        raise
