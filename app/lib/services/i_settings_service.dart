import 'package:informed_citizenry_app/models/settings.dart';
import 'package:informed_citizenry_app/models/user_profile.dart';

abstract class ISettingsService {
  Future<Settings?> getUserSettings(String userId);

  Future<void> upsertSettings({
    required String? id,
    required String userId,
    required bool notificationEnabled,
    required String themePreference,
  });

  Future<UserProfile?> getUserProfile(String userId);

  Future<void> upsertUserProfile({
    required String? id,
    required String userId,
    String? firstName,
    String? lastName,
    DateTime? birthdate,
    String? streetAddress,
    String? city,
    String? state,
    String? zipCode,
    String? phoneNumber,
  });
} 