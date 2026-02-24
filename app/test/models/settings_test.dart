import 'package:flutter_test/flutter_test.dart';
import 'package:informed_citizenry_app/models/settings.dart';

void main() {
  group('Settings Model Tests', () {
    test('should create Settings from JSON correctly', () {
      final json = {
        'id': 'test-id-123',
        'user_id': 'user-456',
        'notification_enabled': true,
        'theme_preference': 'dark',
        'created_at': '2024-01-15T10:30:00.000Z',
        'updated_at': '2024-01-16T14:45:00.000Z',
      };

      final settings = Settings.fromJson(json);

      expect(settings.id, equals('test-id-123'));
      expect(settings.userId, equals('user-456'));
      expect(settings.notificationEnabled, isTrue);
      expect(settings.themePreference, equals('dark'));
      expect(
        settings.createdAt,
        equals(DateTime.parse('2024-01-15T10:30:00.000Z')),
      );
      expect(
        settings.updatedAt,
        equals(DateTime.parse('2024-01-16T14:45:00.000Z')),
      );
    });

    test('should use default values when optional fields are missing', () {
      final json = {
        'id': 'test-id-123',
        'user_id': 'user-456',
        'created_at': '2024-01-15T10:30:00.000Z',
        'updated_at': '2024-01-16T14:45:00.000Z',
      };

      final settings = Settings.fromJson(json);

      expect(settings.notificationEnabled, isTrue); // default value
      expect(settings.themePreference, equals('system')); // default value
    });

    test('should convert Settings to JSON correctly', () {
      final settings = Settings(
        id: 'test-id-123',
        userId: 'user-456',
        notificationEnabled: false,
        themePreference: 'light',
        createdAt: DateTime.parse('2024-01-15T10:30:00.000Z'),
        updatedAt: DateTime.parse('2024-01-16T14:45:00.000Z'),
      );

      final json = settings.toJson();

      expect(json['id'], equals('test-id-123'));
      expect(json['user_id'], equals('user-456'));
      expect(json['notification_enabled'], isFalse);
      expect(json['theme_preference'], equals('light'));
      expect(json['created_at'], equals('2024-01-15T10:30:00.000Z'));
      expect(json['updated_at'], equals('2024-01-16T14:45:00.000Z'));
    });

    test('should omit id in JSON when id is null', () {
      final settings = Settings(
        userId: 'user-456',
        notificationEnabled: true,
        themePreference: 'system',
        createdAt: DateTime.parse('2024-01-15T10:30:00.000Z'),
        updatedAt: DateTime.parse('2024-01-16T14:45:00.000Z'),
      );

      final json = settings.toJson();

      expect(json.containsKey('id'), isFalse);
    });
  });
}
