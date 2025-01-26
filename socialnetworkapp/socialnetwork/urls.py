from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('alumni', views.AlumniViewSet, basename='alumni')
router.register('teacher', views.TeacherViewSet, basename='teacher')
router.register('user', views.UserViewSet, basename='user')
router.register('post', views.PostViewSet, basename='post')
router.register('comment', views.CommentViewSet, basename='comment')
router.register('reaction', views.ReactionViewSet, basename='reaction')
router.register('survey', views.SurveyPostViewSet, basename='survey')


urlpatterns = [
    path('', include(router.urls)),
]