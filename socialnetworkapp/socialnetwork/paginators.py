from rest_framework import pagination

class Pagination(pagination.PageNumberPagination):
    page_size = 10