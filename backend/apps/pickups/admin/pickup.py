from django.contrib import admin

from ..models import Folder, Media, Member, Pickup


class FolderInline(admin.TabularInline[Folder, Pickup]):
    model = Folder
    extra = 0
    fields = ["name", "user_name", "created_at"]
    readonly_fields = ["created_at"]


@admin.register(Pickup)
class PickupAdmin(admin.ModelAdmin[Pickup]):
    list_display = ["id", "title", "visibility", "join_policy", "is_active", "created_at"]
    list_filter = ["is_active", "visibility", "join_policy"]
    search_fields = ["title"]
    inlines = [FolderInline]


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin[Member]):
    list_display = ["user_name", "pickup", "is_creator", "last_active_at"]
    list_filter = ["is_creator"]
    search_fields = ["user_name"]


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin[Media]):
    list_display = ["original_filename", "folder", "media_type", "file_size", "uploaded_at"]
    list_filter = ["media_type"]
