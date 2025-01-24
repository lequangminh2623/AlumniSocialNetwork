from django.test import TestCase

# Create your tests here.
import os
import django

import socialnetwork

# Set the DJANGO_SETTINGS_MODULE environment variable to point to your settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'socialnetworkapp.settings')

django.setup()
t=socialnetwork.models.Teacher.objects.filter(id=3)
[teacher.soft_delete() for teacher in t]
