# Generated by Django 5.1.2 on 2025-01-24 04:03

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('socialnetwork', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='alumni',
            options={'ordering': ['-id']},
        ),
        migrations.AlterModelOptions(
            name='teacher',
            options={'ordering': ['-id']},
        ),
        migrations.AddField(
            model_name='alumni',
            name='active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='alumni',
            name='created_date',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='alumni',
            name='deleted_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='alumni',
            name='updated_date',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        migrations.AddField(
            model_name='teacher',
            name='active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='teacher',
            name='created_date',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name='teacher',
            name='deleted_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='teacher',
            name='updated_date',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
    ]