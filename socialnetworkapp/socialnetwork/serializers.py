import os

from rest_framework import serializers
from rest_framework.serializers import ModelSerializer, ValidationError, Serializer, CharField, StringRelatedField
from .models import User, Alumni, Teacher, Post, PostImage, Comment, SurveyOption, SurveyQuestion, SurveyPost, \
    SurveyType, SurveyDraft
from django.core.mail import send_mail
from django.utils import timezone
from cloudinary.uploader import upload
from cloudinary.exceptions import Error



class UserSerializer(ModelSerializer):

    def create(self, validated_data):
        data = validated_data.copy()
        u = User(**data)
        u.role = 0
        u.set_password(u.password)
        u.save()
        return u


    class Meta:
        model = User
        fields = ["id", "username", "password", "avatar", "cover", "first_name", "last_name", "email"]
        extra_kwargs = {
            'password': {
                'write_only': True,
                'required': False
            }
        }


class PostImageSerializer(ModelSerializer):

    class Meta:
        model = PostImage
        fields = ['id', 'image']


class PostSerializer(ModelSerializer):
    images = PostImageSerializer(many=True, required=False)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'content', 'images', 'lock_comment', 'user', 'created_date', 'updated_date']



class CommentSerializer(ModelSerializer):
    user = UserSerializer(read_only=True)
    post = PostSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'user', 'content', 'image', 'post', 'parent', 'created_date', 'updated_date']

    def create(self, validated_data):
        parent_comment = validated_data.get('parent_comment', None)
        comment = Comment.objects.create(**validated_data)
        return comment


# class ReactionSerializer(ModelSerializer):
#     user = StringRelatedField(read_only=True)
#
#     class Meta:
#         model = Reaction
#         fields = ['id', 'reaction', 'user', 'post', 'created_date', 'updated_date']



class ChangePasswordSerializer(Serializer):
    current_password = CharField(write_only=True, required=True)
    new_password = CharField(write_only=True, required=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mật khẩu hiện tại không đúng.")
        return value


class AlumniSerializer(ModelSerializer):

    user = UserSerializer()

    class Meta:
        model = Alumni
        fields = ["id", "user", "student_code", "is_verified"]

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user_data['role'] = 1
        avatar = user_data.pop('avatar', None)
        cover = user_data.pop('cover', None)
        password = user_data.get('password')

        if not password:
            raise ValidationError({"password": "Yêu cầu mật khẩu."})

        if avatar:
            try:
                avatar_result = upload(avatar, folder="MangXaHoi")
                user_data['avatar'] = avatar_result.get('secure_url')
            except Error as e:
                raise ValidationError({"avatar": f"Lỗi đăng tải avatar: {str(e)}"})

        if cover:
            try:
                cover_result = upload(cover, folder="MangXaHoi")
                user_data['cover'] = cover_result.get('secure_url')
            except Error as e:
                raise ValidationError({"cover": f"Lỗi đăng tải cover: {str(e)}"})

        user = User.objects.create_user(
            username=user_data.get('username'),
            password=password,
            first_name=user_data.get('first_name'),
            last_name=user_data.get('last_name'),
            email=user_data.get('email'),
            avatar=user_data.get('avatar'),
            cover=user_data.get('cover'),
            role=user_data.get('role')
        )

        alumni = Alumni.objects.create(user=user, **validated_data)
        return alumni


class TeacherSerializer(ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = Teacher
        fields = ["id", "user", "must_change_password", "password_reset_time"]

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user_data['role'] = 2
        avatar = user_data.pop('avatar', None)
        cover = user_data.pop('cover', None)
        password = user_data.get('password', 'ou@123')

        if avatar:
            try:
                avatar_result = upload(avatar, folder="MangXaHoi")
                user_data['avatar'] = avatar_result.get('secure_url')
            except Error as e:
                raise ValidationError({"avatar": f"Lỗi đăng tải avatar: {str(e)}"})

        if cover:
            try:
                cover_result = upload(cover, folder="MangXaHoi")
                user_data['cover'] = cover_result.get('secure_url')
            except Error as e:
                raise ValidationError({"cover": f"Lỗi đăng tải cover: {str(e)}"})

        user = User.objects.create_user(
            username=user_data.get('username'),
            password=password,
            first_name=user_data.get('first_name'),
            last_name=user_data.get('last_name'),
            email=user_data.get('email'),
            avatar=user_data.get('avatar'),
            cover=user_data.get('cover'),
            role=user_data.get('role')
        )

        teacher = Teacher.objects.create(user=user, **validated_data)
        teacher.password_reset_time = timezone.now()

        self.send_account_email(user, 'ou@123')

        return teacher

    def send_account_email(self, user, password):

        subject = "Tài khoản giảng viên của bạn"
        message = f"""
        Chào {user.first_name},

        Tài khoản giáo viên của bạn đã được tạo. Vui lòng sử dụng thông tin đăng nhập sau để đăng nhập:

        Tên đăng nhập: {user.username}
        Mật khẩu: {password}

        Bạn phải thay đổi mật khẩu trong vòng 24 giờ, nếu không tài khoản của bạn sẽ bị khóa.

        Trân Trọng,
        Đội ngũ Admin
        """
        send_mail(subject, message, os.getenv('EMAIL_SEND'), [user.email])

# class SurveyOptionSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = SurveyOption
#         fields = ['id', 'option']
#
#
# class SurveyQuestionSerializer(serializers.ModelSerializer):
#     options = SurveyOptionSerializer(many=True)  # Nested options
#
#     class Meta:
#         model = SurveyQuestion
#         fields = ['id', 'question', 'multi_choice', 'options']
#
#     def create(self, validated_data):
#         """
#         Create SurveyQuestion along with nested SurveyOptions.
#         """
#         options_data = validated_data.pop('options', [])  # Extract nested options
#         survey_question = SurveyQuestion.objects.create(**validated_data)  # Create the question
#         for option_data in options_data:
#             SurveyOption.objects.create(survey_question=survey_question, **option_data)  # Create options
#         return survey_question
#
#     def update(self, instance, validated_data):
#         """
#         Update SurveyQuestion and its nested SurveyOptions.
#         If options exist, update them; otherwise, remove them and add new ones.
#         """
#         options_data = validated_data.pop('options', [])
#
#         # Update the question fields
#         instance.question = validated_data.get('question', instance.question)
#         instance.multi_choice = validated_data.get('multi_choice', instance.multi_choice)
#         instance.save()
#
#         # Handle nested SurveyOptions
#         # Clear existing options
#         instance.options.all().delete()
#
#         # Recreate options from the updated data
#         for option_data in options_data:
#             SurveyOption.objects.create(survey_question=instance, **option_data)
#
#         return instance
#
#
# class SurveyPostSerializer(PostSerializer):
#     survey_type = serializers.ChoiceField(choices=SurveyType.choices())
#     questions = SurveyQuestionSerializer(many=True)  # Nested questions
#
#     class Meta:
#         model = SurveyPost
#         fields = ['id', 'content', 'lock_comment', 'user', 'end_time', 'survey_type', 'images', 'questions']
#
#
#     def create(self, validated_data):
#         """
#         Create SurveyPost along with nested SurveyQuestions and SurveyOptions.
#         """
#         questions_data = validated_data.pop('questions', [])  # Extract nested questions
#         survey_post = SurveyPost.objects.create(**validated_data)  # Create the survey post
#
#         for question_data in questions_data:
#             options_data = question_data.pop('options', [])  # Extract nested options
#             survey_question = SurveyQuestion.objects.create(survey_post=survey_post,
#                                                             **question_data)  # Create each question
#             for option_data in options_data:
#                 SurveyOption.objects.create(survey_question=survey_question,
#                                             **option_data)  # Create options for each question
#
#         return survey_post
#
#     def update(self, instance, validated_data):
#         """
#         Update SurveyPost and its nested SurveyQuestions and SurveyOptions.
#         """
#         questions_data = validated_data.pop('questions', [])
#
#         # Update main fields of SurveyPost
#         instance.content = validated_data.get('content', instance.content)
#         instance.lock_comment = validated_data.get('lock_comment', instance.lock_comment)
#         instance.end_time = validated_data.get('end_time', instance.end_time)
#         instance.survey_type = validated_data.get('survey_type', instance.survey_type)
#         instance.save()
#
#         # Update nested SurveyQuestions
#         instance.questions.all().delete()  # Clear all existing questions
#
#         # Recreate questions and their nested options
#         for question_data in questions_data:
#             options_data = question_data.pop('options', [])
#             survey_question = SurveyQuestion.objects.create(survey_post=instance,
#                                                             **question_data)  # Create each question
#             for option_data in options_data:
#                 SurveyOption.objects.create(survey_question=survey_question,
#                                             **option_data)  # Create options for each question
#
#         return instance
#
#
# class SurveyDraftSerializer(serializers.ModelSerializer):
#     survey_post = SurveyPostSerializer(read_only=False)  # Enable write for nested SurveyPost
#     user = UserSerializer(read_only=True)  # Keep user read-only
#
#     class Meta:
#         model = SurveyDraft
#         fields = ['id', 'survey_post', 'user', 'answers', 'token', 'drafted_at']
#         read_only_fields = ['id', 'token', 'drafted_at']
#
#
#
#     def create(self, validated_data):
#         """
#         Create SurveyDraft and associated SurveyPost if provided.
#         """
#         survey_post_data = validated_data.pop('survey_post', None)  # Extract nested survey_post data
#
#         # Handle nested SurveyPost creation
#         if survey_post_data:
#             survey_post_serializer = SurveyPostSerializer(data=survey_post_data)
#             survey_post_serializer.is_valid(raise_exception=True)
#             survey_post = survey_post_serializer.save()
#             validated_data['survey_post'] = survey_post
#
#         survey_draft = SurveyDraft.objects.create(**validated_data)  # Create the draft
#         return survey_draft
#
#     def update(self, instance, validated_data):
#         """
#         Update SurveyDraft and associated SurveyPost if provided.
#         """
#         survey_post_data = validated_data.pop('survey_post', None)
#
#         # Handle nested SurveyPost update
#         if survey_post_data:
#             survey_post_serializer = SurveyPostSerializer(instance.survey_post, data=survey_post_data)
#             survey_post_serializer.is_valid(raise_exception=True)
#             survey_post_serializer.save()
#
#         # Update main fields of SurveyDraft
#         instance.answers = validated_data.get('answers', instance.answers)
#         instance.save()
#         return instance
