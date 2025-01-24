import os
from django.shortcuts import render
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action, permission_classes
from rest_framework.generics import get_object_or_404, ListAPIView, RetrieveAPIView
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.response import Response

from .models import Alumni, Teacher, Post, Comment, Reaction, PostImage, SurveyPost, SurveyQuestion, SurveyOption
from .perms import AdminPermission, OwnerPermission
from .serializers import AlumniSerializer, TeacherSerializer, ChangePasswordSerializer, PostSerializer, \
    PostImageSerializer, CommentSerializer, SurveyPostSerializer, SurveyQuestionSerializer, SurveyOptionSerializer, \
    UserSerializer
from .paginators import Pagination
from django.core.mail import send_mail


def index(request):
    return render(request, template_name='index.html', context={
        'name':'SocialMediaApp'
    })

# Create your views here.

class UserViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(methods=['get'], url_path='current-user', detail=False)
    def get_current_user(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(methods=['patch'],url_path='change-password', detail=False, permission_classes=[OwnerPermission])
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()

            # Nếu là giáo viên đổi mật khẩu lần đầu, sửa thuộc tính
            if hasattr(user, 'teacher') and user.teacher.must_change_password:
                teacher = user.teacher
                teacher.must_change_password = False
                teacher.password_reset_time = None
                teacher.save()

            return Response({"message": "Mật khẩu đã được thay đổi thành công."},
                            status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PostImageViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = PostImage.objects.all()
    serializer_class = PostImageSerializer


class PostViewSet(viewsets.ViewSet, generics.RetrieveAPIView, generics.ListAPIView, generics.DestroyAPIView):
    queryset = Post.objects.filter(active=True)
    serializer_class = PostSerializer

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [IsAuthenticated]
        elif self.action == 'destroy':
            permission_classes = [OwnerPermission, AdminPermission]
        elif self.action == 'partial_update':
            permission_classes = [OwnerPermission]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

    def create(self, request):
        content = request.data.get('content')
        images = request.FILES.getlist('images')
        post = Post.objects.create(content=content, user=request.user)

        for image in images:
            PostImage.objects.create(post=post, image=image)
        serializer = self.get_serializer(post)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(methods=['post'], url_path='comment', detail=True, permission_classes=[IsAuthenticated])
    def create_comment(self, request, pk=None):
        post = get_object_or_404(Post, pk=pk)

        serializer = CommentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user, post=post)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['get'], url_path='comments', detail=True)
    def get_comments(self, request, post_pk=None):
        try:
            post = Post.objects.get(pk=post_pk)
        except Post.DoesNotExist:
            return Response({"detail": "Post not found."}, status=status.HTTP_404_NOT_FOUND)

        queryset = self.queryset.filter(post=post)
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(methods=['patch'], url_path='lock-unlock-comment', detail=True, permission_classes = [IsAuthenticated])
    def lock_unlock_comments(self, request, pk=None):
        post = get_object_or_404(Post, pk=pk, user=request.user)
        post.lock_comment = not post.lock_comment
        post.save()
        return Response({'message': 'Cập nhật trạng thái bình luận của bài đăng thành công.'})


class CommentViewSet(viewsets.ViewSet, generics.ListAPIView, generics.DestroyAPIView):
    queryset = Comment.objects.filter(active=True)
    serializer_class = CommentSerializer

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [IsAuthenticated]
        elif self.action == 'destroy':
            permission_classes = [OwnerPermission, AdminPermission]
        elif self.action == 'partial_update':
            permission_classes = [OwnerPermission]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

    def update(self, request, pk=None):
        comment = get_object_or_404(Comment, id=pk, user=request.user)
        serializer = CommentSerializer(comment, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Chỉnh sửa bình luận thành công.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['post'], detail=True, url_path='reply-comment', permission_classes=[IsAuthenticated])
    def reply_comment(self, request, pk=None):
        comment = get_object_or_404(Comment, id=pk)
        serializer = CommentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user, post=comment.post, parent=comment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# class ReactionViewSet(viewsets.ViewSet, generics.CreateAPIView):
#     queryset = Reaction.objects.all()
#     serializer_class = ReactionSerializer
#     permission_classes = [IsAuthenticated]


class AlumniViewSet(viewsets.ViewSet, generics.CreateAPIView):
    queryset = Alumni.objects.select_related('user')
    serializer_class = AlumniSerializer
    pagination_class = Pagination
    parser_classes = [JSONParser, MultiPartParser, ]

    @action(methods=['get'], url_path='unverified-alumnis', detail=False, permission_classes=[AdminPermission])
    def unverified_alumni(self, request):
        queryset = self.queryset.filter(is_verified=False)
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)

    @action(methods=['patch'], url_path='approve-alumni', detail=True, permission_classes=[AdminPermission])
    def approve_alumni(self, request, pk=None):
        alumni = get_object_or_404(Alumni, pk=pk)

        if alumni.is_verified:
            return Response({"error": "Tài khoản này đã được duyệt."},
                            status=status.HTTP_400_BAD_REQUEST)

        alumni.is_verified = True
        alumni.save()
        send_mail(
            subject='Thông báo duyệt tài khoản',
            message=f"""
                Chào {alumni.user.first_name},
        
                Tài khoản cựu sinh viên của bạn đã được duyệt.
        
                Trân Trọng,
                Đội ngũ Admin
            """,
            from_email=os.getenv('EMAIL_SEND'),
            recipient_list=[alumni.user.email],
            fail_silently=False,
        )

        return Response(
            {"message": "Duyệt tài khoản thành công.", "alumni_id": alumni.id},
            status=status.HTTP_200_OK
        )


class TeacherViewSet(viewsets.ViewSet, generics.CreateAPIView):
    queryset = Teacher.objects.select_related('user')
    serializer_class = TeacherSerializer
    pagination_class = Pagination
    parser_classes = [JSONParser, MultiPartParser, ]
    permission_classes = [AdminPermission]

    @action(methods=['get'], url_path='expired-teacher', detail=False)
    def expired_password_teachers(self, request):
        expired_teachers = [teacher for teacher in self.queryset if teacher.is_password_change_expired() == True]
        serializer = self.serializer_class(expired_teachers, many=True)
        return Response(serializer.data)

    @action(methods=['patch'], url_path='reset-password-timer', detail=True)
    def reset_password_time(self, request, pk=None):
        teacher = get_object_or_404(Teacher, pk=pk)

        if teacher.must_change_password == True and teacher.is_password_change_expired() == True:
            teacher.unlock_account()

            # Gửi email thông báo
            send_mail(
                subject='Thông báo gia hạn thời gian đổi mật khẩu',
                message=f"""
                    Chào {teacher.user.first_name},
            
                    Tài khoản giảng viên của bạn đã được gia hạn thời gian đổi mật khẩu.
            
                    Trân Trọng,
                    Đội ngũ Admin
                """,
                from_email=os.getenv('EMAIL_SEND'),
                recipient_list=[teacher.user.email],
                fail_silently=False,
            )

            return Response({
                "message": f"Thời gian đổi mật khẩu đã được đặt lại cho {teacher.user.username}."
            }, status=status.HTTP_200_OK)

        return Response(
            {"message": f"Tài khoản {teacher.user.username} đã đổi mật khẩu hoặc chưa hết thời gian đổi mật khẩu."},
            status=status.HTTP_400_BAD_REQUEST
        )


class SurveyPostViewSet(viewsets.ViewSet, RetrieveAPIView):
    queryset = SurveyPost.objects.filter(active=True)
    serializer_class = SurveyPostSerializer

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [IsAuthenticated]
        elif self.action == 'partial_update':
            permission_classes = [OwnerPermission]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

    def create(self, request):
        serializer = SurveyPostSerializer(data=request.data)
        if serializer.is_valid():
            survey_post = serializer.save()

            images = request.data.get('images', [])
            questions = request.data.get('questions', [])

            for image in images:
                PostImage.objects.create(post=survey_post, image=image)

            for question in questions:
                survey_question = SurveyQuestion.objects.create(survey_post=survey_post, **question)
                for option in question.get('options', []):
                    SurveyOption.objects.create(survey_question=survey_question, **option)

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        try:
            survey_post = SurveyPost.objects.get(pk=pk)
        except SurveyPost.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = SurveyPostSerializer(survey_post, data=request.data)
        if serializer.is_valid():
            survey_post = serializer.save()

            images = request.data.get('images', [])
            questions = request.data.get('questions', [])

            PostImage.objects.filter(post=survey_post).delete()
            SurveyQuestion.objects.filter(survey_post=survey_post).delete()
            SurveyOption.objects.filter(survey_question__survey_post=survey_post).delete()

            for image in images:
                PostImage.objects.create(post=survey_post, image=image)

            for question_data in questions:
                question = SurveyQuestion.objects.create(survey_post=survey_post, **question_data)
                for option_data in question_data.get('options', []):
                    SurveyOption.objects.create(survey_question=question, **option_data)

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)