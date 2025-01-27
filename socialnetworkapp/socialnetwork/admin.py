from django.contrib import admin
from django.http import JsonResponse
from django.template.response import TemplateResponse
from django.urls import path
from django.db.models import Count

from .models import *


class MyAdminSite(admin.AdminSite):
    site_header = "Alumni Social Network System"
    site_title = "Alumni Admin"
    index_title = "Welcome to Alumni System Admin"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('survey-report/', self.admin_view(self.survey_report), name='survey-report'),
        ]
        return custom_urls + urls

    def survey_report(self, request, *args, **kwargs):
        surveys = SurveyPost.objects.all()
        survey_id = request.GET.get('pk', None)
        if survey_id:
            survey_post = SurveyPost.objects.get(id=survey_id)
            questions = SurveyQuestion.objects.filter(survey_post=survey_post)

            report_data = []
            for question in questions:
                options = SurveyOption.objects.filter(survey_question=question)
                options_data = [
                    {
                        'text': option.option,
                        'count': UserSurveyOption.objects.filter(survey_option=option).count()
                    }
                    for option in options
                ]
                report_data.append({'question': question.question, 'multi_choice': question.multi_choice, 'options': options_data})

            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({
                    'survey_post': survey_post.content,
                    'survey_images': list(survey_post.images.all().values_list('image', flat=True)),
                    'data': report_data
                })

            return TemplateResponse(request, 'admin/survey_report.html', {
                'survey_post': survey_post,
                'survey_image': survey_post.images.all(),
                'report_data': report_data,
                'surveys': surveys
            })
        else:
            return TemplateResponse(request, 'admin/survey_report.html', {'surveys': surveys})



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