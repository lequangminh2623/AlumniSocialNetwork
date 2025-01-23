from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('user', views.UserViewSet, basename='user')
router.register('alumni', views.AlumniViewSet, basename='alumni')
router.register('teacher', views.TeacherViewSet, basename='teacher')

urlpatterns = [
    path('', include(router.urls)),
]