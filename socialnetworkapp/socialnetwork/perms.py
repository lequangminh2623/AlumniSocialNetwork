from rest_framework import permissions


class OwnerPermission(permissions.IsAuthenticated):
    def has_object_permission(self, request, view, object):
        return super().has_permission(request, view) and request.user == object.user


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
