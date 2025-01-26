import os
from django.db import IntegrityError
from cloudinary.exceptions import Error
from cloudinary.uploader import upload
from django.shortcuts import render
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action, permission_classes
from rest_framework.generics import get_object_or_404
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import Alumni, Teacher, Post, Comment, PostImage, SurveyPost, SurveyQuestion, SurveyOption, SurveyDraft, \
    UserSurveyOption, Reaction
from .perms import AdminPermission, OwnerPermission, AlumniPermission
from .serializers import AlumniSerializer, TeacherSerializer, ChangePasswordSerializer, PostSerializer, \
    PostImageSerializer, CommentSerializer, SurveyPostSerializer, UserSerializer, SurveyDraftSerializer, ReactionSerializer
from .paginators import Pagination
from django.core.mail import send_mail


def index(request):
    return render(request, template_name='index.html', context={
        'name':'SocialMediaApp'
    })

# Create your views here.

class UserViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(methods=['get'], url_path='current', detail=False)
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

            return Response({"message": "Mật khẩu đã được thay đổi thành công."}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PostImageViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = PostImage.objects.all()
    serializer_class = PostImageSerializer


class PostViewSet(viewsets.ViewSet, generics.RetrieveAPIView, generics.ListAPIView):
    queryset = Post.objects.filter(active=True)
    serializer_class = PostSerializer
    parser_classes = [JSONParser, MultiPartParser, ]

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
            try:
                upload_result = upload(image, folder='MangXaHoi')
                image_url = upload_result.get('secure_url')
                PostImage.objects.create(post=post, image=image_url)
            except Error as e:
                return Response({"error": f"Lỗi đăng bài: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(post)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        post = get_object_or_404(Post, pk=pk)
        post.soft_delete()
        return Response({'message': 'Bài viết đã được xóa thành công.'}, status=status.HTTP_204_NO_CONTENT)

    @action(methods=['post'], url_path='comment', detail=True, permission_classes=[IsAuthenticated])
    def create_comment(self, request, pk=None):
        post = get_object_or_404(Post, pk=pk)
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
        comments = Comment.objects.filter(post=pk, active=True)
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(methods=['post'], url_path='react', detail=True, permission_classes=[IsAuthenticated])
    def react_post(self, request, pk=None):
        post = get_object_or_404(Post, pk=pk)
        reaction_type = request.data.get("reaction")

        try:
            reaction = Reaction.objects.filter(user=request.user, post=post).first()
            if not reaction_type:
                if reaction:
                    reaction.delete()
                    return Response({"message": "Hủy react thành công."}, status=status.HTTP_200_OK)
                else:
                    return Response({"message": "Không có react nào để hủy."}, status=status.HTTP_200_OK)
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
        reactions = Reaction.objects.filter(post=pk, active=True)
        serializer = ReactionSerializer(reactions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


    @action(methods=['patch'], url_path='lock-unlock-comment', detail=True, permission_classes = [IsAuthenticated])
    def lock_unlock_comments(self, request, pk=None):
        post = get_object_or_404(Post, pk=pk)
        post.lock_comment = not post.lock_comment
        post.save()
        return Response({'message': 'Cập nhật trạng thái bình luận của bài đăng thành công.'}, status=status.HTTP_200_OK)


class CommentViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = Comment.objects.filter(active=True)
    serializer_class = CommentSerializer
    parser_classes = [JSONParser, MultiPartParser, ]

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [IsAuthenticated]
        elif self.action == 'partial_update':
            permission_classes = [OwnerPermission]
        elif self.action == 'update':
            permission_classes = [OwnerPermission]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

    def update(self, request, pk=None):
        comment = get_object_or_404(Comment, id=pk)
        serializer = CommentSerializer(comment, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Chỉnh sửa bình luận thành công.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete_comment(self, request, pk=None):
        comment = get_object_or_404(Comment, id=pk)
        if comment.post.user == request.user or comment.user == request.user or request.user.role == 0:
            comment.soft_delete()
            return Response({'message': 'Xóa bình luận thành công.'}, status=status.HTTP_204_NO_CONTENT)
        return Response({'message': 'Bạn không có quyền xóa bình luận này.'}, status=status.HTTP_403_FORBIDDEN)

    @action(methods=['post'], detail=True, url_path='reply', permission_classes=[IsAuthenticated])
    def reply_comment(self, request, pk=None):
        comment = get_object_or_404(Comment, id=pk)
        serializer = CommentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user, post=comment.post, parent=comment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReactionViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = Reaction.objects.filter(active=True)
    serializer_class = ReactionSerializer


class AlumniViewSet(viewsets.ViewSet, generics.CreateAPIView):
    queryset = Alumni.objects.select_related('user')
    serializer_class = AlumniSerializer
    pagination_class = Pagination
    parser_classes = [JSONParser, MultiPartParser, ]

    @action(methods=['get'], url_path='unverified', detail=False, permission_classes=[AdminPermission])
    def unverified_alumni(self, request):
        queryset = self.queryset.filter(is_verified=False)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)

    @action(methods=['patch'], url_path='approve', detail=True, permission_classes=[AdminPermission])
    def approve_alumni(self, request, pk=None):
        alumni = get_object_or_404(Alumni, pk=pk)

        if alumni.is_verified:
            return Response({"error": "Tài khoản này đã được duyệt."}, status=status.HTTP_400_BAD_REQUEST)

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

        return Response({"message": "Duyệt tài khoản thành công.", "alumni_id": alumni.id}, status=status.HTTP_200_OK)


class TeacherViewSet(viewsets.ViewSet, generics.CreateAPIView):
    queryset = Teacher.objects.select_related('user')
    serializer_class = TeacherSerializer
    pagination_class = Pagination
    parser_classes = [JSONParser, MultiPartParser, ]
    permission_classes = [AdminPermission]

    @action(methods=['get'], url_path='expired', detail=False)
    def expired_password_teachers(self, request):
        queryset = self.get_queryset().filter(is_password_change_expired=True)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(methods=['patch'], url_path='reset', detail=True)
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

            return Response({"message": f"Thời gian đổi mật khẩu đã được đặt lại cho {teacher.user.username}."}, status=status.HTTP_200_OK)

        return Response(
            {"message": f"Tài khoản {teacher.user.username} đã đổi mật khẩu hoặc chưa hết thời gian đổi mật khẩu."},status=status.HTTP_400_BAD_REQUEST)


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

        survey_post = SurveyPost.objects.create(content=content, user=request.user, survey_type=survey_type, end_time=end_time)

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
        survey_post = get_object_or_404(SurveyPost, pk=pk)
        self.check_object_permissions(request, survey_post)

        content = request.data.get('content', survey_post.content)
        images = request.FILES.getlist('images')
        survey_type = request.data.get('survey_type', survey_post.survey_type)
        end_time = request.data.get('end_time', survey_post.end_time)
        questions_data = request.data.get('questions', [])

        survey_post.content = content
        survey_post.survey_type = survey_type
        survey_post.end_time = end_time
        survey_post.save()

        existing_images = {image.image: image for image in survey_post.images.all()}
        new_image_urls = []

        for image in images:
            try:
                upload_result = upload(image, folder='MangXaHoi')
                image_url = upload_result.get('secure_url')
                new_image_urls.append(image_url)
                if image_url not in existing_images:
                    PostImage.objects.create(post=survey_post, image=image_url)
            except Error as e:
                return Response({"error": f"Lỗi cập nhật hình ảnh: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Remove deleted images
        images_to_delete = set(existing_images.keys()) - set(new_image_urls)
        PostImage.objects.filter(image__in=images_to_delete).delete()
        existing_questions = {q.id: q for q in survey_post.questions.all()}
        question_ids = [int(q.get('id')) for q in questions_data if q.get('id')]

        for question_data in questions_data:
            options_data = question_data.pop('options', [])
            question_id = int(question_data.get('id'))
            if question_id and question_id in existing_questions:
                question_instance = existing_questions[question_id]
                for attr, value in question_data.items():
                    setattr(question_instance, attr, value)
                question_instance.save()
                existing_options = {o.id: o for o in question_instance.options.all()}
                option_ids = [int(o.get('id')) for o in options_data if o.get('id')]
                for option_data in options_data:
                    option_id = int(option_data.get('id'))
                    if option_id and option_id in existing_options:
                        option_instance = existing_options[option_id]
                        for attr, value in option_data.items():
                            setattr(option_instance, attr, value)
                        option_instance.save()
                    else:
                        SurveyOption.objects.create(survey_question=question_instance, **option_data)
                options_to_delete = set(existing_options.keys()) - set(option_ids)
                SurveyOption.objects.filter(id__in=options_to_delete).delete()
            else:
                SurveyQuestion.objects.create(survey_post=survey_post, **question_data)
        questions_to_delete = set(existing_questions.keys()) - set(question_ids)
        SurveyQuestion.objects.filter(id__in=questions_to_delete).delete()

        serializer = SurveyPostSerializer(survey_post)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def retrieve(self, request, pk=None):
        survey_post = get_object_or_404(SurveyPost, pk=pk)
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
        return Response(data, status=status.HTTP_200_OK)


    @action(detail=True, url_path='draft', methods=['post'], permission_classes=[AlumniPermission])
    def draft(self, request, pk=None):
        self.check_permissions(request)

        # Kiểm tra nếu người dùng đã từng trả lời khảo sát này
        existing_answers = UserSurveyOption.objects.filter(user=request.user, survey_option__survey_question__survey_post=pk)
        if existing_answers.exists():
            return Response({"error": "You had completed this survey."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        survey_post = get_object_or_404(SurveyPost, pk=pk)
        answers = data.get('answers', {})

        formatted_answers = [{'question_id': key, 'selected_options': value} for key, value in answers.items()]
        draft_data = {
            'survey_post': survey_post,
            'user': request.user.id,
            'answers': formatted_answers
        }

        serializer = SurveyDraftSerializer(data=draft_data)
        if serializer.is_valid():
            serializer.save()

            draft_url = 'link'

            send_mail(
                subject='Nhắc nhở hoàn thành khảo sát',
                message=f"""
                        Chào {request.user.first_name},

                        Bạn đã lưu nháp một khảo sát. Vui lòng truy cập đường dẫn sau để tiếp tục:

                        {draft_url}

                        Cảm ơn đã dành thời gian thực hiện khảo sát!

                        Trân Trọng,
                        Đội ngũ Admin
                    """,
                from_email=os.getenv('EMAIL_SEND'),
                recipient_list=[request.user.email],
                fail_silently=False,
            )

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, url_path='resume', methods=['get'], permission_classes=[OwnerPermission])
    def resume_survey(self, request, pk=None):
        try:
            draft = get_object_or_404(SurveyDraft, survey_post_id=pk, user=request.user)

            self.check_object_permissions(request, draft)

            return Response({
                "answers": draft.answers
            }, status=status.HTTP_200_OK)
        except SurveyDraft.DoesNotExist:
            return Response({"error": "Draft not found."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, url_path='submit', methods=['post'], permission_classes=[AlumniPermission])
    def submit_survey(self, request, pk=None):
        self.check_permissions(request)
        data = request.data
        user = request.user
        survey_post = get_object_or_404(SurveyPost, pk=pk)
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
