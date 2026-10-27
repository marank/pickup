from django.contrib import admin

from ..models import Folder, Media, Member, Pickup


class FolderInline(admin.TabularInline):
    model = Folder
    extra = 0
    fields = ["name", "user_name", "user_email", "created_at"]
    readonly_fields = ["created_at"]


@admin.register(Pickup)
class PickupAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["title"]
    inlines = [FolderInline]


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ["user_name", "pickup", "is_creator", "last_active_at"]
    list_filter = ["is_creator"]
    search_fields = ["user_name", "user_email"]


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = ["original_filename", "folder", "media_type", "file_size", "uploaded_at"]
    list_filter = ["media_type"]
