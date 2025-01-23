from django.contrib import admin
from .models import *


class MyAdminSite(admin.AdminSite):
    site_header = "Alumni Social Network System"
    site_title = "Alumni Admin"
    index_title = "Welcome to Alumni System Admin"


my_admin_site = MyAdminSite(name='myadmin')


### **Inline Admin Classes**

# Inline quản lý hình ảnh trong Post
class PostImageInline(admin.TabularInline):
    model = PostImage
    extra = 1


# Inline quản lý câu hỏi của SurveyPost
class SurveyQuestionInline(admin.TabularInline):
    model = SurveyQuestion
    extra = 1


# Inline quản lý các lựa chọn của SurveyQuestion
class SurveyOptionInline(admin.TabularInline):
    model = SurveyOption
    extra = 1


# Inline quản lý các phản hồi (reply) của Comment
class CommentInline(admin.TabularInline):
    model = Comment
    fk_name = "parent"  # Quản lý dựa trên quan hệ parent-child
    extra = 1


### **Admin Classes**

# Quản lý User
class UserAdmin(admin.ModelAdmin):
    list_display = ("username", "email", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")
    search_fields = ("username", "email")
    ordering = ("-id",)


# Quản lý Alumni
class AlumniAdmin(admin.ModelAdmin):
    list_display = ("user", "student_code", "is_verified")
    list_filter = ("is_verified",)
    search_fields = ("user__username", "student_code")


# Quản lý Teacher
class TeacherAdmin(admin.ModelAdmin):
    list_display = ("user", "must_change_password", "password_reset_time")
    list_filter = ("must_change_password",)
    search_fields = ("user__username",)


# Quản lý Post và inline PostImage
class PostAdmin(admin.ModelAdmin):
    list_display = ("content", "user", "lock_comment", "created_date", "updated_date", "active")
    list_filter = ("lock_comment", "active", "created_date")
    search_fields = ("content", "user__username")
    inlines = [PostImageInline]


# Quản lý Comment và inline replies
class CommentAdmin(admin.ModelAdmin):
    list_display = ("user", "post", "content", "created_date", "parent")
    list_filter = ("created_date", "parent")
    search_fields = ("content", "user__username", "post__content")
    inlines = [CommentInline]


# Quản lý SurveyPost và inline SurveyQuestion
class SurveyPostAdmin(admin.ModelAdmin):
    list_display = ("content", "survey_type", "end_time", "created_date", "user")
    list_filter = ("survey_type", "created_date", "end_time")
    search_fields = ("content", "user__username")
    inlines = [SurveyQuestionInline]


# Quản lý SurveyQuestion và inline SurveyOption
class SurveyQuestionAdmin(admin.ModelAdmin):
    list_display = ("question", "multi_choice", "survey_post")
    list_filter = ("multi_choice",)
    search_fields = ("question", "survey_post__content")
    inlines = [SurveyOptionInline]


# Quản lý SurveyOption
class SurveyOptionAdmin(admin.ModelAdmin):
    list_display = ("option", "survey_question")
    search_fields = ("option", "survey_question__question")


# Quản lý Group
class GroupAdmin(admin.ModelAdmin):
    list_display = ("group_name", "created_date", "updated_date", "active")
    search_fields = ("group_name",)
    list_filter = ("active",)


# Quản lý InvitationPost
class InvitationPostAdmin(admin.ModelAdmin):
    list_display = ("event_name", "user", "created_date", "active")
    search_fields = ("event_name", "user__username")
    filter = ("created_date", "active")



### **Register Models**
my_admin_site.register(User, UserAdmin)
my_admin_site.register(Alumni, AlumniAdmin)
my_admin_site.register(Teacher, TeacherAdmin)
my_admin_site.register(Post, PostAdmin)
my_admin_site.register(Comment, CommentAdmin)
my_admin_site.register(SurveyPost, SurveyPostAdmin)
my_admin_site.register(SurveyQuestion, SurveyQuestionAdmin)
my_admin_site.register(SurveyOption, SurveyOptionAdmin)
my_admin_site.register(Group, GroupAdmin)
my_admin_site.register(InvitationPost, InvitationPostAdmin)
