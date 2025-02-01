import os

from rest_framework import serializers
from rest_framework.serializers import ModelSerializer, ValidationError, Serializer, CharField, PrimaryKeyRelatedField
from .models import User, Alumni, Teacher, Post, PostImage, Comment, SurveyOption, SurveyQuestion, SurveyPost, \
    SurveyDraft, UserSurveyOption, Reaction, Group, InvitationPost
from .tasks import send_email_async
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
        fields = ["id", "username", "password", "avatar", "cover", "first_name", "last_name", "email", "role"]
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


class ReactionSerializer(ModelSerializer):
    user = UserSerializer(read_only=True)
    post = PostSerializer(read_only=True)

    class Meta:
        model = Reaction
        fields = ['id', 'reaction', 'user', 'post', 'created_date', 'updated_date']


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
        print(validated_data)
        user_data = validated_data.pop('user')
        user_data['role'] = 1
        user_data['is_active'] = False
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
        else:
            raise ValidationError({"avatar": "Yêu cầu ảnh đại diện."})

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
            role=user_data.get('role'),
            is_active=user_data.get('is_active')
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
        send_email_async.delay(subject, message, [user.email])


class SurveyOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyOption
        fields = ['id', 'option']


class SurveyQuestionSerializer(serializers.ModelSerializer):
    options = SurveyOptionSerializer(many=True, required=True)

    class Meta:
        model = SurveyQuestion
        fields = ['id', 'question', 'multi_choice', 'options']


class SurveyPostSerializer(PostSerializer):
    questions = SurveyQuestionSerializer(many=True, required=False)

    class Meta:
        model = SurveyPost
        fields = ['id', 'content', 'images', 'lock_comment', 'user', 'created_date', 'updated_date', 'end_time',
                  'survey_type', 'questions']


class UserSurveyOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSurveyOption
        fields = ['id', 'user', 'survey_option']


class SurveyDraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyDraft
        fields = ['id', 'survey_post', 'user', 'answers', 'drafted_at']


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'group_name', 'users', 'created_date', 'updated_date']


class InvitationPostSerializer(serializers.ModelSerializer):
    users = PrimaryKeyRelatedField(many=True, queryset=User.objects.filter(is_active=True), required=False)
    groups = PrimaryKeyRelatedField(many=True, queryset=Group.objects.filter(active=True), required=False)
    images = PostImageSerializer(many=True, required=False)
    user = UserSerializer(read_only=True)

    class Meta:
        model = InvitationPost
        fields = ['id', 'event_name', 'content', 'images', 'users', 'groups', 'created_date', 'user']
