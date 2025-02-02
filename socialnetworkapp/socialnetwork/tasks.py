import os

from celery import shared_task
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
from django.db import DatabaseError
from django.apps import apps
import logging

from socialnetwork.models import Teacher, BaseModel

# Logger for celery tasks
celery_logger = logging.getLogger('celery')


@shared_task
def lock_expired_teacher_accounts():
    try:
        celery_logger.info("Starting task: lock_expired_teacher_accounts")

        expired_teachers = Teacher.objects.filter(must_change_password=True, user__is_active=True)
        locked_count = 0

        for teacher in expired_teachers:
            try:
                if teacher.is_password_change_expired():
                    teacher.lock_account()
                    locked_count += 1
                    celery_logger.info(f"Locked account for teacher: {teacher.user.username}")

            except Exception as teacher_error:
                celery_logger.error(
                    f"Failed to lock account for teacher: {teacher.user.username}. "
                    f"Error: {str(teacher_error)}"
                )

        total_teachers = expired_teachers.count()
        celery_logger.info(f"Locked {locked_count} expired accounts out of {total_teachers} scanned.")
        return f"Locked {locked_count} expired accounts out of {total_teachers} scanned."

    except Exception as task_error:
        celery_logger.critical(
            f"Failed to execute task: lock_expired_teacher_accounts. "
            f"Error: {str(task_error)}"
        )
        raise



@shared_task
def delete_permanently_after_30_days():
    try:
        celery_logger.info("Starting task: delete_permanently_after_30_days")

        all_models = apps.get_models()
        thirty_days_ago = timezone.now() - timedelta(days=30)  # 30 days ago timestamp

        for model in all_models:
            if issubclass(model, BaseModel) and not model._meta.abstract:
                records_to_delete = model.objects.filter(
                    deleted_date__lte=thirty_days_ago,
                    active=False
                )

                record_count = records_to_delete.count()

                if record_count > 0:
                    records_to_delete.delete()
                    celery_logger.info(
                        f"Deleted {record_count} expired records from model {model.__name__}."
                    )
                else:
                    celery_logger.info(
                        f"No records to delete in model {model.__name__}."
                    )

    except DatabaseError as db_err:
        celery_logger.error(f"Database error during deletion: {str(db_err)}")

    except Exception as generic_error:
        celery_logger.error(f"An unexpected error occurred: {str(generic_error)}")

    celery_logger.info("Task completed: delete_permanently_after_30_days")


@shared_task
def send_email_async(subject, message, recipient_email):
    send_mail(
        subject=subject,
        message=message,
        from_email=os.getenv('EMAIL_SEND'),
        recipient_list=[recipient_email],
        fail_silently=False,
    )
    return f"Email sent to {recipient_email}"