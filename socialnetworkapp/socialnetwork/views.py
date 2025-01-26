import os

from celery.worker.control import active
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

from .models import Alumni, Teacher, Post, Comment, PostImage, SurveyPost, SurveyQuestion, SurveyOption, Reaction
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

    @action(methods=['patch'],url_path='change-password', detail=False)
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

    def destroy(self, request, pk=None):
        post = get_object_or_404(Post, pk=pk, active=True)
        self.permission_classes = [OwnerPermission | AdminPermission]
        self.check_object_permissions(request, post)
        post.soft_delete()
        return Response({'message': 'Bài viết đã được xóa thành công.'}, status=status.HTTP_204_NO_CONTENT)


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


    @action(methods=['patch'], url_path='lock-unlock-comment', detail=True, permission_classes = [OwnerPermission | AdminPermission])
    def lock_unlock_comments(self, request, pk=None):
        post = get_object_or_404(Post, pk=pk)
        self.check_object_permissions(request, post)
        post.lock_comment = not post.lock_comment
        post.save(update_fields=['lock_comment'])
        return Response({'message': 'Cập nhật trạng thái bình luận của bài đăng thành công.'}, status=status.HTTP_200_OK)


class CommentViewSet(viewsets.ViewSet):
    queryset = Comment.objects.filter(active=True)
    serializer_class = CommentSerializer
    parser_classes = [JSONParser, MultiPartParser, ]

    def update(self, request, pk=None):
        comment = get_object_or_404(Comment, id=pk, active=True)
        self.permission_classes = [OwnerPermission]
        self.check_object_permissions(request, comment)
        serializer = CommentSerializer(comment, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Chỉnh sửa bình luận thành công.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    def destroy(self, request, pk=None):
        comment = get_object_or_404(Comment, id=pk, active=True)
        if comment.post.user == request.user or comment.user == request.user or request.user.role == 0:
            comment.soft_delete()
            return Response({'message': 'Xóa bình luận thành công.'}, status=status.HTTP_204_NO_CONTENT)
        return Response({'message': 'Bạn không có quyền xóa bình luận này.'}, status=status.HTTP_403_FORBIDDEN)


    @action(methods=['post'], detail=True, url_path='reply', permission_classes=[IsAuthenticated])
    def reply_comment(self, request, pk=None):
        comment = get_object_or_404(Comment, id=pk, active=True)

        if comment.post.lock_comment:
            return Response({'message': 'Bài viết này đã bị khóa bình luận.'},status=status.HTTP_403_FORBIDDEN)

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
        alumni.user.is_active = True
        alumni.save(update_fields=['is_verified'])
        alumni.user.save(update_fields=['is_active'])
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


class SurveyPostViewSet(viewsets.ViewSet, generics.RetrieveAPIView, generics.ListAPIView):
    queryset = SurveyPost.objects.filter(active=True)
    serializer_class = SurveyPostSerializer
    parser_classes = [JSONParser, MultiPartParser]


    def create(self, request):
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

        serializer = self.get_serializer(survey_post)

        for question_data in questions_data:
            options_data = question_data.pop('options', [])
            question = SurveyQuestion.objects.create(survey_post=survey_post, **question_data)
            for option_data in options_data:
                SurveyOption.objects.create(survey_question=question, **option_data)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # def update(self, request, pk=None):
    #     survey_post = self.get_object()
    #     serializer = self.get_serializer(survey_post, data=request.data, partial=True)
    #     if serializer.is_valid():
    #         serializer.save()
    #         return Response(serializer.data)
    #
    #     questions_data = validated_data.pop('questions', [])
    #     instance = super().update(instance, validated_data)
    #
    #     existing_questions = {question.id: question for question in instance.questions.all()}
    #     question_ids = [q.get('id') for q in questions_data if q.get('id')]
    #
    #     for question_data in questions_data:
    #         question_id = question_data.get('id')
    #         if question_id and question_id in existing_questions:
    #             question_instance = existing_questions[question_id]
    #             options_data = question_data.pop('options', [])
    #             for attr, value in question_data.items():
    #                 setattr(question_instance, attr, value)
    #             question_instance.save()
    #
    #             existing_options = {option.id: option for option in question_instance.options.all()}
    #             option_ids = [o.get('id') for o in options_data if o.get('id')]
    #
    #             for option_data in options_data:
    #                 option_id = option_data.get('id')
    #                 if option_id and option_id in existing_options:
    #                     option_instance = existing_options[option_id]
    #                     for attr, value in option_data.items():
    #                         setattr(option_instance, attr, value)
    #                     option_instance.save()
    #                 else:
    #                     SurveyOption.objects.create(survey_question=question_instance, **option_data)
    #
    #             options_to_delete = set(existing_options.keys()) - set(option_ids)
    #             SurveyOption.objects.filter(id__in=options_to_delete).delete()
    #         else:
    #             SurveyQuestion.objects.create(survey_post=instance, **question_data)
    #
    #     questions_to_delete = set(existing_questions.keys()) - set(question_ids)
    #     SurveyQuestion.objects.filter(id__in=questions_to_delete).delete()
    #
    #     return instance
    #     return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
