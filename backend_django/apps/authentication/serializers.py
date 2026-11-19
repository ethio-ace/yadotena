from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    joinedDate = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'name', 'phone', 'role', 'status',
            'avatar_url', 'is_active', 'password', 'joinedDate'
        ]
        read_only_fields = ['id', 'joinedDate', 'is_active']

    def validate_email(self, value):
        return value.strip().lower()

    def validate_role(self, value):
        request = self.context.get('request')
        if value == 'OWNER' and request is not None:
            from apps.core.permissions import user_role
            if user_role(request.user) != 'OWNER':
                raise serializers.ValidationError('Only an owner can assign the OWNER role.')
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'A password of at least 8 characters is required.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        status = validated_data.get('status', 'ACTIVE')
        user = User.objects.create_user(password=password, is_active=(status == 'ACTIVE'), **validated_data)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.is_active = (instance.status == 'ACTIVE')
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = (data.get('email') or '').strip().lower()
        password = data.get('password')
        if email and password:
            # authenticate() rejects is_active=False users, so inactive and
            # wrong-password both get the same message (no account probing).
            user = authenticate(email=email, password=password)
            if not user or user.status != 'ACTIVE':
                raise serializers.ValidationError('Invalid email or password.')
            data['user'] = user
        else:
            raise serializers.ValidationError('Must include "email" and "password".')
        return data
