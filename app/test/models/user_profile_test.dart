import 'package:flutter_test/flutter_test.dart';
import 'package:informed_citizenry_app/models/user_profile.dart';

void main() {
  group('UserProfile Model Tests', () {
    test('should create UserProfile from JSON correctly', () {
      final json = {
        'id': 'profile-id-123',
        'user_id': 'user-456',
        'first_name': 'John',
        'last_name': 'Doe',
        'birthdate': '1990-05-15',
        'street_address': '123 Main St',
        'city': 'New York',
        'state': 'NY',
        'zip_code': '10001',
        'phone_number': '+1234567890',
        'created_at': '2024-01-15T10:30:00.000Z',
        'updated_at': '2024-01-16T14:45:00.000Z',
      };

      final profile = UserProfile.fromJson(json);

      expect(profile.id, equals('profile-id-123'));
      expect(profile.userId, equals('user-456'));
      expect(profile.firstName, equals('John'));
      expect(profile.lastName, equals('Doe'));
      expect(profile.birthdate, equals(DateTime.parse('1990-05-15')));
      expect(profile.streetAddress, equals('123 Main St'));
      expect(profile.city, equals('New York'));
      expect(profile.state, equals('NY'));
      expect(profile.zipCode, equals('10001'));
      expect(profile.phoneNumber, equals('+1234567890'));
    });

    test('should handle null optional fields correctly', () {
      final json = {
        'id': 'profile-id-123',
        'user_id': 'user-456',
        'created_at': '2024-01-15T10:30:00.000Z',
        'updated_at': '2024-01-16T14:45:00.000Z',
      };

      final profile = UserProfile.fromJson(json);

      expect(profile.firstName, isNull);
      expect(profile.lastName, isNull);
      expect(profile.birthdate, isNull);
      expect(profile.streetAddress, isNull);
      expect(profile.city, isNull);
      expect(profile.state, isNull);
      expect(profile.zipCode, isNull);
      expect(profile.phoneNumber, isNull);
    });

    test('should convert UserProfile to JSON correctly', () {
      final profile = UserProfile(
        id: 'profile-id-123',
        userId: 'user-456',
        firstName: 'Jane',
        lastName: 'Smith',
        birthdate: DateTime.parse('1985-08-20'),
        streetAddress: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        phoneNumber: '+1987654321',
        createdAt: DateTime.parse('2024-01-15T10:30:00.000Z'),
        updatedAt: DateTime.parse('2024-01-16T14:45:00.000Z'),
      );

      final json = profile.toJson();

      expect(json['id'], equals('profile-id-123'));
      expect(json['user_id'], equals('user-456'));
      expect(json['first_name'], equals('Jane'));
      expect(json['last_name'], equals('Smith'));
      expect(json['birthdate'], equals('1985-08-20'));
      expect(json['street_address'], equals('456 Oak Ave'));
      expect(json['city'], equals('Los Angeles'));
      expect(json['state'], equals('CA'));
      expect(json['zip_code'], equals('90001'));
      expect(json['phone_number'], equals('+1987654321'));
    });

    test('should omit null fields in JSON', () {
      final profile = UserProfile(
        id: 'profile-id-123',
        userId: 'user-456',
        createdAt: DateTime.parse('2024-01-15T10:30:00.000Z'),
        updatedAt: DateTime.parse('2024-01-16T14:45:00.000Z'),
      );

      final json = profile.toJson();

      expect(json.containsKey('first_name'), isFalse);
      expect(json.containsKey('last_name'), isFalse);
      expect(json.containsKey('birthdate'), isFalse);
      expect(json.containsKey('street_address'), isFalse);
      expect(json.containsKey('city'), isFalse);
      expect(json.containsKey('state'), isFalse);
      expect(json.containsKey('zip_code'), isFalse);
      expect(json.containsKey('phone_number'), isFalse);
    });

    group('fullName getter', () {
      test(
        'should return full name when both first and last name are present',
        () {
          final profile = UserProfile(
            id: 'profile-id-123',
            userId: 'user-456',
            firstName: 'John',
            lastName: 'Doe',
            createdAt: DateTime.parse('2024-01-15T10:30:00.000Z'),
            updatedAt: DateTime.parse('2024-01-16T14:45:00.000Z'),
          );

          expect(profile.fullName, equals('John Doe'));
        },
      );

      test('should return only first name when last name is null', () {
        final profile = UserProfile(
          id: 'profile-id-123',
          userId: 'user-456',
          firstName: 'John',
          createdAt: DateTime.parse('2024-01-15T10:30:00.000Z'),
          updatedAt: DateTime.parse('2024-01-16T14:45:00.000Z'),
        );

        expect(profile.fullName, equals('John'));
      });

      test('should return only last name when first name is null', () {
        final profile = UserProfile(
          id: 'profile-id-123',
          userId: 'user-456',
          lastName: 'Doe',
          createdAt: DateTime.parse('2024-01-15T10:30:00.000Z'),
          updatedAt: DateTime.parse('2024-01-16T14:45:00.000Z'),
        );

        expect(profile.fullName, equals('Doe'));
      });

      test('should return null when both names are null', () {
        final profile = UserProfile(
          id: 'profile-id-123',
          userId: 'user-456',
          createdAt: DateTime.parse('2024-01-15T10:30:00.000Z'),
          updatedAt: DateTime.parse('2024-01-16T14:45:00.000Z'),
        );

        expect(profile.fullName, isNull);
      });
    });
  });
}
