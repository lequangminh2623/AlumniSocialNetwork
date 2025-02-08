import json
from cloudinary.uploader import upload
from django.db.models import Q
from django.shortcuts import render
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action, permission_classes
from rest_framework.generics import get_object_or_404
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .tasks import send_email_async
from .models import Alumni, Teacher, Post, Comment, PostImage, SurveyPost, SurveyQuestion, SurveyOption, SurveyDraft, \
    UserSurveyOption, Reaction, Group, InvitationPost, User
from .perms import AdminPermission, OwnerPermission, AlumniPermission, CommentDeletePermission
from .serializers import AlumniSerializer, TeacherSerializer, ChangePasswordSerializer, PostSerializer, \
    CommentSerializer, SurveyPostSerializer, UserSerializer, SurveyDraftSerializer, \
    ReactionSerializer, GroupSerializer, InvitationPostSerializer
from .paginators import Pagination


def index(request):
    return render(request, template_name='index.html', context={
        'name': 'SocialMediaApp'
    })


# Create your views here.

class UserViewSet(viewsets.ViewSet):
    def get_permissions(self):
        if self.action in ["change_password", "get_current_user"]:
            return [OwnerPermission()]
        return [IsAuthenticated()]

    class CustomPagination(PageNumberPagination):
        page_size = 10

    @action(methods=['get'], url_path='all-users', detail=False)
    def get_all_users(self, request):
        self.check_permissions(request)
        queryset = User.objects.filter(is_active=True)

        paginator = self.CustomPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request, view=self)

        serializer = UserSerializer(paginated_queryset, many=True)
        return paginator.get_paginated_response(serializer.data)

    @action(methods=['get'], url_path='current', detail=False)
    def get_current_user(self, request):
        user = request.user
        self.check_object_permissions(request, user)
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(methods=['patch'], url_path='change-password', detail=False)
    def change_password(self, request):
        user = request.user
        self.check_object_permissions(request, user)

        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user.set_password(serializer.validated_data['new_password'])
            user.save(update_fields=['password'])

            if hasattr(user, 'teacher') and user.teacher.must_change_password:
                teacher = user.teacher
                teacher.must_change_password = False
                teacher.password_reset_time = None
                teacher.save(update_fields=['must_change_password', 'password_reset_time'])

            return Response({"message": "Mật khẩu đã được thay đổi thành công."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PostViewSet(viewsets.ViewSet, generics.RetrieveAPIView, generics.ListAPIView):
    queryset = Post.objects.filter(active=True)
    serializer_class = PostSerializer
    parser_classes = [JSONParser, MultiPartParser]

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated()]
        elif self.action in ["update", "destroy", "lock_unlock_comments"]:
            return [OwnerPermission(), AdminPermission()]
        return super().get_permissions()

    @action(methods=['get'], url_path='my-posts', detail=False)
    def get_my_posts(self, request):
        self.check_permissions(request)
        posts = Post.objects.filter(user=request.user, active=True)
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(methods=['post'], url_path='comment', detail=True)
    def create_comment(self, request, pk=None):
        self.check_permissions(request)
        post = get_object_or_404(Post, pk=pk, active=True)

        if post.lock_comment:
            return Response({"message": "Bài viết đã khóa bình luận"}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get('content')
        image = request.FILES.get('image')

        image_url = None
        if image:
            try:
                upload_result = upload(image, folder='MangXaHoi')
                image_url = upload_result.get('secure_url')
            except Exception as e:
                return Response({"error": f"Lỗi đăng ảnh: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        comment = Comment.objects.create(content=content, image=image_url, user=request.user, post=post)
        serializer = CommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(methods=['patch'], url_path='lock-unlock-comment', detail=True)
    def lock_unlock_comments(self, request, pk=None):
        post = get_object_or_404(Post, pk=pk, active=True)
        self.check_object_permissions(request, post)
        post.lock_comment = not post.lock_comment
        post.save(update_fields=['lock_comment'])
        return Response({'message': 'Cập nhật trạng thái bình luận thành công.'}, status=status.HTTP_200_OK)


class CommentViewSet(viewsets.ViewSet):
    queryset = Comment.objects.filter(active=True)
    serializer_class = CommentSerializer
    parser_classes = [JSONParser, MultiPartParser]

    def get_permissions(self):
        if self.action == "update":
            return [OwnerPermission()]
        elif self.action == "destroy":
            return [CommentDeletePermission()]
        return super().get_permissions()

    def update(self, request, pk=None):
        comment = get_object_or_404(Comment, id=pk, active=True)
        self.check_object_permissions(request, comment)

        content = request.data.get('content', comment.content)
        image = request.FILES.get('image')

        try:
            if image:
                upload_result = upload(image, folder='MangXaHoi')
                comment.image = upload_result.get('secure_url')
            else:
                comment.image = None
            comment.content = content
            comment.save(update_fields=['content', 'image'])
        except Exception as e:
            return Response({"error": f"Lỗi đăng ảnh: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': 'Chỉnh sửa bình luận thành công.'}, status=status.HTTP_200_OK)

    def destroy(self, request, pk=None):
        comment = get_object_or_404(Comment, id=pk, active=True)
        self.check_object_permissions(request, comment)
        comment.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(methods=['post'], detail=True, url_path='reply')
    def reply_comment(self, request, pk=None):
        self.check_permissions(request)
        comment = get_object_or_404(Comment, id=pk, active=True)

        if comment.post.lock_comment:
            return Response({'message': 'Bài viết này đã bị khóa bình luận.'}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get('content')
        image = request.FILES.get('image')

        image_url = None
        if image:
            try:
                upload_result = upload(image, folder='MangXaHoi')
                image_url = upload_result.get('secure_url')
            except Exception as e:
                return Response({"error": f"Lỗi đăng ảnh: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        reply = Comment.objects.create(content=content, image=image_url, user=request.user, post=comment.post,
                                       parent=comment)

        serializer = CommentSerializer(reply)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ReactionViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = Reaction.objects.filter(active=True)
    serializer_class = ReactionSerializer


class AlumniViewSet(viewsets.ViewSet, generics.CreateAPIView):
    queryset = Alumni.objects.select_related('user')
    serializer_class = AlumniSerializer
    pagination_class = Pagination
    parser_classes = [JSONParser, MultiPartParser, ]

    def get_queryset(self):
        query = self.queryset
        q = self.request.query_params.get("search")
        if q:
            query = query.filter(Q(user__first_name__icontains=q) | Q(user__last_name__icontains=q))
        return query

    @action(methods=['get'], url_path='unverified', detail=False, permission_classes=[AdminPermission])
    def unverified_alumni(self, request):
        queryset = self.get_queryset().filter(is_verified=False)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)

    @action(methods=['post'], url_path='approve', detail=False, permission_classes=[AdminPermission])
    def approve_alumni_bulk(self, request):
        pks = request.data.get('pks', [])
        alumni_list = Alumni.objects.filter(pk__in=pks, is_verified=False)

        for alumni in alumni_list:
            alumni.is_verified = True
            alumni.user.is_active = True
            alumni.save(update_fields=['is_verified'])
            alumni.user.save(update_fields=['is_active'])

            send_email_async.delay(
                subject='Thông báo duyệt tài khoản',
                message=f"""
                    Chào {alumni.user.first_name},

                    Tài khoản cựu sinh viên của bạn đã được duyệt.

                    Trân trọng,
                    Đội ngũ Admin
                """,
                recipient_email=alumni.user.email,
            )

        return Response({"message": "Duyệt tài khoản thành công.", "alumni_ids": pks}, status=status.HTTP_200_OK)

    @action(methods=['delete'], url_path='reject', detail=False, permission_classes=[AdminPermission])
    def reject_alumni_bulk(self, request):
        pks = request.data.get('pks', [])
        alumni_list = Alumni.objects.filter(pk__in=pks, is_verified=False)

        for alumni in alumni_list:
            alumni.user.delete()
            alumni.delete()

        return Response({"message": "Đã từ chối các tài khoản.", "alumni_ids": pks}, status=status.HTTP_200_OK)


class TeacherViewSet(viewsets.ViewSet, generics.CreateAPIView):
    queryset = Teacher.objects.select_related('user')
    serializer_class = TeacherSerializer
    pagination_class = Pagination
    parser_classes = [JSONParser, MultiPartParser, ]
    permission_classes = [AdminPermission]

    def get_queryset(self):
        query = self.queryset
        q = self.request.query_params.get("search")
        if q:
            query = query.filter(Q(user__first_name__icontains=q) | Q(user__last_name__icontains=q))
        return query

    @action(methods=['get'], url_path='expired', detail=False)
    def expired_password_teachers(self, request):
        queryset = self.get_queryset()
        expired_queryset = [teacher for teacher in queryset if teacher.is_password_change_expired()]
        page = self.paginate_queryset(expired_queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(expired_queryset, many=True)
        return Response(serializer.data)

    @action(methods=['post'], url_path='reset', detail=False)
    def reset_password_time_bulk(self, request):
        pks = request.data.get('pks', [])
        teachers = Teacher.objects.filter(pk__in=pks)

        for teacher in teachers:
            if teacher.must_change_password and teacher.is_password_change_expired():
                teacher.unlock_account()
                # Gửi email thông báo
                send_email_async.delay(
                    subject='Thông báo gia hạn thời gian đổi mật khẩu',
                    message=f"""
                        Chào {teacher.user.first_name},

                        Tài khoản giảng viên của bạn đã được gia hạn thời gian đổi mật khẩu.

                        Trân trọng,
                        Đội ngũ Admin
                    """,
                    recipient_email=teacher.user.email,
                )

        return Response({"message": "Đã đặt lại thời gian cho các giáo viên được chọn."}, status=status.HTTP_200_OK)


class SurveyPostViewSet(viewsets.ViewSet):
    queryset = SurveyPost.objects.filter(active=True)
    serializer_class = SurveyPostSerializer
    parser_classes = [JSONParser, MultiPartParser]

    def get_permissions(self):
        if self.action == "create":
            return [AdminPermission()]
        elif self.action == "update":
            return [OwnerPermission()]
        elif self.action in ["draft", "submit_survey"]:
            return [AlumniPermission()]
        elif self.action == "resume_survey":
            return [OwnerPermission()]
        return super().get_permissions()

    def create(self, request):
        self.check_permissions(request)
        content = request.data.get('content')
        images = request.FILES.getlist('images')
        survey_type = request.data.get('survey_type')
        end_time = request.data.get('end_time')
        questions_data = request.data.get('questions')

        try:
            questions_data = json.loads(questions_data)
        except json.JSONDecodeError as e:
            return Response({"error": f"Lỗi phân tích cú pháp JSON: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        survey_post = SurveyPost.objects.create(content=content, user=request.user, survey_type=survey_type,
                                                end_time=end_time)

        for image in images:
            try:
                upload_result = upload(image, folder='MangXaHoi')
                image_url = upload_result.get('secure_url')
                PostImage.objects.create(post=survey_post, image=image_url)
            except Exception as e:
                return Response({"error": f"Lỗi đăng ảnh: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(survey_post)

        for question_data in questions_data:
            options_data = question_data.pop('options', [])
            question = SurveyQuestion.objects.create(survey_post=survey_post, **question_data)
            for option_data in options_data:
                SurveyOption.objects.create(survey_question=question, **option_data)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        survey_post = get_object_or_404(SurveyPost, pk=pk, active=True)
        self.check_object_permissions(request, survey_post)

        content = request.data.get('content', survey_post.content)
        images = request.FILES.getlist('images')
        survey_type = request.data.get('survey_type', survey_post.survey_type)
        end_time = request.data.get('end_time', survey_post.end_time)
        questions_data = request.data.get('questions', [])

        if isinstance(questions_data, str):
            questions_data = json.loads(questions_data)

        if not isinstance(questions_data, list):
            questions_data = []

        survey_post.content = content
        survey_post.survey_type = survey_type
        survey_post.end_time = end_time
        survey_post.save()

        PostImage.objects.filter(post=survey_post).delete()
        if images:
            for image in images:
                try:
                    upload_result = upload(image, folder='MangXaHoi')
                    image_url = upload_result.get('secure_url')
                    PostImage.objects.create(post=survey_post, image=image_url)
                except Exception as e:
                    return Response({"error": f"Lỗi đăng ảnh: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = SurveyPostSerializer(survey_post)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, url_path='draft', methods=['post'])
    def draft(self, request, pk=None):
        self.check_permissions(request)
        existing_answers = UserSurveyOption.objects.filter(
            user=request.user, survey_option__survey_question__survey_post=pk
        )
        if existing_answers.exists():
            return Response({"error": "You had completed this survey."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        survey_post = get_object_or_404(SurveyPost, pk=pk, active=True)
        answers = data.get('answers', {})

        formatted_answers = [{'question_id': key, 'selected_options': value} for key, value in answers.items()]

        draft_instance = SurveyDraft.objects.filter(survey_post=survey_post, user=request.user).first()

        if draft_instance:
            draft_instance.answers = formatted_answers
            draft_instance.save(update_fields=['answers'])
            serializer = SurveyDraftSerializer(draft_instance)
            return Response(serializer.data, status=status.HTTP_200_OK)

        draft_data = {
            'survey_post': survey_post.id,
            'user': request.user.id,
            'answers': formatted_answers
        }

        serializer = SurveyDraftSerializer(data=draft_data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, url_path='resume', methods=['get'])
    def resume_survey(self, request, pk=None):
        draft = SurveyDraft.objects.filter(survey_post_id=pk, user=request.user).first()

        has_completed = UserSurveyOption.objects.filter(user=request.user,
                                                        survey_option__survey_question__survey_post=pk).exists()

        if not draft:
            return Response({"answers": None, "has_completed": has_completed}, status=status.HTTP_200_OK)

        self.check_object_permissions(request, draft)

        return Response({"answers": draft.answers, "has_completed": has_completed}, status=status.HTTP_200_OK)

    @action(detail=True, url_path='submit', methods=['post'])
    def submit_survey(self, request, pk=None):
        self.check_permissions(request)
        data = request.data
        user = request.user
        survey_post = get_object_or_404(SurveyPost, pk=pk, active=True)
        answers = data.get('answers', {})

        existing_answers = UserSurveyOption.objects.filter(user=user, survey_option__survey_question__survey_post=pk)
        if existing_answers.exists():
            return Response({"error": "You had completed this survey."}, status=status.HTTP_400_BAD_REQUEST)

        required_question_ids = set(survey_post.questions.values_list('id', flat=True))
        answered_question_ids = set(int(question_id) for question_id in answers.keys())

        if required_question_ids - answered_question_ids:
            return Response({"error": "You must answer all questions."}, status=status.HTTP_400_BAD_REQUEST)

        for question_id, selected_option_ids in answers.items():
            for option_id in selected_option_ids:
                UserSurveyOption.objects.create(user=user, survey_option_id=option_id)

        SurveyDraft.objects.filter(user=user, survey_post=survey_post).delete()

        return Response({"message": "Survey submitted successfully."}, status=status.HTTP_201_CREATED)


class GroupViewSet(viewsets.ViewSet, generics.ListAPIView, generics.CreateAPIView,
                   generics.RetrieveAPIView, generics.DestroyAPIView, generics.UpdateAPIView):
    queryset = Group.objects.filter(active=True)
    serializer_class = GroupSerializer
    permission_classes = [AdminPermission]


class InvitationPostViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView):
    queryset = InvitationPost.objects.all()
    serializer_class = InvitationPostSerializer
    permission_classes = [AdminPermission]

    def create(self, request):

        event_name = request.data.get('event_name')
        content = request.data.get('content')
        users = request.data.get('users', [])
        groups = request.data.get('groups', [])
        images = request.FILES.getlist('images')

        if not event_name:
            return Response({"error": "event_name is required."}, status=status.HTTP_400_BAD_REQUEST)

        if not content:
            return Response({"error": "content is required."}, status=status.HTTP_400_BAD_REQUEST)

        invitation_post = InvitationPost.objects.create(content=content, user=request.user, event_name=event_name)

        if images:
            for image in images:
                upload_result = upload(image, folder='MangXaHoi')
                image_url = upload_result.get('secure_url')
                PostImage.objects.create(post=invitation_post, image=image_url)

        if users:
            for user_id in users:
                user = get_object_or_404(User, id=user_id, is_active=True)
                invitation_post.users.add(user)
                send_email_async.delay(
                    subject=f"Lời mời tham gia sự kiện: {invitation_post.event_name}",
                    message=f"""Xin chào,

                                Bạn được mời tham gia sự kiện '{invitation_post.event_name}' trên nền tảng của chúng tôi.
                                Nội dung sự kiện: {invitation_post.content}

                                Trân trọng,
                                Đội ngũ Admin.
                            """,
                    recipient_email=user.email
                )

        if groups:
            for group_id in groups:
                group = get_object_or_404(Group, id=group_id, active=True)
                invitation_post.groups.add(group)
                for user in group.users.filter(is_active=True):
                    send_email_async.delay(
                        subject=f"Lời mời tham gia sự kiện: {invitation_post.event_name}",
                        message=f"""Xin chào,

                                    Bạn được mời tham gia sự kiện '{invitation_post.event_name}' trên nền tảng của chúng tôi.
                                    Nội dung sự kiện: {invitation_post.content}

                                    Trân trọng,
                                    Đội ngũ Admin.
                                """,
                        recipient_email=user.email
                    )

        serializer = InvitationPostSerializer(invitation_post)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        invitation_post = get_object_or_404(InvitationPost, pk=pk, user=request.user, active=True)

        event_name = request.data.get('event_name')
        content = request.data.get('content')
        users = request.data.get('users', [])
        groups = request.data.get('groups', [])
        images = request.FILES.getlist('images')

        if event_name:
            invitation_post.event_name = event_name
            invitation_post.save(update_fields=['event_name'])

        if content:
            invitation_post.content = content
            invitation_post.save(update_fields=['content'])

        invitation_post.images.all().delete()
        if images:
            for image in images:
                upload_result = upload(image, folder='MangXaHoi')
                image_url = upload_result.get('secure_url')
                PostImage.objects.create(post=invitation_post, image=image_url)
            invitation_post.save()

        invitation_post.users.clear()
        if users:
            for user_id in users:
                user = get_object_or_404(User, id=user_id, is_active=True)
                invitation_post.users.add(user)
                send_email_async.delay(
                    subject=f"Lời mời tham gia sự kiện: {invitation_post.event_name}",
                    message=f"""Xin chào,

                                Bạn được mời tham gia sự kiện '{invitation_post.event_name}' trên nền tảng của chúng tôi.
                                Nội dung sự kiện: {invitation_post.content}

                                Trân trọng,
                                Đội ngũ Admin.
                            """,
                    recipient_email=user.email
                )
            invitation_post.save()

        invitation_post.groups.clear()
        if groups:
            for group_id in groups:
                group = get_object_or_404(Group, id=group_id, active=True)
                invitation_post.groups.add(group)
                for user in group.users.filter(is_active=True):
                    send_email_async.delay(
                        subject=f"Lời mời tham gia sự kiện: {invitation_post.event_name}",
                        message=f"""Xin chào,

                                    Bạn được mời tham gia sự kiện '{invitation_post.event_name}' trên nền tảng của chúng tôi.
                                    Nội dung sự kiện: {invitation_post.content}
    
                                    Trân trọng,
                                    Đội ngũ Admin.
                                """,
                        recipient_email=user.email
                    )
            invitation_post.save()

        serializer = InvitationPostSerializer(invitation_post)
        return Response(serializer.data, status=status.HTTP_200_OK)
