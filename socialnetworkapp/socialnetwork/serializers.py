import os
from rest_framework.serializers import ModelSerializer, ValidationError
from .models import User, Alumni, Teacher
from django.core.mail import send_mail
from django.utils import timezone


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


class AlumniSerializer(ModelSerializer):

    user = UserSerializer()

    class Meta:
        model = Alumni
        fields = ["id", "user", "student_code", "is_verified"]

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user_data['role'] = 1
        password = user_data.get('password')

        if not password:
            raise ValidationError({"password": "Yêu cầu mật khẩu."})

        user = User.objects.create_user(
            username=user_data.get('username'),
            password=password,
            first_name=user_data.get('first_name'),
            last_name=user_data.get('last_name'),
            email=user_data.get('email'),
            avatar=user_data.get('avatar'),
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
        password = user_data.get('password', 'ou@123')


        user = User.objects.create_user(
            username=user_data.get('username'),
            password=password,
            first_name=user_data.get('first_name'),
            last_name=user_data.get('last_name'),
            email=user_data.get('email'),
            avatar=user_data.get('avatar'),
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

