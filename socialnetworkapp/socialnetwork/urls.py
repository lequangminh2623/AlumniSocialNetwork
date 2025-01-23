from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('alumni', views.AlumniViewSet, basename='alumni')
router.register('teacher', views.TeacherViewSet, basename='teacher')
router.register('user', views.ChangePasswordView, basename='change-password')

urlpatterns = [
    path('', include(router.urls)),
]