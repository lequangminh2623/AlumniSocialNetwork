import json
import os
from encodings import search_function

from django.db import IntegrityError
from cloudinary.exceptions import Error
from cloudinary.uploader import upload
from django.db.models import Q
from django.shortcuts import render
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from sqlalchemy.sql.functions import current_user

from .tasks import send_email_async

from .models import Alumni, Teacher, Post, Comment, PostImage, SurveyPost, SurveyQuestion, SurveyOption, SurveyDraft, \
    UserSurveyOption, Reaction, Group, InvitationPost, User
from .perms import AdminPermission, OwnerPermission, AlumniPermission
from .serializers import AlumniSerializer, TeacherSerializer, ChangePasswordSerializer, PostSerializer, \
    PostImageSerializer, CommentSerializer, SurveyPostSerializer, UserSerializer, SurveyDraftSerializer, \
    ReactionSerializer, GroupSerializer, InvitationPostSerializer
from .paginators import Pagination
from django.core.mail import send_mail


def index(request):
    return render(request, template_name='index.html', context={
        'name': 'SocialMediaApp'
    })


# Create your views here.

class UserViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    class CustomPagination(PageNumberPagination):
        page_size = 10

    @action(methods=['get'], url_path='all-users', detail=False, permission_classes=[IsAuthenticated])
    def get_all_users(self, request):
        queryset = User.objects.filter(is_active=True)

        paginator = self.CustomPagination()
        paginated_queryset = paginator.paginate_queryset(queryset, request, view=self)

        serializer = UserSerializer(paginated_queryset, many=True)
        return paginator.get_paginated_response(serializer.data)


    @action(methods=['get'], url_path='current', detail=False)
    def get_current_user(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(methods=['patch'], url_path='change-password', detail=False)
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save(update_fields=['password'])

            # Nếu là giáo viên đổi mật khẩu lần đầu, sửa thuộc tính
            if hasattr(user, 'teacher') and user.teacher.must_change_password:
                teacher = user.teacher
                teacher.must_change_password = False
                teacher.password_reset_time = None
                teacher.save(update_fields=['must_change_password', 'password_reset_time'])

            return Response({"message": "Mật khẩu đã được thay đổi thành công."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PostImageViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = PostImage.objects.all()
    serializer_class = PostImageSerializer


class PostViewSet(viewsets.ViewSet, generics.RetrieveAPIView, generics.ListAPIView):
    queryset = Post.objects.filter(active=True)
    serializer_class = PostSerializer
    parser_classes = [JSONParser, MultiPartParser, ]

    def get_queryset(self):
        query = self.queryset
        q = self.request.query_params.get("q")
        current_user= self.request.query_params.get("current_user")
        if q:
            query = query.filter(content__icontains=q)
        if current_user:
            query = query.filter(user=current_user)
        return query

    @action(methods=['get'], url_path='my-posts', detail=False, permission_classes=[IsAuthenticated])
    def get_my_posts(self, request):
        posts = Post.objects.filter(user=request.user, active=True)
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        self.permission_classes = [IsAuthenticated]
        self.check_permissions(request)
        content = request.data.get('content')
        images = request.FILES.getlist('images')
        if not content:
            return Response({"message": f"Yêu cầu content."}, status=status.HTTP_400_BAD_REQUEST)
        post = Post.objects.create(content=content, user=request.user)

        for image in images:
            try:
                upload_result = upload(image, folder='MangXaHoi')
                image_url = upload_result.get('secure_url')
                PostImage.objects.create(post=post, image=image_url)
            except Error as e:
                return Response({"error": f"Lỗi đăng ảnh: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(post)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        post = get_object_or_404(Post, pk=pk, active=True)
        self.permission_classes = [OwnerPermission | AdminPermission]
        self.check_object_permissions(request, post)

        content = request.data.get('content')
        images = request.FILES.getlist('images')

        if content:
            post.content = content
            post.save(update_fields=['content'])

        PostImage.objects.filter(post=post).delete()
        if images:
            for image in images:
                try:
                    upload_result = upload(image, folder='MangXaHoi')
                    image_url = upload_result.get('secure_url')
                    PostImage.objects.create(post=post, image=image_url)
                except Error as e:
                    return Response({"error": f"Lỗi đăng ảnh: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
            post.save()
        serializer = self.get_serializer(post)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, pk=None):
        post = get_object_or_404(Post, pk=pk, active=True)
        self.permission_classes = [OwnerPermission | AdminPermission]
        self.check_object_permissions(request, post)
        post.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(methods=['post'], url_path='comment', detail=True, permission_classes=[IsAuthenticated])
    def create_comment(self, request, pk=None):
        post = get_object_or_404(Post, pk=pk, active=True)

        if post.lock_comment:
            return Response({"message": f"Bài viết đã khóa bình luận"}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get('content')
        image = request.FILES.get('image')

        image_url = None
        if image:
            try:
                upload_result = upload(image, folder='MangXaHoi')
                image_url = upload_result.get('secure_url')
            except Error as e:
                return Response({"error": f"Lỗi đăng ảnh: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        comment = Comment.objects.create(content=content, image=image_url, user=request.user, post=post)
        serializer = CommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(methods=['get'], url_path='comments', detail=True)
    def get_comments(self, request, pk=None):
        post = get_object_or_404(Post, id=pk, active=True)
        comments = Comment.objects.filter(post=post, active=True)

        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(methods=['post'], url_path='react', detail=True, permission_classes=[IsAuthenticated])
    def react_post(self, request, pk=None):
        post = get_object_or_404(Post, pk=pk, active=True)
        reaction_type = request.data.get("reaction")

        try:
            reaction = Reaction.objects.filter(user=request.user, post=post).first()
            if not reaction_type:
                if reaction:
                    reaction.delete()
                    return Response({"message": "Hủy react thành công."}, status=status.HTTP_200_OK)
                else:
                    Reaction.objects.create(user=request.user, post=post, reaction=1)
                    return Response({"message": "React thành công."}, status=status.HTTP_200_OK)
            else:
                if reaction:
                    reaction.reaction = int(reaction_type)
                    reaction.save()
                    return Response({"message": "React thành công."}, status=status.HTTP_200_OK)
                else:
                    Reaction.objects.create(user=request.user, post=post, reaction=int(reaction_type))
                    return Response({"message": "React thành công."}, status=status.HTTP_201_CREATED)

        except IntegrityError as e:
            return Response({"error": f"Lỗi khi thực hiện react: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['get'], url_path='reacts', detail=True)
    def get_reactions(self, request, pk=None):
        post = get_object_or_404(Post, id=pk, active=True)
        reactions = Reaction.objects.filter(post=post, active=True)
        serializer = ReactionSerializer(reactions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(methods=['patch'], url_path='lock-unlock-comment', detail=True)
    def lock_unlock_comments(self, request, pk=None):
        post = get_object_or_404(Post, pk=pk, active=True)
        self.permission_classes = [OwnerPermission | AdminPermission]
        self.check_object_permissions(request, post)
        post.lock_comment = not post.lock_comment
        post.save(update_fields=['lock_comment'])
        return Response({'message': 'Cập nhật trạng thái bình luận của bài đăng thành công.'},
                        status=status.HTTP_200_OK)


class CommentViewSet(viewsets.ViewSet):
    queryset = Comment.objects.filter(active=True)
    serializer_class = CommentSerializer
    parser_classes = [JSONParser, MultiPartParser, ]

    def update(self, request, pk=None):
        comment = get_object_or_404(Comment, id=pk, active=True)
        self.permission_classes = [OwnerPermission]
        self.check_object_permissions(request, comment)

        content = request.data.get('content', comment.content)
        image = request.FILES.get('image')

        if image:
            try:
                upload_result = upload(image, folder='MangXaHoi')
                image_url = upload_result.get('secure_url')
                comment.image = image_url
                comment.content = content
            except Error as e:
                return Response({"error": f"Lỗi đăng ảnh: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            comment.content = content
            comment.image = None
        comment.save(update_fields=['content', 'image'])
        return Response({'message': 'Chỉnh sửa bình luận thành công.'}, status=status.HTTP_200_OK)

    def destroy(self, request, pk=None):
        comment = get_object_or_404(Comment, id=pk, active=True)
        if comment.post.user == request.user or comment.user == request.user or request.user.role == 0:
            comment.soft_delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({'message': 'Bạn không có quyền xóa bình luận này.'}, status=status.HTTP_403_FORBIDDEN)

    @action(methods=['post'], detail=True, url_path='reply', permission_classes=[IsAuthenticated])
    def reply_comment(self, request, pk=None):
        comment = get_object_or_404(Comment, id=pk, active=True)

        if comment.post.lock_comment:
            return Response({'message': 'Bài viết này đã bị khóa bình luận.'}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get('content')
        image = request.FILES.get('image')

        image_url = None
        if image:
            try:
                upload_result = upload(image, folder='MangXaHoi')  # Upload ảnh lên Cloudinary
                image_url = upload_result.get('secure_url')
            except Exception as e:
                return Response({"error": f"Lỗi đăng ảnh: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        reply = Comment.objects.create(
            content=content,
            image=image_url,
            user=request.user,
            post=comment.post,
            parent=comment
        )

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

    @action(methods=['patch'], url_path='approve', detail=False, permission_classes=[AdminPermission])
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
        queryset = self.get_queryset()  # Lấy tất cả đối tượng Teachers
        expired_queryset = [teacher for teacher in queryset if teacher.is_password_change_expired()]  # Gọi hàm để lọc
        page = self.paginate_queryset(expired_queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(expired_queryset, many=True)
        return Response(serializer.data)

    @action(methods=['patch'], url_path='reset', detail=False)
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

    def create(self, request):
        self.permission_classes = [AdminPermission]
        self.check_permissions(request)

        content = request.data.get('content')
        images = request.FILES.getlist('images')
        survey_type = request.data.get('survey_type')
        end_time = request.data.get('end_time')
        questions_data = request.data.get('questions')

        # Parse the questions_data JSON string into a Python list of dictionaries
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
            except Error as e:
                return Response({"error": f"Lỗi đăng bài: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = SurveyPostSerializer(survey_post)

        for question_data in questions_data:
            options_data = question_data.pop('options', [])
            question = SurveyQuestion.objects.create(survey_post=survey_post, **question_data)
            for option_data in options_data:
                SurveyOption.objects.create(survey_question=question, **option_data)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        self.permission_classes = [OwnerPermission]
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
                except Error as e:
                    return Response({"error": f"Lỗi đăng ảnh: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
            survey_post.save()

        existing_questions = {q.id: q for q in survey_post.questions.all()}
        question_ids = [int(q.get('id')) for q in questions_data if q.get('id')]

        for question_data in questions_data:
            options_data = question_data.pop('options', [])
            question_id = question_data.get('id')
            if question_id and int(question_id) in existing_questions:
                question_instance = existing_questions[int(question_id)]
                for attr, value in question_data.items():
                    setattr(question_instance, attr, value)
                question_instance.save()
                existing_options = {o.id: o for o in question_instance.options.all()}
                option_ids = [int(o.get('id')) for o in options_data if o.get('id')]
                for option_data in options_data:
                    option_id = option_data.get('id')
                    if option_id and int(option_id) in existing_options:
                        option_instance = existing_options[int(option_id)]
                        for attr, value in option_data.items():
                            setattr(option_instance, attr, value)
                        option_instance.save()
                    else:
                        if 'id' in option_data:
                            del option_data['id']
                        SurveyOption.objects.create(survey_question=question_instance, **option_data)
                options_to_delete = set(existing_options.keys()) - set(option_ids)
                SurveyOption.objects.filter(id__in=options_to_delete).delete()
            else:
                if 'id' in question_data:
                    del question_data['id']
                new_question = SurveyQuestion.objects.create(survey_post=survey_post, **question_data)
                for option_data in options_data:
                    if 'id' in option_data:
                        del option_data['id']
                    SurveyOption.objects.create(survey_question=new_question, **option_data)

        questions_to_delete = set(existing_questions.keys()) - set(question_ids)
        SurveyQuestion.objects.filter(id__in=questions_to_delete).delete()

        serializer = SurveyPostSerializer(survey_post)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def retrieve(self, request, pk=None):
        survey_post = get_object_or_404(SurveyPost, pk=pk, active=True)
        questions = survey_post.questions.all()
        data = []
        for question in questions:
            options = question.options.all().values('id', 'option')
            data.append({
                'id': question.id,
                'question': question.question,
                'multi_choice': question.multi_choice,
                'options': list(options)
            })

        response_data = {
            'survey_type': survey_post.survey_type,
            'end_time': survey_post.end_time,
            'questions': data
        }

        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=True, url_path='draft', methods=['post'], permission_classes=[AlumniPermission])
    def draft(self, request, pk=None):
        self.check_permissions(request)

        existing_answers = UserSurveyOption.objects.filter(
            user=request.user, survey_option__survey_question__survey_post=pk
        )
        if existing_answers.exists():
            return Response(
                {"error": "You had completed this survey."}, status=status.HTTP_400_BAD_REQUEST
            )

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

            send_email_async.delay(
                subject='Nhắc nhở hoàn thành khảo sát',
                message=f"""
                        Chào {request.user.first_name},

                        Bạn đã lưu nháp một khảo sát: {survey_post.content}

                        Cảm ơn đã dành thời gian thực hiện!

                        Trân Trọng,
                        Đội ngũ Admin
                    """,
                recipient_email=request.user.email,
            )

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, url_path='resume', methods=['get'], permission_classes=[OwnerPermission])
    def resume_survey(self, request, pk=None):
        draft = SurveyDraft.objects.filter(survey_post_id=pk, user=request.user).first()

        has_completed = UserSurveyOption.objects.filter(user=request.user, survey_option__survey_question__survey_post=pk).exists()

        if not draft:
            return Response({
            "answers": None,
            "has_completed": has_completed
        }, status=status.HTTP_200_OK)

        self.check_object_permissions(request, draft)

        return Response({
            "answers": draft.answers,
            "has_completed": has_completed
        }, status=status.HTTP_200_OK)

    @action(detail=True, url_path='submit', methods=['post'], permission_classes=[AlumniPermission])
    def submit_survey(self, request, pk=None):
        self.check_permissions(request)
        data = request.data
        user = request.user
        survey_post = get_object_or_404(SurveyPost, pk=pk, active=True)
        answers = data.get('answers', {})

        # Kiểm tra nếu người dùng đã từng trả lời khảo sát này
        existing_answers = UserSurveyOption.objects.filter(user=user, survey_option__survey_question__survey_post=pk)
        if existing_answers.exists():
            return Response({"error": "You had completed this survey."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Lấy tất cả các câu hỏi của bài khảo sát
        required_question_ids = set(survey_post.questions.values_list('id', flat=True))
        answered_question_ids = set(int(question_id) for question_id in answers.keys())

        # Kiểm tra xem người dùng đã trả lời tất cả các câu hỏi chưa
        if required_question_ids - answered_question_ids:
            return Response({"error": "You must answer all questions."}, status=status.HTTP_400_BAD_REQUEST)

        for question_id, selected_option_ids in answers.items():
            for option_id in selected_option_ids:
                UserSurveyOption.objects.create(user=user, survey_option_id=option_id)

        # Xóa bản nháp nếu tồn tại
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



