from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    joinedDate = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'name', 'phone', 'role', 'status',
            'avatar_url', 'is_active', 'password', 'joinedDate'
        ]
        read_only_fields = ['id', 'joinedDate']

    def create(self, validated_data):
        password = validated_data.pop('password', 'password123')
        user = User.objects.create_user(password=password, **validated_data)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        if email and password:
            user = authenticate(email=email, password=password)
            if not user:
                raise serializers.ValidationError('Invalid email or password.')
            if user.status != 'ACTIVE':
                raise serializers.ValidationError('User account is inactive.')
            data['user'] = user
        else:
            raise serializers.ValidationError('Must include "email" and "password".')
        return data
