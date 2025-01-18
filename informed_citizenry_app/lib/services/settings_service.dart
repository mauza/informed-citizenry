import 'package:supabase_flutter/supabase_flutter.dart';
import 'i_settings_service.dart';

class SettingsService implements ISettingsService {
  final SupabaseClient _client;

  SettingsService([SupabaseClient? client]) : _client = client ?? Supabase.instance.client;

  @override
  Future<Map<String, dynamic>?> getUserSettings(String userId) async {
    try {
      final response = await _client
          .from('user_settings')
          .select()
          .eq('user_id', userId)
          .single();
      return response;
    } catch (e) {
      if (e is PostgrestException && e.message.contains('multiple (or no) rows returned')) {
        // Return null to indicate no settings exist
        return null;
      }
      rethrow;
    }
  }

  @override
  Future<void> upsertUserSettings({
    required String? id,
    required String userId,
    required double monthlyIncome,
    required double monthlyExpenses,
    required double savingsGoal,
  }) async {
    final settings = {
      if (id != null) 'id': id,
      'user_id': userId,
      'monthly_income': monthlyIncome,
      'monthly_expenses': monthlyExpenses,
      'savings_goal': savingsGoal,
      'updated_at': DateTime.now().toIso8601String(),
    };

    await _client.from('user_settings').upsert(settings);
  }
} 