import 'package:pocketbase/pocketbase.dart';
import 'package:informed_citizenry_app/models/settings.dart';
import 'package:informed_citizenry_app/models/user_profile.dart';
import 'i_settings_service.dart';

class SettingsService implements ISettingsService {
  final PocketBase _pb;

  SettingsService([PocketBase? pb])
      : _pb = pb ?? PocketBase('http://localhost:8090');

  String get _userId {
    final userId = _pb.authStore.model?.id;
    if (userId == null) {
      throw Exception('No authenticated user');
    }
    return userId;
  }

  @override
  Future<Settings?> getUserSettings(String userId) async {
    try {
      final records = await _pb.collection('settings').getList(
          filter: _pb.filter('user = {:userId}', {'userId': userId}),
          page: 1,
          perPage: 1);

      if (records.items.isEmpty) {
        return null;
      }

      return Settings.fromJson(records.items.first.toJson());
    } on ClientException catch (e) {
      if (e.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  @override
  Future<void> upsertSettings({
    required String? id,
    required String userId,
    required bool notificationEnabled,
    required String themePreference,
  }) async {
    final body = {
      'user': userId,
      'notification_enabled': notificationEnabled,
      'theme_preference': themePreference,
    };

    if (id != null) {
      await _pb.collection('settings').update(id, body: body);
    } else {
      await _pb.collection('settings').create(body: body);
    }
  }

  @override
  Future<UserProfile?> getUserProfile(String userId) async {
    try {
      final records = await _pb.collection('user_profiles').getList(
          filter: _pb.filter('user = {:userId}', {'userId': userId}),
          page: 1,
          perPage: 1);

      if (records.items.isEmpty) {
        return null;
      }

      return UserProfile.fromJson(records.items.first.toJson());
    } on ClientException catch (e) {
      if (e.statusCode == 404) {
        return null;
      }
      rethrow;
    }
  }

  @override
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
  }) async {
    final body = <String, dynamic>{'user': userId};

    if (firstName != null) body['first_name'] = firstName;
    if (lastName != null) body['last_name'] = lastName;
    if (birthdate != null)
      body['birthdate'] = birthdate.toIso8601String().split('T')[0];
    if (streetAddress != null) body['street_address'] = streetAddress;
    if (city != null) body['city'] = city;
    if (state != null) body['state'] = state;
    if (zipCode != null) body['zip_code'] = zipCode;
    if (phoneNumber != null) body['phone_number'] = phoneNumber;

    if (id != null) {
      await _pb.collection('user_profiles').update(id, body: body);
    } else {
      await _pb.collection('user_profiles').create(body: body);
    }
  }
}
