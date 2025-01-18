import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:informed_citizenry_app/models/settings.dart';
import 'package:informed_citizenry_app/models/user_profile.dart';
import 'i_settings_service.dart';

class SettingsService implements ISettingsService {
  final SupabaseClient _client;

  SettingsService([SupabaseClient? client]) : _client = client ?? Supabase.instance.client;

  @override
  Future<Settings?> getUserSettings(String userId) async {
    try {
      final response = await _client
          .from('settings')
          .select()
          .eq('user_id', userId)
          .single();
      return response != null ? Settings.fromJson(response) : null;
    } catch (e) {
      if (e is PostgrestException && e.message.contains('multiple (or no) rows returned')) {
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
    final settings = {
      if (id != null) 'id': id,
      'user_id': userId,
      'notification_enabled': notificationEnabled,
      'theme_preference': themePreference,
      'updated_at': DateTime.now().toIso8601String(),
    };

    await _client.from('settings').upsert(settings);
  }

  @override
  Future<UserProfile?> getUserProfile(String userId) async {
    try {
      final response = await _client
          .from('user_profiles')
          .select()
          .eq('user_id', userId)
          .single();
      return response != null ? UserProfile.fromJson(response) : null;
    } catch (e) {
      if (e is PostgrestException && e.message.contains('multiple (or no) rows returned')) {
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
    final profile = {
      if (id != null) 'id': id,
      'user_id': userId,
      if (firstName != null) 'first_name': firstName,
      if (lastName != null) 'last_name': lastName,
      if (birthdate != null) 'birthdate': birthdate.toIso8601String().split('T')[0],
      if (streetAddress != null) 'street_address': streetAddress,
      if (city != null) 'city': city,
      if (state != null) 'state': state,
      if (zipCode != null) 'zip_code': zipCode,
      if (phoneNumber != null) 'phone_number': phoneNumber,
      'updated_at': DateTime.now().toIso8601String(),
    };

    await _client.from('user_profiles').upsert(profile);
  }
}