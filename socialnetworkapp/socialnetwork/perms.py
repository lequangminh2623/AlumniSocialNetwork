from rest_framework import permissions


class OwnerPermission(permissions.IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        # Nếu object chính là user
        if obj == request.user:
            return True

        # Nếu object có field "user"
        user_field = getattr(obj, "user", None)
        if user_field == request.user:
            return True

        return False


class AdminPermission(permissions.BasePermission):

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == 0


class AlumniPermission(permissions.BasePermission):

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == 1


class TeacherPermission(permissions.BasePermission):

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == 2

class CommentDeletePermission(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.post.user == request.user or obj.user == request.user or getattr(request.user, "role", None) == 0